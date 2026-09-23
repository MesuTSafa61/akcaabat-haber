import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import { TS, SS, parseTFF, parseTFFDetail } from './parsers.js';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const sources=[{team:TS,url:'https://www.tff.org/default.aspx?pageID=198',parse:parseTFF,detail:parseTFFDetail},{team:SS,url:'https://www.tff.org/Default.aspx?grupID=3541&pageID=976',parse:(html:string)=>parseTFF(html,{club:'SEBAT SPOR KULÜBÜ',competition:'Nesine 2. Lig Beyaz Grup',source_url:'https://www.tff.org/Default.aspx?grupID=3541&pageID=976'}),detail:parseTFFDetail}];
async function get(url:string){
 const target=new URL(url);if(!['www.tff.org','sebatspor.org'].includes(target.hostname))throw Error('Kaynak adresi geçersiz');
 let failure=new Error('Kaynak alınamadı');
 for(let i=0;i<2;i++){
  try {const r=await fetch(url,{headers:{'User-Agent':'AkcaabatHaber/2.0 (sports updates)','Accept':'text/html'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`Kaynak HTTP ${r.status}`);const bytes=new Uint8Array(await r.arrayBuffer());return new TextDecoder(target.hostname.endsWith('tff.org')?'windows-1254':'utf-8').decode(bytes);}catch(e){failure=e instanceof Error?e:new Error('Kaynak alınamadı');}
 }
 throw failure;
}
async function sync(source:typeof sources[number]){
 const {data:claimed,error:claimError}=await db.rpc('sports_sync_claim',{p_team:source.team});if(claimError)throw Error(claimError.message);if(!claimed)return {team:source.team,status:'busy'};
 try {
  const previous=await db.from('sports_feeds').select('data').eq('team_id',source.team).single();if(previous.error)throw previous.error;
  const old=previous.data?.data||{};
  const feed=source.parse(await get(source.url));
  const cache=new Map((old.season===feed.season?old.matches||[]:[]).map((m:any)=>[m.id,m]));
  const now=Date.now();
  for(const m of feed.matches){const p:any=cache.get(m.id);if(!p)continue;for(const key of ['venue','details','detail_fetched_at','date','home_logo','away_logo'])m[key]=p[key];}
  const oldCardFormat=(m:any)=>['home','away'].some(side=>m.details?.[side]?.cards?.some((card:any)=>typeof card==='string'));
  const due=feed.matches.filter((m:any)=>{const age=now-new Date(m.detail_fetched_at||0).getTime();const near=m.date&&Math.abs(now-new Date(m.date).getTime())<86400000;return oldCardFormat(m)||!m.detail_fetched_at||age>(near?120000:86400000);}).sort((a:any,b:any)=>Number(oldCardFormat(b))-Number(oldCardFormat(a))||Number(!!a.detail_fetched_at)-Number(!!b.detail_fetched_at)||(new Date(a.detail_fetched_at||0).getTime()-new Date(b.detail_fetched_at||0).getTime())).slice(0,8);
  const errors:string[]=[];
  // Three requests at a time; a slow detail page never discards the validated standings.
  for(let i=0;i<due.length;i+=3){await Promise.all(due.slice(i,i+3).map(async(m:any)=>{try{Object.assign(m,source.detail(await get(m.url),m));}catch{errors.push(m.id);}}));}
  const logos=new Map<string,string>();for(const m of feed.matches){if(m.home_logo)logos.set(m.home,m.home_logo);if(m.away_logo)logos.set(m.away,m.away_logo);}
  for(const row of feed.standings){row.logo=row.logo||logos.get(row.name)||null;}
  const own=(name:string)=>source.team===TS?/trabzonspor/i.test(name):/sebat/i.test(name);
  for(const m of feed.matches){m.home_logo=m.home_logo||logos.get(m.home)||null;m.away_logo=m.away_logo||logos.get(m.away)||null;}
  const ownMatch=feed.matches.find((m:any)=>own(m.home)?m.home_logo:m.away_logo);
  const data={...feed,team_logo:ownMatch?(own(ownMatch.home)?ownMatch.home_logo:ownMatch.away_logo):null,checked_at:new Date().toISOString(),coverage:'Resmî kaynakta yayımlanan lig fikstürü, sonuçlar ve puan tablosu. Maç detayları kaynakta bulunduğunda gösterilir.'};
  const error=errors.length?`${errors.length} maç detayı alınamadı; son kayıt korunuyor.`:null;
  const saved=await db.rpc('sports_sync_save',{p_team:source.team,p_data:data,p_error:error});if(saved.error)throw saved.error;
  return {team:source.team,status:error?'partial':'completed',matches:feed.matches.length,standings:feed.standings.length,details:feed.matches.filter((m:any)=>m.detail_fetched_at).length};
 }catch(e){
  const message=e instanceof Error?e.message:(typeof e==='object'&&e&&'message' in e?String(e.message):'Kaynak doğrulanamadı');
  await db.from('sports_feeds').update({status:'failed',error_summary:message.slice(0,250),lease_until:new Date(0).toISOString()}).eq('team_id',source.team);
  return {team:source.team,status:'failed',error:message.slice(0,250)};
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=req.headers.get('x-sync-secret')||'';
 if(token.length<20)return Response.json({error:'Unauthorized'},{status:401});
 const {data:authorized,error}=await db.rpc('sports_sync_authorized',{p_token:token});
 if(error||!authorized)return Response.json({error:'Unauthorized'},{status:401});
 const results=await Promise.all(sources.map(sync));
 return Response.json({ok:results.every(r=>r.status==='completed'||r.status==='busy'),results});
});
