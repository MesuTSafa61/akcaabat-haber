(function () {
  'use strict';
  const root = document.querySelector('[data-transport]');
  if (!root) return;
  const type = root.dataset.transport;
  const content = document.getElementById('transportContent');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = value => String(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const date = value => value ? new Date(value).toLocaleString('tr-TR', {timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'}) : 'Henüz güncellenmedi';
  const age = value => { const ms = Date.now() - Date.parse(value); return Number.isFinite(ms) && ms >= -60000 ? ms : Infinity; };
  const busSource = 'https://ulasim.trabzon.bel.tr/';
  const flightSource = 'https://www.dhmi.gov.tr/Sayfalar/Havalimani/Trabzon/AnaSayfa.aspx';
  let data;
  let routeId = '';
  let direction = 'arrivals';
  let kind = 'domestic';
  let flightQuery = '';
  let busQuery = '';
  let busScope = 'local';
  let loading = false;

  function source(url, label) {
    return `<p class="local-source">Kaynak: <a href="${url}" target="_blank" rel="noopener">${label}</a> · Saatler Türkiye saatidir.</p>`;
  }
  function notice(message, url, label) {
    return `<div class="transport-notice"><strong>${escape(message)}</strong><a href="${url}" target="_blank" rel="noopener">${label} ↗</a></div>`;
  }
  function busShell() {
    content.innerHTML = `<section class="local-panel transport-panel"><div class="transport-heading"><div><span class="transport-kicker">TRABZON BÜYÜKŞEHİR BELEDİYESİ</span><h2>Hat ve sefer saatleri</h2></div><span class="transport-badge">121 hat</span></div><div class="transport-controls"><div><label for="busSearch">Hat numarası veya güzergâh</label><input type="search" id="busSearch" placeholder="Örn. 203, Akçaabat, Yıldızlı" autocomplete="off"></div><div><label for="busScope">Hatlar</label><select id="busScope"><option value="local">Akçaabat ve çevresi</option><option value="all">Tüm Trabzon hatları</option></select></div></div><div class="bus-layout"><nav class="bus-routes" aria-label="Otobüs hatları" id="busRoutes"></nav><div id="busSchedule" aria-live="polite"></div></div>${source(busSource, 'Trabzon Büyükşehir Belediyesi')}</section>`;
    document.getElementById('busSearch').value = busQuery;
    document.getElementById('busScope').value = busScope;
    document.getElementById('busSearch').addEventListener('input', event => { busQuery = event.target.value; renderRoutes(); });
    document.getElementById('busScope').addEventListener('change', event => { busScope = event.target.value; renderRoutes(); });
    renderRoutes();
  }
  function renderRoutes() {
    const routes = data?.buses?.routes || [];
    document.querySelector('.transport-badge').textContent = `${routes.length} hat`;
    const query = fold(busQuery.trim());
    const filtered = routes.filter(r => (query ? fold(`${r.code} ${r.name}`).includes(query) : busScope === 'all' || /^2/.test(r.code) || fold(r.name).includes('akcaabat')));
    const list = document.getElementById('busRoutes');
    list.innerHTML = filtered.length ? filtered.map(r => `<button type="button" class="bus-route" data-route="${escape(r.id)}" aria-pressed="${r.id === routeId}"><b>${escape(r.code)}</b><span>${escape(r.name)}</span><span aria-hidden="true">›</span></button>`).join('') : '<p class="transport-empty">Aramanıza uygun hat bulunamadı.</p>';
    list.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => { routeId = button.dataset.route; renderRoutes(); }));
    if (!filtered.some(r => r.id === routeId)) routeId = (filtered.find(r => r.code === '203-A') || filtered[0])?.id || '';
    list.querySelectorAll('[data-route]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.route === routeId)));
    renderSchedule(routes.find(r => r.id === routeId));
  }
  function renderSchedule(route) {
    const panel = document.getElementById('busSchedule');
    if (!route) { panel.innerHTML = notice('Hat listesi şu anda gösterilemiyor.', busSource, 'Belediyede görüntüle'); return; }
    const url = `${busSource}Web/HatSaat?hatIdler=${encodeURIComponent(route.id)}&yon=1`;
    const stale = age(route.updatedAt) > 48 * 3600000;
    panel.innerHTML = `<div class="bus-schedule-heading"><span class="route-number">${escape(route.code)}</span><h3>${escape(route.name)}</h3></div><p class="transport-updated">Son güncelleme: ${date(route.updatedAt)}</p>${route.error || stale ? notice('Sefer saatlerinin güncelliği doğrulanamadı. Resmî sayfayı kontrol edin.', url, 'Güncel tarifeyi aç') : ''}${stale || !route.directions?.length ? '' : route.directions.map(d => `<section class="bus-direction"><h4>${escape(d.name)}</h4><div class="transport-table-scroll"><table class="transport-table bus-table"><caption class="sr-only">${escape(route.name)} — ${escape(d.name)}</caption><thead><tr>${d.days.map(day => `<th scope="col">${escape(day)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('')}<p class="local-note">Resmî tatillerde ve özel günlerde sefer düzeni değişebilir.</p><a class="local-button secondary" href="${url}" target="_blank" rel="noopener">Belediyede bu hattı görüntüle ↗</a>`;
  }
  function flightShell() {
    content.innerHTML = `<section class="local-panel transport-panel"><div class="transport-heading"><div><span class="transport-kicker">TRABZON HAVALİMANI • TZX</span><h2>Uçuş panosu</h2></div><button type="button" class="local-button secondary" id="refreshFlights">↻ Yenile</button></div><div class="transport-filter-row"><div class="transport-segments" role="group" aria-label="Uçuş yönü"><button type="button" data-direction="arrivals">↘ Gelen uçaklar</button><button type="button" data-direction="departures">↗ Giden uçaklar</button></div><div class="transport-segments" role="group" aria-label="Hat türü"><button type="button" data-kind="domestic">İç Hat</button><button type="button" data-kind="international">Dış Hat</button></div></div><label class="transport-search-label" for="flightSearch">Uçuş numarası veya şehir ara</label><input class="flight-search" id="flightSearch" type="search" placeholder="Örn. TK, İstanbul, Ankara" autocomplete="off"><div id="flightBoard" aria-live="polite"></div>${source(flightSource, 'DHMİ')}<p class="local-note">Bilgiler belirli aralıklarla yenilenir; son güncelleme saatini kontrol edin.</p></section>`;
    document.getElementById('flightSearch').value = flightQuery;
    document.querySelectorAll('[data-direction]').forEach(b => b.addEventListener('click', () => { direction = b.dataset.direction; renderFlights(); }));
    document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; renderFlights(); }));
    document.getElementById('flightSearch').addEventListener('input', event => { flightQuery = event.target.value; renderFlights(); });
    document.getElementById('refreshFlights').addEventListener('click', load);
    renderFlights();
  }
  function flightDate(item) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(item.date);
    const t = /^(\d{2}):(\d{2})$/.test(item.planned) ? item.planned : '00:00';
    return m ? `${m[3]}-${m[2]}-${m[1]}T${t}:00+03:00` : '';
  }
  function statusClass(status) {
    const value = fold(status);
    return /iptal|cancel/.test(value) ? 'cancelled' : /indi|landed|kalkti|departed/.test(value) ? 'completed' : /gecik|delay/.test(value) ? 'delayed' : 'scheduled';
  }
  function renderFlights() {
    document.querySelectorAll('[data-direction]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.direction === direction)));
    document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
    const board = data?.flights?.boards?.[`${direction}-${kind}`];
    const stale = !board || age(board.updatedAt) > 30 * 60000;
    const container = document.getElementById('flightBoard');
    if (stale) { container.innerHTML = notice('Güncel uçuş listesi şu anda doğrulanamıyor.', flightSource, 'DHMİ uçuş panosunu aç'); return; }
    const query = fold(flightQuery.trim());
    const items = (board.items || []).filter(item => fold(`${item.number} ${item.city} ${item.airline}`).includes(query)).sort((a,b) => flightDate(a).localeCompare(flightDate(b)));
    const title = direction === 'arrivals' ? 'Gelen uçuşlar' : 'Giden uçuşlar';
    container.innerHTML = `<div class="transport-meta"><span>${items.length} uçuş</span><span>Son güncelleme: ${date(board.updatedAt)}</span></div>${board.error || data.flights.error ? notice('Son yenileme başarısız; aşağıda son alınan liste gösteriliyor.', flightSource, 'DHMİ’de kontrol et') : ''}${items.length ? `<div class="transport-table-scroll"><table class="transport-table flight-table"><caption class="sr-only">Trabzon Havalimanı ${title}</caption><thead><tr><th scope="col">Uçuş / Firma</th><th scope="col">${direction === 'arrivals' ? 'Geldiği şehir' : 'Gideceği şehir'}</th><th scope="col">Tarih</th><th scope="col">Planlanan</th><th scope="col">Tahmini</th><th scope="col">Durum</th><th scope="col">${direction === 'arrivals' ? 'Bagaj' : 'Kapı'}</th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${escape(item.number)}</strong><small>${escape(item.airline)}</small></td><td>${escape(item.city)}</td><td>${escape(item.date)}</td><td><strong>${escape(item.planned || '—')}</strong></td><td>${escape(item.estimated || '—')}</td><td><span class="flight-status ${statusClass(item.status)}">${escape(item.status || 'Bilgi bekleniyor')}</span></td><td>${escape(item.gate || '—')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="transport-empty">${query ? 'Aramanıza uygun uçuş bulunamadı.' : 'DHMİ bu seçim için uçuş bildirmedi.'}</p>`}`;
  }
  async function load() {
    if (loading) return;
    loading = true;
    const button = document.getElementById('refreshFlights');
    if (button) { button.disabled = true; button.textContent = 'Yenileniyor…'; }
    try {
      const response = await fetch(`data/ulasim.json?t=${Date.now()}`, {cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('Data unavailable');
      const incoming = await response.json();
      if (!incoming || typeof incoming !== 'object') throw new Error('Invalid data');
      data = incoming;
      if (type === 'bus') busShell(); else if (document.getElementById('flightBoard')) renderFlights(); else flightShell();
    } catch (_) {
      if (data && type === 'flights') {
        renderFlights();
        document.getElementById('flightBoard').insertAdjacentHTML('afterbegin', notice('Son yenilemede bağlantı kurulamadı.', flightSource, 'DHMİ’de kontrol et'));
      } else {
        content.innerHTML = `<section class="local-panel">${notice('Ulaşım bilgileri şu anda yüklenemiyor.', type === 'bus' ? busSource : flightSource, 'Resmî kaynağı aç')}<button class="local-button secondary" type="button" id="retryTransport">Tekrar dene</button></section>`;
        document.getElementById('retryTransport').addEventListener('click', load);
      }
    } finally {
      loading = false;
      const refresh = document.getElementById('refreshFlights');
      if (refresh) { refresh.disabled = false; refresh.textContent = '↻ Yenile'; }
    }
  }
  load();
  if (type === 'flights') setInterval(() => { if (!document.hidden) load(); }, 60000);
}());
