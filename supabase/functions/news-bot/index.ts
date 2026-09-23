import { DOMParser } from "linkedom";
import { createClient } from "@supabase/supabase-js";

type Scope = "akcaabat" | "trabzon" | "trabzonspor";
type Source = {
  id: string; name: string; feed_url: string; source_type: "rss" | "api";
  category: Scope; trust_level: number; auto_publish: boolean;
  allow_remote_image: boolean;
};
type Item = {
  guid: string | null; url: string; title: string; summary: string;
  publishedAt: string | null; imageUrl: string | null; content?: string;
  creditedSource?: string;
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

const turkishDateValue = (value: string | null | undefined) => {
  const normalized = clean(value, 100).toLocaleLowerCase("tr-TR");
  const match = normalized.match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/u);
  if (!match) return dateValue(normalized);
  const months: Record<string, number> = {
    ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
    temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
  };
  const month = months[match[2]];
  if (month === undefined) return null;
  // Fanatik kart tarihleri Türkiye saatiyle yayınlanıyor.
  const iso = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}T${match[4].padStart(2, "0")}:${match[5]}:00+03:00`;
  return dateValue(iso);
};

const compactTurkishDateValue = (value: string | null | undefined) => {
  const normalized = clean(value, 100);
  const match = normalized.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return turkishDateValue(normalized);
  const iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T${(match[4] || "00").padStart(2, "0")}:${match[5] || "00"}:00+03:00`;
  return dateValue(iso);
};

const slugify = (value: string) => clean(value, 160).toLocaleLowerCase("tr-TR")
  .replace(/[^a-z0-9ğüşıöç]+/g, "-").replace(/^-+|-+$/g, "") || "haber";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const contentFromSummary = (summary: string) => clean(summary, 1200)
  .replace(/([.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9])/g, "$1\n\n");

// Feed spotu haber gövdesi değildir. Kaynaktaki farklı olguları kısa alıntı olarak ayır.
function distinctDetails(body: string, summary: string): string {
  const lead = clean(summary, 700).toLocaleLowerCase("tr-TR");
  const separated = String(body || "")
    .replace(/([.!?])(?=[A-ZÇĞİÖŞÜ])/gu, "$1\n\n")
    .replace(/([A-ZÇĞİÖŞÜ]{5,})(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü])/gu, "$1\n\n");
  const sentences = separated.split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9])/u);
  const chosen: string[] = [];
  for (const sentence of sentences) {
    const part = clean(sentence, 600);
    const heading = part.length >= 15 && part.length <= 90 &&
      part === part.toLocaleUpperCase("tr-TR") && !/[.!?]$/.test(part);
    if ((!heading && part.length < 45) || lead.includes(part.toLocaleLowerCase("tr-TR"))) continue;
    if (chosen.join(" ").length + part.length > 480) break;
    chosen.push(heading ? part.toLocaleLowerCase("tr-TR").replace(/^./u, (letter) => letter.toLocaleUpperCase("tr-TR")) : part);
    if (chosen.length === 4) break;
  }
  return chosen.join("\n\n");
}

function newsArticleSchema(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = newsArticleSchema(entry);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const type = object["@type"];
  if (type === "NewsArticle" || (Array.isArray(type) && type.includes("NewsArticle"))) return object;
  return newsArticleSchema(object["@graph"]);
}

// Yayıncının kendisi, sosyal medya alanı veya içerikteki rastgele bir isim
// kaynak sayılmaz: yalnızca açıkça "Kaynak: ..." biçimindeki kredi alınır.
function explicitSourceCredit(value: string | null | undefined): string {
  const lines = String(value || "")
    .replace(/<br\s*\/?\s*>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ").split(/\n+/);
  for (const line of lines) {
    const match = line.trim().match(/^(?:haber\s+)?kaynak\s*[:：]\s*([^|•]{2,90})/iu);
    if (!match) continue;
    const name = clean(match[1], 90).replace(/\s*(?:[|•]|\s+-\s+).*/, "").trim();
    if (name.length >= 2 && name.length <= 80 && !/^(belirtilmedi|yok|editör|haber merkezi)$/iu.test(name)) return name;
  }
  return "";
}

function sourceCreditFromArticle(doc: Document): string {
  const selectors = "article [class*='source'], [itemprop='sourceOrganization'], article p, .article-content p, .news-content p";
  const nodes = [...doc.querySelectorAll(selectors)].slice(-70);
  for (const node of nodes) {
    const credit = explicitSourceCredit(node.textContent);
    if (credit) return credit;
  }
  return "";
}

async function enrichFanatikItem(item: Item): Promise<Item> {
  try {
    const response = await fetch(item.url, {
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "User-Agent": "AkcaabatHaberBot/1.0 (+https://akcaabathaber.com)",
      },
    });
    if (!response.ok) return item;
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    if (!doc) return item;
    let structuredDescription = "";
    let articleBody = "";
    for (const script of [...doc.querySelectorAll("script[type='application/ld+json']")]) {
      try {
        const schema = newsArticleSchema(JSON.parse(script.textContent || ""));
        if (schema?.articleBody) articleBody = String(schema.articleBody);
        if (schema?.description) {
          structuredDescription = String(schema.description);
          if (articleBody) break;
        }
      } catch { /* bozuk yapılandırılmış veri yerine meta açıklamasını kullan */ }
    }
    const summary = clean(
      structuredDescription ||
      doc.querySelector("meta[name='description']")?.getAttribute("content") ||
      doc.querySelector("meta[property='og:description']")?.getAttribute("content"),
      700,
    ).replace(/\s*(?:\.{3}|…)\s*$/, "…");
    const articleSections = [...doc.querySelectorAll(".nd-article-content h2, .nd-article-content h3, .nd-article-content p")]
      .map((section) => clean(section.textContent, 2000)).filter(Boolean);
    if (articleSections.length > 1) articleBody = articleSections.join("\n\n");
    const detailImage = doc.querySelector("meta[property='og:image']")?.getAttribute("content");
    return {
      ...item,
      summary: summary || item.summary,
      content: distinctDetails(articleBody, summary || item.summary),
      creditedSource: sourceCreditFromArticle(doc) || item.creditedSource,
      imageUrl: detailImage && /^https:\/\//i.test(detailImage) ? detailImage : item.imageUrl,
    };
  } catch {
    return item;
  }
}

// RSS akışı yalnızca spot sağlıyorsa haberin kendi sayfasından gövdeyi ara.
// Yönlendirmeleri izlememek kaynak dışı adreslere istek yapılmasını önler.
async function enrichArticleItem(item: Item, source: Source): Promise<Item> {
  try {
    const articleUrl = new URL(item.url);
    const feedHost = new URL(source.feed_url).hostname.replace(/^www\./, "");
    const articleHost = articleUrl.hostname.replace(/^www\./, "");
    if (articleUrl.protocol !== "https:" ||
      !(articleHost === feedHost || articleHost.endsWith("." + feedHost) || feedHost.endsWith("." + articleHost))) return item;
    const response = await fetch(articleUrl.href, {
      signal: AbortSignal.timeout(4500), redirect: "error",
      headers: { Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
    });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("html")) return item;
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    if (!doc) return item;
    let body = "";
    for (const script of [...doc.querySelectorAll("script[type='application/ld+json']")]) {
      try {
        const schema = newsArticleSchema(JSON.parse(script.textContent || ""));
        if (typeof schema?.articleBody === "string" && schema.articleBody.length > body.length) body = schema.articleBody;
      } catch { /* geçersiz JSON-LD */ }
    }
    for (const selector of ["[itemprop='articleBody']", ".article-content", ".news-detail-content", ".detail-content", ".news-content", "article"]) {
      const container = doc.querySelector(selector);
      if (!container) continue;
      const paragraphs = [...container.querySelectorAll("h2, h3, p")]
        .map((node) => clean(node.textContent, 1500))
        .filter((part) => part.length >= 35 && !/^(reklam|ilgili haber|son dakika)$/i.test(part));
      const candidate = paragraphs.join("\n\n");
      if (candidate.length > body.length) body = candidate;
    }
    const content = distinctDetails(body, item.summary);
    return {
      ...item,
      content: content.length >= 90 ? content : item.content,
      creditedSource: sourceCreditFromArticle(doc) || item.creditedSource,
    };
  } catch { return item; }
}

function rssItems(xml: string): Item[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (!doc || doc.querySelector("parsererror")) throw new Error("Geçersiz RSS/XML");
  const nodes = [...doc.querySelectorAll("item"), ...doc.querySelectorAll("entry")].slice(0, 12);
  return nodes.map((node) => {
    const text = (selector: string) => node.querySelector(selector)?.textContent || "";
    const link = node.querySelector("link[href]")?.getAttribute("href") || text("link");
    const rawSummary = text("description") || text("summary") || text("content\\:encoded") || text("content");
    const fullBody = text("content\\:encoded") || text("content");
    const embeddedImage = rawSummary.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)?.[1];
    const image = node.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
      node.querySelector("media\\:content, media\\:thumbnail, content[url]")?.getAttribute("url") || embeddedImage || null;
    return {
      guid: clean(text("guid") || text("id"), 500) || null,
      url: clean(link, 2000),
      title: clean(text("title"), 300),
      summary: clean(rawSummary, 700),
      content: distinctDetails(fullBody, rawSummary),
      creditedSource: explicitSourceCredit(rawSummary) || explicitSourceCredit(fullBody),
      publishedAt: dateValue(text("pubDate") || text("published") || text("updated")),
      imageUrl: image && /^https:\/\//i.test(image) ? image : null,
    };
  }).filter((item) => item.url && item.title);
}

function dhaItems(html: string, sourceUrl: string): Item[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("DHA sayfası ayrıştırılamadı");
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const card of [...doc.querySelectorAll(".news__item")]) {
    const anchor = card.querySelector("a.news__titles-link[href], a.news__link[href], a[href]");
    if (!anchor) continue;
    let url: URL;
    try { url = new URL(anchor.getAttribute("href") || "", sourceUrl); } catch { continue; }
    if (!/(^|\.)dha\.com\.tr$/i.test(url.hostname)) continue;
    url.search = "";
    url.hash = "";
    if (seen.has(url.href)) continue;
    const title = clean(
      card.querySelector(".news__title")?.textContent || anchor.getAttribute("title") || anchor.textContent,
      300,
    );
    const summary = clean(card.querySelector(".news__spot")?.textContent, 700);
    if (title.length < 12) continue;
    const image = card.querySelector("img[data-src], img[src]");
    const rawImage = image?.getAttribute("data-src") || image?.getAttribute("src");
    let imageUrl: string | null = null;
    try {
      if (rawImage) {
        const parsed = new URL(rawImage, sourceUrl);
        if (parsed.protocol === "https:") imageUrl = parsed.href;
      }
    } catch { /* görselsiz devam */ }
    seen.add(url.href);
    const articleId = url.pathname.match(/-(\d+)$/)?.[1] || url.pathname;
    items.push({
      guid: `dha:${articleId}`,
      url: url.href,
      title,
      summary,
      publishedAt: compactTurkishDateValue(card.querySelector(".news__date")?.textContent),
      imageUrl,
    });
    if (items.length >= 12) break;
  }
  if (!items.length) throw new Error("DHA haber kartı bulunamadı");
  return items;
}

function fanatikItems(html: string, sourceUrl: string): Item[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("Fanatik sayfası ayrıştırılamadı");
  const seen = new Set<string>();
  const items: Item[] = [];
  const cards = [...doc.querySelectorAll(".single-article")];
  const addAnchor = (anchor: Element, container: Element) => {
    const rawHref = anchor.getAttribute("href") || "";
    let url: URL;
    try { url = new URL(rawHref, sourceUrl); } catch { return; }
    if (url.hostname !== "www.fanatik.com.tr" && url.hostname !== "fanatik.com.tr") return;
    const articleId = url.pathname.match(/^\/trabzonspor\/[a-z0-9-]+-(\d+)\/?$/i)?.[1];
    if (!articleId) return;
    url.search = "";
    url.hash = "";
    const image = container.querySelector("a.fixed-ratio img") ||
      container.querySelector("img[src*='image.fanatik'], img[data-src*='image.fanatik'], img[data-original*='image.fanatik']") ||
      container.querySelector("img[src], img[data-src]");
    const title = clean(
      anchor.getAttribute("title") || anchor.getAttribute("aria-label") ||
      anchor.textContent || image?.getAttribute("alt"), 300,
    );
    if (title.length < 12 || seen.has(articleId)) return;
    const rawImage = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.getAttribute("data-original");
    let imageUrl: string | null = null;
    try { if (rawImage) { const parsed = new URL(rawImage, sourceUrl); if (parsed.protocol === "https:") imageUrl = parsed.href; } } catch { /* görselsiz devam */ }
    seen.add(articleId);
    const publishedAt = turkishDateValue(container.querySelector(".card-date")?.textContent);
    items.push({ guid: `fanatik:${articleId}`, url: url.href, title, summary: "", publishedAt, imageUrl });
  };
  for (const card of cards) {
    const anchor = card.querySelector(".single-article__title a[href]") || card.querySelector("a[href]");
    if (anchor) addAnchor(anchor, card);
    if (items.length >= 12) break;
  }
  // CDN bazı bölgelerde kart sınıflarını sadeleştiriyor; haber URL deseni aynı kalıyor.
  if (!items.length) {
    for (const anchor of [...doc.querySelectorAll("a[href]")]) {
      const container = anchor.parentElement?.parentElement || anchor.parentElement || anchor;
      addAnchor(anchor, container);
      if (items.length >= 12) break;
    }
  }
  if (!items.length) {
    throw new Error(`Fanatik Trabzonspor haber bağlantısı bulunamadı (kart: ${cards.length}, bağlantı: ${doc.querySelectorAll("a[href]").length})`);
  }
  return items;
}

function apiItems(body: unknown): Item[] {
  const data = Array.isArray(body) ? body : (body as { items?: unknown[] })?.items;
  if (!Array.isArray(data)) throw new Error("API yanıtında items dizisi yok");
  return data.slice(0, 12).map((raw) => {
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
  // Özel kategoriler eşit puanda genel "Trabzon" kategorisinden önce gelir.
  (["trabzonspor", "akcaabat", "trabzon"] as Scope[]).forEach((scope) => {
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
      [category.slug, category.name.toLocaleLowerCase("tr-TR")].includes(scope))?.id ||
      (scope === "trabzonspor" ? categories?.find((category) => category.slug === "spor")?.id : null) || null;
    const { data: sources, error: sourcesError } = await client.from("news_sources").select("*").eq("is_active", true);
    if (sourcesError) throw sourcesError;

    for (const source of (sources || []) as Source[]) {
      totals.sources_checked++;
      try {
        const isFanatikSource = source.feed_url.includes("fanatik.com.tr");
        const isDhaSource = source.feed_url.includes("dha.com.tr/haberleri/");
        const sourceDisplayName = isFanatikSource ? "Fanatik" : isDhaSource ? "DHA" : source.name;
        const requestSource = () => fetch(source.feed_url, {
          signal: AbortSignal.timeout(8000),
          redirect: "follow",
          headers: {
            "Accept": source.source_type === "rss"
              ? "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8"
              : "application/json",
            "Accept-Language": "tr-TR,tr;q=0.9",
            "User-Agent": "AkcaabatHaberBot/1.0 (+https://akcaabathaber.com)",
          },
        });
        let response = await requestSource();
        if (response.status === 429 || response.status >= 500) {
          await response.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, 500));
          response = await requestSource();
        }
        if (!response.ok) throw new Error("Kaynak HTTP " + response.status);
        const contentType = response.headers.get("content-type") || "";
        const responseBody = await response.text();
        const isFanatikHtml = isFanatikSource &&
          (contentType.includes("text/html") || /<!doctype\s+html|<html[\s>]/i.test(responseBody));
        const isDhaHtml = isDhaSource &&
          (contentType.includes("text/html") || /<!doctype\s+html|<html[\s>]/i.test(responseBody));
        let items = source.source_type === "api"
          ? apiItems(JSON.parse(responseBody))
          : isFanatikHtml
            ? fanatikItems(responseBody, response.url || source.feed_url)
            : isDhaHtml
              ? dhaItems(responseBody, response.url || source.feed_url)
            : rssItems(responseBody);
        if (isFanatikHtml) {
          items = await Promise.all(items.map(enrichFanatikItem));
        }

        let articleFetches = 0;
        for (let item of items) {
          totals.found_count++;
          // Yalnızca başlık ve bağlantıdan oluşan eksik haberleri hiçbir kaynaktan yayımlama.
          const normalizedTitle = clean(item.title, 700).toLocaleLowerCase("tr-TR");
          const normalizedSummary = clean(item.summary, 700).toLocaleLowerCase("tr-TR");
          if (normalizedSummary.length < 40 || normalizedSummary === normalizedTitle) {
            totals.skipped_count++;
            continue;
          }
          // Genel RSS/HTML akışlarında kaynak kategorisine körlemesine güvenme. Fanatik
          // sayfası yalnızca Trabzonspor'a ayrılmıştır; diğer tüm kaynaklar eşleşmelidir.
          const match = classify(item, settings.keywords || {}) ||
            (isFanatikSource ? { scope: "trabzonspor" as Scope, score: 2, tags: ["Trabzonspor"] } : null);
          if (!match) { totals.skipped_count++; continue; }
          const itemScope: Scope = isFanatikSource ? "trabzonspor" : match.scope;
          if (!isFanatikSource && articleFetches < 2) {
            articleFetches++;
            item = await enrichArticleItem(item, source);
          }
          const fingerprint = await sha256([item.url, item.title.toLocaleLowerCase("tr-TR"), item.publishedAt || ""].join("|"));
          const recentCutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
          const duplicateChecks = await Promise.all([
            client.from("news_bot_items").select("id,news_id").eq("source_url", item.url).limit(1),
            client.from("news_bot_items").select("id,news_id").eq("fingerprint", fingerprint).limit(1),
            item.guid
              ? client.from("news_bot_items").select("id,news_id").eq("source_id", source.id).eq("source_guid", item.guid).limit(1)
              : Promise.resolve({ data: [] }),
          ]);
          const duplicate = duplicateChecks.flatMap((result) => result.data || [])[0];
          if (duplicate) {
            totals.duplicate_count++;
            if (duplicate.news_id) {
              const { data: existing } = await client.from("news")
                .select("id,status,published_at,content,source_summary")
                .eq("id", duplicate.news_id).maybeSingle();
              if (existing) {
                const placeholder = !clean(existing.content || "") || !existing.source_summary ||
                  /kaynağından alınan haber başlığı|Orijinal haber:/i.test(existing.content || "");
                const botManagedContent = placeholder || clean(existing.content || "", 1200) ===
                  clean(contentFromSummary(existing.source_summary || ""), 1200) ||
                  (isFanatikSource && /[.!?][A-ZÇĞİÖŞÜ]{5,}|[A-ZÇĞİÖŞÜ]{5,}[A-ZÇĞİÖŞÜ][a-zçğıöşü]/u.test(existing.content || ""));
                const updates: Record<string, unknown> = {};
                if (isFanatikSource) {
                  updates.category_id = categoryId("trabzonspor");
                  updates.source_name = sourceDisplayName;
                }
                if (item.creditedSource) updates.credited_source_name = item.creditedSource;
                if (botManagedContent && item.content) {
                  updates.summary = item.summary;
                  updates.content = item.content;
                  updates.source_summary = item.summary;
                  if (source.allow_remote_image && item.imageUrl) updates.image_url = item.imageUrl;
                }
                if (settings.default_mode === "auto_publish" && source.auto_publish &&
                  existing.status === "draft" && !!item.content) {
                  updates.status = "published";
                  updates.published_at = existing.published_at || new Date().toISOString();
                }
                if (Object.keys(updates).length) {
                  updates.updated_at = new Date().toISOString();
                  await client.from("news").update(updates).eq("id", existing.id);
                }
              }
              await client.from("news_bot_items").update({
                summary: item.summary || null,
                remote_image_url: source.allow_remote_image ? item.imageUrl : null,
                source_published_at: item.publishedAt,
              }).eq("id", duplicate.id);
            }
            continue;
          }

          const { data: sameTitle } = await client.from("news").select("id")
            .eq("title", item.title).gte("created_at", recentCutoff).limit(1);
          if (sameTitle?.length) { totals.duplicate_count++; continue; }

          // Yayımlanamayacak boş gövdeli taslakları da veritabanına ekleme.
          if (!item.content || clean(item.content, 3000).length < 90) {
            totals.skipped_count++;
            continue;
          }

          const status = settings.default_mode === "auto_publish" && source.auto_publish
            ? "published" : "draft";
          const summary = item.summary;
          const payload = {
            title: item.title, slug: slugify(item.title) + "-" + fingerprint.slice(0, 8),
            summary, content: item.content,
            category_id: categoryId(itemScope), image_url: source.allow_remote_image ? item.imageUrl : null,
            status, published_at: status === "published" ? new Date().toISOString() : null,
            origin_type: "automated", source_id: source.id, source_name: sourceDisplayName,
            credited_source_name: item.creditedSource || null,
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
            fingerprint, title: item.title, summary: item.summary || null, scope: itemScope, tags: match.tags,
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
