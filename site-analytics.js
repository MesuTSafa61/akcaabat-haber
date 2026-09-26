/* Kimliksiz sayfa açılışı sayımı: çerez, günlük kimlik ve aktiflik takibi yok. */
(function () {
  "use strict";
  // Daha önce reddedenlerin kararı korunur.
  try { if (localStorage.getItem("akcaabat-analytics-preference-v1") === "no") return; }
  catch (_) { /* Depolama kapalıysa yine de tanımlayıcı oluşturulmaz. */ }

  const page = "/" + (location.pathname.split("/").pop() || "index.html");
  const allowed = new Set([
    "/index.html", "/haber.html", "/haber-detay.html", "/kategori.html", "/arama.html",
    "/mac-merkezi.html", "/kameralar.html", "/trafik.html", "/hava-durumu.html",
    "/canli.html", "/yazarlar.html", "/reklam.html", "/iletisim.html", "/sorun-bildir.html",
    "/hakkimizda.html", "/kunye.html", "/gizlilik.html", "/kvkk.html",
    "/cerez-politikasi.html", "/basin-ilkeleri.html", "/etik-ilkeler.html", "/sorumlu-yayincilik.html"
  ]);
  if (!allowed.has(page)) return;

  function count() {
    const config = window.AKCAABAT_SUPABASE;
    if (!config?.url || !config?.key) return false;
    fetch(config.url + "/rest/v1/rpc/record_anonymous_pageview", {
      method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_path: page }), keepalive: true
    }).catch(function () { /* Sayfa yüklenmesi sayaca bağlı değildir. */ });
    return true;
  }
  if (count()) return;
  const script = document.querySelector('script[src^="supabase-config.js"]');
  if (script) script.addEventListener("load", count, { once: true });
  else {
    const configScript = document.createElement("script");
    configScript.src = "supabase-config.js";
    configScript.addEventListener("load", count, { once: true });
    document.head.appendChild(configScript);
  }
})();
