const source = "https://www.kgm.gov.tr/Sayfalar/KGM/SiteTr/YolDanisma/CalismaYapilanYollarYeni.aspx?Bolge=10";
const origins = new Set(["https://akcaabathaber.com.tr", "https://www.akcaabathaber.com.tr", "https://mesutsafa61.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]);
const corridor = /Akçaabat Şehir geçişi|Trabzon Şehir geçişi|Söğütlü\s+Yıldızlı/i;
let cache: { until: number; body: unknown } | null = null;
let pending: Promise<unknown> | null = null;
function clean(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}
function reply(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=600", "access-control-allow-origin": origin, "vary": "Origin",
    "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "apikey, authorization" } });
}
async function refresh() {
  const response = await fetch(source, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("source_unavailable");
  const html = await response.text();
  const rows = [...html.matchAll(/<tr\b[^>]*class="trCalismaYapilanYollarDatas"[^>]*>([\s\S]*?)<\/tr>/gi)];
  const items = rows.map(([, row]) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => clean(cell)))
    .filter(cells => cells.length >= 4 && /^(?:010-21|61-83)$/.test(cells[0]) && corridor.test(cells[1]))
    .map(([road, description, announced, updated]) => ({ road, description: description.slice(0, 900), announced, updated }))
    .slice(0, 30);
  if (!rows.length) throw new Error("source_format_changed");
  const body = { source: "Karayolları Genel Müdürlüğü", sourceUrl: source, fetchedAt: new Date().toISOString(), items };
  cache = { until: Date.now() + 30 * 60_000, body };
  return body;
}
Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";
  if (!origins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return reply({}, 200, origin);
  if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405, origin);
  if (cache && cache.until > Date.now()) return reply(cache.body, 200, origin);
  pending ||= refresh().finally(() => { pending = null; });
  try { return reply(await pending, 200, origin); }
  catch { return reply({ error: "source_unavailable" }, 503, origin); }
});
