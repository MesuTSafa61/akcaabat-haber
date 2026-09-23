/* Akçaabat Haber — yalnızca açık tercih ile anonim ziyaret sayımı. */
(function () {
  "use strict";
  const preferenceKey = "akcaabat-analytics-preference-v1";
  const idPrefix = "akcaabat-analytics-day-";
  let enabled = false;
  let visitorId = "";
  let visitorDay = "";
  let heartbeat = null;
  let page = "";

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function today() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(function (part) { return [part.type, part.value]; }));
    return value.year + "-" + value.month + "-" + value.day;
  }
  function dailyId() {
    const day = today();
    if (visitorId && visitorDay === day) return visitorId;
    visitorId = "";
    const key = idPrefix + day;
    let id = storageGet(key);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      if (!storageSet(key, id)) return "";
      try {
        Object.keys(localStorage).forEach(function (oldKey) {
          if (oldKey.startsWith(idPrefix) && oldKey !== key) localStorage.removeItem(oldKey);
        });
      } catch (_) { /* depolama engellenmiş olabilir */ }
    }
    visitorId = id;
    visitorDay = day;
    return id;
  }
  function withConfig(callback) {
    if (window.AKCAABAT_SUPABASE) return callback();
    let finished = false;
    function ready() {
      if (!finished && window.AKCAABAT_SUPABASE) {
        finished = true;
        callback();
      }
    }
    let script = document.querySelector('script[src="supabase-config.js"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "supabase-config.js";
      document.head.appendChild(script);
    }
    script.addEventListener("load", ready, { once: true });
    window.setTimeout(ready, 800);
  }
  function send(pageview) {
    if (!enabled || document.visibilityState !== "visible") return;
    const config = window.AKCAABAT_SUPABASE;
    const id = dailyId();
    if (!config || !config.url || !config.key || !id) return;
    fetch(config.url + "/rest/v1/rpc/record_site_visit", {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: "Bearer " + config.key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_visitor_id: id, p_path: page, p_pageview: pageview }),
      keepalive: !pageview
    }).catch(function () { /* istatistik hatası sayfa kullanımını etkilemez */ });
  }
  function enable() {
    if (enabled) return;
    enabled = true;
    withConfig(function () { send(true); });
    if (!heartbeat) {
      heartbeat = window.setInterval(function () { send(false); }, 60000);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") send(false);
      });
    }
  }
  function showChoice() {
    document.getElementById("analytics-choice")?.remove();
    const notice = document.createElement("aside");
    notice.id = "analytics-choice";
    notice.className = "analytics-choice";
    notice.setAttribute("aria-label", "İstatistik tercihi");
    notice.innerHTML = '<div><strong>Ziyaret istatistikleri</strong><p>Günlük ziyaret ve anlık aktiflik sayısını anonim bir günlük tanımlayıcıyla ölçmemize izin verir misiniz? <a href="cerez-politikasi.html">Ayrıntılar</a></p></div><div class="analytics-choice-actions"><button type="button" data-analytics-choice="no">Reddet</button><button type="button" data-analytics-choice="yes">Kabul et</button></div>';
    notice.querySelectorAll("[data-analytics-choice]").forEach(function (button) {
      button.addEventListener("click", function () {
        const accept = button.dataset.analyticsChoice === "yes";
        storageSet(preferenceKey, accept ? "yes" : "no");
        notice.remove();
        if (accept) enable();
        else enabled = false;
      });
    });
    document.body.appendChild(notice);
  }

  page = "/" + (location.pathname.split("/").pop() || "index.html");
  const preferenceButton = document.createElement("button");
  preferenceButton.type = "button";
  preferenceButton.className = "analytics-preference-link";
  preferenceButton.textContent = "İstatistik tercihi";
  preferenceButton.addEventListener("click", showChoice);
  document.querySelector(".unified-site-footer .footer-column:last-child")?.appendChild(preferenceButton);
  const choice = storageGet(preferenceKey);
  if (choice === "yes") enable();
  else if (choice !== "no") showChoice();
})();
