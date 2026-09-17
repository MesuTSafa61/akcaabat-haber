(function () {
  "use strict";

  const sources = [
    { key: "fanatik", name: "Fanatik", logo: "assets/sources/fanatik.svg", aliases: ["fanatik trabzonspor", "fanatik.com.tr"] },
    { key: "fotomac", name: "Fotomaç", logo: "assets/sources/fotomac.svg", aliases: ["fotomac", "fotomac.com.tr"] },
    { key: "61saat", name: "61Saat", logo: "assets/sources/61saat.svg", aliases: ["61 saat", "61saat.com"] },
    { key: "haber61", name: "Haber61", logo: "assets/sources/haber61.svg", aliases: ["haber 61", "haber61.net"] },
    { key: "dha", name: "DHA", logo: "assets/sources/dha.svg", aliases: ["demiroren haber ajansi", "demirören haber ajansı", "dha.com.tr"] },
    { key: "iha", name: "İHA", logo: "assets/sources/iha.svg", aliases: ["ihlas haber ajansi", "İhlas haber ajansı", "iha.com.tr"] }
  ];

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
    return sources.find(function (source) {
      return normalize(source.name) === needle ||
        normalize(source.key) === needle ||
        source.aliases.some(function (alias) { return normalize(alias) === needle; });
    }) || null;
  }

  window.AkcaabatNewsSources = { all: sources.slice(), find: find };
})();
