import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "cache-control": "public, max-age=180, s-maxage=180",
  "content-type": "application/json; charset=utf-8",
};

async function json(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "AkcaabatHaber/1.0" } });
  if (!response.ok) throw new Error(String(response.status));
  return await response.json();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: cors });

  const [currencies, gold, silver] = await Promise.allSettled([
    json("https://api.frankfurter.app/latest?from=USD&to=TRY,EUR"),
    json("https://api.gold-api.com/price/XAU"),
    json("https://api.gold-api.com/price/XAG"),
  ]);
  const fx = currencies.status === "fulfilled" ? currencies.value : null;
  const usdTry = Number(fx?.rates?.TRY);
  const usdEur = Number(fx?.rates?.EUR);
  const goldUsd = gold.status === "fulfilled" ? Number(gold.value?.price) : NaN;
  const silverUsd = silver.status === "fulfilled" ? Number(silver.value?.price) : NaN;
  const perOunce = 31.1034768;
  const numberOrNull = (value: number) => Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;

  const payload = {
    usd_try: numberOrNull(usdTry),
    eur_try: numberOrNull(usdTry / usdEur),
    gold_try_gram: numberOrNull(goldUsd * usdTry / perOunce),
    silver_try_gram: numberOrNull(silverUsd * usdTry / perOunce),
    updated_at: new Date().toISOString(),
  };
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && serviceKey) {
    await fetch(supabaseUrl + "/rest/v1/site_settings?on_conflict=key", {
      method: "POST",
      headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json", prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key: "market_data", value: payload, updated_at: payload.updated_at }),
    }).catch(() => null);
  }
  return new Response(JSON.stringify(payload), { headers: cors });
});
