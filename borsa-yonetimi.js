(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const builtIn = window.AKCAABAT_MARKETS || [];
  let catalog = [...builtIn];
  let custom = [];
  let client;
  let order = catalog.map(item => item.id);
  let enabled = new Set(order);
  function status(message, failed) { $("marketStatus").textContent = message; $("marketStatus").classList.toggle("error", !!failed); }
  function render() {
    const list = $("marketList"); list.replaceChildren();
    order.forEach((id, index) => {
      const item = catalog.find(entry => entry.id === id);
      if (!item) return;
      const row = document.createElement("div"); row.className = "market-row";
      const label = document.createElement("label");
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = enabled.has(id);
      input.addEventListener("change", () => { if (input.checked) enabled.add(id); else enabled.delete(id); });
      label.append(input, document.createTextNode(item.name));
      const group = document.createElement("small"); group.textContent = item.group;
      row.append(label, group);
      if (custom.some(entry => entry.id === id)) {
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Sil";
        remove.setAttribute("aria-label", item.name + " kaldır");
        remove.addEventListener("click", () => {
          custom = custom.filter(entry => entry.id !== id);
          catalog = [...builtIn, ...custom];
          order = order.filter(entry => entry !== id); enabled.delete(id);
          render(); status("Piyasa kaldırıldı. Kalıcı olması için değişiklikleri kaydet.");
        });
        row.append(remove);
      }
      for (const [symbol, step, name] of [["↑", -1, "Yukarı taşı"], ["↓", 1, "Aşağı taşı"]]) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = symbol;
        button.disabled = index + step < 0 || index + step >= order.length;
        button.setAttribute("aria-label", item.name + " " + name);
        button.addEventListener("click", () => { [order[index], order[index + step]] = [order[index + step], order[index]]; render(); });
        row.append(button);
      }
      list.append(row);
    });
  }
  async function addMarket(event) {
    event.preventDefault();
    const button = $("marketAdd"); button.disabled = true;
    try {
      const group = $("marketType").value;
      const id = $("marketCode").value.trim()[group === "Döviz" ? "toUpperCase" : "toLowerCase"]();
      const name = $("marketName").value.trim();
      const item = window.AKCAABAT_NORMALIZE_MARKET({ id, name, group });
      if (!item) throw new Error(group === "Döviz" ? "Üç harfli döviz kodu ve geçerli bir ad gir." : "CoinGecko coin kimliği ve geçerli bir ad gir.");
      if (catalog.some(entry => entry.id.toLowerCase() === id.toLowerCase()) || ["USD", "EUR", "XAU", "XAG"].includes(id.toUpperCase())) throw new Error("Bu piyasa zaten listede.");
      let value;
      if (group === "Döviz") {
        const response = await fetch("https://api.frankfurter.dev/v2/rate/" + id.toLowerCase() + "/try");
        if (!response.ok) throw new Error("Döviz kodu veri kaynağında bulunamadı.");
        value = Number((await response.json()).rate);
      } else {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(id) + "&vs_currencies=try");
        if (!response.ok) throw new Error("CoinGecko şu anda yanıt vermiyor. Biraz sonra tekrar dene.");
        value = Number((await response.json())[id]?.try);
      }
      if (!Number.isFinite(value) || value <= 0) throw new Error("Bu kodla TL fiyatı bulunamadı. Sembol yerine veri kaynağındaki coin kimliğini kullan.");
      if (custom.length >= 80) throw new Error("En fazla 80 ek piyasa kaydedilebilir.");
      custom.push(item); catalog.push(item); order.push(id); enabled.add(id);
      $("marketAddForm").reset(); render();
      status(item.name + " eklendi. Ziyaretçilere göstermek için değişiklikleri kaydet.");
    } catch (error) { status(error.message || "Piyasa eklenemedi.", true); }
    finally { button.disabled = false; }
  }
  async function init() {
    try {
      client = window.supabase.createClient(window.AKCAABAT_SUPABASE.url, window.AKCAABAT_SUPABASE.key);
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { location.replace("admin-giris.html"); return; }
      const { data: profile, error: profileError } = await client.from("profiles").select("role,is_active").eq("id", auth.user.id).maybeSingle();
      if (profileError || !profile?.is_active || !["admin", "editor"].includes(profile.role)) throw new Error("Bu sayfa için editör yetkisi gerekiyor.");
      $("marketAdmin").hidden = false;
      const { data, error } = await client.from("site_settings").select("value").eq("key", "market_display").maybeSingle();
      if (error) throw error;
      const saved = data?.value;
      const normalize = window.AKCAABAT_NORMALIZE_MARKET;
      const ids = new Set(builtIn.map(item => item.id.toLowerCase()));
      custom = (Array.isArray(saved?.custom) ? saved.custom : []).slice(0, 80).map(normalize).filter(item => {
        if (!item || ids.has(item.id.toLowerCase())) return false;
        ids.add(item.id.toLowerCase()); return true;
      });
      catalog = [...builtIn, ...custom];
      order = catalog.map(item => item.id);
      if (Array.isArray(saved?.order)) order = [...new Set(saved.order.filter(id => catalog.some(item => item.id === id))), ...order.filter(id => !saved.order.includes(id))];
      enabled = Array.isArray(saved?.enabled) ? new Set(saved.enabled.filter(id => catalog.some(item => item.id === id))) : new Set(order);
      render(); status("Ek piyasa seçeneklerini buradan yönetebilirsin.");
      $("marketAddForm").addEventListener("submit", addMarket);
      $("marketSave").addEventListener("click", async () => {
        const button = $("marketSave"); button.disabled = true;
        try {
          const value = { order, enabled: order.filter(id => enabled.has(id)), custom };
          const result = await client.from("site_settings").upsert({ key: "market_display", value, updated_at: new Date().toISOString() }, { onConflict: "key" }).select("value").single();
          if (result.error) throw result.error;
          if (JSON.stringify(result.data.value) !== JSON.stringify(value)) throw new Error("Kaydedilen ayarlar doğrulanamadı.");
          status("Kaydedildi. Borsa sayfasındaki seçimler güncellendi.");
        } catch (error) { status(error.message || "Ayarlar kaydedilemedi.", true); }
        finally { button.disabled = false; }
      });
    } catch (error) { $("marketAdmin").hidden = false; status(error.message || "Yönetim yüklenemedi.", true); }
  }
  init();
})();
