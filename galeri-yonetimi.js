(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const page = $("galleryAdmin"), status = $("galleryStatus");
  let client, galleries = [], current = null;
  const safeUrl = value => {
    if (!value) return "";
    try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; }
    catch { return ""; }
  };
  const youtube = value => {
    try {
      const url = new URL(value), host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol !== "https:") return false;
      const id = host === "youtu.be" ? url.pathname.slice(1) :
        ["youtube.com", "m.youtube.com"].includes(host) ?
          (url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]) : "";
      return /^[A-Za-z0-9_-]{11}$/.test(id || "");
    } catch { return false; }
  };
  function message(value, error = false) { status.textContent = value; status.classList.toggle("error", error); }
  function makeButton(text, action) { const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.addEventListener("click", action); return button; }
  function resetForm() {
    current = null; $("galleryForm").reset(); $("galleryItemForm").reset();
    $("galleryItemsPanel").hidden = true; $("galleryKind").disabled = false;
    renderList(); message("Yeni galeri oluşturabilirsin.");
  }
  function selectGallery(gallery) {
    current = gallery;
    $("galleryKind").value = gallery.kind;
    $("galleryKind").disabled = (gallery.items || []).length > 0;
    $("galleryPublish").value = gallery.status;
    $("galleryTitleInput").value = gallery.title;
    $("galleryDescriptionInput").value = gallery.description || "";
    $("galleryCoverInput").value = gallery.cover_url || "";
    $("galleryItemsPanel").hidden = false;
    $("galleryPublishRow").hidden = gallery.status === "published" || !(gallery.items || []).length;
    $("galleryItemsTitle").textContent = gallery.title + " · Medyalar";
    $("galleryFile").accept = gallery.kind === "photo" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm";
    $("posterField").hidden = gallery.kind !== "video";
    $("galleryPublicLink").href = "galeri-detay.html?id=" + encodeURIComponent(gallery.id);
    $("galleryPublicLink").hidden = gallery.status !== "published";
    renderList(); renderItems(); message(gallery.title + " seçildi.");
  }
  function renderList() {
    const target = $("galleryList"); target.replaceChildren();
    if (!galleries.length) { target.textContent = "Henüz galeri oluşturulmadı."; return; }
    galleries.forEach(gallery => {
      const row = document.createElement("div"); row.className = "gallery-admin-row";
      const copy = document.createElement("div"), title = document.createElement("strong"), info = document.createElement("small");
      title.textContent = gallery.title;
      info.textContent = (gallery.kind === "photo" ? "Foto" : "Video") + " · " + (gallery.items || []).length + " medya · " + (gallery.status === "published" ? "Yayında" : "Taslak");
      copy.append(title, info); row.append(copy, makeButton(current?.id === gallery.id ? "Seçili" : "Düzenle", () => selectGallery(gallery)));
      target.append(row);
    });
  }
  function renderItems() {
    const target = $("galleryItems"); target.replaceChildren();
    if (!current) return;
    const items = Array.isArray(current.items) ? current.items : [];
    if (!items.length) { target.textContent = "Henüz medya eklenmedi."; return; }
    items.forEach((item, index) => {
      const row = document.createElement("div"); row.className = "gallery-admin-item";
      const preview = document.createElement("div"); preview.className = "gallery-admin-thumb"; preview.textContent = current.kind === "photo" ? "▧" : "▶";
      const imageUrl = safeUrl(current.kind === "photo" ? item.url : item.poster_url);
      if (imageUrl) { const image = document.createElement("img"); image.src = imageUrl; image.alt = ""; image.addEventListener("error", () => image.remove()); preview.append(image); }
      const copy = document.createElement("div"), label = document.createElement("strong"), sub = document.createElement("small");
      label.textContent = item.caption || (index + 1) + ". medya";
      let filename = "Medya bağlantısı";
      try { filename = decodeURIComponent(new URL(item.url).pathname.split("/").pop()) || filename; } catch (_) {}
      sub.textContent = filename; sub.title = item.url; copy.append(label, sub);
      const controls = document.createElement("div"); controls.className = "controls";
      controls.append(makeButton("↑", () => moveItem(index, -1)), makeButton("↓", () => moveItem(index, 1)), makeButton("Kaldır", () => removeItem(index)));
      row.append(preview, copy, controls); target.append(row);
    });
  }
  async function refresh(selectId) {
    const { data, error } = await client.from("media_galleries").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    galleries = data || [];
    const selected = galleries.find(item => item.id === selectId);
    if (selected) selectGallery(selected);
    else resetForm();
  }
  async function saveItems(items, cover) {
    const { error } = await client.from("media_galleries").update({ items, cover_url: cover, updated_at: new Date().toISOString() }).eq("id", current.id);
    if (error) throw error;
    await refresh(current.id);
  }
  async function moveItem(index, offset) {
    const items = [...current.items], other = index + offset;
    if (other < 0 || other >= items.length) return;
    [items[index], items[other]] = [items[other], items[index]];
    try { await saveItems(items, current.cover_url); message("Sıra güncellendi."); }
    catch (error) { message(error.message, true); }
  }
  async function removeItem(index) {
    if (!confirm("Bu medyayı galeriden kaldırmak istiyor musun?")) return;
    const items = current.items.filter((_, i) => i !== index);
    const cover = current.cover_url === current.items[index].url || current.cover_url === current.items[index].poster_url ?
      (items[0]?.poster_url || items[0]?.url || null) : current.cover_url;
    try { await saveItems(items, cover); message("Medya kaldırıldı."); }
    catch (error) { message(error.message, true); }
  }
  async function saveGallery(event) {
    event.preventDefault();
    try {
      const title = $("galleryTitleInput").value.trim(), kind = $("galleryKind").value;
      const cover = $("galleryCoverInput").value.trim();
      if (cover && !safeUrl(cover)) throw new Error("Kapak adresi HTTPS olmalı.");
      if ($("galleryPublish").value === "published" && !current?.items?.length) throw new Error("Yayımlamak için önce medya ekle.");
      const fields = { title, kind, description: $("galleryDescriptionInput").value.trim(), status: $("galleryPublish").value,
        cover_url: cover || current?.cover_url || null, updated_at: new Date().toISOString() };
      const query = current ? client.from("media_galleries").update(fields).eq("id", current.id) : client.from("media_galleries").insert(fields);
      const { data, error } = await query.select("id").single();
      if (error) throw error;
      await refresh(data.id); message("Galeri kaydedildi.");
    } catch (error) { message(error.message || "Galeri kaydedilemedi.", true); }
  }
  async function addItem(event) {
    event.preventDefault();
    if (!current) return;
    try {
      message("Medya ekleniyor…");
      let url = $("galleryItemUrl").value.trim();
      const file = $("galleryFile").files[0];
      if (file) {
        const allowed = current.kind === "photo" ? ["image/jpeg","image/png","image/webp","image/gif"] : ["video/mp4","video/webm"];
        if (!allowed.includes(file.type)) throw new Error("Dosya türü galeriye uygun değil.");
        if (file.size > (current.kind === "photo" ? 10 : 50) * 1024 * 1024) throw new Error("Dosya boyutu sınırı aşıldı.");
        const extension = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/gif":"gif", "video/mp4":"mp4", "video/webm":"webm" }[file.type];
        const path = current.id + "/" + crypto.randomUUID() + "." + extension;
        const uploaded = await client.storage.from("media-galleries").upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (uploaded.error) throw uploaded.error;
        url = client.storage.from("media-galleries").getPublicUrl(path).data.publicUrl;
      }
      if (!safeUrl(url)) throw new Error("Dosya seç veya HTTPS bağlantısı gir.");
      if (current.kind === "video" && !youtube(url) && !/\.(?:mp4|webm)$/i.test(new URL(url).pathname)) throw new Error("Video için YouTube, MP4 veya WebM bağlantısı gir.");
      const poster = $("galleryPoster").value.trim();
      if (poster && !safeUrl(poster)) throw new Error("Video kapak adresi HTTPS olmalı.");
      const item = { url, caption: $("galleryCaption").value.trim(), poster_url: current.kind === "video" ? poster || null : null };
      const items = [...(current.items || []), item];
      const cover = current.cover_url || (current.kind === "photo" ? url : poster || null);
      await saveItems(items, cover);
      $("galleryItemForm").reset(); message("Medya eklendi.");
    } catch (error) { message(error.message || "Medya eklenemedi.", true); }
  }
  async function init() {
    try {
      if (!window.supabase || !window.AKCAABAT_SUPABASE) throw new Error("Bağlantı ayarları eksik.");
      client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
      const { data: userResult } = await client.auth.getUser();
      if (!userResult.user) { location.replace("admin-giris.html"); return; }
      const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", userResult.user.id).maybeSingle();
      if (!profile?.is_active || !["admin","editor"].includes(profile.role)) throw new Error("Galeri yönetimi için editör yetkisi gerekiyor.");
      page.hidden = false;
      $("galleryForm").addEventListener("submit", saveGallery);
      $("galleryItemForm").addEventListener("submit", addItem);
      $("newGallery").addEventListener("click", resetForm);
      $("galleryPublishNow").addEventListener("click", async () => {
        if (!current || !(current.items || []).length) return;
        const button = $("galleryPublishNow"); button.disabled = true;
        try {
          const { error } = await client.from("media_galleries").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", current.id);
          if (error) throw error;
          await refresh(current.id); message("Galeri yayında. Ana sayfada ve galeri bölümünde görünecek.");
        } catch (error) { message(error.message || "Galeri yayımlanamadı.", true); }
        finally { button.disabled = false; }
      });
      $("galleryKind").addEventListener("change", () => { $("galleryFile").accept = $("galleryKind").value === "photo" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm"; });
      await refresh(null);
      if (new URLSearchParams(location.search).get("kind") === "video") {
        $("galleryKind").value = "video";
        $("galleryFile").accept = "video/mp4,video/webm";
      }
      message("Galeriler hazır. Önce galeri oluştur, sonra medyaları ekle ve yayımla.");
    } catch (error) { page.hidden = false; message(error.message || "Galeriler yüklenemedi.", true); }
  }
  init();
})();
