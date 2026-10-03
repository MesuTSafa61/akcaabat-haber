import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';
import opentype from 'npm:opentype.js@1.3.4';
import decodeWebp, { init as initWebp } from 'npm:@jsquash/webp@1.5.0/decode.js';
import { Buffer } from 'node:buffer';
import { PNG } from 'npm:pngjs@7.0.0';
import { fontBase64 } from './cover-font.ts';
import { coverLogo } from './cover-logo.ts';

const fontBytes=Uint8Array.from(atob(fontBase64), c=>c.charCodeAt(0));
const font=opentype.parse(fontBytes.buffer);
let initialized:Promise<void>|undefined;
let webpInitialized:Promise<void>|undefined;
const xml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
async function resource(url:string) {
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!r.ok) throw new Error('Kapak işleme bileşeni yüklenemedi.');
  return r.arrayBuffer();
}
function initRenderer() {
  if(!initialized) initialized=resource('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm').then(x=>initWasm(x)).catch(e=>{initialized=undefined;throw e;});
  return initialized;
}
function base64(bytes:Uint8Array) {
  let text='';
  for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text);
}
export function headlineLayout(title:string,width=1104,maxSize=86,maxLines=3) {
  for(let size=maxSize;size>=34;size-=2) {
    const lines:string[]=[];let line='';
    for(const word of title.trim().split(/\s+/)) {
      const candidate=line?line+' '+word:word;
      if(font.getAdvanceWidth(candidate,size)>width && line){lines.push(line);line=word;}else line=candidate;
    }
    if(line)lines.push(line);
    if(lines.length<=maxLines && lines.every(x=>font.getAdvanceWidth(x,size)<=width))return {size,lines};
  }
  throw new Error('Kapak vurgusu sığmadı; daha kısa yazın.');
}
export function choosePlacement(raw:any) {
  const {data,width,height}=raw;
  const region=(x0:number,x1:number,y0:number,y1:number)=>{
    let total=0,total2=0,edges=0,skin=0,count=0;
    for(let y=Math.floor(height*y0);y<height*y1;y++)for(let x=Math.floor(width*x0);x<width*x1;x++){
      const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2],v=(r+g+b)/765;
      total+=v;total2+=v*v;count++;
      if(x>0)edges+=Math.abs(v-(data[i-4]+data[i-3]+data[i-2])/765);
      if(r>95 && g>40 && b>20 && r>g*1.15 && r>b*1.3 && Math.max(r,g,b)-Math.min(r,g,b)>15)skin++;
    }
    return Math.sqrt(Math.max(0,total2/count-(total/count)**2))+edges/count+skin/count*.9;
  };
  const scores=[{place:'left',score:region(0,.4,.24,.8)},{place:'right',score:region(.6,1,.24,.8)},{place:'bottom',score:region(0,1,.67,.95)+.07}];
  scores.sort((a,b)=>a.score-b.score);
  return scores[0].place;
}
export async function renderCover(bytes:Uint8Array,type:string,title:string,sourcePhoto=false,options:any={}) {
  await initRenderer();
  let image=bytes;
  if(type==='image/webp') {
    if(!webpInitialized)webpInitialized=resource('https://unpkg.com/@jsquash/webp@1.5.0/codec/dec/webp_dec.wasm').then(x=>WebAssembly.compile(x)).then(x=>initWebp(x,{noInitialRun:true})).catch(e=>{webpInitialized=undefined;throw e;});
    await webpInitialized;
    const raw=await decodeWebp(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    if(raw.width>4096 || raw.height>4096)throw new Error('Kaynak görsel boyutu çok büyük.');
    image=PNG.sync.write({width:raw.width,height:raw.height,data:raw.data});
    type='image/png';
  }
  let logo=coverLogo,logoWidth=211;
  if(options.logo){const raw=PNG.sync.read(Buffer.from(options.logo.bytes));if(raw.width>2048 || raw.height>2048)throw new Error('Logo boyutu çok büyük.');logo='data:image/png;base64,'+base64(options.logo.bytes);logoWidth=Math.min(252,Math.max(24,44*raw.width/raw.height));}
  const dataUrl='data:'+type+';base64,'+base64(image);
  let placement=options.placement||'auto';
  if(placement==='auto'){
    const probe=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><image href="'+dataUrl+'" width="64" height="36" preserveAspectRatio="xMidYMid slice"/></svg>');
    const rendered=probe.render();
    try{placement=choosePlacement(PNG.sync.read(Buffer.from(rendered.asPng())));}finally{rendered.free();probe.free();}
  }
  const bottom=placement==='bottom',right=placement==='right';
  const {size,lines}=headlineLayout(title.toLocaleUpperCase('tr-TR'),bottom?1104:510,bottom?86:80,bottom?3:4),spacing=size*1.08;
  const start=bottom?605-(lines.length-1)*spacing:(675-lines.length*spacing)/2+size;
  const x=right?642:48;
  const stops=bottom?
    '<stop offset="0" stop-color="#061524" stop-opacity="0"/><stop offset=".4" stop-color="#061524" stop-opacity="0"/><stop offset=".72" stop-color="#061524" stop-opacity=".87"/><stop offset="1" stop-color="#061524" stop-opacity=".97"/>':
    '<stop offset="0" stop-color="#061524" stop-opacity=".97"/><stop offset=".4" stop-color="#061524" stop-opacity=".87"/><stop offset=".75" stop-color="#061524" stop-opacity="0"/><stop offset="1" stop-color="#061524" stop-opacity="0"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs><linearGradient id="shade" x1="${right?1:0}" y1="0" x2="${bottom?0:right?0:1}" y2="${bottom?1:0}">${stops}</linearGradient></defs>
  <rect width="1200" height="675" fill="#0c2742"/>
  <image href="${dataUrl}" width="1200" height="675" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="675" fill="url(#shade)"/>
  <rect x="48" y="30" width="${logoWidth+10}" height="48" rx="7" fill="white"/>
  <image x="53" y="32" width="${logoWidth}" height="44" href="${logo}" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${x}" y="${start-size-23}" width="76" height="7" rx="3" fill="#e11d3a"/>
  ${lines.map((line,i)=>`<text x="${x}" y="${start+i*spacing}" fill="${i===lines.length-1?'#ffdc66':'white'}" stroke="#071b30" stroke-width="1" paint-order="stroke" font-family="AH Cover" font-size="${size}" font-weight="700">${xml(line)}</text>`).join('')}
  ${sourcePhoto?'':'<rect x="948" y="24" width="216" height="30" rx="5" fill="#071b30" fill-opacity=".8"/><text x="966" y="45" fill="white" font-family="AH Cover" font-size="15">TEMSİLİ AI GÖRSELİ</text>'}
  <rect x="0" y="667" width="1200" height="8" fill="#d7132d"/>
  </svg>`;
  const renderer=new Resvg(svg,{font:{fontBuffers:[fontBytes],defaultFontFamily:'AH Cover'},fitTo:{mode:'original'}});
  const rendered=renderer.render();
  try{return rendered.asPng();}finally{rendered.free();renderer.free();}
}
