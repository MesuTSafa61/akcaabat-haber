(function () {
  "use strict";
  const body = document.body;
  if (!body || body.dataset.publicShellReady === "true") return;
  body.dataset.publicShellReady = "true";
  body.classList.add("portal-unified");

  const now = new Date();
  const dateText = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shell = document.createElement("div");
  shell.className = "portal-shell-top";
  shell.innerHTML = `
    <div class="top-bar portal-top-bar"><div class="container top-bar-inner"><div class="top-date"><span>📅</span><span>${dateText}</span></div><div class="top-info"><span>📍 Akçaabat</span><span>•</span><span>Trabzon</span><span>•</span><span id="portalCurrentTime">--:--</span></div></div></div>
    <section class="market-strip" aria-label="Piyasa ve hava bilgileri"><div class="container market-inner"><div class="market-scroll" aria-label="Güncel piyasa verileri"><div class="market-list" id="portalMarketList"><span class="market-item"><b>DOLAR</b> <em id="marketUsd">—</em></span><span class="market-item"><b>EURO</b> <em id="marketEur">—</em></span><span class="market-item"><b>ALTIN</b> <em id="marketGold">—</em></span><span class="market-item"><b>GÜMÜŞ</b> <em id="marketSilver">—</em></span></div></div><a href="hava-durumu.html" class="market-weather" id="portalWeatherNow">☁ Hava Durumu</a></div></section>
    <header class="site-header portal-site-header" id="unifiedSiteHeader">
      <div class="container header-main portal-brand-row">
        <button class="mobile-menu-button" type="button" aria-label="Menüyü aç" aria-expanded="false" id="portalMobileMenuButton"><span></span><span></span><span></span></button>
        <a href="index.html" class="brand portal-header-brand" aria-label="Akçaabat Haber Ana Sayfa"><img class="portal-brand-logo" src="assets/akcaabat-haber-logo.png" alt="Akçaabat Haber — Karadeniz'in Güçlü Sesi" width="360" height="120"></a>
        <div class="header-actions"><button class="header-search-button" type="button" id="portalHeaderSearchButton" aria-label="Haber ara">⌕</button><a href="admin.html" class="admin-link">Yönetim</a></div>
      </div>
      <nav class="main-nav" id="portalMainNav" aria-label="Ana menü"><div class="container nav-inner">
        <a href="index.html" class="nav-link" data-page="index.html">Ana Sayfa</a><a href="kategori.html?kategori=Akçaabat" class="nav-link" data-category="akçaabat">Akçaabat</a><a href="kategori.html?kategori=Trabzon" class="nav-link" data-category="trabzon">Trabzon</a><a href="kategori.html?kategori=Trabzonspor" class="nav-link" data-category="trabzonspor">Trabzonspor</a><a href="haber.html?breaking=1" class="nav-link" data-breaking="1">Son Dakika</a><a href="kategori.html?kategori=Gündem" class="nav-link" data-category="gündem">Gündem</a><a href="kategori.html?kategori=Spor" class="nav-link" data-category="spor">Spor</a><a href="mac-merkezi.html" class="nav-link" data-page="mac-merkezi.html">Maç Merkezi</a><a href="kameralar.html" class="nav-link" data-page="kameralar.html">Kameralar</a><a href="trafik.html" class="nav-link" data-page="trafik.html">Trafik</a><a href="yazarlar.html" class="nav-link" data-page="yazarlar.html">Yazarlar</a>
      </div></nav>
    </header>
    <nav class="service-strip" aria-label="Hızlı servisler"><div class="container service-inner"><a href="mac-merkezi.html">⚽ Maç Merkezi</a><a href="kameralar.html">🎥 Mobeseler</a><a href="trafik.html">🚗 Trafik Durumu</a><a href="hava-durumu.html">☀ Hava Durumu</a><a href="haber.html">▦ Tüm Manşetler</a><a href="arama.html">⌕ Haber Arşivi</a></div></nav>
    <section class="breaking-bar" aria-label="Son dakika"><div class="container breaking-inner"><div class="breaking-label"><span class="breaking-dot"></span>SON DAKİKA</div><div class="breaking-content"><a href="haber.html?breaking=1">Akçaabat ve Trabzon'dan son dakika gelişmeleri</a></div></div></section>
    <section class="search-panel" id="portalSearchPanel"><div class="container"><form class="search-form" id="portalSearchForm"><input type="search" id="portalSearchInput" placeholder="Haberlerde ara..." autocomplete="off" aria-label="Haberlerde ara"><button type="submit">Ara</button></form></div></section>`;

  [":scope > header", ":scope > nav", ":scope > .top-bar", ":scope > .topbar", ":scope > .market-strip", ":scope > .service-strip", ":scope > .breaking-bar", ":scope > .search-panel"].forEach(function (selector) {
    body.querySelectorAll(selector).forEach(function (element) { element.remove(); });
  });
  body.querySelectorAll("#site-header, #site-footer, #siteHeader, #siteFooter, #portalHeader, #portalFooter").forEach(function (element) { element.remove(); });
  body.querySelectorAll(".mc-page > .mc-top, .mc-page > .mc-header, .mc-page > .mc-nav, .mc-page > .mc-footer").forEach(function (element) { element.remove(); });
  body.insertBefore(shell, body.firstChild);

  body.querySelectorAll(":scope > footer").forEach(function (element) { element.remove(); });
  const footer = document.createElement("footer");
  footer.className = "site-footer unified-site-footer";
  footer.id = "unifiedSiteFooter";
  footer.innerHTML = `<div class="container footer-grid">
    <div class="footer-brand"><a href="index.html" class="brand footer-logo"><span class="brand-mark">AH</span><span class="brand-text"><strong>AKÇAABAT</strong><span>HABER</span></span></a><p>Akçaabat ve Trabzon'dan doğru, hızlı ve güncel haberler.</p></div>
    <div class="footer-column"><h3>Kategoriler</h3><a href="kategori.html?kategori=Akçaabat">Akçaabat</a><a href="kategori.html?kategori=Trabzon">Trabzon</a><a href="kategori.html?kategori=Trabzonspor">Trabzonspor</a><a href="kategori.html?kategori=Gündem">Gündem</a></div>
    <div class="footer-column"><h3>Hızlı Erişim</h3><a href="haber.html">Son Haberler</a><a href="mac-merkezi.html">Maç Merkezi</a><a href="kameralar.html">Kameralar</a><a href="trafik.html">Trafik Merkezi</a><a href="yazarlar.html">Yazarlar</a></div>
    <div class="footer-column"><h3>Kurumsal</h3><a href="hakkimizda.html">Hakkımızda</a><a href="kunye.html">Künye</a><a href="iletisim.html">İletişim</a><a href="gizlilik.html">Gizlilik</a><a href="kvkk.html">KVKK</a></div>
  </div><div class="footer-bottom"><div class="container footer-bottom-inner"><span>© <span id="currentYear">${now.getFullYear()}</span> Akçaabat Haber<span id="footerYear" hidden>${now.getFullYear()}</span></span><span>Akçaabat • Trabzon</span></div></div>`;
  body.appendChild(footer);

  const clock = document.getElementById("portalCurrentTime");
  function updateClock() { if (clock) clock.textContent = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
  updateClock();
  window.setInterval(updateClock, 30000);

  const money = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function setMarket(id, value, suffix) { const element = document.getElementById(id); if (element && Number.isFinite(value) && value > 0) element.textContent = money.format(value) + (suffix || ""); }
  function showMarket(data) {
    if (!data) return;
    setMarket("marketUsd", Number(data.usd_try), " ₺");
    setMarket("marketEur", Number(data.eur_try), " ₺");
    setMarket("marketGold", Number(data.gold_try_gram), " ₺/gr");
    setMarket("marketSilver", Number(data.silver_try_gram), " ₺/gr");
  }
  async function loadMarketData() {
    try {
      await loadDependency("supabase-config.js", function () { return Boolean(window.AKCAABAT_SUPABASE); });
      const config = window.AKCAABAT_SUPABASE;
      const cachedResponse = await fetch(config.url + "/rest/v1/site_settings?key=eq.market_data&select=value", { headers: { apikey: config.key, Authorization: "Bearer " + config.key } });
      if (cachedResponse.ok) {
        const rows = await cachedResponse.json();
        if (rows && rows[0]) showMarket(rows[0].value);
      }
      const response = await fetch(window.AKCAABAT_SUPABASE.url + "/functions/v1/market-data", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error();
      showMarket(await response.json());
    } catch (_) {}
  }
  async function loadHeaderWeather() {
    try {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0027&longitude=39.7168&current=temperature_2m,weather_code&timezone=Europe%2FIstanbul");
      if (!response.ok) throw new Error();
      const data = await response.json();
      const target = document.getElementById("portalWeatherNow");
      if (target && data.current) target.textContent = "☁ Trabzon " + Math.round(Number(data.current.temperature_2m)) + "°";
    } catch (_) {}
  }
  loadMarketData(); loadHeaderWeather();

  const menuButton = document.getElementById("portalMobileMenuButton");
  const mainNav = document.getElementById("portalMainNav");
  if (menuButton && mainNav) {
    menuButton.addEventListener("click", function () { const open = mainNav.classList.toggle("mobile-open"); menuButton.setAttribute("aria-expanded", String(open)); });
    mainNav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { mainNav.classList.remove("mobile-open"); menuButton.setAttribute("aria-expanded", "false"); }); });
  }

  const searchButton = document.getElementById("portalHeaderSearchButton");
  const searchPanel = document.getElementById("portalSearchPanel");
  const searchForm = document.getElementById("portalSearchForm");
  const searchInput = document.getElementById("portalSearchInput");
  if (searchButton && searchPanel) searchButton.addEventListener("click", function () { const open = searchPanel.classList.toggle("search-open"); if (open && searchInput) searchInput.focus(); });
  if (searchForm && searchInput) searchForm.addEventListener("submit", function (event) { event.preventDefault(); const query = searchInput.value.trim(); if (query) window.location.href = "haber.html?search=" + encodeURIComponent(query); });

  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const category = (params.get("kategori") || "").toLocaleLowerCase("tr-TR");
  if (mainNav) mainNav.querySelectorAll(".nav-link").forEach(function (link) {
    const active = (link.dataset.page && link.dataset.page === path) || (link.dataset.category && path === "kategori.html" && link.dataset.category === category) || (link.dataset.breaking && path === "haber.html" && params.get("breaking") === "1");
    link.classList.toggle("active", Boolean(active));
    if (active) link.setAttribute("aria-current", "page");
  });

  function safeHttps(value) {
    try { return new URL(value, location.href).protocol === "https:"; } catch (_) { return false; }
  }
  function adIsLive(ad) {
    const time = Date.now();
    const start = ad.start_at ? new Date(ad.start_at).getTime() : 0;
    const end = ad.end_at ? new Date(ad.end_at).getTime() : Infinity;
    return Boolean(ad.active && ad.desktop_image && safeHttps(ad.desktop_image) && start <= time && end >= time);
  }
  function createAd(ad) {
    const wrapper = document.createElement("aside");
    wrapper.className = "portal-ad portal-ad-" + (ad.placement || "top");
    wrapper.setAttribute("aria-label", "Reklam");
    const label = document.createElement("span");
    label.className = "portal-ad-label";
    label.textContent = ad.label || "REKLAM";
    const picture = document.createElement("picture");
    if (ad.mobile_image && safeHttps(ad.mobile_image)) {
      const source = document.createElement("source");
      source.media = "(max-width: 640px)";
      source.srcset = ad.mobile_image;
      picture.appendChild(source);
    }
    const image = document.createElement("img");
    image.src = ad.desktop_image;
    image.alt = ad.name || "Reklam";
    image.loading = "lazy";
    image.decoding = "async";
    picture.appendChild(image);
    let media = picture;
    if (ad.target_url && safeHttps(ad.target_url)) {
      const anchor = document.createElement("a");
      anchor.href = ad.target_url;
      anchor.setAttribute("aria-label", (ad.name || "Reklam") + " bağlantısını aç");
      if (ad.new_tab !== false) { anchor.target = "_blank"; anchor.rel = "sponsored noopener noreferrer"; }
      else anchor.rel = "sponsored";
      anchor.appendChild(picture);
      media = anchor;
    }
    const inner = document.createElement("div");
    inner.className = "container portal-ad-inner";
    inner.appendChild(label);
    inner.appendChild(media);
    wrapper.appendChild(inner);
    return wrapper;
  }
  function placeAds(ads) {
    const liveAds = ads.filter(adIsLive);
    ["top", "content", "footer"].forEach(function (placement) {
      const ad = liveAds.find(function (item) { return item.placement === placement; });
      if (!ad) return;
      const element = createAd(ad);
      if (placement === "top") shell.insertAdjacentElement("afterend", element);
      else if (placement === "footer") footer.insertAdjacentElement("beforebegin", element);
      else {
        const main = body.querySelector("main");
        const firstSection = main && main.querySelector(":scope > section");
        if (firstSection) firstSection.insertAdjacentElement("afterend", element);
        else if (main) main.insertBefore(element, main.children[1] || null);
      }
    });
  }
  function loadDependency(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      let script = document.querySelector('script[src="' + src + '"]');
      if (!script) {
        script = document.createElement("script");
        script.src = src;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      window.setTimeout(function () { if (ready()) resolve(); }, 500);
    });
  }
  async function loadAdvertisements() {
    try {
      await loadDependency("supabase-config.js", function () { return Boolean(window.AKCAABAT_SUPABASE); });
      await loadDependency("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function () { return Boolean(window.supabase); });
      const client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
      const result = await client.from("site_settings").select("value").eq("key", "advertisements").maybeSingle();
      if (!result.error && result.data && result.data.value && Array.isArray(result.data.value.ads)) placeAds(result.data.value.ads);
    } catch (error) { console.warn("Reklamlar yüklenemedi:", error); }
  }
  loadAdvertisements();
})();
