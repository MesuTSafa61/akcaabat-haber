// Apple Maps ETA proxy. Keep Apple credentials in Supabase function secrets.
const routes = [
  { id: "akcaabat-sogutlu", name: "Akçaabat → Söğütlü", from: [41.0197, 39.5716], to: [41.0064, 39.6138] },
  { id: "sogutlu-akcaabat", name: "Söğütlü → Akçaabat", from: [41.0064, 39.6138], to: [41.0197, 39.5716] },
  { id: "akcaabat-trabzon", name: "Akçaabat → Trabzon", from: [41.0197, 39.5716], to: [41.0027, 39.7168] },
  { id: "trabzon-akcaabat", name: "Trabzon → Akçaabat", from: [41.0027, 39.7168], to: [41.0197, 39.5716] }
];
const allowedOrigins = new Set(["https://akcaabathaber.com.tr", "https://www.akcaabathaber.com.tr",
  "https://mesutsafa61.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]);
const encoder = new TextEncoder();
let accessToken = null;
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function reply(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "access-control-allow-origin": origin, "vary": "Origin",
    "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "apikey, authorization"
  } });
}
async function appleToken() {
  if (accessToken && accessToken.until > Date.now() + 30_000) return accessToken.value;
  const team = Deno.env.get("APPLE_MAPS_TEAM_ID");
  const keyId = Deno.env.get("APPLE_MAPS_KEY_ID");
  const pem = Deno.env.get("APPLE_MAPS_PRIVATE_KEY");
  if (!team || !keyId || !pem) throw new Error("credentials_missing");
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })));
  const payload = base64url(encoder.encode(JSON.stringify({ iss: team, iat: now, exp: now + 3600, scope: "server_api" })));
  const input = header + "." + payload;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(input)));
  const auth = input + "." + base64url(signature);
  const response = await fetch("https://maps-api.apple.com/v1/token", { headers: { Authorization: "Bearer " + auth } });
  if (!response.ok) throw new Error("apple_auth_failed");
  const result = await response.json();
  if (typeof result.accessToken !== "string") throw new Error("apple_auth_failed");
  accessToken = { value: result.accessToken, until: Date.now() + Math.min(Number(result.expiresInSeconds) || 300, 1500) * 1000 };
  return accessToken.value;
}
Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return reply({}, 200, origin);
  if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405, origin);
  try {
    const token = await appleToken();
    const results = await Promise.all(routes.map(async route => {
      const url = new URL("https://maps-api.apple.com/v1/etas");
      url.searchParams.set("origin", route.from.join(","));
      url.searchParams.set("destinations", route.to.join(","));
      const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) return { id: route.id, name: route.name, available: false };
      const eta = (await response.json()).etas?.[0];
      const actual = Number(eta?.expectedTravelTimeSeconds);
      const normal = Number(eta?.staticTravelTimeSeconds);
      return { id: route.id, name: route.name, available: Number.isFinite(actual) && actual > 0,
        seconds: actual, delaySeconds: Number.isFinite(normal) ? Math.max(0, actual - normal) : null };
    }));
    return reply({ updatedAt: new Date().toISOString(), source: "Apple Maps", routes: results }, 200, origin);
  } catch (error) {
    const missing = error instanceof Error && error.message === "credentials_missing";
    return reply({ error: missing ? "provider_not_configured" : "provider_unavailable" }, 503, origin);
  }
});
