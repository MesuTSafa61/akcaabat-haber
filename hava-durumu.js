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
  // Sabit noktalar, seçilen yaylanın çevresindeki model hücresini sorgular.
  const highlands = [
    ["Hıdırnebi", 40.953, 39.463], ["Uzungöl", 40.620, 40.295],
    ["Sultanmurat", 40.584, 40.128], ["Kadırga", 40.672, 39.391],
    ["Erikbeli", 40.704, 39.354], ["Zigana", 40.650, 39.397],
    ["Sisdağı", 40.789, 39.151]
  ];
  const fixed = {
    "mahalle:Söğütlü": [41.0064, 39.6138], "mahalle:Yıldızlı": [40.9908, 39.606],
    "mahalle:Yaylacık": [41.0108, 39.5861], "mahalle:Dürbinar": [41.0158, 39.574],
    "mahalle:Darıca": [41.0441, 39.5294], "mahalle:Akçakale": [41.08099, 39.4977],
    "mahalle:Mersin": [41.08896, 39.46652], "mahalle:Orta": [41.022156, 39.565231],
    "mahalle:Yeni": [41.016533, 39.584305], "ilce:Akçaabat": [41.0197, 39.5716],
    "mahalle:Benlitaş Baltacı": [41.03347, 39.47314],
    "mahalle:Oğulkaya Yolbaşı": [40.93156, 39.59239],
    "mahalle:Akpınar": [40.92406, 39.50669], "mahalle:Arpacılı": [40.9568, 39.47973],
    "mahalle:Demirkapı": [40.91464, 39.46308], "mahalle:Cevizlik": [40.89197, 39.54447],
    "mahalle:Kemaliye": [40.95543, 39.46709], "mahalle:Nefsipulathane": [41.0246, 39.56579],
    "mahalle:Tütüncüler": [40.99159, 39.52752],
    "mahalle:Akdamar": [40.9532428, 39.5303108], "mahalle:Aydınköy": [40.99525, 39.41647],
    "mahalle:Çolaklı": [41.0270927, 39.5630019], "mahalle:Esentepe": [40.932369, 39.576321],
    "mahalle:Karaman": [40.9659, 39.6023], "mahalle:Kavaklı": [41.020607, 39.525631],
    "mahalle:Kayalar": [41.0007, 39.5748], "mahalle:Ortaalan": [40.933548, 39.478268],
    "mahalle:Sarıtaş": [41.010102, 39.566324], "mahalle:Uğurlu": [40.976704, 39.657093],
    "ilce:Ortahisar": [41.0027, 39.7168]
  };
  // Harita yerleşim merkezleri: her mahalleye ait ayrı tahmin noktası.
  const fallbackNeighborhoods = {
    "Acısu": [40.93893, 39.45912],
    "Adacık": [41.03724, 39.47527],
    "Ağaçlı": [40.98769, 39.42506],
    "Akçakale": [41.08099, 39.4977],
    "Akçaköy": [40.92551, 39.62545],
    "Akören": [40.96573, 39.55489],
    "Alsancak": [40.9553, 39.51092],
    "Ambarcık": [40.92543, 39.47101],
    "Bozdoğan": [40.9649, 39.50102],
    "Cevizli": [40.94345, 39.51138],
    "Çamlıca": [41.02016, 39.48795],
    "Çamlıdere": [41.05765, 39.48489],
    "Çiçeklidüz": [40.97852, 39.5587],
    "Çilekli": [41.01615, 39.4427],
    "Çınarlık": [40.98188, 39.52942],
    "Çukurca": [40.89545, 39.59631],
    "Darıca": [41.0441, 39.5294],
    "Demirci": [40.9825, 39.55833],
    "Demirtaş": [40.97422, 39.59975],
    "Derecik": [40.9459, 39.59401],
    "Dörtyol": [40.92242, 39.49178],
    "Doğanköy": [40.90828, 39.47552],
    "Erikli": [40.90532, 39.50569],
    "Eskiköy": [41.05316, 39.4458],
    "Fındıklı": [40.92724, 39.59236],
    "Fıstıklı": [40.97693, 39.51945],
    "Gümüşlü": [40.96661, 39.45944],
    "Helvacı": [40.99212, 39.5425],
    "Işıklar": [40.89565, 39.45983],
    "Kaleönü": [40.99099, 39.47827],
    "Karaçayır": [41.00562, 39.445],
    "Karpınar": [41.04695, 39.45271],
    "Kirazlık": [40.94804, 39.52625],
    "Koçlu": [40.92775, 39.50878],
    "Kuruçam": [40.94796, 39.4595],
    "Maden": [40.90018, 39.59338],
    "Mersin": [41.08896, 39.46652],
    "Meşeli": [41.01456, 39.49028],
    "Meydankaya": [40.97237, 39.54178],
    "Ortaköy": [40.98542, 39.50359],
    "Osmanbaba": [40.98421, 39.6026],
    "Özakdamar": [40.95502, 39.53169],
    "Özdemirci": [40.99196, 39.57283],
    "Salacık": [41.05597, 39.53022],
    "Sarıca": [41.06395, 39.43571],
    "Sertkaya": [40.95846, 39.47223],
    "Şinik": [40.94289, 39.49244],
    "Tatlısu": [40.96636, 39.5354],
    "Uçarsu": [40.91466, 39.58496],
    "Yeniköy": [41.04111, 39.49873],
    "Yeşiltepe": [40.96823, 39.50808],
    "Yeşilyurt": [40.94532, 39.54428],
    "Zaferli": [40.96064, 39.48767]
  };
  const geocodeCache = new Map(), weatherCache = new Map(), requests = { mahalle: 0, ilce: 0, yayla: 0 };
  const trKey = value => String(value).toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/gu, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const icon = code => code === 0 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "🌨️" : code <= 82 ? "🌦️" : code <= 99 ? "⛈️" : "☁️";
  const day = date => new Date(date + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "short" });

  async function resolveLocation(type, name) {
    if (type === "yayla") {
      const place = highlands.find(([label]) => label === name);
      if (!place) throw new Error("Yayla bulunamadı.");
      return place.slice(1);
    }
    const key = type + ":" + name;
    if (fixed[key]) return fixed[key];
    if (type === "mahalle" && fallbackNeighborhoods[name]) return fallbackNeighborhoods[name];
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
    if (!coords && type === "mahalle" && fallbackNeighborhoods[name]) coords = fallbackNeighborhoods[name];
    if (!coords) throw new Error("Bu konumun koordinatı doğrulanamadı. Yanlış bir konumun tahmini gösterilmiyor.");
    geocodeCache.set(key, coords);
    return coords;
  }

  async function forecast(coords) {
    const key = coords.join(","), cached = weatherCache.get(key);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.data;
    const params = new URLSearchParams({ latitude: String(coords[0]), longitude: String(coords[1]),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,snowfall,visibility",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum", timezone: "Europe/Istanbul", forecast_days: "5" });
    const response = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
    if (!response.ok) throw new Error("Hava tahmini şu anda alınamıyor.");
    const data = await response.json();
    if (!data.current || !data.daily || !Array.isArray(data.daily.time)) throw new Error("Hava tahmini eksik geldi.");
    weatherCache.set(key, { time: Date.now(), data });
    return data;
  }

  function render(name, type, data) {
    const current = data.current, daily = data.daily;
    const label = type === "mahalle" ? name + " Mahallesi, Akçaabat" : name + (type === "yayla" ? " Yaylası" : ", Trabzon");
    const snow = Number(daily.snowfall_sum?.[0] || 0);
    const visibility = Number(current.visibility);
    const risk = type === "yayla" ? '<div class="highland-advice">' +
      (snow > 0 ? '❄️ Bugün kar tahmini: ' + snow.toFixed(1) + ' cm. ' : '') +
      (Number.isFinite(visibility) && visibility < 1000 ? '🌫️ Tahmini görüş mesafesi 1 km altında. ' : '') +
      (Number(current.temperature_2m) <= 0 ? '🧊 Sıfırın altında sıcaklık; yol koşullarını kontrol edin. ' : '') +
      (!snow && !(visibility < 1000) && Number(current.temperature_2m) > 0 ? 'Belirgin kar, sis veya don uyarısı görünmüyor. ' : '') +
      '<small>Bu bir meteorolojik tahmindir; yolun açık olduğunu göstermez.</small></div>' : '';
    return '<article class="weather-card"><div class="weather-head"><div><h3>' + esc(label) +
      '</h3><small>Güncelleme: ' + esc((current.time || "").replace("T", " ")) + '</small></div><span class="weather-icon" aria-hidden="true">' +
      icon(current.weather_code) + '</span></div><div class="weather-current"><span class="weather-temp">' +
      Math.round(Number(current.temperature_2m)) + '°</span><span class="weather-meta"><span>Hissedilen ' +
      Math.round(Number(current.apparent_temperature)) + '°</span><span>Nem %' +
      Math.round(Number(current.relative_humidity_2m)) + '</span><span>Rüzgâr ' +
      Math.round(Number(current.wind_speed_10m)) + ' km/sa</span></span></div><div class="forecast">' +
      daily.time.map((date, i) => '<div>' + day(date) + '<br>' + icon(daily.weather_code[i]) + '<strong>' +
        Math.round(Number(daily.temperature_2m_max[i])) + '° / ' + Math.round(Number(daily.temperature_2m_min[i])) + '°</strong></div>').join("") +
      '</div>' + risk + '</article>';
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
  setup("yayla", "highlandSelect", "highlandWeather", highlands.map(place => place[0]), "Hıdırnebi");
})();
