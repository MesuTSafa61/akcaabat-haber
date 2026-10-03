// Public transport only. Fixed upstreams, bounded IDs, explicit publishable-key authentication.
const publishable = 'sb_publishable__ejHKVEaMQnvOU8MeAJurg_dT2tpPeD';
const base = 'https://ulasim.trabzon.bel.tr';
const origins = new Set(['https://mesutsafa61.github.io', 'https://akcaabathaber.com.tr', 'https://www.akcaabathaber.com.tr']);
const cache = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

async function fetchJSON(path: string, form?: URLSearchParams) {
  const response = await fetch(base + path, {
    method: form ? 'POST' : 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base + '/',
      'X-Requested-With': 'XMLHttpRequest', ...(form ? {'Content-Type': 'application/x-www-form-urlencoded'} : {}) },
    body: form?.toString(), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Source unavailable');
  return response.json();
}

async function cached(key: string, ttl: number, fn: () => Promise<unknown>) {
  const old = cache.get(key);
  if (old && old.expires > Date.now()) return old.value;
  if (inflight.has(key)) return inflight.get(key);
  const promise = fn().then(value => {
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, {expires: Date.now() + ttl, value});
    return value;
  }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

function tidy(value: unknown) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 180); }
function transportTime(value) {
  const text = String(value || '').trim();
  const match = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);
  }
  // Zoned ISO dates are unambiguous; never interpret unzoned dates in the viewer's timezone.
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(text) ? Date.parse(text) : NaN;
}
function coordinates(raw: unknown) {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const x = Number(raw[0]), y = Number(raw[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return {lat:y, lon:x};
  const lon = x / 20037508.34 * 180;
  const lat = Math.atan(Math.exp(y / 6378137)) * 360 / Math.PI - 90;
  return {lat, lon};
}

Deno.serve(async req => {
  const origin = req.headers.get('Origin') || '';
  const headers = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://akcaabathaber.com.tr',
    'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store'};
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers});
  if (origin && !origins.has(origin)) return reply({error: 'Origin not allowed'}, 403);
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (req.headers.get('apikey') !== publishable) return reply({error: 'Invalid API key'}, 401);
  if (req.method !== 'GET') return reply({error: 'Method not allowed'}, 405);
  const url = new URL(req.url), route = url.searchParams.get('route') || '', kind = url.searchParams.get('kind');
  if (!/^\d{1,3}$/.test(route) || Number(route) < 1 || Number(route) > 250) return reply({error:'Invalid route'}, 400);
  const checkedAt = new Date().toISOString();
  try {
    if (kind === 'stops') {
      const result = await cached('stops:' + route, 6 * 3600000, async () => {
        const raw = await fetchJSON('/Web/GetHatDurakGeoJson?hatIdler=' + route);
        if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Invalid stops');
        const stops = raw.features.filter((f: any) => String(f.properties?.hat_id) === route).map((f: any) => {
          const p = f.properties;
          return {id: String(p.durak_id), code: String(p.durak_kod), name: tidy(p.ad),
            direction: Number(p.yon), directionName: tidy(p.hat_guzergah_ad), order: Number(p.sira), ...coordinates(f.geometry?.coordinates)};
        }).filter((s: any) => s.name && Number.isFinite(s.order)).sort((a: any,b: any) => a.direction - b.direction || a.order - b.order);
        return {stops, updatedAt: new Date().toISOString()};
      });
      return reply({...result as object, checkedAt});
    }
    if (kind === 'vehicles') {
      const result = await cached('vehicles:' + route, 10000, async () => {
        const raw = await fetchJSON('/Web/KonumGetir', new URLSearchParams({'hatIdler[]':route}));
        if (raw.SonucDurum !== true || !Array.isArray(raw.SonucData)) return {available:false, vehicles:[], updatedAt:new Date().toISOString()};
        const vehicles = raw.SonucData.filter((v: any) => String(v.HatId) === route).map((v: any) => ({
          plate:tidy(v.PlakaKod), passedStop:String(v.GecilenDurakId || ''), direction:Number.isFinite(Number(v.Yon)) ? Number(v.Yon) : null, directionCode:tidy(v.HatYon),
          timestamp:(() => {const time = transportTime(v.Tarih || v.EklemeTarih || v.OncekiGecilenDurakTarih);return Number.isFinite(time) ? new Date(time).toISOString() : '';})(),
          ...coordinates([v.KonumX,v.KonumY]),
        }));
        return {available:true, vehicles, updatedAt:new Date().toISOString()};
      });
      return reply({...result as object, checkedAt});
    }
    if (kind === 'arrivals') {
      const stop = url.searchParams.get('stop') || '';
      if (!/^\d{1,6}$/.test(stop)) return reply({error:'Invalid stop'},400);
      const result = await cached('arrivals:' + route + ':' + stop, 10000, async () => {
        // Only permit a stop belonging to this selected route.
        const geo = await fetchJSON('/Web/GetHatDurakGeoJson?hatIdler=' + route);
        if (!geo.features?.some((f: any) => String(f.properties?.durak_kod) === stop && String(f.properties?.hat_id) === route)) throw new Error('Invalid stop');
        const raw = await fetchJSON('/Web/DuragaYaklasanAraclar?qrDurakKod=' + stop);
        if (raw.SonucDurum !== true || !Array.isArray(raw.SonucData)) return {available:false, items:[], updatedAt:new Date().toISOString()};
        return {available:true, items:raw.SonucData.filter((v: any) => String(v.HatId) === route), updatedAt:new Date().toISOString()};
      });
      return reply({...result as object, checkedAt});
    }
    return reply({error:'Invalid request'},400);
  } catch (_) { return reply({available:false, checkedAt, error:'Kaynak servise ulaşılamadı'},503); }
});
