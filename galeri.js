(function () {
  "use strict";
  const view = document.body.dataset.galleryView;
  const status = document.getElementById("galleryStatus");
  const $ = id => document.getElementById(id);
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; }
    catch { return ""; }
  };
  const itemsOf = gallery => Array.isArray(gallery.items) ? gallery.items : [];
  function coverOf(gallery) {
    const first = itemsOf(gallery)[0];
    return safeUrl(gallery.cover_url || (gallery.kind === "photo" ? first?.url : first?.poster_url));
  }
  function notice(message) { status.textContent = message; }
  function picture(url, alt) {
    const image = document.createElement("img");
    image.src = url; image.alt = alt; image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    return image;
  }
  function card(gallery) {
    const link = document.createElement("a");
    link.href = "galeri-detay.html?id=" + encodeURIComponent(gallery.id);
    const article = document.createElement("article"); article.className = "gallery-card";
    const media = document.createElement("div"); media.className = "gallery-card-image";
    media.textContent = gallery.kind === "video" ? "▶" : "▧";
    const cover = coverOf(gallery);
    if (cover) media.append(picture(cover, ""));
    const badge = document.createElement("span"); badge.className = "gallery-badge";
    badge.textContent = itemsOf(gallery).length + (gallery.kind === "photo" ? " fotoğraf" : " video");
    media.append(badge);
    const copy = document.createElement("div"); copy.className = "gallery-card-copy";
    const title = document.createElement("h2"); title.textContent = gallery.title;
    const description = document.createElement("p"); description.textContent = gallery.description || "";
    const date = document.createElement("small");
    date.textContent = new Date(gallery.updated_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    copy.append(title, description, date); link.append(media, copy); article.append(link);
    return article;
  }
  function youtubeEmbed(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return "";
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const id = host === "youtu.be" ? url.pathname.slice(1) :
        ["youtube.com", "m.youtube.com"].includes(host) ?
          (url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]) : "";
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? "https://www.youtube-nocookie.com/embed/" + id : "";
    } catch { return ""; }
  }
  function renderPhotos(gallery, target) {
    const photos = itemsOf(gallery).filter(item => safeUrl(item?.url));
    if (!photos.length) { notice("Bu galeride henüz fotoğraf yok."); return; }
    let index = 0;
    const viewer = document.createElement("div"); viewer.className = "gallery-viewer";
    const previous = document.createElement("button"); previous.type = "button"; previous.textContent = "‹"; previous.setAttribute("aria-label", "Önceki fotoğraf");
    const image = picture(safeUrl(photos[0].url), photos[0].caption || gallery.title);
    const next = document.createElement("button"); next.type = "button"; next.textContent = "›"; next.setAttribute("aria-label", "Sonraki fotoğraf");
    const caption = document.createElement("p"); caption.className = "gallery-caption";
    const thumbs = document.createElement("div"); thumbs.className = "gallery-thumbs";
    const select = value => {
      index = (value + photos.length) % photos.length;
      image.src = safeUrl(photos[index].url);
      image.alt = photos[index].caption || gallery.title;
      caption.textContent = (index + 1) + "/" + photos.length + (photos[index].caption ? " · " + photos[index].caption : "");
      thumbs.querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-current", String(i === index)));
    };
    previous.addEventListener("click", () => select(index - 1));
    next.addEventListener("click", () => select(index + 1));
    photos.forEach((item, i) => {
      const button = document.createElement("button"); button.type = "button";
      button.setAttribute("aria-label", (i + 1) + ". fotoğrafı göster");
      button.append(picture(safeUrl(item.url), ""));
      button.addEventListener("click", () => select(i)); thumbs.append(button);
    });
    document.addEventListener("keydown", event => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (event.key === "ArrowLeft") select(index - 1);
      if (event.key === "ArrowRight") select(index + 1);
    });
    viewer.append(previous, image, next); target.append(viewer, caption, thumbs); select(0);
  }
  function renderVideos(gallery, target) {
    const videos = itemsOf(gallery).filter(item => youtubeEmbed(item?.url) ||
      (/\.(?:mp4|webm)$/i.test(new URL(safeUrl(item?.url) || "https://invalid.example").pathname) && safeUrl(item?.url)));
    if (!videos.length) { notice("Bu galeride henüz video yok."); return; }
    const list = document.createElement("div"); list.className = "gallery-video-list";
    videos.forEach(item => {
      const card = document.createElement("article"); card.className = "gallery-video-card";
      const frame = document.createElement("div"); frame.className = "gallery-video-frame";
      const embed = youtubeEmbed(item.url);
      if (embed) {
        const play = document.createElement("button"); play.type = "button";
        play.setAttribute("aria-label", "Videoyu oynat: " + (item.caption || gallery.title));
        const poster = safeUrl(item.poster_url);
        if (poster) play.append(picture(poster, ""));
        const icon = document.createElement("span"); icon.textContent = "▶"; play.append(icon);
        play.addEventListener("click", () => {
          const iframe = document.createElement("iframe"); iframe.src = embed + "?autoplay=1";
          iframe.title = item.caption || gallery.title;
          iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
          iframe.allowFullscreen = true; frame.replaceChildren(iframe);
        });
        frame.append(play);
      } else {
        const video = document.createElement("video"); video.controls = true; video.playsInline = true; video.preload = "metadata";
        video.src = safeUrl(item.url); video.poster = safeUrl(item.poster_url); frame.append(video);
      }
      const caption = document.createElement("p"); caption.textContent = item.caption || gallery.title;
      card.append(frame, caption); list.append(card);
    });
    target.append(list);
  }
  async function init() {
    try {
      if (!window.supabase || !window.AKCAABAT_SUPABASE) throw new Error("Bağlantı kurulamadı.");
      const client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
      if (view === "detail") {
        const id = new URLSearchParams(location.search).get("id");
        if (!/^[0-9a-f-]{36}$/i.test(id || "")) throw new Error("Galeri bulunamadı.");
        const { data: gallery, error } = await client.from("media_galleries").select("id,title,description,kind,status,items,cover_url,updated_at")
          .eq("id", id).eq("status", "published").maybeSingle();
        if (error) throw error;
        if (!gallery) throw new Error("Galeri bulunamadı.");
        document.title = gallery.title + " | Akçaabat Haber";
        $("galleryBack").href = gallery.kind === "photo" ? "foto-galeri.html" : "video-galeri.html";
        $("galleryKind").textContent = gallery.kind === "photo" ? "FOTO GALERİ" : "VİDEO GALERİ";
        $("galleryTitle").textContent = gallery.title;
        $("galleryDescription").textContent = gallery.description || "";
        if (gallery.kind === "photo") renderPhotos(gallery, $("galleryContent"));
        else renderVideos(gallery, $("galleryContent"));
        return;
      }
      const { data, error } = await client.from("media_galleries").select("id,title,description,kind,items,cover_url,updated_at")
        .eq("status", "published").eq("kind", view).order("updated_at", { ascending: false }).limit(80);
      if (error) throw error;
      const galleries = (data || []).filter(gallery => itemsOf(gallery).length);
      notice(galleries.length ? galleries.length + " galeri" : "Henüz yayımlanmış galeri bulunmuyor.");
      galleries.forEach(gallery => $("galleryGrid").append(card(gallery)));
    } catch (error) { notice(error.message || "Galeriler yüklenemedi."); }
  }
  init();
})();
