(function () {
  "use strict";
  const locations = {
    corridor: {lat: 41.0120, lon: 39.6200, zoom: 13},
    akcaabat: {lat: 41.0209, lon: 39.5716, zoom: 15},
    sogutlu: {lat: 41.0075, lon: 39.6200, zoom: 14},
    trabzon: {lat: 41.0027, lon: 39.7168, zoom: 14}
  };
  const map = document.getElementById("trafficMap");
  const buttons = [...document.querySelectorAll("[data-location]")];
  const typeButtons = [...document.querySelectorAll("[data-map-type]")];
  let current = "corridor";
  let mapType = "map";
  let enabled = true;
  const locate = document.getElementById("trafficLocate");
  const locationStatus = document.getElementById("trafficLocationStatus");
  const etaRoutes = document.getElementById("etaRoutes");
  const etaStatus = document.getElementById("etaStatus");
  const etaUpdated = document.getElementById("etaUpdated");
  const routeNames = ["Akçaabat → Söğütlü", "Söğütlü → Akçaabat", "Akçaabat → Trabzon", "Trabzon → Akçaabat"];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  function unavailable(message) {
    etaRoutes.innerHTML = routeNames.map(name => `<div class="eta-card"><strong>${escapeHtml(name)}</strong><span>—</span><small>Canlı süre yok</small></div>`).join("");
    etaStatus.textContent = message;
    etaUpdated.textContent = "Harita üzerinden yoğunluğu izleyebilirsiniz.";
  }
  async function updateEtas() {
    const config = window.AKCAABAT_SUPABASE;
    if (!config?.url || !config?.key) return unavailable("Süre servisi yapılandırılmadı.");
    try {
      const response = await fetch(config.url + "/functions/v1/traffic-eta", {
        headers: { apikey: config.key }, signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error("unavailable");
      const result = await response.json();
      if (!Array.isArray(result.routes)) throw new Error("invalid");
      etaRoutes.innerHTML = result.routes.map(route => {
        const seconds = Number(route.seconds);
        const delay = Number(route.delaySeconds);
        const available = route.available && Number.isFinite(seconds) && seconds > 0;
        const minutes = available ? Math.max(1, Math.round(seconds / 60)) : 0;
        const state = !available ? "" : delay >= 600 ? "heavy" : delay >= 180 ? "slow" : "clear";
        const detail = available ? (Number.isFinite(delay) && delay >= 60 ? "+" + Math.round(delay / 60) + " dk gecikme" : "Normal akış") : "Canlı süre yok";
        return `<div class="eta-card" data-state="${state}"><strong>${escapeHtml(route.name || "")}</strong><span>${available ? minutes + " dk" : "—"}</span><small>${detail}</small></div>`;
      }).join("");
      etaStatus.textContent = "Tahmini yolculuk süreleri; gerçek yol ve hava koşullarına göre değişebilir. Kaynak: Trabzon Trafik.";
      etaUpdated.textContent = "Güncelleme: " + new Date(result.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } catch (_) { unavailable("Canlı güzergâh süreleri şu anda alınamıyor."); }
  }
  let watchId = null;
  let tracking = false;
  let trackingGeneration = 0;
  let lastRenderedPosition = null;
  let lastRenderedAt = 0;
  function distanceMeters(a, b) {
    const lat = (a.lat - b.lat) * Math.PI / 180;
    const lon = (a.lon - b.lon) * Math.PI / 180;
    const meanLat = (a.lat + b.lat) * Math.PI / 360;
    return Math.hypot(lat * 6371000, lon * 6371000 * Math.cos(meanLat));
  }
  function stopTracking() {
    trackingGeneration++;
    tracking = false;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    lastRenderedPosition = null;
    lastRenderedAt = 0;
    locate.textContent = "⌖ Konumum";
    locate.setAttribute("aria-pressed", "false");
  }
  function urlFor(key) {
    const {lat, lon, zoom} = locations[key];
    return `https://yandex.com/map-widget/v1/?ll=${lon}%2C${lat}&z=${zoom}&l=${mapType}%2Ctrf&lang=tr_TR${key === "myLocation" ? `&pt=${lon},${lat},pm2blm` : ""}`;
  }
  function render() {
    if (!enabled) {
      map.innerHTML = '<div class="traffic-empty"><strong>Canlı trafik yayını kapalı</strong>Harita yönetim panelinden yeniden açılabilir.</div>';
      return;
    }
    const frame = document.createElement("iframe");
    frame.title = "Yandex canlı trafik haritası – " + (current === "myLocation" ? "Konumum" : buttons.find(item => item.dataset.location === current).textContent.trim());
    frame.src = urlFor(current);
    frame.allowFullscreen = true;
    frame.allow = "geolocation";
    frame.loading = "eager";
    map.replaceChildren(frame);
  }
  buttons.forEach(button => button.addEventListener("click", () => {
    if (tracking) stopTracking();
    locationStatus.textContent = "";
    current = button.dataset.location;
    buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  typeButtons.forEach(button => button.addEventListener("click", () => {
    mapType = button.dataset.mapType;
    typeButtons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  document.getElementById("trafficRefresh").addEventListener("click", () => { render(); updateEtas(); });
  locate.addEventListener("click", () => {
    if (!enabled) return;
    if (tracking) {
      stopTracking();
      locationStatus.textContent = "Canlı konum takibi durduruldu.";
      return;
    }
    if (!navigator.geolocation) {
      locationStatus.textContent = "Tarayıcınız konum özelliğini desteklemiyor.";
      return;
    }
    const generation = ++trackingGeneration;
    tracking = true;
    locate.textContent = "■ Takibi durdur";
    locate.setAttribute("aria-pressed", "true");
    locationStatus.textContent = "Konumunuz alınıyor; istenirse konum izni verin.";
    try {
      watchId = navigator.geolocation.watchPosition(position => {
      if (generation !== trackingGeneration || !tracking) return;
      if (!enabled) return;
      const next = {lat: position.coords.latitude, lon: position.coords.longitude, zoom: 16};
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return;
      locations.myLocation = next;
      current = "myLocation";
      buttons.forEach(item => item.setAttribute("aria-pressed", "false"));
      locationStatus.textContent = `Canlı konum takibi açık. Yaklaşık doğruluk: ${Math.round(position.coords.accuracy)} metre.`;
      const now = Date.now();
      if (!lastRenderedPosition || (now - lastRenderedAt >= 4000 && distanceMeters(next, lastRenderedPosition) >= 12)) {
        lastRenderedPosition = next;
        lastRenderedAt = now;
        render();
      }
    }, error => {
      if (generation !== trackingGeneration || !tracking) return;
      if (error.code === 1) stopTracking();
      locationStatus.textContent = error.code === 1
        ? "Konum izni verilmedi. Tarayıcınızın site ayarlarından konuma izin verip tekrar deneyin."
        : error.code === 3 ? "Konum sinyali bekleniyor; takip açık. Cihazınızın konum servislerini kontrol edin."
        : "Konum bulunamadı; takip açık. Cihazınızın konum servislerini kontrol edin.";
      }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
    } catch (_) {
      stopTracking();
      locationStatus.textContent = "Konum takibi başlatılamadı. Tarayıcı ve site konum izinlerini kontrol edin.";
    }
  });
  window.addEventListener("pagehide", stopTracking);
  render();
  updateEtas();
  setInterval(() => { if (!document.hidden) updateEtas(); }, 180000);
  // The map remains available if the settings service is temporarily unreachable.
  if (window.supabase && window.AKCAABAT_SUPABASE) {
    const client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
    client.from("live_service_settings").select("value").eq("key", "traffic").maybeSingle().then(({data, error}) => {
      if (error || !data?.value || data.value.enabled !== false) return;
      enabled = false;
      if (tracking) stopTracking();
      render();
    });
  }
})();
