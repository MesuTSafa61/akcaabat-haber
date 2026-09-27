(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const catalog = window.AKCAABAT_MARKETS || [];
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
      if (Array.isArray(saved?.order)) order = [...new Set(saved.order.filter(id => catalog.some(item => item.id === id))), ...order.filter(id => !saved.order.includes(id))];
      if (Array.isArray(saved?.enabled)) enabled = new Set(saved.enabled.filter(id => catalog.some(item => item.id === id)));
      render(); status("Ek piyasa seçeneklerini buradan yönetebilirsin.");
      $("marketSave").addEventListener("click", async () => {
        const button = $("marketSave"); button.disabled = true;
        try {
          const value = { order, enabled: order.filter(id => enabled.has(id)) };
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
