(function () {
  "use strict";
  const fields = { usd: "usd_try", eur: "eur_try", gold: "gold_try_gram", silver: "silver_try_gram" };
  const formatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const updated = document.getElementById("financeUpdated");
  const error = document.getElementById("financeError");
  const refresh = document.getElementById("financeRefresh");
  let hasData = false;

  function render(data) {
    if (!data || typeof data !== "object") return;
    let count = 0;
    Object.entries(fields).forEach(([key, field]) => {
      const card = document.querySelector('.finance-card[data-key="' + key + '"]');
      const value = Number(data[field]);
      if (!card || !Number.isFinite(value) || value <= 0) return;
      card.querySelector(".finance-value").textContent = formatter.format(value) + " ₺";
      const change = data.changes && data.changes[key];
      const direction = change && ["up", "down"].includes(change.direction) ? change.direction : "flat";
      const percent = Number(change && change.percent);
      card.dataset.state = direction;
      card.querySelector(".finance-change").textContent = direction === "up" ? "▲ Yükseliş" + (percent > 0 ? " %" + formatter.format(percent) : "") : direction === "down" ? "▼ Düşüş" + (percent > 0 ? " %" + formatter.format(percent) : "") : "Değişim yok";
      count++;
    });
    if (!count) return;
    hasData = true;
    const stamp = new Date(data.updated_at);
    updated.textContent = Number.isFinite(stamp.getTime()) ? "Son veri: " + new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(stamp) : "Son erişilebilir piyasa verileri";
    error.hidden = true;
  }

  async function load() {
    refresh.disabled = true;
    try {
      if (!window.AKCAABAT_SUPABASE) {
        await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "supabase-config.js"; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
      }
      const config = window.AKCAABAT_SUPABASE;
      const cached = await fetch(config.url + "/rest/v1/site_settings?key=eq.market_data&select=value", { headers: { apikey: config.key, Authorization: "Bearer " + config.key } });
      if (cached.ok) { const rows = await cached.json(); if (rows[0]) render(rows[0].value); }
      const live = await fetch(config.url + "/functions/v1/market-data", { headers: { Accept: "application/json" } });
      if (!live.ok) throw new Error("Veri alınamadı");
      render(await live.json());
    } catch (_) {
      error.textContent = hasData ? "Yeni veri alınamadı; son erişilebilir değerler gösteriliyor." : "Piyasa verileri şu anda yüklenemiyor. Biraz sonra yeniden deneyin.";
      error.hidden = false;
      if (!hasData) updated.textContent = "Veri alınamadı";
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener("click", load);
  load();
})();
