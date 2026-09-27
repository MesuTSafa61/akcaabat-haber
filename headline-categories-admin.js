(function () {
  "use strict";
  const defaults = ["Akçaabat", "Trabzon", "Trabzonspor", "Gündem", "Spor"];
  const editor = document.getElementById("sideCategoryEditor");
  const picker = document.getElementById("addSideCategory");
  const status = document.getElementById("sideCategoryStatus");
  const save = document.getElementById("saveSideCategories");
  const add = document.getElementById("addSideCategoryButton");
  let client, categories = [], news = [], tabs = [], searches = {};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  const note = (value, error) => { status.textContent = value; status.style.color = error ? "#b42318" : "#475467"; };
  const matches = (item, name) => item.categories?.name?.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR");

  function readChoices() {
    editor.querySelectorAll(".side-category-admin-row").forEach(row => {
      const tab = tabs[Number(row.dataset.index)];
      if (tab) tab.pinned = [...row.querySelectorAll("select[data-position]")].map(select => select.value).filter(Boolean);
    });
  }

  function render() {
    picker.innerHTML = '<option value="">Kategori seç…</option>' + categories.filter(category => !tabs.some(tab => tab.name === category.name))
      .map(category => '<option value="' + esc(category.name) + '">' + esc(category.name) + '</option>').join("");
    add.disabled = tabs.length >= 8 || !picker.options.length || picker.options.length === 1;
    editor.innerHTML = tabs.map((tab, index) => {
      const eligible = news.filter(item => matches(item, tab.name));
      const query = (searches[tab.name] || "").toLocaleLowerCase("tr-TR");
      const filtered = eligible.filter(item => !query || item.title.toLocaleLowerCase("tr-TR").includes(query));
      const chosen = tab.pinned.map(id => eligible.find(item => item.id === id)).filter(Boolean);
      const options = [...new Map(chosen.concat(filtered).map(item => [item.id, item])).values()];
      const selects = Array.from({ length: 4 }, (_, position) => '<label>Sabit haber ' + (position + 1) + '<select data-position="' + position + '"><option value="">En yeni haber (otomatik)</option>' + options.map(item => '<option value="' + esc(item.id) + '"' + (item.id === tab.pinned[position] ? ' selected' : '') + '>' + esc(item.title) + '</option>').join("") + '</select></label>').join("");
      return '<div class="side-category-admin-row" data-index="' + index + '"><div class="side-category-admin-head"><strong>' + esc(tab.name) + '</strong><span><button type="button" data-move="-1"' + (!index ? ' disabled' : '') + ' aria-label="' + esc(tab.name) + ' yukarı taşı">↑</button><button type="button" data-move="1"' + (index === tabs.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(tab.name) + ' aşağı taşı">↓</button><button type="button" data-remove aria-label="' + esc(tab.name) + ' sekmesini kaldır">Kaldır</button></span></div><label>Bu kategoride haber ara<input type="search" data-search value="' + esc(searches[tab.name] || '') + '" placeholder="Başlığa göre ara…"></label><div class="side-category-admin-pins">' + selects + '</div><small>' + eligible.length + ' yayınlanmış haber · Sabit seçilmeyen yerler en yeni haberlerle dolar.</small></div>';
    }).join("") || '<p>Manşetin yanındaki alan gizli. Kategori ekleyerek açabilirsin.</p>';
  }

  editor.addEventListener("input", event => {
    if (!event.target.matches("[data-search]")) return;
    readChoices();
    const row = event.target.closest("[data-index]");
    const index = Number(row.dataset.index);
    searches[tabs[index].name] = event.target.value;
    const offset = event.target.selectionStart;
    render();
    const input = editor.querySelectorAll("[data-search]")[index];
    input.focus(); input.setSelectionRange(offset, offset);
  });
  editor.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const row = button.closest("[data-index]");
    if (!row) return;
    readChoices();
    const index = Number(row.dataset.index);
    if (button.hasAttribute("data-remove")) tabs.splice(index, 1);
    else if (button.hasAttribute("data-move")) {
      const other = index + Number(button.dataset.move);
      if (other < 0 || other >= tabs.length) return;
      [tabs[index], tabs[other]] = [tabs[other], tabs[index]];
    }
    render();
  });
  add.addEventListener("click", () => {
    readChoices();
    if (!picker.value || tabs.length >= 8) return;
    tabs.push({ name: picker.value, pinned: [] });
    render();
  });
  save.addEventListener("click", async () => {
    readChoices();
    const clean = tabs.map(tab => ({ name: tab.name, pinned: tab.pinned }));
    for (const tab of clean) {
      if (new Set(tab.pinned).size !== tab.pinned.length) { note(tab.name + ': Aynı haberi iki kez sabitleyemezsin.', true); return; }
      if (tab.pinned.some(id => !news.some(item => item.id === id && matches(item, tab.name)))) { note(tab.name + ': Seçilen haber yayında değil veya başka kategoride.', true); return; }
    }
    save.disabled = true;
    try {
      const { data, error } = await client.from("site_settings").upsert({ key: "homepage_side_categories", value: { tabs: clean }, updated_at: new Date().toISOString() }, { onConflict: "key" }).select("value").single();
      if (error) throw error;
      if (JSON.stringify(data?.value?.tabs) !== JSON.stringify(clean)) throw Error("Kaydedilen sekmeler doğrulanamadı.");
      note("Manşet yanı kategorileri kaydedildi. Ana sayfada görünür.");
    } catch (error) { note(error.message || "Sekmeler kaydedilemedi.", true); }
    finally { save.disabled = false; }
  });

  async function init(supabaseClient) {
    client = supabaseClient;
    const [categoryResult, newsResult, settingResult] = await Promise.all([
      client.from("categories").select("id,name").order("name"),
      client.from("news").select("id,title,status,published_at,categories(id,name)").eq("status", "published").order("published_at", { ascending: false }).limit(1000),
      client.from("site_settings").select("value").eq("key", "homepage_side_categories").maybeSingle()
    ]);
    if (categoryResult.error || newsResult.error || settingResult.error) throw categoryResult.error || newsResult.error || settingResult.error;
    categories = categoryResult.data || [];
    news = newsResult.data || [];
    const configured = settingResult.data?.value?.tabs;
    tabs = (Array.isArray(configured) ? configured : defaults.map(name => ({ name, pinned: [] })))
      .filter(tab => categories.some(category => category.name === tab.name)).slice(0, 8)
      .map(tab => ({ name: tab.name, pinned: Array.isArray(tab.pinned) ? tab.pinned.slice(0, 4).filter(Boolean) : [] }));
    const missing = [...new Set(tabs.flatMap(tab => tab.pinned))].filter(id => !news.some(item => item.id === id));
    if (missing.length) {
      const { data, error } = await client.from("news").select("id,title,status,published_at,categories(id,name)").eq("status", "published").in("id", missing);
      if (error) throw error;
      news.push(...(data || []));
    }
    render();
    note("Sekmeler hazır. Değişiklikleri kaydettiğinde ana sayfaya yansır.");
  }
  window.HeadlineCategoriesAdmin = { init };
})();
