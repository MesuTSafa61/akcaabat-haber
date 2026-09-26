// Fixed local corridors. One shared response per edge isolate limits upstream traffic.
const routes = [
  { id: "akcaabat-sogutlu", name: "Akçaabat → Söğütlü", from: [41.0197, 39.5716], to: [41.0064, 39.6138] },
  { id: "sogutlu-akcaabat", name: "Söğütlü → Akçaabat", from: [41.0064, 39.6138], to: [41.0197, 39.5716] },
  { id: "akcaabat-trabzon", name: "Akçaabat → Trabzon", from: [41.0197, 39.5716], to: [41.0027, 39.7168] },
  { id: "trabzon-akcaabat", name: "Trabzon → Akçaabat", from: [41.0027, 39.7168], to: [41.0197, 39.5716] }
];
const upstream = "https://europe-west1-trabzon-sehir-kameralari.cloudfunctions.net/getRoute";
const allowedOrigins = new Set(["https://akcaabathaber.com.tr", "https://www.akcaabathaber.com.tr",
  "https://mesutsafa61.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]);
let cached: { until: number; body: unknown } | null = null;
let pending: Promise<unknown> | null = null;

function reply(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60",
    "access-control-allow-origin": origin, "vary": "Origin",
    "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "apikey, authorization"
  } });
}
async function refresh() {
  const results = await Promise.all(routes.map(async route => {
    try {
      const response = await fetch(upstream, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: { fromLat: route.from[0], fromLng: route.from[1], toLat: route.to[0], toLng: route.to[1] } }),
        signal: AbortSignal.timeout(8500)
      });
      if (!response.ok) throw new Error("upstream_unavailable");
      const data = await response.json();
      const alternatives = data?.result?.routes;
      const first = Array.isArray(alternatives) ? alternatives.find(item => Number(item.minutes) > 0) : null;
      if (!first) throw new Error("route_unavailable");
      const minutes = Number(first.minutes), delay = Number(first.delay);
      return { id: route.id, name: route.name, available: true, seconds: Math.round(minutes * 60),
        delaySeconds: Number.isFinite(delay) ? Math.max(0, Math.round(delay * 60)) : null,
        status: String(first.status || "") };
    } catch {
      return { id: route.id, name: route.name, available: false };
    }
  }));
  const body = { updatedAt: new Date().toISOString(), source: "Trabzon Trafik", routes: results };
  cached = { until: Date.now() + (results.some(route => route.available) ? 120_000 : 30_000), body };
  return body;
}
Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return reply({}, 200, origin);
  if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405, origin);
  if (cached && cached.until > Date.now()) return reply(cached.body, 200, origin);
  pending ||= refresh().finally(() => { pending = null; });
  const body = await pending;
  return reply(body, 200, origin);
});
