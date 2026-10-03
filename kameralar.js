(function () {
  "use strict";
  const akcaabat = [
    ["Akçaabat Genel", 5], ["Atatürk Parkı", 3], ["Ak Cami", 11],
    ["Millet Bahçesi", 8], ["Millet Bahçesi-2", 9], ["Akçaabat Limanı", 10],
    ["Orta Cadde", 16], ["Sahil Park", 13], ["Sahil Park-2", 14], ["Sahil Parkı-3", 19]
  ].map(([name, id]) => ({name, city: "Akçaabat", id, provider: "akcaabat", url: `https://www.akcaabat.bel.tr/sehir-kameralari-detay.aspx?id=${id}`}));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const grid = document.getElementById("cameraSections");
  const search = document.getElementById("cameraSearch");
  const dialog = document.getElementById("cameraDialog");
  const player = document.getElementById("cameraPlayer");
  const official = document.getElementById("cameraOfficial");
  const extra = [];
  let filter = "all";
  const favoriteKey = "akcaabat-haber-camera-favorites";
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem(favoriteKey) || "[]"); } catch (_) { /* Private mode. */ }
  if (!Array.isArray(favorites)) favorites = [];
  const cameraKey = camera => camera.city + ":" + camera.name;
  function card(camera) {
    const active = favorites.includes(cameraKey(camera));
    return `<article class="camera-card"><button type="button" class="camera-image camera-preview" data-preview="${camera.id}" data-play="${camera.provider}:${camera.id}" aria-label="${escapeHtml(camera.name)} canlı yayınını aç"><img class="camera-snapshot" alt="${escapeHtml(camera.name)} kamerasından son görüntü" hidden><span class="camera-provider">Akçaabat Belediyesi</span><span class="camera-preview-play" aria-hidden="true">▶</span><span class="camera-preview-caption">Önizleme yükleniyor…</span></button><div class="camera-body"><div><small>RESMÎ ŞEHİR KAMERASI</small><h3>${escapeHtml(camera.name)}</h3></div><button type="button" class="camera-favorite" data-favorite="${escapeHtml(cameraKey(camera))}" aria-pressed="${active}" aria-label="${escapeHtml(camera.name)} kamerasını favorilere ${active ? "kaldır" : "ekle"}">${active ? "★" : "☆"}</button></div></article>`;
  }
  let playerWatch = null;
  let selectedCamera = null;
  function stopPlayer() {
    clearInterval(playerWatch);
    playerWatch = null;
    const video = player.querySelector("video");
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    player.replaceChildren();
  }
  function playCamera(key) {
    const camera = akcaabat.find(item => `${item.provider}:${item.id}` === key);
    if (!camera) return;
    stopPlayer();
    selectedCamera = key;
    document.getElementById("cameraDialogTitle").textContent = camera.name + " · Kamera";
    official.href = camera.url;
    const frame = document.createElement("iframe");
    frame.title = camera.name + " canlı kamera oynatıcısı";
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    frame.src = `kamera-oynatici.html?v=3&id=${camera.id}`;
    player.replaceChildren(frame);
    const status = document.getElementById("cameraStatus");
    status.textContent = "Yayın bağlantısı kuruluyor…";
    if (camera.provider === "akcaabat") {
      const openedAt = Date.now();
      let lastTime = -1, lastFrameAt = 0;
      playerWatch = setInterval(() => {
        const doc = frame.contentDocument;
        const video = doc?.querySelector("video");
        if (video?.videoWidth > 0 && video.readyState >= 2 && video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          lastFrameAt = Date.now();
        }
        if (lastFrameAt && Date.now() - lastFrameAt < 15000) {
          status.textContent = video?.paused ? "Yayın duraklatıldı. Devam etmek için oynat düğmesine dokunun." : "Canlı görüntü alınıyor. Ses ve tam ekran için oynatıcı kontrollerini kullanın.";
        } else if (doc?.querySelector(".jw-state-error") || Date.now() - openedAt > 25000) {
          status.textContent = "Yayından görüntü alınamıyor. Yeniden deneyebilir veya belediye sayfasındaki durumu kontrol edebilirsiniz.";
        }
      }, 1000);
    }
    dialog.showModal();
  }
  document.getElementById("cameraRetry").addEventListener("click", () => { if (selectedCamera) playCamera(selectedCamera); });
  document.getElementById("cameraClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", stopPlayer);
  function render() {
    const term = search.value.trim().toLocaleLowerCase("tr-TR");
    const groups = [{name: "Akçaabat Belediyesi", city: "Akçaabat", rows: [...akcaabat, ...extra.filter(item => item.city === "Akçaabat")]}];
    const shown = groups.filter(group => filter === "all" || filter === "favorites" || group.city === filter).map(group => {
      const rows = group.rows.filter(item => (filter !== "favorites" || favorites.includes(cameraKey(item))) && (item.name + " " + item.city).toLocaleLowerCase("tr-TR").includes(term));
      return rows.length ? `<section aria-label="${group.name}"><h2 class="camera-heading">${group.name} · ${rows.length} kamera</h2><div class="camera-grid">${rows.map(card).join("")}</div></section>` : "";
    }).join("");
    grid.innerHTML = shown || '<p class="camera-empty">Bu aramayla eşleşen kamera bulunamadı.</p>';
    window.cameraPreviews?.observe();
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
})();
