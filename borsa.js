(function () {
  "use strict";
  const fields = { usd: "usd_try", eur: "eur_try", gold: "gold_try_gram", silver: "silver_try_gram" };
  const formatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const updated = document.getElementById("financeUpdated");
  const error = document.getElementById("financeError");
  const refresh = document.getElementById("financeRefresh");
  const select = document.getElementById("financeSelect");
  const extra = document.getElementById("financeExtra");
  const extraName = document.getElementById("financeExtraName");
  const extraValue = document.getElementById("financeExtraValue");
  const extraMeta = document.getElementById("financeExtraMeta");
  let selectionRequest = 0;
  let hasData = false;
  const catalog = window.AKCAABAT_MARKETS || [];

  function renderOptions(config) {
    const selected = select.value;
    const enabled = Array.isArray(config && config.enabled) ? config.enabled : catalog.map(item => item.id);
    const sequence = Array.isArray(config && config.order) ? config.order : catalog.map(item => item.id);
    const allowed = new Set(enabled);
    const ordered = [...new Set([...sequence, ...catalog.map(item => item.id)])]
      .filter(id => allowed.has(id))
      .map(id => catalog.find(item => item.id === id)).filter(Boolean);
    select.replaceChildren(new Option("Bir piyasa seç", ""));
    for (const groupName of ["Döviz", "Kripto"]) {
      const group = document.createElement("optgroup"); group.label = groupName;
      ordered.filter(item => item.group === groupName).forEach(item => group.append(new Option(item.name, item.id)));
      if (group.children.length) select.append(group);
    }
    if (ordered.some(item => item.id === selected)) select.value = selected;
    else { select.value = ""; extra.hidden = true; ++selectionRequest; }
  }

  async function loadOptions(config) {
    renderOptions();
    try {
      const response = await fetch(config.url + "/rest/v1/site_settings?key=eq.market_display&select=value", { headers: { apikey: config.key, Authorization: "Bearer " + config.key } });
      if (!response.ok) throw new Error("Piyasa seçenekleri alınamadı");
      const rows = await response.json();
      if (rows[0]) renderOptions(rows[0].value);
    } catch (_) { /* Bağlantı kesilirse varsayılan seçenekler görünür kalır. */ }
  }

  async function json(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Veri alınamadı");
    return response.json();
  }

  function showExtra(value, percent, source, when) {
    extraValue.textContent = formatter.format(value) + " ₺";
    const direction = Number.isFinite(percent) && percent > 0 ? "up" : Number.isFinite(percent) && percent < 0 ? "down" : "flat";
    extra.dataset.state = direction;
    const change = direction === "up" ? "▲ %" + formatter.format(percent) : direction === "down" ? "▼ %" + formatter.format(Math.abs(percent)) : "Değişim yok";
    extraMeta.textContent = change + " · " + source + (when ? " · " + when : "");
  }

  async function loadExtra() {
    const key = select.value;
    const request = ++selectionRequest;
    if (!key) { extra.hidden = true; return; }
    extra.hidden = false;
    extraName.textContent = select.selectedOptions[0].textContent;
    extraValue.textContent = "Yükleniyor…";
    extraMeta.textContent = "";
    extra.dataset.state = "flat";
    try {
      if (catalog.some(item => item.id === key && item.group === "Döviz")) {
        const base = "https://api.frankfurter.dev/v2/rate/" + key.toLowerCase() + "/try";
        const latest = await json(base);
        const value = Number(latest.rate);
        if (!Number.isFinite(value) || value <= 0) throw new Error("Kur bulunamadı");
        const priorDate = new Date(latest.date + "T12:00:00Z");
        priorDate.setUTCDate(priorDate.getUTCDate() - 1);
        const previous = await json(base + "?date=" + priorDate.toISOString().slice(0, 10));
        const before = Number(previous.rate);
        if (request !== selectionRequest) return;
        const percent = before > 0 ? (value - before) / before * 100 : NaN;
        showExtra(value, percent, "Frankfurter", latest.date);
      } else {
        const data = await json("https://api.coingecko.com/api/v3/simple/price?ids=" + key + "&vs_currencies=try&include_24hr_change=true&include_last_updated_at=true");
        if (request !== selectionRequest) return;
        const item = data[key];
        const value = Number(item && item.try);
        if (!Number.isFinite(value) || value <= 0) throw new Error("Fiyat bulunamadı");
        const percent = Number(item.try_24h_change);
        const when = item.last_updated_at ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(item.last_updated_at * 1000)) : "";
        showExtra(value, percent, "CoinGecko · 24 saat", when);
      }
    } catch (_) {
      if (request !== selectionRequest) return;
      extraValue.textContent = "Veri alınamadı";
      extraMeta.textContent = "Bu piyasanın güncel verisine ulaşılamıyor. Daha sonra tekrar deneyin.";
    }
  }

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
      await loadOptions(config);
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
  refresh.addEventListener("click", function () { load(); if (select.value) loadExtra(); });
  select.addEventListener("change", loadExtra);
  load();
})();
