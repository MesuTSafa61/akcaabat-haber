import { parseHTML } from 'npm:linkedom@0.18.12';
export const TS='f9ccbebd-8724-4bb5-ab17-9b4e4cea49f7';
export const SS='04bfa175-c483-4b3c-8f79-6a59e2af1392';
const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
const url=(s,base)=>s?new URL(s.replace(/\\/g,'/'),base).href:null;
const num=s=>/^-?\d+$/.test(String(s).trim())?Number(s):null;
export function dateTR(s){const m=s.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s*[·-]?\s*(\d{1,2}):(\d{2}))?/);if(!m)return null;return m[4]?`${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2,'0')}:${m[5]}:00+03:00`:null;}
function checkStandings(rows){if(rows.length<10||rows.length>24||new Set(rows.map(r=>r.name)).size!==rows.length)throw Error('Puan tablosu eksik veya tekrarlı');for(const r of rows){if([r.position,r.played,r.won,r.drawn,r.lost,r.gf,r.ga,r.gd,r.points].some(n=>!Number.isInteger(n))||r.played!==r.won+r.drawn+r.lost||r.gd!==r.gf-r.ga)throw Error('Puan tablosu doğrulaması başarısız');}return rows;}
export function parseTFF(html,config={club:'TRABZONSPOR',competition:'Trendyol Süper Lig',source_url:'https://www.tff.org/default.aspx?pageID=198'}){
 const d=parseHTML(html).document, base='https://www.tff.org/';
 const season=[...d.querySelectorAll('.moduleTitle')].map(text).join(' ').match(/(20\d{2}-20\d{2}) Sezonu/ )?.[1];
 if(!season)throw Error('TFF sezon bilgisi bulunamadı');
 const rows=[...d.querySelectorAll('a[id$="lnkTakim"]')].map(a=>{const c=[...a.closest('tr').children].map(text),name=text(a).replace(/^\d+\./,'');const n=c.slice(1).map(num);return {name,position:Number(text(a).match(/^\d+/)?.[0]),played:n[0],won:n[1],drawn:n[2],lost:n[3],gf:n[4],ga:n[5],gd:n[6],points:n[7],logo:null};});
 if(!rows.some(r=>r.name.includes(config.club)))throw Error('TFF puan tablosunda takip edilen takım yok');
 const matches=[];
 for(const r of d.querySelectorAll('.fiksturListesiTable tr')){
  const c=[...r.children];if(c.length!==3||!(text(c[0]).includes(config.club)||text(c[2]).includes(config.club)))continue;
  const home=text(c[0]),away=text(c[2]),a=c[1].querySelector('a'),href=a?.getAttribute('href');
  const id=href?.match(/macId=(\d+)/i)?.[1];if(!id)continue;
  const scores=text(c[1]).match(/^(\d+)\s*-\s*(\d+)$/),block=r.closest('table.softBG');
  matches.push({id:'tff:'+id,home,away,home_logo:null,away_logo:null,home_score:scores?+scores[1]:null,away_score:scores?+scores[2]:null,status:scores?'finished':'scheduled',date:null,round:Number(text(block?.querySelector('.belirginYazi')).match(/\d+/)?.[0])||null,url:url(href,base),venue:null,details:{},detail_fetched_at:null});
 }
 const unique=[...new Map(matches.map(m=>[m.id,m])).values()];
 if(unique.length<20)throw Error('TFF sezon fikstürü eksik');
 return {season,competition:config.competition,source:'TFF',source_url:config.source_url,matches:unique,standings:checkStandings(rows)};
}
export function parseTFFDetail(html,expected){
 const d=parseHTML(html).document,base='https://www.tff.org/',get=s=>text(d.querySelector(s));
 const home=get('[id$="lnkTakim1"]'),away=get('[id$="lnkTakim2"]');
 if(!home||!away||home!==expected.home||away!==expected.away)throw Error('TFF maç kimliği eşleşmedi');
 const details={referees:[...d.querySelectorAll('[id$="lnkHakem"]')].map(text),home:{},away:{}};
 for(const [i,side] of [[1,'home'],[2,'away']]){
  const prefix=`[id*="grdTakim${i}_"]`;
  const collect=(group,suffix)=>[...d.querySelectorAll(`${prefix}[id*="${group}"][id$="${suffix}"]`)].map(n=>text(n.parentElement));
  const cards=[...d.querySelectorAll(`${prefix}[id*="rptKartlar"][id$="lblKart"]`)].map(n=>{
   const row=n.parentElement,icon=row?.querySelector('img');
   const marker=`${icon?.getAttribute('alt')||''} ${icon?.getAttribute('src')||''}`;
   const type=/k[ıi]rm[ıi]z[ıi]|kirmizi|red/i.test(marker)?'red':/ikinci\s+sar[ıi]|second\s+yellow/i.test(marker)?'second_yellow':/sar[ıi]|yellow/i.test(marker)?'yellow':null;
   return {text:text(row),type};
  });
  details[side]={lineup:collect('rptKadrolar','lnkOyuncu'),bench:collect('rptYedekler','lnkOyuncu'),goals:collect('rptGoller','lblGol'),cards,substitutions_in:collect('rptGirenler','lblGiren'),substitutions_out:collect('rptCikanlar','lblCikan')};
 }
 return {date:dateTR(get('[id$="dtMacBilgisi_lblTarih"]')),venue:get('[id$="lnkStad"]')||null,home_logo:url(d.querySelector('[id$="imgTakim1Logo"] img')?.getAttribute('src'),base),away_logo:url(d.querySelector('[id$="imgTakim2Logo"] img')?.getAttribute('src'),base),details,detail_fetched_at:new Date().toISOString()};
}
export function parseSebat(html){
 const d=parseHTML(html).document,base='https://sebatspor.org/';
 const season=d.querySelector('#mc-sezon option[selected]')?.getAttribute('value');if(!/^20\d{2}-20\d{2}$/.test(season||''))throw Error('Sebatspor sezon bilgisi bulunamadı');
 const matches=[];
 for(const a of d.querySelectorAll('a.match-list-item')){
  const teams=[...a.querySelectorAll('.match-list-item__team')];if(teams.length!==2)continue;
  const home=text(teams[0].querySelector('.match-list-item__name')),away=text(teams[1].querySelector('.match-list-item__name'));
  if(!/sebat/i.test(home+' '+away))continue;
  const statusText=text(a.querySelector('.badge')),href=a.getAttribute('href'),id=href?.match(/maclar\/(\d+)/)?.[1];if(!id)throw Error('Sebatspor maç kimliği bulunamadı');
  const meta=text(a.querySelector('.match-list-item__meta'));
  const status=/bitti/i.test(statusText)?'finished':/canlı|devam|ilk yarı|ikinci yarı|devre/i.test(statusText)?'live':/ertelen/i.test(statusText)?'postponed':/iptal/i.test(statusText)?'cancelled':'scheduled';
  matches.push({id:'sebat:'+id,home,away,home_logo:url(teams[0].querySelector('img')?.getAttribute('src'),base),away_logo:url(teams[1].querySelector('img')?.getAttribute('src'),base),home_score:num(text(teams[0].querySelector('strong'))),away_score:num(text(teams[1].querySelector('strong'))),status,date:dateTR(meta),date_label:meta.match(/\d{2}\.\d{2}\.\d{4}/)?.[0]||null,round:Number(meta.match(/(\d+)\. Hafta/)?.[1])||null,url:url(href,base),venue:null,details:{},detail_fetched_at:null});
 }
 const standings=[...d.querySelectorAll('table.standings-table tbody tr')].map(r=>{const cells=[...r.querySelectorAll('td')],c=cells.map(text);return{position:num(c[0]),name:c[1],played:num(c[2]),won:num(c[3]),drawn:num(c[4]),lost:num(c[5]),gf:num(c[6]),ga:num(c[7]),gd:num(c[8]),points:num(c[9]),logo:url(cells[1]?.querySelector('img')?.getAttribute('src'),base)};});
 const unique=[...new Map(matches.map(m=>[m.id,m])).values()];if(unique.length<10)throw Error('Sebatspor fikstürü eksik');
 return {season,competition:'TFF 2. Lig Beyaz Grup',source:'Sebatspor',source_url:base+'mac-merkezi',matches:unique,standings:checkStandings(standings)};
}
export function parseSebatDetail(html){
 const d=parseHTML(html).document;
 const events=[...d.querySelectorAll('#match-events li')].map(text).filter(s=>!/^Henüz/.test(s));
 const info={};for(const n of d.querySelectorAll('dt'))info[text(n)]=text(n.nextElementSibling);
 return {venue:info.Stat||info.Stadyum||null,details:{events,note:info.Not||null,referees:info.Hakem?[info.Hakem]:[]},detail_fetched_at:new Date().toISOString()};
}
