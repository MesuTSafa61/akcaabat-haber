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
  const googleLink = document.getElementById("trafficGoogleLink");
  const locationStatus = document.getElementById("trafficLocationStatus");
  let locationRequest = 0;
  function urlFor(key) {
    const {lat, lon, zoom} = locations[key];
    return `https://yandex.com/map-widget/v1/?ll=${lon}%2C${lat}&z=${zoom}&l=${mapType}%2Ctrf&lang=tr_TR${key === "myLocation" ? `&pt=${lon},${lat},pm2blm` : ""}`;
  }
  function updateGoogleLink() {
    const {lat, lon, zoom} = locations[current];
    const params = new URLSearchParams({api: "1", map_action: "map", center: `${lat},${lon}`, zoom: String(zoom), basemap: mapType === "sat" ? "satellite" : "roadmap", layer: "traffic"});
    googleLink.href = `https://www.google.com/maps/@?${params}`;
  }
  function render() {
    updateGoogleLink();
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
    locationRequest++;
    locate.disabled = false;
    locate.setAttribute("aria-pressed", "false");
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
  document.getElementById("trafficRefresh").addEventListener("click", render);
  locate.addEventListener("click", () => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      locationStatus.textContent = "Tarayıcınız konum özelliğini desteklemiyor.";
      return;
    }
    const request = ++locationRequest;
    locate.disabled = true;
    locationStatus.textContent = "Konumunuz alınıyor; istenirse konum izni verin.";
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== locationRequest) return;
      locate.disabled = false;
      if (!enabled) return;
      locations.myLocation = {lat: position.coords.latitude, lon: position.coords.longitude, zoom: 16};
      current = "myLocation";
      buttons.forEach(item => item.setAttribute("aria-pressed", "false"));
      locate.setAttribute("aria-pressed", "true");
      locationStatus.textContent = `Konumunuz işaretlendi. Yaklaşık doğruluk: ${Math.round(position.coords.accuracy)} metre. Yenilemek için Konumum'a tekrar dokunun.`;
      render();
    }, error => {
      if (request !== locationRequest) return;
      locate.disabled = false;
      locationStatus.textContent = error.code === 1
        ? "Konum izni verilmedi. Tarayıcınızın site ayarlarından konuma izin verip tekrar deneyin."
        : error.code === 3 ? "Konum alınması zaman aşımına uğradı. Tekrar deneyin."
        : "Konum bulunamadı. Cihazınızın konum servislerini açıp tekrar deneyin.";
    }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  });
  render();
  // The map remains available if the settings service is temporarily unreachable.
  if (window.supabase && window.AKCAABAT_SUPABASE) {
    const client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
    client.from("live_service_settings").select("value").eq("key", "traffic").maybeSingle().then(({data, error}) => {
      if (error || !data?.value || data.value.enabled !== false) return;
      enabled = false;
      render();
    });
  }
})();
