(() => {
  "use strict";
  const main = document.querySelector("[data-local-service]");
  const output = document.getElementById("localServiceContent");
  if (!main || !output) return;
  const kind = main.dataset.localService;
  const prayerNames = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"];
  const sourceUrls = {
    prayer: "https://namazvakitleri.diyanet.gov.tr/tr-TR/9891/akcaabat-namaz-vakitleri",
    pharmacy: "https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/61/1113",
    obituaries: "https://www.akcaabat.bel.tr/vefat-edenler.aspx"
  };
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const localTime = () => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const dateLabel = date => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Europe/Istanbul" }).format(new Date(date + "T12:00:00+03:00"));
  function tag(name, className, value) { const node = document.createElement(name); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; }
  function link(label, href, secondary = false) { const a = tag("a", "local-button" + (secondary ? " secondary" : ""), label); a.href = href; if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; } return a; }
  function sourceNote(label, url) { const p = tag("p", "local-source", "Kaynak: "); p.append(link(label + " ↗", url, true)); return p; }
  function empty(message, url, label) { const box = tag("div", "local-empty"); box.append(tag("strong", "", message)); box.append(tag("p", "", "Bilgileri doğrudan resmî sayfadan kontrol edebilirsiniz.")); box.append(link(label, url)); return box; }
  function renderPrayer(data) {
    const section = tag("section", "local-panel");
    section.append(tag("h2", "", "Bugünün namaz vakitleri"));
    const day = (data.days || []).find(item => item.date === today() && Array.isArray(item.times) && item.times.length === 6 && item.times.every(time => /^\d{2}:\d{2}$/.test(time)));
    if (!day) { section.append(empty("Bugünün doğrulanmış vakitleri henüz alınamadı.", sourceUrls.prayer, "Diyanet'te vakitleri aç ↗")); output.replaceChildren(section); return; }
    section.append(tag("div", "local-meta", dateLabel(day.date) + "  •  Akçaabat / Trabzon"));
    const next = tag("div", "prayer-next"); const nextTitle = tag("div"); const small = tag("small", "", "SIRADAKİ VAKİT"); const nextName = tag("strong"); const nextTime = tag("time"); nextTitle.append(small, nextName); next.append(nextTitle, nextTime); section.append(next);
    const grid = tag("div", "prayer-grid"); const slots = day.times.map((time, i) => { const card = tag("div", "prayer-slot"); card.append(tag("span", "", prayerNames[i]), tag("strong", "", time)); grid.append(card); return card; }); section.append(grid);
    const countdown = tag("p", "local-note"); section.append(countdown);
    function update() {
      const clock = localTime(); const index = day.times.findIndex(time => time > clock); slots.forEach((slot, i) => slot.classList.toggle("active", i === index));
      if (index < 0) { nextName.textContent = "Yarınki İmsak"; nextTime.textContent = "—"; countdown.textContent = "Yarınki vakitleri Diyanet'ten kontrol edin."; return; }
      nextName.textContent = prayerNames[index]; nextTime.textContent = day.times[index];
      const [hour, minute] = day.times[index].split(":").map(Number); const now = new Date(); const currentMinutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":")[0]) * 60 + Number(localTime().split(":")[1]);
      const remaining = hour * 60 + minute - currentMinutes; countdown.textContent = `Sıradaki vakte yaklaşık ${Math.floor(remaining / 60)} saat ${remaining % 60} dakika kaldı.`;
    }
    update(); setInterval(() => { if (today() !== day.date) location.reload(); else update(); }, 30000);
    section.append(sourceNote("Diyanet İşleri Başkanlığı", sourceUrls.prayer));
    const weekly = tag("section", "local-panel"); weekly.append(tag("h2", "", "Yaklaşan günler"));
    const future = (data.days || []).filter(item => item.date > today()).slice(0, 5);
    if (future.length) { const list = tag("div", "memorial-list"); for (const item of future) { const row = tag("div", "memorial-card"); row.append(tag("strong", "", dateLabel(item.date))); row.append(tag("p", "", "İmsak " + item.times[0] + " · Öğle " + item.times[2] + " · Akşam " + item.times[4])); list.append(row); } weekly.append(list); } else weekly.append(tag("p", "", "Yeni vakitler resmî kaynaktan güncellendiğinde burada görüntülenecek."));
    output.replaceChildren(section, weekly);
  }
  function renderPharmacy(data) {
    const section = tag("section", "local-panel"); const heading = tag("div", "local-heading-row"); heading.append(tag("h2", "", "Bugün nöbetçi olanlar"), link("Resmî liste ↗", sourceUrls.pharmacy, true)); section.append(heading);
    const valid = Array.isArray(data.items) && data.items.length > 0 && (data.startsAt && data.endsAt ? new Date(data.startsAt) <= new Date() && new Date(data.endsAt) > new Date() : data.date === today());
    if (!valid) { section.append(empty("Bugünkü nöbet listesi doğrulanamadı.", sourceUrls.pharmacy, "Eczacı Odasında kontrol et ↗")); output.replaceChildren(section); return; }
    section.append(tag("div", "local-meta", dateLabel(data.date) + "  •  Akçaabat  •  Nöbet bitişi: " + (data.endsAt ? new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(data.endsAt)) : "resmî listede")));
    const list = tag("div", "pharmacy-list");
    for (const item of data.items) {
      const card = tag("article", "pharmacy-card"); card.append(tag("small", "", "NÖBETÇİ ECZANE"), tag("h3", "", item.name)); card.append(tag("address", "", item.address || "Adres için resmî listeyi inceleyin."));
      const actions = tag("div", "pharmacy-actions"); const phone = (item.phone || "").replace(/[^0-9+]/g, ""); if (phone.length >= 10) actions.append(link("☎ " + item.phone, "tel:" + phone));
      if (item.address) actions.append(link("↗ Yol tarifi", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + item.address + " Akçaabat Trabzon"), true)); actions.append(link("Kaynak ↗", sourceUrls.pharmacy, true)); card.append(actions); list.append(card);
    }
    section.append(list, tag("p", "local-note", "Nöbet bilgileri değişebilir. Gitmeden önce eczaneyi telefonla arayarak teyit edin."), sourceNote("Trabzon Eczacı Odası", sourceUrls.pharmacy)); output.replaceChildren(section);
  }
  function renderObituaries(data) {
    const section = tag("section", "local-panel obituary-panel");
    section.append(tag("h2", "", "Vefat edenler"));
    const todayKey = today();
    const availableDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayKey + "T12:00:00+03:00");
      date.setUTCDate(date.getUTCDate() - index);
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    });
    const items = Array.isArray(data.items) ? data.items.filter(item => item && item.name && availableDates.includes(item.date)) : [];
    let selected = 0;
    const navigation = tag("div", "obituary-date-nav");
    const previous = tag("button", "obituary-date-arrow", "←"); previous.type = "button"; previous.setAttribute("aria-label", "Önceki gün");
    const current = tag("strong", "obituary-date-label");
    const next = tag("button", "obituary-date-arrow", "→"); next.type = "button"; next.setAttribute("aria-label", "Sonraki gün");
    navigation.append(previous, current, next);
    const list = tag("div", "obituary-list");
    section.append(navigation, list, tag("p", "local-source obituary-source", "Kaynak: Akçaabat Belediyesi"));
    function field(parent, label, value) {
      if (!value) return;
      const row = tag("div", "obituary-field");
      row.append(tag("dt", "", label), tag("dd", "", value));
      parent.append(row);
    }
    function renderDay() {
      const date = availableDates[selected];
      current.textContent = dateLabel(date);
      previous.disabled = selected === availableDates.length - 1;
      next.disabled = selected === 0;
      const dayItems = items.filter(item => item.date === date);
      if (!dayItems.length) {
        list.replaceChildren(tag("p", "obituary-no-results", "Bu tarihe ait vefat duyurusu bulunmuyor."));
        return;
      }
      const cards = dayItems.map(item => {
        const card = tag("details", "obituary-entry");
        const title = tag("summary", "obituary-summary");
        const icon = tag("img", "obituary-mosque"); icon.src = "assets/mosque.svg"; icon.alt = ""; icon.width = 38; icon.height = 38;
        title.append(icon, tag("span", "obituary-name", item.name), tag("span", "obituary-chevron", "⌄"));
        const body = tag("div", "obituary-body"); const fields = tag("dl", "obituary-fields");
        field(fields, "Defin tarihi", dateLabel(item.date));
        field(fields, "Namaz vakti", item.prayerTime);
        field(fields, "Namaz yeri", item.mosque);
        field(fields, "Mezarlık", item.cemetery);
        field(fields, "Yakın bilgisi", item.relative);
        if (fields.childElementCount) body.append(fields);
        else body.append(tag("p", "", item.details || "Ayrıntı henüz paylaşılmadı."));
        const latitude = Number(item.latitude), longitude = Number(item.longitude);
        const hasCoordinates = item.latitude !== "" && item.longitude !== "" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
        if (hasCoordinates || item.mosque) {
          const query = hasCoordinates ? `${latitude},${longitude}` : `${item.mosque} Akçaabat Trabzon`;
          body.append(link(hasCoordinates ? "⌖ Konumu haritada aç" : "⌖ Namaz yerini haritada ara", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query), true));
        }
        card.append(title, body);
        card.addEventListener("toggle", () => {
          if (card.open) for (const other of list.querySelectorAll("details[open]")) if (other !== card) other.open = false;
        });
        return card;
      });
      list.replaceChildren(...cards);
    }
    previous.addEventListener("click", () => { if (selected < availableDates.length - 1) { selected++; renderDay(); } });
    next.addEventListener("click", () => { if (selected > 0) { selected--; renderDay(); } });
    renderDay(); output.replaceChildren(section);
  }
  fetch("data/yerel-hizmetler.json?ts=" + Math.floor(Date.now() / 300000), { cache: "no-store" }).then(response => { if (!response.ok) throw Error("Veri alınamadı"); return response.json(); }).then(data => {
    if (kind === "prayer") renderPrayer(data.prayer || {});
    if (kind === "pharmacy") renderPharmacy(data.pharmacies || {});
    if (kind === "obituaries") renderObituaries(data.obituaries || {});
  }).catch(() => { const section = tag("section", "local-panel"); if (kind === "obituaries") section.append(tag("p", "local-empty", "Vefat duyuruları şu anda yüklenemiyor."), tag("p", "local-source", "Kaynak: Akçaabat Belediyesi")); else section.append(empty("Bilgiler şu anda yüklenemiyor.", sourceUrls[kind], "Resmî kaynağı aç ↗")); output.replaceChildren(section); });
})();
