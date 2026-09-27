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
    const districtNames = ["Akçaabat", "Ortahisar", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"];
    const grouped = data.districts && typeof data.districts === "object" ? data.districts : { Akçaabat: data.days || [] };
    const section = tag("section", "local-panel prayer-panel");
    const heading = tag("div", "prayer-heading"); const symbol = tag("span", "prayer-heading-icon", "☪"); symbol.setAttribute("aria-hidden", "true");
    const title = tag("div"); title.append(tag("span", "prayer-eyebrow", "TRABZON • BUGÜN"), tag("h2", "", "Namaz vakitleri")); heading.append(symbol, title); section.append(heading);
    const picker = tag("div", "pharmacy-picker prayer-picker"); const pickerLabel = tag("label", "", "İlçe seç"); pickerLabel.htmlFor = "prayerDistrict";
    const select = tag("select", "pharmacy-select"); select.id = "prayerDistrict";
    districtNames.forEach(name => { const option = tag("option", "", name === "Ortahisar" ? "Trabzon Merkez (Ortahisar)" : name); option.value = name; select.append(option); });
    picker.append(pickerLabel, select); section.append(picker);
    const status = tag("div", "prayer-status");
    const next = tag("div", "prayer-next"); const nextTitle = tag("div"); const small = tag("small", "", "SIRADAKİ VAKİT"); const nextName = tag("strong"); const nextTime = tag("time"); nextTitle.append(small, nextName); next.append(nextTitle, nextTime);
    const grid = tag("div", "prayer-grid"); const countdown = tag("p", "prayer-countdown");
    section.append(status, next, grid, countdown, tag("p", "local-source prayer-source", "Kaynak: Diyanet İşleri Başkanlığı"));
    let selectedDay = null, selectedDays = [], slots = [];
    function renderDistrict() {
      selectedDays = Array.isArray(grouped[select.value]) ? grouped[select.value] : [];
      selectedDay = selectedDays.find(item => item.date === today() && Array.isArray(item.times) && item.times.length === 6 && item.times.every(time => /^\d{2}:\d{2}$/.test(time))) || null;
      status.textContent = selectedDay ? dateLabel(selectedDay.date) + " · " + (select.value === "Ortahisar" ? "Trabzon Merkez" : select.value) : select.value;
      next.hidden = !selectedDay; grid.replaceChildren(); slots = [];
      if (!selectedDay) {
        countdown.textContent = select.value === "Maçka" ? "Maçka için Diyanet'in ayrı bir ilçe vakit tablosu bulunmuyor." : "Bu ilçe için bugünün doğrulanmış vakitleri henüz alınamadı.";
        return;
      }
      for (let i = 0; i < prayerNames.length; i++) {
        const card = tag("div", "prayer-slot"); card.append(tag("span", "", prayerNames[i]), tag("strong", "", selectedDay.times[i])); grid.append(card); slots.push(card);
      }
      update();
    }
    function update() {
      if (!selectedDay) return;
      const index = selectedDay.times.findIndex(time => time > localTime());
      slots.forEach((slot, i) => slot.classList.toggle("active", i === index));
      const tomorrow = selectedDays.find(item => item.date > selectedDay.date && Array.isArray(item.times) && item.times.length === 6);
      if (index < 0 && !tomorrow) { nextName.textContent = "Yarınki İmsak"; nextTime.textContent = "—"; countdown.textContent = "Yarınki vakitler güncellendiğinde burada görünecek."; return; }
      const name = index < 0 ? "Yarınki İmsak" : prayerNames[index];
      const time = index < 0 ? tomorrow.times[0] : selectedDay.times[index];
      const date = index < 0 ? tomorrow.date : selectedDay.date;
      nextName.textContent = name; nextTime.textContent = time;
      const minutes = Math.max(0, Math.ceil((new Date(date + "T" + time + ":00+03:00") - Date.now()) / 60000));
      countdown.textContent = `Sıradaki vakte ${Math.floor(minutes / 60)} saat ${minutes % 60} dakika kaldı.`;
    }
    select.addEventListener("change", renderDistrict);
    renderDistrict(); setInterval(() => { if (selectedDay && today() !== selectedDay.date) location.reload(); else update(); }, 30000);
    output.replaceChildren(section);
  }
  function renderPharmacy(data) {
    const districtNames = ["Akçaabat", "Ortahisar", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"];
    const section = tag("section", "local-panel pharmacy-panel");
    const heading = tag("div", "pharmacy-heading");
    const headingIcon = tag("span", "pharmacy-heading-icon", "✚"); headingIcon.setAttribute("aria-hidden", "true");
    const headingText = tag("div"); headingText.append(tag("span", "pharmacy-eyebrow", "TRABZON • BUGÜN"), tag("h2", "", "Nöbetçi eczaneler"));
    heading.append(headingIcon, headingText); section.append(heading);
    const picker = tag("div", "pharmacy-picker");
    const pickerLabel = tag("label", "", "İlçe seç"); pickerLabel.htmlFor = "pharmacyDistrict";
    const select = tag("select", "pharmacy-select"); select.id = "pharmacyDistrict";
    districtNames.forEach(name => { const option = tag("option", "", name === "Ortahisar" ? "Trabzon Merkez (Ortahisar)" : name); option.value = name; select.append(option); });
    picker.append(pickerLabel, select); section.append(picker);
    const valid = data.date === today();
    const grouped = data.districts && typeof data.districts === "object" ? data.districts : { Akçaabat: data.items || [] };
    const status = tag("div", "pharmacy-status"); section.append(status);
    const list = tag("div", "pharmacy-list");
    section.append(list, tag("p", "pharmacy-advice", "Gitmeden önce eczaneyi arayıp nöbet durumunu teyit edin."), tag("p", "pharmacy-credit", "Veri: Trabzon Eczacı Odası"));
    function renderDistrict() {
      const district = select.value;
      const now = new Date();
      const entries = valid && Array.isArray(grouped[district]) ? grouped[district].filter(item => item && item.name && (!item.endsAt || new Date(item.endsAt) > now)) : [];
      status.replaceChildren(tag("span", "pharmacy-status-date", valid ? dateLabel(data.date) : "Güncel veri bekleniyor"), tag("span", "pharmacy-status-end", district === "Ortahisar" ? "Trabzon Merkez" : district));
      if (!entries.length) {
        list.replaceChildren(tag("p", "pharmacy-no-results", valid ? "Bu ilçede bugün için doğrulanmış nöbetçi eczane kaydı bulunmuyor." : "Bugünkü nöbet listesi henüz doğrulanamadı. Biraz sonra yeniden deneyin."));
        return;
      }
      list.replaceChildren();
      for (const item of entries) {
      const card = tag("article", "pharmacy-card");
      const cardTop = tag("div", "pharmacy-card-top"); const cardIcon = tag("span", "pharmacy-card-icon", "✚"); cardIcon.setAttribute("aria-hidden", "true");
      const starts = item.startsAt ? new Date(item.startsAt) : null;
      const ends = item.endsAt ? new Date(item.endsAt) : null;
      const isUpcoming = starts && starts > now;
      const clock = value => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(value);
      const timing = isUpcoming ? clock(starts) + "'DE BAŞLAYACAK" : "ŞU AN NÖBETÇİ";
      const cardTitle = tag("div"); cardTitle.append(tag("small", "", timing), tag("h3", "", item.name)); cardTop.append(cardIcon, cardTitle); card.append(cardTop);
      const address = tag("address", "pharmacy-address"); address.append(tag("span", "", "⌖"), tag("span", "", item.address || "Adres bilgisi bulunamadı")); card.append(address);
      if (ends) card.append(tag("p", "pharmacy-shift", "Nöbet bitişi: " + new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(ends)));
      const actions = tag("div", "pharmacy-actions"); const phone = (item.phone || "").replace(/[^0-9+]/g, "");
      if (phone.length >= 10) actions.append(link("☎  " + item.phone, "tel:" + phone));
      if (item.address) actions.append(link("➤  Yol tarifi", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + item.address + " " + district + " Trabzon"), true));
      card.append(actions); list.append(card);
      }
    }
    select.addEventListener("change", renderDistrict);
    renderDistrict(); output.replaceChildren(section);
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
  }).catch(() => { const section = tag("section", "local-panel"); if (kind === "obituaries") section.append(tag("p", "local-empty", "Vefat duyuruları şu anda yüklenemiyor."), tag("p", "local-source", "Kaynak: Akçaabat Belediyesi")); else if (kind === "prayer") section.append(tag("p", "local-empty", "Namaz vakitleri şu anda yüklenemiyor."), tag("p", "local-source", "Kaynak: Diyanet İşleri Başkanlığı")); else section.append(empty("Bilgiler şu anda yüklenemiyor.", sourceUrls[kind], "Resmî kaynağı aç ↗")); output.replaceChildren(section); });
})();
