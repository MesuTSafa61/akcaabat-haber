(function () {
  "use strict";

  // Akçaabat Belediyesi muhtarlık listesi; Orta ve Yeni kayıtları "Mahalle" olarak geçer.
  const neighborhoods = [
    "Acısu", "Adacık", "Ağaçlı", "Akçakale", "Akçaköy", "Akdamar", "Akören", "Akpınar",
    "Alsancak", "Ambarcık", "Arpacılı", "Aydınköy", "Benlitaş Baltacı", "Bozdoğan",
    "Cevizli", "Cevizlik", "Çamlıca", "Çamlıdere", "Çiçeklidüz", "Çilekli", "Çınarlık",
    "Çolaklı", "Çukurca", "Darıca", "Demirci", "Demirkapı", "Demirtaş", "Derecik",
    "Dörtyol", "Doğanköy", "Dürbinar", "Esentepe", "Erikli", "Eskiköy", "Fındıklı",
    "Fıstıklı", "Gümüşlü", "Helvacı", "Işıklar", "Kaleönü", "Karaçayır", "Karpınar",
    "Karaman", "Kavaklı", "Kayalar", "Kemaliye", "Kirazlık", "Koçlu", "Kuruçam",
    "Maden", "Mersin", "Meşeli", "Meydankaya", "Nefsipulathane", "Oğulkaya Yolbaşı",
    "Orta", "Ortaalan", "Ortaköy", "Osmanbaba", "Özakdamar", "Özdemirci", "Salacık",
    "Sarıca", "Sarıtaş", "Sertkaya", "Söğütlü", "Şinik", "Tatlısu", "Tütüncüler",
    "Uçarsu", "Uğurlu", "Yaylacık", "Yeni", "Yeniköy", "Yeşiltepe", "Yeşilyurt",
    "Yıldızlı", "Zaferli"
  ];
  const districts = [
    "Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı",
    "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Şalpazarı",
    "Sürmene", "Tonya", "Vakfıkebir", "Yomra"
  ];
  const fixed = {
    "mahalle:Söğütlü": [41.0064, 39.6138], "mahalle:Yıldızlı": [40.9908, 39.606],
    "mahalle:Yaylacık": [41.0108, 39.5861], "mahalle:Dürbinar": [41.0158, 39.574],
    "mahalle:Darıca": [41.0281, 39.5269], "mahalle:Akçakale": [41.0651, 39.4345],
    "mahalle:Mersin": [41.094, 39.356], "ilce:Akçaabat": [41.0197, 39.5716],
    "ilce:Ortahisar": [41.0027, 39.7168]
  };
  const geocodeCache = new Map(), weatherCache = new Map(), requests = { mahalle: 0, ilce: 0 };
  const trKey = value => String(value).toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/gu, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const icon = code => code === 0 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "🌨️" : code <= 82 ? "🌦️" : code <= 99 ? "⛈️" : "☁️";
  const day = date => new Date(date + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "short" });

  async function resolveLocation(type, name) {
    const key = type + ":" + name;
    if (fixed[key]) return fixed[key];
    if (geocodeCache.has(key)) return geocodeCache.get(key);
    const endpoint = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(name) + "&count=100&language=tr&format=json&countryCode=TR";
    let entries = [];
    try {
      const response = await fetch(endpoint);
      if (response.ok) entries = (await response.json()).results || [];
    } catch { /* İkinci konum sağlayıcısı denenir. */ }
    const matches = entries.filter(place => {
      const latitude = Number(place.latitude), longitude = Number(place.longitude);
      const inTrabzon = Number.isFinite(latitude) && Number.isFinite(longitude) &&
        latitude >= 40.50 && latitude <= 41.20 && longitude >= 39.20 && longitude <= 40.65;
      if (!inTrabzon || place.country_code !== "TR") return false;
      if (type === "mahalle") {
        return latitude >= 40.80 && longitude <= 39.75 &&
          trKey(place.name) === trKey(name) &&
          /akçaabat/i.test([place.admin2, place.admin3, place.admin4].filter(Boolean).join(" "));
      }
      return trKey(place.name) === trKey(name) &&
        /trabzon/i.test([place.admin1, place.admin2].filter(Boolean).join(" "));
    });
    let coords = matches.length ? [Number(matches[0].latitude), Number(matches[0].longitude)] : null;
    if (!coords) {
      // Photon yalnızca seçildiğinde sorgulanır; tüm mahalleler için toplu istek yapılmaz.
      const bbox = type === "mahalle" ? "39.30,40.79,39.76,41.15" : "39.20,40.50,40.65,41.20";
      const query = type === "mahalle" ? name + ", Akçaabat" : name + ", Trabzon";
      const url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(query) +
        "&bbox=" + bbox + "&countrycode=TR&lang=tr&limit=10";
      const response = await fetch(url);
      if (response.ok) {
        const features = (await response.json()).features || [];
        const match = features.find(feature => {
          const [lon, lat] = feature.geometry?.coordinates || [];
          const properties = feature.properties || {};
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || trKey(properties.name) !== trKey(name)) return false;
          if (type === "mahalle") {
            return lat >= 40.79 && lat <= 41.15 && lon >= 39.30 && lon <= 39.76 &&
              (!properties.district || /akçaabat/i.test(properties.district)) &&
              (!properties.city || /akçaabat/i.test(properties.city));
          }
          return lat >= 40.50 && lat <= 41.20 && lon >= 39.20 && lon <= 40.65;
        });
        if (match) coords = [match.geometry.coordinates[1], match.geometry.coordinates[0]];
      }
    }
    if (!coords) throw new Error("Bu konumun koordinatı doğrulanamadı. Yanlış bir konumun tahmini gösterilmiyor.");
    geocodeCache.set(key, coords);
    return coords;
  }

  async function forecast(coords) {
    const key = coords.join(","), cached = weatherCache.get(key);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.data;
    const params = new URLSearchParams({ latitude: String(coords[0]), longitude: String(coords[1]),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min", timezone: "Europe/Istanbul", forecast_days: "5" });
    const response = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
    if (!response.ok) throw new Error("Hava tahmini şu anda alınamıyor.");
    const data = await response.json();
    if (!data.current || !data.daily || !Array.isArray(data.daily.time)) throw new Error("Hava tahmini eksik geldi.");
    weatherCache.set(key, { time: Date.now(), data });
    return data;
  }

  function render(name, type, data) {
    const current = data.current, daily = data.daily;
    const label = type === "mahalle" ? name + " Mahallesi, Akçaabat" : name + ", Trabzon";
    return '<article class="weather-card"><div class="weather-head"><div><h3>' + esc(label) +
      '</h3><small>Güncelleme: ' + esc((current.time || "").replace("T", " ")) + '</small></div><span class="weather-icon" aria-hidden="true">' +
      icon(current.weather_code) + '</span></div><div class="weather-current"><span class="weather-temp">' +
      Math.round(Number(current.temperature_2m)) + '°</span><span class="weather-meta"><span>Hissedilen ' +
      Math.round(Number(current.apparent_temperature)) + '°</span><span>Nem %' +
      Math.round(Number(current.relative_humidity_2m)) + '</span><span>Rüzgâr ' +
      Math.round(Number(current.wind_speed_10m)) + ' km/sa</span></span></div><div class="forecast">' +
      daily.time.map((date, i) => '<div>' + day(date) + '<br>' + icon(daily.weather_code[i]) + '<strong>' +
        Math.round(Number(daily.temperature_2m_max[i])) + '° / ' + Math.round(Number(daily.temperature_2m_min[i])) + '°</strong></div>').join("") +
      '</div></article>';
  }

  async function update(type, selector, target) {
    const name = selector.value, ticket = ++requests[type];
    target.innerHTML = '<div class="weather-empty">' + esc(name) + ' için hava durumu yükleniyor…</div>';
    try {
      const coords = await resolveLocation(type, name);
      const data = await forecast(coords);
      if (ticket === requests[type]) target.innerHTML = render(name, type, data);
    } catch (error) {
      if (ticket === requests[type]) target.innerHTML = '<div class="weather-empty error"><strong>' + esc(name) + ' için tahmin gösterilemiyor.</strong><br>' + esc(error.message) + '</div>';
    }
  }

  function setup(type, selectId, resultId, names, initial) {
    const select = document.getElementById(selectId), result = document.getElementById(resultId);
    names.forEach(name => select.add(new Option(name + (type === "mahalle" ? " Mahallesi" : ""), name)));
    select.value = initial;
    select.addEventListener("change", () => update(type, select, result));
    update(type, select, result);
  }
  setup("mahalle", "neighborhoodSelect", "neighborhoodWeather", neighborhoods, "Söğütlü");
  setup("ilce", "districtSelect", "districtWeather", districts, "Ortahisar");
})();
