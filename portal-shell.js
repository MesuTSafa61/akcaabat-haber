(function () {
  "use strict";
  const body = document.body;
  if (!body || body.dataset.publicShellReady === "true") return;
  body.dataset.publicShellReady = "true";
  body.classList.add("portal-unified");
  try { document.documentElement.dataset.theme = localStorage.getItem("akcaabat-theme") === "dark" ? "dark" : "light"; } catch (_) {}

  const now = new Date();
  const dateText = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    photo: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m4 17 5-4 3 2 3-4 6 6"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    pen: '<path d="m4 20 5-.8L20 8a2 2 0 0 0-4-4L5 15zM14 6l4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart: '<path d="M3 19h18M5 16l5-5 4 3 5-7M16 7h3v3"/>',
    pharmacy: '<path d="M12 3v18M3 12h18"/>',
    mosque: '<path d="M4 21V9m16 12V9M2 9h4m12 0h4M7 21v-8l5-4 5 4v8M10 21v-5h4v5M4 7V4m16 3V4"/>',
    bus: '<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 11h16M8 3v8M16 3v8M7 20v2m10-2v2"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
    plane: '<path d="m3 13 7 1 4 7 2-1-2-7 6-6c2-2 0-4-2-2l-6 6-7-2-1 2z"/>',
    contact: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>'
  };
  function menuIcon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPaths[name] + '</svg>'; }
  const shell = document.createElement("div");
  shell.className = "portal-shell-top";
  shell.innerHTML = `
    <div class="top-bar portal-top-bar"><div class="container top-bar-inner"><div class="top-date"><span>📅</span><span>${dateText}</span><time id="portalCurrentTime">--:--</time></div><div class="portal-top-market" aria-label="Piyasa ve hava bilgileri"><div class="market-scroll" aria-label="Güncel piyasa verileri"><div class="market-list" id="portalMarketList"><a class="market-item" href="borsa.html" aria-label="Dolar kuru ve piyasa verileri"><b>DOLAR</b> <em id="marketUsd">—</em><i class="market-trend" id="marketUsdTrend" hidden></i></a><a class="market-item" href="borsa.html" aria-label="Euro kuru ve piyasa verileri"><b>EURO</b> <em id="marketEur">—</em><i class="market-trend" id="marketEurTrend" hidden></i></a><a class="market-item" href="borsa.html" aria-label="Gram altın ve piyasa verileri"><b>ALTIN</b> <em id="marketGold">—</em><i class="market-trend" id="marketGoldTrend" hidden></i></a><a class="market-item" href="borsa.html" aria-label="Gram gümüş ve piyasa verileri"><b>GÜMÜŞ</b> <em id="marketSilver">—</em><i class="market-trend" id="marketSilverTrend" hidden></i></a></div></div><a href="hava-durumu.html" class="market-weather" id="portalWeatherNow">☁ Trabzon</a></div></div></div>
    <header class="site-header portal-site-header" id="unifiedSiteHeader">
      <div class="container header-main portal-brand-row">
        <button class="mobile-menu-button" type="button" aria-label="Menüyü aç" aria-expanded="false" id="portalMobileMenuButton"><span></span><span></span><span></span></button>
        <a href="index.html" class="brand portal-header-brand" aria-label="Akçaabat Haber Ana Sayfa"><img class="portal-brand-logo" data-brand-logo src="assets/akcaabat-haber-logo-final-v2.png?v=2" alt="Akçaabat Haber — Akçaabat'ın Sesi, Karadeniz'in Gücü" width="400" height="121"></a>
        <div class="header-actions"><button class="portal-theme-button" type="button" id="portalThemeButton" aria-label="Koyu temayı aç" title="Temayı değiştir">☾</button><button class="header-search-button" type="button" id="portalHeaderSearchButton" aria-label="Haber ara">⌕</button></div>
      </div>
      <nav class="main-nav" id="portalMainNav" aria-label="Ana menü"><div class="container nav-inner">
        <a href="index.html" class="nav-link" data-page="index.html"><span class="nav-icon" aria-hidden="true">⌂</span>Ana Sayfa</a><a href="kategori.html?kategori=Akçaabat" class="nav-link" data-category="akçaabat"><span class="nav-icon" aria-hidden="true">📍</span>Akçaabat</a><a href="kategori.html?kategori=Trabzon" class="nav-link" data-category="trabzon"><span class="nav-icon" aria-hidden="true">▥</span>Trabzon</a><a href="kategori.html?kategori=Trabzonspor" class="nav-link" data-category="trabzonspor"><span class="nav-icon" aria-hidden="true">⚽</span>Trabzonspor</a><a href="kategori.html?kategori=Gündem" class="nav-link" data-category="gündem"><span class="nav-icon" aria-hidden="true">◉</span>Gündem</a><a href="kategori.html?kategori=Spor" class="nav-link" data-category="spor"><span class="nav-icon" aria-hidden="true">🏆</span>Spor</a><a href="namaz-vakitleri.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">☪</span>Namaz Vakitleri</a><a href="nobetci-eczaneler.html" class="nav-link nav-extra"><img class="nav-icon pharmacy-heart-icon" src="assets/pharmacy-heart.svg" alt="">Nöbetçi Eczaneler</a><a href="otobus-saatleri.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">🚌</span>Otobüs Saatleri</a><a href="ucus-bilgileri.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">✈</span>Uçuş Bilgileri</a><a href="vefat-edenler.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">♧</span>Vefat Duyuruları</a><a href="foto-galeri.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">▣</span>Foto Galeri</a><a href="video-galeri.html" class="nav-link nav-extra"><span class="nav-icon" aria-hidden="true">▶</span>Video Galeri</a>
        <div class="mobile-menu-content">
          <div class="mobile-menu-heading"><strong>MENÜ</strong><button type="button" id="portalMenuClose" aria-label="Menüyü kapat">×</button></div>
          <div class="mobile-menu-social"><span>Sosyal medya</span><div class="social-links" data-social-links></div></div>
          <a href="index.html" class="mobile-menu-link">${menuIcon("home")}<span>Ana Sayfa</span></a>
          <details class="mobile-menu-categories"><summary class="mobile-menu-link">${menuIcon("folder")}<span>Kategoriler</span>${menuIcon("chevron")}</summary>
            <div class="mobile-category-list"><a href="kategori.html?kategori=Akçaabat">Akçaabat</a><a href="kategori.html?kategori=Trabzon">Trabzon</a><a href="kategori.html?kategori=Trabzonspor">Trabzonspor</a><a href="kategori.html?kategori=Gündem">Gündem</a><a href="kategori.html?kategori=Spor">Spor</a><a href="kategori.html?kategori=Asayiş">Asayiş</a><a href="kategori.html?kategori=Ekonomi">Ekonomi</a><a href="kategori.html?kategori=Siyaset">Siyaset</a><a href="kategori.html?kategori=Kültür">Kültür &amp; Sanat</a></div>
          </details>
          <a href="foto-galeri.html" class="mobile-menu-link">${menuIcon("photo")}<span>Foto Galeri</span></a>
          <a href="video-galeri.html" class="mobile-menu-link">${menuIcon("video")}<span>Video Galeri</span></a>
          <a href="yazarlar.html" class="mobile-menu-link">${menuIcon("pen")}<span>Yazarlar</span></a>
          <div class="mobile-menu-section">Günlük yaşam</div>
          <a href="borsa.html" class="mobile-menu-link">${menuIcon("chart")}<span>Piyasalar</span></a>
          <a href="namaz-vakitleri.html" class="mobile-menu-link">${menuIcon("clock")}<span>Namaz Vakitleri</span></a>
          <a href="nobetci-eczaneler.html" class="mobile-menu-link"><img class="pharmacy-heart-icon" src="assets/pharmacy-heart.svg" alt=""><span>Nöbetçi Eczaneler</span></a>
          <a href="otobus-saatleri.html" class="mobile-menu-link">${menuIcon("bus")}<span>Otobüs Saatleri</span></a>
          <a href="ucus-bilgileri.html" class="mobile-menu-link">${menuIcon("plane")}<span>Uçuş Bilgileri</span></a>
          <a href="vefat-edenler.html" class="mobile-menu-link">${menuIcon("mosque")}<span>Vefat Duyuruları</span></a>
          <a href="iletisim.html" class="mobile-menu-link">${menuIcon("contact")}<span>İletişim</span></a>
        </div>
      </div></nav><button type="button" class="mobile-menu-backdrop" id="portalMenuBackdrop" aria-label="Menüyü kapat" hidden></button>
    </header>
    <nav class="service-strip" aria-label="Hızlı servisler"><div class="container service-inner"><a href="mac-merkezi.html">⚽ Maç Merkezi</a><a href="kameralar.html">🎥 Kameralar</a><a href="trafik.html">🚗 Trafik</a><a href="hava-durumu.html">☁ Hava Durumu</a><a href="namaz-vakitleri.html">☪ Namaz Vakitleri</a><a href="nobetci-eczaneler.html"><img class="service-pharmacy-icon" src="assets/pharmacy-heart.svg" alt="" width="18" height="18"> Nöbetçi Eczaneler</a><a href="otobus-saatleri.html">🚌 Otobüs Saatleri</a><a href="ucus-bilgileri.html">✈ Uçuş Bilgileri</a><a href="vefat-edenler.html"><img class="service-mosque-icon" src="assets/mosque.svg" alt="" width="17" height="17"> Vefat Duyuruları</a><a href="foto-galeri.html" data-gallery-service="true">📷 Foto ve Video Galeri</a></div></nav>
    <section class="breaking-bar" id="portalBreakingBar" aria-label="Son dakika" style="display:none"><div class="container breaking-inner"><div class="breaking-label"><span class="breaking-clock" aria-hidden="true"><i class="breaking-clock-hour"></i><i class="breaking-clock-minute"></i></span><span class="breaking-wordmark"><span>SON</span><span>DAKİKA</span></span></div><div class="breaking-content" id="portalBreakingContent"><a id="portalBreakingLink" href="haber.html?breaking=1"></a></div><div class="breaking-controls" id="portalBreakingControls" hidden><button type="button" id="portalBreakingPrev" aria-label="Önceki son dakika haberi">‹</button><button type="button" id="portalBreakingNext" aria-label="Sonraki son dakika haberi">›</button></div></div></section>
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
    <div class="footer-brand"><a href="index.html" class="brand footer-logo" aria-label="Akçaabat Haber Ana Sayfa"><img data-brand-logo src="assets/akcaabat-haber-logo-final-v2.png?v=2" alt="Akçaabat Haber — Akçaabat'ın Sesi, Karadeniz'in Gücü" width="400" height="121"></a><p>Akçaabat'ın sesi, Karadeniz'in gücü. Akçaabat ve Trabzon'dan doğru, hızlı ve güncel haberler.</p><div class="footer-social"><strong>Bizi takip edin</strong><div class="social-links" data-social-links></div></div></div>
    <div class="footer-column"><h3>Kategoriler</h3><a href="kategori.html?kategori=Akçaabat">Akçaabat</a><a href="kategori.html?kategori=Trabzon">Trabzon</a><a href="kategori.html?kategori=Trabzonspor">Trabzonspor</a><a href="kategori.html?kategori=Gündem">Gündem</a><a href="kategori.html?kategori=Spor">Spor</a><a href="kategori.html?kategori=Asayiş">Asayiş</a><a href="kategori.html?kategori=Ekonomi">Ekonomi</a><a href="kategori.html?kategori=Siyaset">Siyaset</a><a href="kategori.html?kategori=Kültür">Kültür &amp; Sanat</a></div>
    <div class="footer-column"><h3>Hızlı Erişim</h3><a href="haber.html">Son Haberler</a><a href="borsa.html">Piyasalar</a><a href="mac-merkezi.html">Maç Merkezi</a><a href="kameralar.html">Kameralar</a><a href="trafik.html">Trafik Merkezi</a><a href="namaz-vakitleri.html">Namaz Vakitleri</a><a href="nobetci-eczaneler.html">Nöbetçi Eczaneler</a><a href="otobus-saatleri.html">Otobüs Saatleri</a><a href="ucus-bilgileri.html">Uçuş Bilgileri</a><a href="vefat-edenler.html">Vefat Duyuruları</a><a href="foto-galeri.html">Foto Galeri</a><a href="video-galeri.html">Video Galeri</a></div>
    <div class="footer-column"><h3>Kurumsal</h3><a href="hakkimizda.html">Hakkımızda</a><a href="kunye.html">Künye</a><a href="iletisim.html">İletişim</a><a href="basin-ilkeleri.html">Basın İlkeleri</a><a href="etik-ilkeler.html">Etik İlkeler</a></div>
    <div class="footer-column"><h3>Yasal ve İlkeler</h3><a href="kvkk.html">KVKK Aydınlatma Metni</a><a href="gizlilik.html">Gizlilik Politikası</a><a href="cerez-politikasi.html">Çerez Politikası</a><a href="sorumlu-yayincilik.html">Sorumlu Yayıncılık</a><a href="sorun-bildir.html">Sorun Bildir</a></div>
  </div><div class="footer-bottom"><div class="container footer-bottom-inner"><span>© <span id="currentYear">${now.getFullYear()}</span> Akçaabat Haber<span id="footerYear" hidden>${now.getFullYear()}</span></span><span>Akçaabat • Trabzon</span></div></div>`;
  body.appendChild(footer);
  const analyticsScript = document.createElement("script");
  analyticsScript.src = "site-analytics.js?v=2";
  document.head.appendChild(analyticsScript);

  function safeBrandUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.href);
      return url.protocol === "https:" || url.origin === location.origin ? url.href : "";
    } catch (_) { return ""; }
  }
  function applyBrandLogo(value) {
    const logoUrl = safeBrandUrl(value) || new URL("assets/akcaabat-haber-logo-final-v2.png?v=2", location.href).href;
    document.querySelectorAll("[data-brand-logo]").forEach(function (image) { image.src = logoUrl; });
  }
  const socialPlatforms = [
    { key: "socialFacebook", visibleKey: "socialFacebookVisible", name: "Facebook", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.7V13h3.1v9h3.8z"/></svg>' },
    { key: "socialInstagram", visibleKey: "socialInstagramVisible", name: "Instagram", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/></svg>' },
    { key: "socialX", visibleKey: "socialXVisible", name: "X", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h4.8l4.2 5.6L17.8 3H20l-6 7.3L20.8 21H16l-4.7-6.3L6 21H3.8l6.5-8L4 3zm3.5 1.8L17 19.2h2L9.5 4.8h-2z"/></svg>' },
    { key: "socialYoutube", visibleKey: "socialYoutubeVisible", name: "YouTube", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8z"/><path d="m10 15.5 5-3.5-5-3.5v7z" fill="white"/></svg>' },
    { key: "socialWhatsapp", visibleKey: "socialWhatsappVisible", name: "WhatsApp", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a9.7 9.7 0 0 0-8.3 14.7L2.4 22l5.4-1.3A9.8 9.8 0 1 0 12 2zm0 17.6a7.6 7.6 0 0 1-3.9-1.1l-.4-.2-3.2.8.9-3.1-.2-.4A7.7 7.7 0 1 1 12 19.6zm4.3-5.7c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-3-.2-.3.2-.3.7-1 .1-.2.1-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.3-.2-.5-.3z"/></svg>' }
  ];
  function applySocialLinks(settings) {
    document.querySelectorAll("[data-social-links]").forEach(function (container) {
      container.replaceChildren();
      socialPlatforms.forEach(function (platform) {
        if (settings && settings[platform.visibleKey] === false) return;
        const value = settings && settings[platform.key];
        let url = null;
        try { if (value) url = new URL(value); } catch (_) {}
        if (url && url.protocol !== "https:") url = null;
        const item = document.createElement(url ? "a" : "span");
        if (url) { item.href = url.href; item.target = "_blank"; item.rel = "noopener noreferrer"; }
        item.className = "social-link social-" + platform.name.toLowerCase() + (url ? "" : " social-disabled");
        item.setAttribute("aria-label", "Akçaabat Haber " + platform.name + (url ? " hesabı" : " hesabı henüz eklenmedi"));
        item.title = platform.name + (url ? "" : " · bağlantı yakında");
        item.innerHTML = platform.icon;
        container.appendChild(item);
      });
    });
  }
  async function loadBranding() {
    try {
      await loadDependency("supabase-config.js", function () { return Boolean(window.AKCAABAT_SUPABASE); });
      const config = window.AKCAABAT_SUPABASE;
      const response = await fetch(config.url + "/rest/v1/site_settings?key=eq.site&select=value", { headers: { apikey: config.key, Authorization: "Bearer " + config.key } });
      if (!response.ok) throw new Error("Marka ayarları alınamadı.");
      const rows = await response.json();
      if (rows && rows[0] && rows[0].value) { applyBrandLogo(rows[0].value.brandLogoUrl); applySocialLinks(rows[0].value); }
      else applySocialLinks({});
    } catch (_) { applyBrandLogo(""); applySocialLinks({}); }
  }
  loadBranding();

  const clock = document.getElementById("portalCurrentTime");
  function updateClock() { if (clock) clock.textContent = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
  updateClock();
  window.setInterval(updateClock, 30000);
  const themeButton = document.getElementById("portalThemeButton");
  function updateThemeButton() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeButton.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#ffba24"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6m11 11 1.6 1.6M19.1 4.9l-1.6 1.6m-11 11-1.6 1.6" fill="none" stroke="#ffba24" stroke-width="1.8" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.6 8.6 0 1 0 20.5 15.4Z" fill="currentColor"/></svg>';
    themeButton.setAttribute("aria-label", dark ? "Açık temayı aç" : "Koyu temayı aç");
    themeButton.setAttribute("aria-pressed", String(dark));
  }
  themeButton.addEventListener("click", function () { const dark = document.documentElement.dataset.theme !== "dark"; document.documentElement.dataset.theme = dark ? "dark" : "light"; try { localStorage.setItem("akcaabat-theme", dark ? "dark" : "light"); } catch (_) {} updateThemeButton(); });
  updateThemeButton();

  const money = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function setMarket(id, value, suffix) { const element = document.getElementById(id); if (element && Number.isFinite(value) && value > 0) element.textContent = money.format(value) + (suffix || ""); }
  function setTrend(id, movement) {
    const element = document.getElementById(id);
    if (!element || !movement || !["up", "down"].includes(movement.direction)) { if (element) element.hidden = true; return; }
    const percent = Number(movement.percent || 0);
    element.className = "market-trend " + movement.direction;
    element.textContent = (movement.direction === "up" ? "▲" : "▼") + (percent ? " %" + money.format(percent) : "");
    element.hidden = false;
    element.setAttribute("aria-label", movement.direction === "up" ? "Yükseldi" : "Düştü");
  }
  function updateMarketTicker() {
    const list = document.getElementById("portalMarketList");
    if (!list || !list.parentElement || !list.querySelector("em:not(:empty)")) return;
    const scroll = list.parentElement;
    let track = scroll.querySelector(".market-track");
    if (!track) {
      track = document.createElement("div");
      track.className = "market-track";
      scroll.insertBefore(track, list);
      track.appendChild(list);
    }
    track.querySelectorAll(".market-list-copy").forEach(copy => copy.remove());
    const copy = list.cloneNode(true);
    copy.id = "";
    copy.classList.add("market-list-copy");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    copy.querySelectorAll("a").forEach(link => { link.tabIndex = -1; });
    track.appendChild(copy);
    track.style.setProperty("--market-distance", list.scrollWidth + "px");
    track.style.setProperty("--market-duration", Math.max(22, list.scrollWidth / 18) + "s");
    track.classList.add("is-moving");
  }
  function showMarket(data) {
    if (!data) return;
    setMarket("marketUsd", Number(data.usd_try), " ₺");
    setMarket("marketEur", Number(data.eur_try), " ₺");
    setMarket("marketGold", Number(data.gold_try_gram), " ₺/gr");
    setMarket("marketSilver", Number(data.silver_try_gram), " ₺/gr");
    const changes = data.changes || {};
    setTrend("marketUsdTrend", changes.usd);
    setTrend("marketEurTrend", changes.eur);
    setTrend("marketGoldTrend", changes.gold);
    setTrend("marketSilverTrend", changes.silver);
    requestAnimationFrame(updateMarketTicker);
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
  async function loadBreakingNews() {
    try {
      await loadDependency("supabase-config.js", function () { return Boolean(window.AKCAABAT_SUPABASE); });
      const config = window.AKCAABAT_SUPABASE;
      const headers = { apikey: config.key, Authorization: "Bearer " + config.key };
      const [response, settingsResponse] = await Promise.all([
        fetch(config.url + "/rest/v1/news?select=title,slug&status=eq.published&is_breaking=eq.true&breaking_visible=eq.true&order=breaking_order.asc,published_at.desc&limit=12", { headers }),
        fetch(config.url + "/rest/v1/site_settings?key=eq.breaking_news_limit&select=value", { headers })
      ]);
      if (!response.ok) return;
      const configured = settingsResponse.ok ? (await settingsResponse.json())[0]?.value?.limit : 5;
      const limit = Math.max(1, Math.min(12, Number(configured) || 5));
      const news = (await response.json()).filter(item => item.title && item.slug).slice(0, limit);
      if (!news.length) return;
      const link = document.getElementById("portalBreakingLink");
      const bar = document.getElementById("portalBreakingBar");
      const content = document.getElementById("portalBreakingContent");
      const controls = document.getElementById("portalBreakingControls");
      let index = 0;
      let rotationTimer = null;
      function restartScroll() {
        link.style.animation = "none";
        link.style.setProperty("--breaking-travel", Math.max(0, link.scrollWidth - content.clientWidth + 12) + "px");
        void link.offsetWidth;
        link.style.animation = "";
      }
      function show(offset) {
        index = (index + offset + news.length) % news.length;
        link.textContent = news[index].title;
        link.href = "haber-detay.html?slug=" + encodeURIComponent(news[index].slug);
        requestAnimationFrame(restartScroll);
      }
      function restartRotation() {
        if (rotationTimer) clearInterval(rotationTimer);
        if (news.length > 1 && !document.hidden) {
          rotationTimer = setInterval(() => show(1), 10000);
        }
      }
      function step(offset) { show(offset); restartRotation(); }
      show(0);
      bar.style.display = "";
      window.addEventListener("resize", restartScroll);
      controls.hidden = news.length < 2;
      if (news.length > 1) {
        document.getElementById("portalBreakingPrev").addEventListener("click", () => step(-1));
        document.getElementById("portalBreakingNext").addEventListener("click", () => step(1));
        let startX = null, dragged = false;
        content.addEventListener("pointerdown", event => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          startX = event.clientX; dragged = false;
        });
        content.addEventListener("pointerup", event => {
          if (startX === null) return;
          const delta = event.clientX - startX;
          startX = null;
          if (Math.abs(delta) < 35) return;
          dragged = true;
          step(delta < 0 ? 1 : -1);
        });
        content.addEventListener("pointercancel", () => { startX = null; });
        content.addEventListener("click", event => {
          if (!dragged) return;
          event.preventDefault(); event.stopPropagation(); dragged = false;
        }, true);
        content.tabIndex = 0;
        content.setAttribute("aria-label", "Son dakika haberleri; sağ ve sol oklarla değiştir");
        content.addEventListener("keydown", event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1);
        });
        document.addEventListener("visibilitychange", restartRotation);
        restartRotation();
      }
    } catch (_) { /* Veri yoksa boş son dakika bandı gösterilmez. */ }
  }
  async function loadAkcaabatWeather() {
    const temperature = document.getElementById("homeWeatherTemperature");
    if (!temperature) return;
    try {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0197&longitude=39.5716&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code,is_day&timezone=Europe%2FIstanbul");
      if (!response.ok) throw new Error("Hava durumu alınamadı");
      const current = (await response.json()).current;
      if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error("Hava durumu eksik");
      const code = Number(current.weather_code);
      const condition = code === 0 ? "Açık" : code <= 3 ? "Parçalı bulutlu" : code <= 48 ? "Sisli" : code <= 67 ? "Yağmurlu" : code <= 77 ? "Karlı" : code <= 82 ? "Sağanak yağışlı" : code <= 86 ? "Karlı" : code >= 95 ? "Gök gürültülü" : "Bulutlu";
      const weatherCard = temperature.closest(".weather-box");
      if (weatherCard) {
        weatherCard.dataset.weather = code >= 95 ? "storm" : code >= 71 && code <= 77 || code >= 85 && code <= 86 ? "snow" : code >= 51 && code <= 82 ? "rain" : code >= 45 && code <= 48 ? "fog" : code === 0 ? "clear" : "cloud";
        weatherCard.dataset.day = current.is_day ? "true" : "false";
      }
      temperature.textContent = Math.round(Number(current.temperature_2m)) + "°";
      document.getElementById("homeWeatherCondition").textContent = condition;
      document.getElementById("homeWeatherFeelsLike").textContent = "🌡️ Hissedilen " + Math.round(Number(current.apparent_temperature)) + "°";
      document.getElementById("homeWeatherWind").textContent = "💨 " + Math.round(Number(current.wind_speed_10m)) + " km/sa";
      document.getElementById("homeWeatherIcon").textContent = code >= 95 ? "⛈️" : (code >= 71 && code <= 77) || (code >= 85 && code <= 86) ? "🌨️" : code >= 51 && code <= 82 ? "🌧️" : code <= 3 && current.is_day ? "☀️" : "☁️";
    } catch (_) { document.getElementById("homeWeatherCondition").textContent = "Veri alınamadı"; }
  }
  loadMarketData(); loadHeaderWeather(); loadBreakingNews(); loadAkcaabatWeather();

  const menuButton = document.getElementById("portalMobileMenuButton");
  const mainNav = document.getElementById("portalMainNav");
  if (menuButton && mainNav) {
    const backdrop = document.getElementById("portalMenuBackdrop");
    const closeButton = document.getElementById("portalMenuClose");
    function setMenuOpen(open) { mainNav.classList.toggle("mobile-open", open); backdrop.hidden = !open; menuButton.setAttribute("aria-expanded", String(open)); document.body.classList.toggle("portal-menu-is-open", open); if (open) closeButton.focus(); else menuButton.focus(); }
    menuButton.addEventListener("click", function () { setMenuOpen(!mainNav.classList.contains("mobile-open")); });
    closeButton.addEventListener("click", function () { setMenuOpen(false); });
    backdrop.addEventListener("click", function () { setMenuOpen(false); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && mainNav.classList.contains("mobile-open")) setMenuOpen(false); });
    mainNav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { setMenuOpen(false); }); });
  }

  const searchButton = document.getElementById("portalHeaderSearchButton");
  const searchPanel = document.getElementById("portalSearchPanel");
  const searchForm = document.getElementById("portalSearchForm");
  const searchInput = document.getElementById("portalSearchInput");
  if (searchButton && searchPanel) searchButton.addEventListener("click", function () { const open = searchPanel.classList.toggle("search-open"); if (open && searchInput) searchInput.focus(); });
  if (searchForm && searchInput) searchForm.addEventListener("submit", function (event) { event.preventDefault(); const query = searchInput.value.trim(); if (query) window.location.href = "haber.html?search=" + encodeURIComponent(query); });

  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".portal-shell-top .service-inner a").forEach(function (link) {
    const selected = link.dataset.galleryService === "true" ? ["foto-galeri.html", "video-galeri.html", "galeri-detay.html"].includes(path) : new URL(link.href, location.href).pathname.split("/").pop().toLowerCase() === path;
    link.classList.toggle("is-active", selected);
    if (selected) link.setAttribute("aria-current", "page");
  });
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
