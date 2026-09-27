(function () {
  "use strict";
  const grid = document.getElementById("homeGalleryGrid");
  if (!grid) return;
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; }
    catch (_) { return ""; }
  };
  function card(gallery) {
    const article = document.createElement("article"); article.className = "gallery-card";
    const link = document.createElement("a"); link.href = "galeri-detay.html?id=" + encodeURIComponent(gallery.id);
    const media = document.createElement("div"); media.className = "gallery-card-image";
    media.textContent = gallery.kind === "video" ? "▶" : "▧";
    const first = Array.isArray(gallery.items) ? gallery.items[0] : null;
    const cover = safeUrl(gallery.cover_url || (gallery.kind === "photo" ? first?.url : first?.poster_url));
    if (cover) {
      const image = document.createElement("img"); image.src = cover; image.alt = "";
      image.loading = "lazy"; image.addEventListener("error", () => image.remove(), { once: true }); media.append(image);
    }
    const badge = document.createElement("span"); badge.className = "gallery-badge";
    badge.textContent = gallery.kind === "photo" ? "FOTO GALERİ" : "VİDEO GALERİ"; media.append(badge);
    const copy = document.createElement("div"); copy.className = "gallery-card-copy";
    const title = document.createElement("h2"); title.textContent = gallery.title;
    const count = document.createElement("small");
    count.textContent = gallery.items.length + (gallery.kind === "photo" ? " fotoğraf" : " video");
    copy.append(title, count); link.append(media, copy); article.append(link);
    return article;
  }
  async function load() {
    try {
      const config = window.AKCAABAT_SUPABASE;
      if (!config) throw new Error("Bağlantı kurulamadı.");
      const response = await fetch(config.url + "/rest/v1/media_galleries?select=id,title,kind,cover_url,items&status=eq.published&order=updated_at.desc&limit=6", {
        headers: { apikey: config.key, Authorization: "Bearer " + config.key }
      });
      if (!response.ok) throw new Error("Galeriler alınamadı.");
      const galleries = (await response.json()).filter(item => Array.isArray(item.items) && item.items.length).slice(0, 4);
      grid.replaceChildren();
      if (!galleries.length) {
        const empty = document.createElement("p"); empty.className = "gallery-empty";
        empty.textContent = "Henüz yayımlanmış fotoğraf veya video galerisi yok."; grid.append(empty); return;
      }
      galleries.forEach(item => grid.append(card(item)));
    } catch (error) {
      grid.replaceChildren();
      const empty = document.createElement("p"); empty.className = "gallery-empty";
      empty.textContent = "Galeriler şu an yüklenemedi."; grid.append(empty);
    }
  }
  load();
})();
