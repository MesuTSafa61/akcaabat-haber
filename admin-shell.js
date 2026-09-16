(function () {
  "use strict";
  const body = document.body;
  if (!body || body.dataset.adminShellReady === "true") return;
  body.dataset.adminShellReady = "true";
  body.classList.add("admin-unified");

  const page = (location.pathname.split("/").pop() || "admin-panel.html").toLowerCase();
  const pageData = {
    "admin-panel.html": ["Dashboard", "Genel durum ve hızlı işlemler"],
    "admin.html": ["Yönetim Ana Sayfası", "Akçaabat Haber içerik yönetimi"],
    "haberler.html": ["Haberler", "Yayınlanan ve planlanan haberleri yönetin"],
    "manset-yonetimi.html": ["Manşet Yönetimi", "Ana sayfadaki 1–10 manşet sırasını yönetin"],
    "yeni-haber.html": ["Yeni Haber", "Yeni içerik oluşturun veya mevcut haberi düzenleyin"],
    "taslaklar.html": ["Taslaklar", "Yayınlanmamış içerikleri yönetin"],
    "kategoriler.html": ["Kategoriler", "Haber kategorilerini düzenleyin"],
    "yorumlar.html": ["Yorumlar", "Okuyucu etkileşimlerini yönetin"],
    "haber-botu.html": ["Haber Botu", "Kaynakları ve tarama ayarlarını yönetin"],
    "mac-yonetimi.html": ["Maç Merkezi Yönetimi", "Maç, skor ve puan durumu verilerini yönetin"],
    "trafik-yonetimi.html": ["Trafik Yönetimi", "Doğrulanmış trafik sağlayıcısını yönetin"],
    "reklam-yonetimi.html": ["Reklam Yönetimi", "Reklam alanlarını ve yayın tarihlerini yönetin"],
    "canli-servisler.html": ["Canlı Servisler", "Kamera ve trafik kaynaklarını yönetin"],
    "ayarlar.html": ["Ayarlar", "Site ve yönetim ayarlarını düzenleyin"]
  };
  const current = pageData[page] || ["Yönetim Paneli", "Akçaabat Haber yönetim merkezi"];
  const links = [
    ["admin-panel.html", "▦", "Dashboard", "PANEL"],
    ["admin.html", "⌂", "Yönetim Ana Sayfası"],
    ["haberler.html", "▤", "Haberler", "İÇERİK"],
    ["manset-yonetimi.html", "★", "Manşet Yönetimi"],
    ["yeni-haber.html", "＋", "Yeni Haber"],
    ["taslaklar.html", "◫", "Taslaklar"],
    ["kategoriler.html", "☷", "Kategoriler"],
    ["yorumlar.html", "◌", "Yorumlar"],
    ["haber-botu.html", "◆", "Haber Botu", "SERVİSLER"],
    ["mac-yonetimi.html", "⚽", "Maç Merkezi Yönetimi"],
    ["trafik-yonetimi.html", "≋", "Trafik Yönetimi"],
    ["reklam-yonetimi.html", "▣", "Reklam Yönetimi"],
    ["canli-servisler.html", "◉", "Canlı Servisler"],
    ["ayarlar.html", "⚙", "Ayarlar", "SİSTEM"]
  ];
  let navHtml = "";
  links.forEach(function (item) {
    if (item[3]) navHtml += '<div class="unified-admin-label">' + item[3] + "</div>";
    navHtml += '<a class="unified-admin-link' + (page === item[0] ? " active" : "") + '" href="' + item[0] + '"' + (page === item[0] ? ' aria-current="page"' : "") + '><span class="unified-admin-icon">' + item[1] + "</span><span>" + item[2] + "</span></a>";
  });

  const shell = document.createElement("div");
  shell.className = "unified-admin-shell";
  shell.innerHTML = '<aside class="unified-admin-sidebar"><a class="unified-admin-brand" href="admin-panel.html"><span class="unified-admin-mark">AH</span><span class="unified-admin-brand-copy"><strong>AKÇAABAT HABER</strong><span>YÖNETİM MERKEZİ</span></span></a><nav class="unified-admin-nav">' + navHtml + '</nav><div class="unified-admin-sidebar-bottom"><a href="index.html" target="_blank" rel="noopener">↗ Siteyi Görüntüle</a></div></aside><header class="unified-admin-topbar"><button class="unified-admin-menu" id="unifiedAdminMenu" type="button" aria-label="Menüyü aç" aria-expanded="false">☰</button><div class="unified-admin-title"><h1>' + current[0] + '</h1><p>' + current[1] + '</p></div><div class="unified-admin-actions"><div class="unified-admin-user"><strong id="unifiedAdminEmail">Yönetici</strong><span>Yetkili kullanıcı</span></div><a class="unified-admin-view" href="index.html" target="_blank" rel="noopener">Siteyi Aç</a><button class="unified-admin-logout" id="unifiedAdminLogout" type="button">Çıkış</button></div></header><div class="unified-admin-overlay" id="unifiedAdminOverlay"></div>';
  body.insertBefore(shell, body.firstChild);

  const menu = document.getElementById("unifiedAdminMenu");
  const overlay = document.getElementById("unifiedAdminOverlay");
  function closeMenu() { body.classList.remove("admin-menu-open"); if (menu) menu.setAttribute("aria-expanded", "false"); }
  if (menu) menu.addEventListener("click", function () { const open = body.classList.toggle("admin-menu-open"); menu.setAttribute("aria-expanded", String(open)); });
  if (overlay) overlay.addEventListener("click", closeMenu);
  shell.querySelectorAll(".unified-admin-link").forEach(function (link) { link.addEventListener("click", closeMenu); });

  let adminClient = null;
  function getClient() {
    if (adminClient) return adminClient;
    if (!window.supabase || !window.AKCAABAT_SUPABASE) return null;
    adminClient = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
    return adminClient;
  }
  async function loadUser() {
    try {
      const client = getClient();
      if (!client) return;
      const result = await client.auth.getUser();
      const email = result.data && result.data.user && result.data.user.email;
      const target = document.getElementById("unifiedAdminEmail");
      if (target && email) target.textContent = email;
    } catch (_) {}
  }
  const logout = document.getElementById("unifiedAdminLogout");
  if (logout) logout.addEventListener("click", async function () {
    logout.disabled = true;
    logout.textContent = "Çıkılıyor…";
    try { const client = getClient(); if (client) await client.auth.signOut(); } catch (_) {}
    location.replace("admin-giris.html");
  });

  function revealShell() {
    const gated = document.getElementById("adminShell") || document.getElementById("adminApp");
    if (!gated || getComputedStyle(gated).display !== "none") body.classList.add("admin-shell-auth-ready");
  }
  revealShell();
  const observer = new MutationObserver(revealShell);
  const gated = document.getElementById("adminShell") || document.getElementById("adminApp");
  if (gated) observer.observe(gated, { attributes: true, attributeFilter: ["style", "class"] });
  window.setTimeout(function () { revealShell(); loadUser(); }, 300);
})();
