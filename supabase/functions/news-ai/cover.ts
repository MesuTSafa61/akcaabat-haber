import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';
import opentype from 'npm:opentype.js@1.3.4';
import decodeWebp, { init as initWebp } from 'npm:@jsquash/webp@1.5.0/decode.js';
import { PNG } from 'npm:pngjs@7.0.0';
import { fontBase64 } from './cover-font.ts';

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
export function headlineLayout(title:string) {
  for(let size=58;size>=32;size-=2) {
    const lines:string[]=[];let line='';
    for(const word of title.trim().split(/\s+/)) {
      const candidate=line?line+' '+word:word;
      if(font.getAdvanceWidth(candidate,size)>600 && line){lines.push(line);line=word;}else line=candidate;
    }
    if(line)lines.push(line);
    if(lines.length<=6 && lines.every(x=>font.getAdvanceWidth(x,size)<=600))return {size,lines};
  }
  throw new Error('Başlık kapağa sığmadı; daha kısa başlık kullanın.');
}
export async function renderCover(bytes:Uint8Array,type:string,title:string,sourcePhoto=false) {
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
  const {size,lines}=headlineLayout(title),spacing=size*1.17;
  const start=(675-lines.length*spacing)/2+size;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071b30" stop-opacity=".22"/><stop offset=".32" stop-color="#071b30" stop-opacity=".12"/><stop offset=".60" stop-color="#071b30" stop-opacity=".65"/><stop offset="1" stop-color="#061524" stop-opacity=".98"/></linearGradient></defs>
  <rect width="1200" height="675" fill="#0c2742"/>
  <image x="620" href="data:${type};base64,${base64(image)}" width="580" height="675" preserveAspectRatio="xMaxYMid slice"/>
  <rect width="1200" height="675" fill="url(#shade)"/><rect width="650" height="675" fill="#081e34"/><rect x="644" width="8" height="675" fill="#d7132d"/>
  <rect x="48" y="36" width="318" height="54" rx="8" fill="#d7132d"/>
  <text x="68" y="73" fill="white" font-family="AH Cover" font-size="26" font-weight="700">AKÇAABAT HABER</text>
  <rect x="48" y="${start-size-27}" width="76" height="7" rx="3" fill="#e11d3a"/>
  ${lines.map((line,i)=>`<text x="48" y="${start+i*spacing}" fill="white" font-family="AH Cover" font-size="${size}" font-weight="700">${xml(line)}</text>`).join('')}
  <text x="48" y="649" fill="#becddd" font-family="AH Cover" font-size="16">${sourcePhoto?'Kaynak fotoğrafıyla hazırlanan haber kapağı':'Yapay zekâ ile üretilmiş temsili görsel'}</text>
  <rect x="0" y="667" width="1200" height="8" fill="#d7132d"/>
  </svg>`;
  const renderer=new Resvg(svg,{font:{fontBuffers:[fontBytes],defaultFontFamily:'AH Cover'},fitTo:{mode:'original'}});
  const rendered=renderer.render();
  try{return rendered.asPng();}finally{rendered.free();renderer.free();}
}
