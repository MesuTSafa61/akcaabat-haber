(function () {
  "use strict";
  const akcaabat = [
    ["Akçaabat Genel", 5], ["Atatürk Parkı", 3], ["Ak Cami", 11],
    ["Millet Bahçesi", 8], ["Millet Bahçesi-2", 9], ["Akçaabat Limanı", 10],
    ["Orta Cadde", 16], ["Sahil Park", 13], ["Sahil Park-2", 14], ["Sahil Parkı-3", 19]
  ].map(([name, id]) => ({name, city: "Akçaabat", url: `https://www.akcaabat.bel.tr/sehir-kameralari-detay.aspx?id=${id}`}));
  const trabzon = [
    ["Akyazı Paparapark", 3041], ["Ayasofya Kavşak", 3050], ["Pazarkapı", 3051],
    ["Boztepe Manzara", 3042], ["Atatürk Köşkü", 3046], ["Değirmendere", 3047],
    ["Uzungöl", 3049], ["Oyuncakistan", 3052], ["Of Manzara", 3056],
    ["Sümela Manastırı", 3080], ["Meydan Park", 3048], ["Meydan", 3055],
    ["Sürmene Manzara", 3060], ["Şalpazarı Merkez", 3065], ["Arsin Manzara", 3070],
    ["Çarşıbaşı Manzara", 3063], ["Akçaabat Manzara", 3071], ["Hayrat Manzara", 3072],
    ["Dernekpazarı Manzara", 3075], ["Maçka Manzara", 3076], ["Çaykara Merkez", 3059],
    ["Araklı Merkez", 3074], ["Köprübaşı Manzara", 3077], ["Sisdağı Yaylası", 3069],
    ["Beşikdüzü Teleferik", 3081], ["Düzköy Manzara", 3078], ["Yomra Manzara", 3073],
    ["Hıdırnebi Yaylası", 3079], ["Ganita Şehir Kamerası", 3045], ["Kanunievi", 3053]
  ].map(([name, id]) => ({name, city: "Trabzon", id, url: "https://www.trabzon.bel.tr/Web/SehirKameralari"}));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const grid = document.getElementById("cameraSections");
  const search = document.getElementById("cameraSearch");
  const dialog = document.getElementById("cameraDialog");
  const player = document.getElementById("cameraPlayer");
  const official = document.getElementById("cameraOfficial");
  let hls = null;
  let playTicket = 0;
  const curatedNames = new Set([...akcaabat, ...trabzon].map(item => item.name.toLocaleLowerCase("tr-TR")));
  const extra = [];
  let filter = "all";
  const favoriteKey = "akcaabat-haber-camera-favorites";
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem(favoriteKey) || "[]"); } catch (_) { /* Private mode. */ }
  if (!Array.isArray(favorites)) favorites = [];
  const cameraKey = camera => camera.city + ":" + camera.name;
  function card(camera) {
    const image = camera.id ? `<img src="https://www.trabzon.bel.tr/img/kameralar/${camera.id}.webp" alt="${escapeHtml(camera.name)} kamera önizlemesi" loading="lazy" onerror="this.remove()">` : "";
    const active = favorites.includes(cameraKey(camera));
    const open = camera.id ? `<button type="button" class="camera-play" data-play="${camera.id}">▶ Canlı izle</button>` : `<a href="${escapeHtml(camera.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(camera.name)} kamerasını belediye sitesinde aç">Canlı yayını aç ↗</a>`;
    return `<article class="camera-card"><div class="camera-image">📹${image}<span>${escapeHtml(camera.city)} Belediyesi</span></div><div class="camera-body"><small>RESMÎ ŞEHİR KAMERASI</small><h3>${escapeHtml(camera.name)}</h3><div class="camera-actions">${open}<button type="button" class="camera-favorite" data-favorite="${escapeHtml(cameraKey(camera))}" aria-pressed="${active}" aria-label="${escapeHtml(camera.name)} kamerasını favorilere ${active ? "kaldır" : "ekle"}">${active ? "★" : "☆"}</button></div></div></article>`;
  }
  function stopPlayer() {
    playTicket++;
    if (hls) { hls.destroy(); hls = null; }
    const video = player.querySelector("video");
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    player.replaceChildren();
  }
  async function playCamera(id) {
    const camera = trabzon.find(item => item.id === id);
    if (!camera) return;
    stopPlayer();
    const ticket = playTicket;
    document.getElementById("cameraDialogTitle").textContent = camera.name + " · Canlı yayın";
    official.href = camera.url;
    player.textContent = "Yayın yükleniyor…";
    dialog.showModal();
    try {
      const response = await fetch("https://europe-west1-trabzon-sehir-kameralari.cloudfunctions.net/getStream", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: { streamId: String(id) } }), signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error("Yayın bağlantısı alınamadı.");
      const data = await response.json();
      const url = new URL(data?.result?.url);
      if (url.protocol !== "https:" || url.hostname !== "canli.trabzon.bel.tr") throw new Error("Yayın adresi doğrulanamadı.");
      if (ticket !== playTicket || !dialog.open) return;
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.addEventListener("error", () => {
        if (ticket === playTicket) player.innerHTML = "<p>Yayın oynatılamıyor. Belediye bağlantısını deneyin.</p>";
      });
      player.replaceChildren(video);
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url.href;
      } else if (window.Hls?.isSupported()) {
        hls = new window.Hls({ maxBufferLength: 20 });
        hls.on(window.Hls.Events.ERROR, (_, event) => {
          if (event.fatal && ticket === playTicket) {
            hls.destroy(); hls = null;
            player.innerHTML = "<p>Yayın oynatılamıyor. Belediye bağlantısını deneyin.</p>";
          }
        });
        hls.loadSource(url.href);
        hls.attachMedia(video);
      } else throw new Error("Tarayıcı bu yayın biçimini desteklemiyor.");
      video.play().catch(() => { /* Kullanıcı oynat düğmesine dokunabilir. */ });
    } catch (error) {
      if (ticket === playTicket) player.textContent = error.message || "Yayın açılamadı. Belediye bağlantısını deneyin.";
    }
  }
  document.getElementById("cameraClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", stopPlayer);
  function render() {
    const term = search.value.trim().toLocaleLowerCase("tr-TR");
    const groups = [{name: "Akçaabat Belediyesi", city: "Akçaabat", rows: [...akcaabat, ...extra.filter(item => item.city === "Akçaabat")]}, {name: "Trabzon Büyükşehir Belediyesi", city: "Trabzon", rows: [...trabzon, ...extra.filter(item => item.city === "Trabzon")]}];
    const shown = groups.filter(group => filter === "all" || filter === "favorites" || group.city === filter).map(group => {
      const rows = group.rows.filter(item => (filter !== "favorites" || favorites.includes(cameraKey(item))) && (item.name + " " + item.city).toLocaleLowerCase("tr-TR").includes(term));
      return rows.length ? `<section aria-label="${group.name}"><h2 class="camera-heading">${group.name} · ${rows.length} kamera</h2><div class="camera-grid">${rows.map(card).join("")}</div></section>` : "";
    }).join("");
    grid.innerHTML = shown || '<p class="camera-empty">Bu aramayla eşleşen kamera bulunamadı.</p>';
  }
  document.querySelectorAll("[data-city]").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.city;
    document.querySelectorAll("[data-city]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  search.addEventListener("input", render);
  grid.addEventListener("click", event => {
    const play = event.target.closest("[data-play]");
    if (play) { playCamera(Number(play.dataset.play)); return; }
    const button = event.target.closest("[data-favorite]");
    if (!button) return;
    const key = button.dataset.favorite;
    favorites = favorites.includes(key) ? favorites.filter(item => item !== key) : [...favorites, key];
    try { localStorage.setItem(favoriteKey, JSON.stringify(favorites)); } catch (_) { /* Private mode. */ }
    render();
  });
  render();
  if (window.supabase && window.AKCAABAT_SUPABASE) {
    const client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
    client.from("live_cameras").select("name,city,source_url").eq("is_active", true).then(({data, error}) => {
      if (error) return;
      for (const item of data || []) {
        if (!item.name || !["Akçaabat", "Trabzon"].includes(item.city) || curatedNames.has(item.name.toLocaleLowerCase("tr-TR"))) continue;
        try {
          const url = new URL(item.source_url);
          if (url.protocol !== "https:") continue;
          extra.push({name: item.name, city: item.city, url: url.href});
        } catch (_) { /* Ignore invalid administrator links. */ }
      }
      render();
    });
  }
})();
