(function () {
  "use strict";
  const locations = {
    corridor: {lat: 41.0120, lon: 39.6200, zoom: 13},
    akcaabat: {lat: 41.0209, lon: 39.5716, zoom: 15},
    sogutlu: {lat: 41.0078, lon: 39.6500, zoom: 15},
    trabzon: {lat: 41.0027, lon: 39.7168, zoom: 14}
  };
  const map = document.getElementById("trafficMap");
  const buttons = [...document.querySelectorAll("[data-location]")];
  const typeButtons = [...document.querySelectorAll("[data-map-type]")];
  let current = "corridor";
  let mapType = "sat";
  let enabled = true;
  function urlFor(key) {
    const {lat, lon, zoom} = locations[key];
    return `https://yandex.com/map-widget/v1/?ll=${lon}%2C${lat}&z=${zoom}&l=${mapType}%2Ctrf&lang=tr_TR`;
  }
  function render() {
    if (!enabled) {
      map.innerHTML = '<div class="traffic-empty"><strong>Canlı trafik yayını kapalı</strong>Harita yönetim panelinden yeniden açılabilir.</div>';
      return;
    }
    const frame = document.createElement("iframe");
    frame.title = "Yandex canlı trafik haritası – " + buttons.find(item => item.dataset.location === current).textContent.trim();
    frame.src = urlFor(current);
    frame.allowFullscreen = true;
    frame.loading = "eager";
    map.replaceChildren(frame);
  }
  buttons.forEach(button => button.addEventListener("click", () => {
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
