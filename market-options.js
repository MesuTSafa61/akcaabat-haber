(function () {
  "use strict";
  window.AKCAABAT_MARKETS = Object.freeze([
    { id: "GBP", name: "Sterlin / TL", group: "Döviz" },
    { id: "CHF", name: "İsviçre Frangı / TL", group: "Döviz" },
    { id: "JPY", name: "Japon Yeni / TL", group: "Döviz" },
    { id: "SAR", name: "Suudi Arabistan Riyali / TL", group: "Döviz" },
    { id: "AED", name: "BAE Dirhemi / TL", group: "Döviz" },
    { id: "QAR", name: "Katar Riyali / TL", group: "Döviz" },
    { id: "EGP", name: "Mısır Lirası / TL", group: "Döviz" },
    { id: "RUB", name: "Rus Rublesi / TL", group: "Döviz" },
    { id: "bitcoin", name: "Bitcoin / TL", group: "Kripto" },
    { id: "ethereum", name: "Ethereum / TL", group: "Kripto" }
  ]);
  window.AKCAABAT_NORMALIZE_MARKET = function (entry) {
    if (!entry || !["Döviz", "Kripto"].includes(entry.group)) return null;
    const id = String(entry.id || "").trim();
    const name = String(entry.name || "").trim();
    if (name.length < 2 || name.length > 65 || /[<>]/.test(name)) return null;
    if (entry.group === "Döviz" && !/^[A-Z]{3}$/.test(id)) return null;
    if (entry.group === "Kripto" && !/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) return null;
    return { id, name, group: entry.group };
  };
})();
