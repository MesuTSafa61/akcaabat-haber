import { createClient } from "@supabase/supabase-js";

type Scope = "akcaabat" | "trabzon" | "trabzonspor";
type Source = {
  id: string; name: string; feed_url: string; source_type: "rss" | "api";
  category: Scope; trust_level: number; auto_publish: boolean;
  allow_remote_image: boolean;
};
type Item = {
  guid: string | null; url: string; title: string; summary: string;
  publishedAt: string | null; imageUrl: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const clean = (value: string | null | undefined, limit = 1000) =>
  String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

const dateValue = (value: string | null | undefined) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const slugify = (value: string) => clean(value, 160).toLocaleLowerCase("tr-TR")
  .replace(/[^a-z0-9ğüşıöç]+/g, "-").replace(/^-+|-+$/g, "") || "haber";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rssItems(xml: string): Item[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (!doc || doc.querySelector("parsererror")) throw new Error("Geçersiz RSS/XML");
  const nodes = [...doc.querySelectorAll("item"), ...doc.querySelectorAll("entry")].slice(0, 40);
  return nodes.map((node) => {
    const text = (selector: string) => node.querySelector(selector)?.textContent || "";
    const link = node.querySelector("link[href]")?.getAttribute("href") || text("link");
    const image = node.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
      node.querySelector("media\\:content, content[url]")?.getAttribute("url") || null;
    return {
      guid: clean(text("guid") || text("id"), 500) || null,
      url: clean(link, 2000),
      title: clean(text("title"), 300),
      summary: clean(text("description") || text("summary") || text("content"), 700),
      publishedAt: dateValue(text("pubDate") || text("published") || text("updated")),
      imageUrl: image && /^https:\/\//i.test(image) ? image : null,
    };
  }).filter((item) => item.url && item.title);
}

function apiItems(body: unknown): Item[] {
  const data = Array.isArray(body) ? body : (body as { items?: unknown[] })?.items;
  if (!Array.isArray(data)) throw new Error("API yanıtında items dizisi yok");
  return data.slice(0, 40).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      guid: clean(String(item.id || item.guid || ""), 500) || null,
      url: clean(String(item.url || item.external_url || ""), 2000),
      title: clean(String(item.title || ""), 300),
      summary: clean(String(item.summary || item.description || ""), 700),
      publishedAt: dateValue(String(item.date_published || item.published_at || "")),
      imageUrl: /^https:\/\//i.test(String(item.image || item.image_url || ""))
        ? String(item.image || item.image_url) : null,
    };
  }).filter((item) => item.url && item.title);
}

function classify(item: Item, keywords: Record<string, string[]>) {
  const title = item.title.toLocaleLowerCase("tr-TR");
  const detail = (item.title + " " + item.summary).toLocaleLowerCase("tr-TR");
  let best: { scope: Scope; score: number; tags: string[] } | null = null;
  (["akcaabat", "trabzon", "trabzonspor"] as Scope[]).forEach((scope) => {
    const terms = Array.isArray(keywords[scope]) ? keywords[scope] : [];
    const tags = terms.filter((term) => detail.includes(String(term).toLocaleLowerCase("tr-TR"))).slice(0, 5);
    const titleHits = terms.filter((term) => title.includes(String(term).toLocaleLowerCase("tr-TR"))).length;
    const score = tags.length + titleHits * 2;
    if (!best || score > best.score) best = { scope, score, tags };
  });
  return best && best.score >= 2 ? best : null;
}

async function canRun(client: ReturnType<typeof createClient>, request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-news-bot-secret") ||
    url.searchParams.get("secret");
  if (secret) {
    const { data, error } = await client.rpc("is_news_bot_cron_secret", { p_secret: secret });
    if (!error && data === true) return true;
  }
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: userData } = await client.auth.getUser(token);
  const user = userData.user;
  if (!user) return false;
  const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  return Boolean(profile?.is_active && ["admin", "editor"].includes(profile.role));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Yalnızca POST desteklenir." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Sunucu ayarları eksik." }, 500);
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (!await canRun(client, request)) return json({ error: "Yetkisiz istek." }, 401);

  const { data: settings, error: settingsError } = await client
    .from("news_bot_settings").select("*").eq("id", true).single();
  if (settingsError) return json({ error: "Bot ayarları okunamadı." }, 500);
  if (!settings.is_enabled) {
    await client.from("news_bot_runs").insert({ status: "disabled", completed_at: new Date().toISOString() });
    return json({ status: "disabled" });
  }

  const { data: run, error: runError } = await client.from("news_bot_runs").insert({}).select("id").single();
  if (runError || !run) return json({ error: "Çalışma kaydı oluşturulamadı." }, 500);
  const totals = { sources_checked: 0, found_count: 0, skipped_count: 0, duplicate_count: 0, draft_count: 0, published_count: 0 };
  const errors: string[] = [];

  try {
    const { data: categories } = await client.from("categories").select("id,slug,name").eq("is_active", true);
    const categoryId = (scope: Scope) => categories?.find((category) =>
      [category.slug, category.name.toLocaleLowerCase("tr-TR")].includes(scope))?.id || null;
    const { data: sources, error: sourcesError } = await client.from("news_sources").select("*").eq("is_active", true);
    if (sourcesError) throw sourcesError;

    for (const source of (sources || []) as Source[]) {
      totals.sources_checked++;
      try {
        const response = await fetch(source.feed_url, {
          signal: AbortSignal.timeout(8000),
          headers: { "Accept": source.source_type === "rss" ? "application/rss+xml, application/atom+xml, application/xml;q=0.9" : "application/json" },
        });
        if (!response.ok) throw new Error("Kaynak HTTP " + response.status);
        const items = source.source_type === "rss"
          ? rssItems(await response.text())
          : apiItems(await response.json());

        for (const item of items) {
          totals.found_count++;
          const match = classify(item, settings.keywords || {});
          if (!match) { totals.skipped_count++; continue; }
          const fingerprint = await sha256([item.url, item.title.toLocaleLowerCase("tr-TR"), item.publishedAt || ""].join("|"));
          const duplicateChecks = await Promise.all([
            client.from("news_bot_items").select("id").eq("source_url", item.url).limit(1),
            client.from("news_bot_items").select("id").eq("fingerprint", fingerprint).limit(1),
            item.guid
              ? client.from("news_bot_items").select("id").eq("source_id", source.id).eq("source_guid", item.guid).limit(1)
              : Promise.resolve({ data: [] }),
          ]);
          if (duplicateChecks.some((result) => result.data?.length)) {
            totals.duplicate_count++;
            continue;
          }

          const status = settings.default_mode === "auto_publish" && source.auto_publish && source.trust_level >= 4
            ? "published" : "draft";
          const summary = item.summary || `${source.name} kaynağından alınan haber başlığı.`;
          const payload = {
            title: item.title, slug: slugify(item.title) + "-" + fingerprint.slice(0, 8),
            summary, content: summary + "\n\nKaynak: " + source.name + "\nOrijinal haber: " + item.url,
            category_id: categoryId(match.scope), image_url: source.allow_remote_image ? item.imageUrl : null,
            status, published_at: status === "published" ? new Date().toISOString() : null,
            origin_type: "automated", source_id: source.id, source_name: source.name,
            source_url: item.url, source_guid: item.guid, source_published_at: item.publishedAt,
            source_summary: item.summary || null, source_fingerprint: fingerprint, imported_at: new Date().toISOString(),
          };
          const { data: news, error: newsError } = await client.from("news").insert(payload).select("id").single();
          if (newsError) {
            if (newsError.code === "23505") { totals.duplicate_count++; continue; }
            throw newsError;
          }
          const { error: itemError } = await client.from("news_bot_items").insert({
            source_id: source.id, run_id: run.id, source_guid: item.guid, source_url: item.url,
            fingerprint, title: item.title, summary: item.summary || null, scope: match.scope, tags: match.tags,
            remote_image_url: source.allow_remote_image ? item.imageUrl : null,
            source_published_at: item.publishedAt, disposition: "created", news_id: news.id,
          });
          if (itemError) throw itemError;
          await client.from("news_sources").update({ last_guid: item.guid, last_published_at: item.publishedAt }).eq("id", source.id);
          if (status === "published") totals.published_count++; else totals.draft_count++;
        }
      } catch (error) {
        errors.push(source.name + ": " + (error instanceof Error ? error.message : "Kaynak okunamadı"));
      }
    }
    const status = errors.length ? "partial" : "completed";
    await client.from("news_bot_runs").update({
      ...totals, status, completed_at: new Date().toISOString(), error_summary: errors.join(" | ").slice(0, 2000),
    }).eq("id", run.id);
    await client.from("news_bot_settings").update({ last_run_at: new Date().toISOString() }).eq("id", true);
    return json({ status, ...totals, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen hata";
    await client.from("news_bot_runs").update({
      ...totals, status: "failed", completed_at: new Date().toISOString(), error_summary: message.slice(0, 2000),
    }).eq("id", run.id);
    return json({ error: "Bot çalışması tamamlanamadı." }, 500);
  }
});
