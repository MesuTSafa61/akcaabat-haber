(function () {
  "use strict";
  const akcaabat = [
    ["Akçaabat Genel", 5], ["Atatürk Parkı", 3], ["Ak Cami", 11],
    ["Millet Bahçesi", 8], ["Millet Bahçesi-2", 9], ["Akçaabat Limanı", 10],
    ["Orta Cadde", 16], ["Sahil Park", 13], ["Sahil Park-2", 14], ["Sahil Parkı-3", 19]
  ].map(([name, id]) => ({name, city: "Akçaabat", id, provider: "akcaabat", url: `https://www.akcaabat.bel.tr/sehir-kameralari-detay.aspx?id=${id}`}));
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
  ].map(([name, id]) => ({name, city: "Trabzon", id, provider: "trabzon", url: "https://www.trabzon.bel.tr/Web/SehirKameralari"}));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const grid = document.getElementById("cameraSections");
  const search = document.getElementById("cameraSearch");
  const dialog = document.getElementById("cameraDialog");
  const player = document.getElementById("cameraPlayer");
  const official = document.getElementById("cameraOfficial");
  const curatedNames = new Set([...akcaabat, ...trabzon].map(item => item.name.toLocaleLowerCase("tr-TR")));
  const extra = [];
  let filter = "all";
  const favoriteKey = "akcaabat-haber-camera-favorites";
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem(favoriteKey) || "[]"); } catch (_) { /* Private mode. */ }
  if (!Array.isArray(favorites)) favorites = [];
  const cameraKey = camera => camera.city + ":" + camera.name;
  function card(camera) {
    const image = camera.provider === "trabzon" ? `<img src="https://www.trabzon.bel.tr/img/kameralar/${camera.id}.webp" alt="${escapeHtml(camera.name)} kamera önizlemesi" loading="lazy" onerror="this.remove()">` : "";
    const active = favorites.includes(cameraKey(camera));
    const open = camera.id ? `<button type="button" class="camera-play" data-play="${camera.provider}:${camera.id}">▶ Canlı izle</button>` : `<a href="${escapeHtml(camera.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(camera.name)} kamerasını belediye sitesinde aç">Canlı yayını aç ↗</a>`;
    return `<article class="camera-card"><div class="camera-image">📹${image}<span>${escapeHtml(camera.city)} Belediyesi</span></div><div class="camera-body"><small>RESMÎ ŞEHİR KAMERASI</small><h3>${escapeHtml(camera.name)}</h3><div class="camera-actions">${open}<button type="button" class="camera-favorite" data-favorite="${escapeHtml(cameraKey(camera))}" aria-pressed="${active}" aria-label="${escapeHtml(camera.name)} kamerasını favorilere ${active ? "kaldır" : "ekle"}">${active ? "★" : "☆"}</button></div></div></article>`;
  }
  function stopPlayer() {
    const video = player.querySelector("video");
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    player.replaceChildren();
  }
  function playCamera(key) {
    const camera = [...akcaabat, ...trabzon].find(item => `${item.provider}:${item.id}` === key);
    if (!camera) return;
    stopPlayer();
    document.getElementById("cameraDialogTitle").textContent = camera.name + " · Canlı yayın";
    official.href = camera.url;
    const frame = document.createElement("iframe");
    frame.title = camera.name + " canlı kamera oynatıcısı";
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    frame.src = camera.provider === "akcaabat"
      ? `kamera-oynatici.html?id=${camera.id}`
      : `https://sehirkamerasi.trabzon.bel.tr/stream/EmbedPlayer/${camera.id}?autoplay=true`;
    player.replaceChildren(frame);
    document.getElementById("cameraStatus").textContent = camera.provider === "akcaabat"
      ? "Akçaabat Belediyesi canlı yayın oynatıcısı. Ses ve tam ekran için oynatıcı kontrollerini kullanın."
      : "Trabzon Belediyesi canlı yayın oynatıcısı. Erişim uyarısı çıkarsa kaynak bu sitede oynatmaya izin vermiyor.";
    dialog.showModal();
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
    if (play) { playCamera(play.dataset.play); return; }
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
