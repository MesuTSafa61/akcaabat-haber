(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let client, breaking = [], candidates = [], saving = false;
  const message = (text, error = false) => { $("breakingStatus").textContent = text; $("breakingStatus").classList.toggle("error", error); };
  const orderedIds = () => [...$("breakingList").querySelectorAll("[data-sort-id]")].map(item => item.dataset.sortId);
  function renderCandidates() {
    const term = $("breakingSearch").value.trim().toLocaleLowerCase("tr-TR");
    const select = $("breakingNewsSelect"); select.replaceChildren(new Option("Haber seçin", ""));
    candidates.filter(item => !item.is_breaking && (!term || item.title.toLocaleLowerCase("tr-TR").includes(term)))
      .slice(0, 100).forEach(item => select.add(new Option(item.title, item.id)));
  }
  function render() {
    const list = $("breakingList"); list.replaceChildren();
    if (!breaking.length) { list.textContent = "Henüz son dakika haberi yok."; return; }
    breaking.forEach((item, index) => {
      const row = document.createElement("div"); row.className = "editorial-sort-row"; row.dataset.sortId = item.id;
      const handle = document.createElement("button"); handle.type = "button"; handle.className = "editorial-sort-handle";
      handle.dataset.sortHandle = ""; handle.textContent = "☰"; handle.setAttribute("aria-label", item.title + " haberini sürükle");
      const number = document.createElement("span"); number.className = "editorial-sort-number"; number.textContent = String(index + 1);
      const title = document.createElement("span"); title.className = "editorial-sort-title"; title.textContent = item.title;
      const actions = document.createElement("span"); actions.className = "editorial-sort-actions";
      for (const [label, direction, disabled] of [["↑", -1, index === 0], ["↓", 1, index === breaking.length - 1]]) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.dataset.move = String(direction); button.disabled = disabled;
        button.setAttribute("aria-label", direction < 0 ? "Yukarı taşı" : "Aşağı taşı"); actions.append(button);
      }
      const visible = document.createElement("label"); visible.className = "breaking-visible";
      const check = document.createElement("input"); check.type = "checkbox"; check.checked = item.breaking_visible;
      check.dataset.visible = item.id; visible.append(check, document.createTextNode("Göster"));
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "breaking-remove";
      remove.dataset.remove = item.id; remove.textContent = "Çıkar";
      row.append(handle, number, title, actions, visible, remove); list.append(row);
    });
  }
  async function load() {
    const [newsResult, limitResult] = await Promise.all([
      client.from("news").select("id,title,is_breaking,breaking_order,breaking_visible,published_at")
        .eq("status", "published").order("published_at", { ascending: false }).limit(1000),
      client.from("site_settings").select("value").eq("key", "breaking_news_limit").maybeSingle()
    ]);
    if (newsResult.error) throw newsResult.error;
    if (limitResult.error) throw limitResult.error;
    candidates = newsResult.data || [];
    breaking = candidates.filter(item => item.is_breaking).sort((a, b) =>
      (a.breaking_order - b.breaking_order) || new Date(b.published_at) - new Date(a.published_at));
    $("breakingLimit").value = String(limitResult.data?.value?.limit || 5);
    render(); renderCandidates(); message(breaking.length + " son dakika haberi yönetiliyor.");
  }
  async function saveOrder(ids) {
    if (saving) return;
    saving = true;
    try {
      const { error } = await client.rpc("reorder_breaking_news", { p_news_ids: ids });
      if (error) throw error;
      await load(); message("Son dakika sırası kaydedildi.");
    } catch (error) { await load(); message(error.message || "Sıra kaydedilemedi.", true); }
    finally { saving = false; }
  }
  async function init() {
    try {
      client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { location.replace("admin-giris.html"); return; }
      const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", auth.user.id).maybeSingle();
      if (!profile?.is_active || !["admin", "editor"].includes(profile.role)) throw new Error("Son dakika yönetimi için editör yetkisi gerekiyor.");
      $("breakingAdmin").hidden = false;
      const limit = $("breakingLimit"); for (let n = 1; n <= 12; n++) limit.add(new Option(n + " haber", String(n)));
      window.EditorialSortable.attach($("breakingList"), saveOrder);
      $("breakingList").addEventListener("click", event => {
        const move = event.target.closest("[data-move]");
        if (!move || saving) return;
        const row = move.closest("[data-sort-id]"), rows = [...$("breakingList").querySelectorAll("[data-sort-id]")];
        const other = rows.indexOf(row) + Number(move.dataset.move);
        if (other < 0 || other >= rows.length) return;
        if (other > rows.indexOf(row)) rows[other].after(row); else rows[other].before(row);
        saveOrder(orderedIds());
      });
      $("breakingList").addEventListener("change", async event => {
        const checkbox = event.target.closest("[data-visible]"); if (!checkbox) return;
        const { error } = await client.from("news").update({ breaking_visible: checkbox.checked }).eq("id", checkbox.dataset.visible);
        if (error) { checkbox.checked = !checkbox.checked; message(error.message, true); return; }
        await load(); message("Şeritte görünürlük güncellendi.");
      });
      $("breakingList").addEventListener("click", async event => {
        const remove = event.target.closest("[data-remove]"); if (!remove) return;
        if (!confirm("Bu haberi son dakika şeridinden çıkarmak istiyor musun?")) return;
        const { error } = await client.from("news").update({ is_breaking: false }).eq("id", remove.dataset.remove);
        if (error) { message(error.message, true); return; }
        await load(); message("Haber son dakikadan çıkarıldı.");
      });
      $("breakingSearch").addEventListener("input", renderCandidates);
      $("addBreaking").addEventListener("click", async () => {
        const id = $("breakingNewsSelect").value;
        if (!id) { message("Önce yayımlanmış bir haber seç.", true); return; }
        const { error } = await client.from("news").update({ is_breaking: true }).eq("id", id).eq("status", "published");
        if (error) { message(error.message, true); return; }
        await load(); message("Haber son dakikada ilk sıraya eklendi.");
      });
      $("saveBreakingLimit").addEventListener("click", async () => {
        const value = Number(limit.value);
        const { error } = await client.from("site_settings").upsert({ key: "breaking_news_limit", value: { limit: value }, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) { message(error.message, true); return; }
        message("Şeritte " + value + " haber gösterilecek.");
      });
      await load();
    } catch (error) { $("breakingAdmin").hidden = false; message(error.message || "Yönetim açılamadı.", true); }
  }
  init();
})();
