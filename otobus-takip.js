(function () {
  'use strict';
  const config = window.AKCAABAT_SUPABASE;
  const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let route, stops = [], vehicles = [], direction = 1, selected = '', query = '', epoch = 0;
  let available = false, updated = '', busy = false, stopsError = false;
  const stopCache = new Map();
  let arrivalEpoch = 0;
  let searchTimer;
  async function call(kind, stop, signal) {
    const url = `${config.url}/functions/v1/bus-live?kind=${kind}&route=${encodeURIComponent(route.id)}${stop ? '&stop='+encodeURIComponent(stop) : ''}`;
    const response = await fetch(url,{headers:{apikey:config.key},signal:signal || AbortSignal.timeout(18000),cache:'no-store'});
    if (!response.ok) throw new Error('Source unavailable');
    return response.json();
  }
  function fresh(v) {
    const ms = Date.parse(v.timestamp);
    return Number.isFinite(ms) && Date.now()-ms < 120000 && ms < Date.now()+60000;
  }
  function render() {
    const root = document.getElementById('busLiveContent');
    if (!root || !route) return;
    const directions = [...new Set(stops.map(s=>s.direction))];
    if (!directions.includes(direction)) direction = directions[0] || 1;
    const all = stops.filter(s=>s.direction===direction);
    if (!all.some(s=>s.code===selected)) selected = all[0]?.code || '';
    const filtered = all.filter(s=>s.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
    const current = vehicles.filter(fresh);
    root.innerHTML = `<div class="bus-live-status ${available ? 'ready' : 'unavailable'}"><span aria-hidden="true">●</span><div><strong>${available ? (current.length ? `${current.length} araç konumu alındı` : 'Güncel araç konumu bildirilmedi') : 'Anlık araç konumu şu anda alınamıyor'}</strong><small>${updated ? 'Son kontrol: '+new Date(updated).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'Belediye verileri kontrol ediliyor…'}</small></div><button type="button" id="busLiveRefresh">↻</button></div><div class="transport-segments bus-direction-switch" role="group" aria-label="Durak yönü">${directions.map(d=>`<button type="button" data-stop-direction="${d}" aria-pressed="${d===direction}">${escape(stops.find(s=>s.direction===d)?.directionName || 'Kalkış '+d)}</button>`).join('')}</div><label class="transport-search-label" for="stopSearch">Durak adı ara</label><input class="flight-search" type="search" id="stopSearch" placeholder="Örn. Söğütlü, Trabzon Üniversitesi" value="${escape(query)}"><div class="stop-layout"><div><div class="stop-list-title"><strong>DURAK SEÇ</strong><span>${all.length} durak</span></div><ol class="stop-timeline">${filtered.map(s=>{
      const buses = current.filter(v=>v.passedStop===s.id);
      return `<li class="${s.code===selected?'selected':''}"><button type="button" data-stop="${escape(s.code)}" aria-pressed="${s.code===selected}"><span class="stop-dot" aria-hidden="true"></span><span><strong>${escape(s.name)}</strong><small>Durak kodu: ${escape(s.code)}</small>${buses.map(b=>`<span class="stop-bus">🚌 ${escape(b.plate)} · Son geçilen durak</span>`).join('')}</span><span class="stop-order">${s.order}</span></button></li>`;
    }).join('') || `<li class="transport-empty">${stopsError ? 'Durak listesi şu anda alınamıyor.' : 'Bu seçim için durak bulunamadı.'}</li>`}</ol></div><aside class="stop-arrivals" id="stopArrivals" aria-live="polite"></aside></div><p class="local-note">Durak listesi güzergâhı gösterir. Araç konumu yalnızca belediyeden güncel kayıt geldiğinde işaretlenir.</p>`;
    root.querySelectorAll('[data-stop-direction]').forEach(b=>b.addEventListener('click',()=>{direction=Number(b.dataset.stopDirection);render();loadArrivals();}));
    root.querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.stop;render();loadArrivals();}));
    document.getElementById('stopSearch').addEventListener('input',e=>{query=e.target.value;const pos=e.target.selectionStart;render();const input=document.getElementById('stopSearch');input.focus();if(pos!==null)input.setSelectionRange(pos,pos);clearTimeout(searchTimer);searchTimer=setTimeout(loadArrivals,400);});
    document.getElementById('busLiveRefresh').addEventListener('click',()=>refresh(true));
    const stop=all.find(s=>s.code===selected);
    document.getElementById('stopArrivals').innerHTML=stop ? `<span class="transport-kicker">SEÇİLİ DURAK</span><h4>${escape(stop.name)}</h4><div id="arrivalItems">Yaklaşan araçlar kontrol ediliyor…</div>` : '<p>Güzergâhtan bir durak seçin.</p>';
  }
  async function loadArrivals() {
    const token=++arrivalEpoch, id=selected, routeKey=route?.id;
    if (!id || !routeKey) return;
    try {
      const result=await call('arrivals',id);
      if (token!==arrivalEpoch || selected!==id || route?.id!==routeKey) return;
      const node=document.getElementById('arrivalItems');if(!node)return;
      node.innerHTML=result.available ? (result.items?.length ? result.items.map(v=>`<article class="arrival-card"><strong>🚌 ${escape(route.code)}</strong><p>${escape(v.GuzergahAd || v.HatAd || '')}</p><span>Kalan durak: ${escape(v.KalanDurakAdet ?? '—')}</span><span>${Number.isFinite(Number(v.VarisSuresiSn)) ? Math.floor(Number(v.VarisSuresiSn)/60)+' dk' : 'Süre bilgisi bekleniyor'}</span></article>`).join('') : '<p>Bu durağa yaklaşan araç bildirilmedi.</p>') : '<p>Yaklaşan araç bilgisi şu anda alınamıyor.</p>';
    }catch(_){if(token===arrivalEpoch){const node=document.getElementById('arrivalItems');if(node)node.innerHTML='<p>Yaklaşan araç servisine şu anda ulaşılamıyor.</p>';}}
  }
  async function refresh(force=false) {
    if (!route || busy && !force || document.hidden) return;
    busy=true;const token=epoch, routeKey=route.id;
    try {
      const [stopResult,vehicleResult]=await Promise.allSettled([stopCache.has(routeKey)?Promise.resolve(stopCache.get(routeKey)):call('stops'),call('vehicles')]);
      if(token!==epoch || route?.id!==routeKey)return;
      if(stopResult.status==='fulfilled'){stops=stopResult.value.stops || [];stopCache.set(routeKey,stopResult.value);stopsError=false;}else{stopsError=true;}
      available=vehicleResult.status==='fulfilled' && vehicleResult.value.available===true;
      vehicles=available?vehicleResult.value.vehicles || []:[];
      updated=vehicleResult.status==='fulfilled'?vehicleResult.value.checkedAt:new Date().toISOString();
      render();loadArrivals();
    }finally{if(token===epoch)busy=false;}
  }
  window.addEventListener('transport-route',event=>{
    if(!config)return;
    const changed=route?.id!==event.detail.id;
    route=event.detail;
    if(changed){epoch++;arrivalEpoch++;busy=false;stops=[];vehicles=[];selected='';query='';direction=1;available=false;updated='';}
    render();refresh(true);
  });
  setInterval(()=>{if(!document.hidden && document.getElementById('busLiveContent')?.offsetParent!==null)refresh();},15000);
}());
