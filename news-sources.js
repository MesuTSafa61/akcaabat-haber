(function () {
  "use strict";

  const sources = [
    { key: "fanatik", name: "Fanatik", logo: "assets/sources/fanatik.svg", aliases: ["fanatik trabzonspor", "fanatik.com.tr"] },
    { key: "fotomac", name: "Fotomaç", logo: "assets/sources/fotomac.svg", aliases: ["fotomac", "fotomac.com.tr"] },
    { key: "61saat", name: "61Saat", logo: "assets/sources/61saat.svg", aliases: ["61 saat", "61saat.com"] },
    { key: "haber61", name: "Haber61", logo: "assets/sources/haber61.svg", aliases: ["haber 61", "haber61.net"] },
    { key: "dha", name: "DHA", logo: "assets/sources/dha.svg", aliases: ["demiroren haber ajansi", "demirören haber ajansı", "dha.com.tr"] },
    { key: "iha", name: "İHA", logo: "assets/sources/iha.svg", aliases: ["ihlas haber ajansi", "İhlas haber ajansı", "iha.com.tr"] },
    { key: "yenisafak", name: "Yeni Şafak", mark: "YENİ ŞAFAK", bg: "#bd0d18", fg: "#ffffff", aliases: ["yeni safak", "yenisafak.com"] },
    { key: "haberlercom", name: "Haberler.com", mark: "HABERLER.COM", bg: "#d71920", fg: "#ffffff", aliases: ["haberler", "haberler com", "rss.haberler.com"] },
    { key: "kuzeyekspres", name: "Kuzey Ekspres", mark: "KUZEY EKSPRES", bg: "#10447c", fg: "#ffffff", aliases: ["kuzey ekspres", "kuzeyekspres.com.tr"] },
    { key: "taka", name: "Taka Gazete", mark: "TAKA", bg: "#e11d2e", fg: "#ffffff", aliases: ["taka", "takagazete.com.tr"] },
    { key: "gunebakis", name: "Günebakış", mark: "GÜNEBAKIŞ", bg: "#f2b705", fg: "#111827", aliases: ["gunebakis", "gunebakis.com.tr"] },
    { key: "trabzonspor", name: "Trabzonspor", mark: "TRABZONSPOR", bg: "#6b1638", fg: "#5fc3e8", aliases: ["trabzonspor kulübü", "trabzonspor.org.tr"] },
    { key: "sebat", name: "Sebat Gençlik", mark: "SEBAT", bg: "#d71920", fg: "#ffffff", aliases: ["akçaabat sebatspor", "akcaabat sebatspor", "sebatspor", "sebat gençlik spor"] },
    { key: "akcaabatbelediyesi", name: "Akçaabat Belediyesi", mark: "AKÇAABAT BLD.", bg: "#0b6f6a", fg: "#ffffff", aliases: ["akcaabat belediyesi", "akcaabat.bel.tr"] },
    { key: "trabzonbuyuksehir", name: "Trabzon Büyükşehir Belediyesi", mark: "TRABZON BŞB", bg: "#0f4774", fg: "#ffffff", aliases: ["trabzon büyükşehir", "trabzon.bel.tr"] },
    { key: "aa", name: "Anadolu Ajansı", mark: "AA", bg: "#e30613", fg: "#ffffff", aliases: ["anadolu ajansi", "aa.com.tr"] },
    { key: "trthaber", name: "TRT Haber", mark: "TRT HABER", bg: "#c8102e", fg: "#ffffff", aliases: ["trthaber.com"] },
    { key: "trtspor", name: "TRT Spor", mark: "TRT SPOR", bg: "#111827", fg: "#ffffff", aliases: ["trtspor.com.tr"] },
    { key: "sabah", name: "Sabah", mark: "SABAH", bg: "#f59e0b", fg: "#111827", aliases: ["sabah.com.tr"] },
    { key: "hurriyet", name: "Hürriyet", mark: "HÜRRİYET", bg: "#d71920", fg: "#ffffff", aliases: ["hurriyet.com.tr"] },
    { key: "milliyet", name: "Milliyet", mark: "MİLLİYET", bg: "#e30613", fg: "#ffffff", aliases: ["milliyet.com.tr"] },
    { key: "ntv", name: "NTV", mark: "NTV", bg: "#123c78", fg: "#ffffff", aliases: ["ntv.com.tr"] },
    { key: "cnnturk", name: "CNN Türk", mark: "CNN TÜRK", bg: "#cc0000", fg: "#ffffff", aliases: ["cnn turk", "cnnturk.com"] },
    { key: "sozcu", name: "Sözcü", mark: "SÖZCÜ", bg: "#e30613", fg: "#ffffff", aliases: ["sozcu.com.tr"] },
    { key: "ahaber", name: "A Haber", mark: "A HABER", bg: "#b20d16", fg: "#ffffff", aliases: ["ahaber.com.tr"] },
    { key: "haberturk", name: "Habertürk", mark: "HABERTÜRK", bg: "#bb0a1e", fg: "#ffffff", aliases: ["haberturk.com"] },
    { key: "tgrt", name: "TGRT Haber", mark: "TGRT HABER", bg: "#d71920", fg: "#ffffff", aliases: ["tgrthaber.com"] },
    { key: "turkiyegazetesi", name: "Türkiye Gazetesi", mark: "TÜRKİYE", bg: "#d71920", fg: "#ffffff", aliases: ["turkiyegazetesi.com.tr"] },
    { key: "takvim", name: "Takvim", mark: "TAKVİM", bg: "#0f8a43", fg: "#ffffff", aliases: ["takvim.com.tr"] },
    { key: "aksam", name: "Akşam", mark: "AKŞAM", bg: "#d71920", fg: "#ffffff", aliases: ["aksam.com.tr"] },
    { key: "cumhuriyet", name: "Cumhuriyet", mark: "CUMHURİYET", bg: "#e30613", fg: "#ffffff", aliases: ["cumhuriyet.com.tr"] },
    { key: "ensonhaber", name: "Ensonhaber", mark: "ENSONHABER", bg: "#e30613", fg: "#ffffff", aliases: ["ensonhaber.com"] },
    { key: "sporx", name: "Sporx", mark: "SPORX", bg: "#1462a4", fg: "#ffffff", aliases: ["sporx.com"] },
    { key: "ajansspor", name: "Ajansspor", mark: "AJANSSPOR", bg: "#ed1c24", fg: "#ffffff", aliases: ["ajansspor.com"] },
    { key: "beinsports", name: "beIN SPORTS", mark: "beIN SPORTS", bg: "#4b167a", fg: "#ffffff", aliases: ["bein sports", "beinsports.com.tr"] }
  ];

  function logoFor(source) {
    if (!source) return "assets/akcaabat-haber-logo.svg";
    if (source.logo) return source.logo;
    const mark = String(source.mark || source.name || "KAYNAK");
    const fontSize = mark.length > 12 ? 20 : mark.length > 8 ? 25 : 31;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 72">' +
      '<rect width="240" height="72" rx="12" fill="' + (source.bg || "#0b1f3a") + '"/>' +
      '<text x="120" y="45" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fontSize + '" font-weight="900" fill="' + (source.fg || "#fff") + '">' + mark.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '</text></svg>';
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function find(value) {
    const needle = normalize(value);
    if (!needle) return null;
    const exact = sources.find(function (source) {
      return normalize(source.name) === needle ||
        normalize(source.key) === needle ||
        source.aliases.some(function (alias) { return normalize(alias) === needle; });
    });
    if (exact) return exact;
    return sources.find(function (source) {
      return needle.includes(normalize(source.name)) ||
        needle.includes(normalize(source.key)) ||
        source.aliases.some(function (alias) { return needle.includes(normalize(alias)); });
    }) || null;
  }

  window.AkcaabatNewsSources = { all: sources.slice(), find: find, logoFor: logoFor };
})();
