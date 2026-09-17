(function () {
  "use strict";

  const allowedTypes = ["contact", "report", "advertising"];

  function text(value, limit) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function optional(value, limit) {
    const result = text(value, limit);
    return result || null;
  }

  async function submit(input) {
    const config = window.AKCAABAT_SUPABASE;
    if (!config || !config.url || !config.key) {
      throw new Error("Mesaj servisi şu anda kullanılamıyor.");
    }

    const messageType = allowedTypes.includes(input.message_type)
      ? input.message_type
      : "contact";
    const payload = {
      name: text(input.name, 120),
      email: optional(input.email, 200),
      phone: optional(input.phone, 40),
      subject: optional(input.subject, 180),
      message: text(input.message, 4000),
      message_type: messageType,
      related_url: optional(input.related_url, 1000),
      status: "new",
      metadata: {
        page: location.pathname.split("/").pop() || "index.html",
        sent_at: new Date().toISOString()
      }
    };

    if (payload.name.length < 2 || payload.message.length < 10) {
      throw new Error("Ad ve mesaj alanlarını eksiksiz doldurun.");
    }

    const response = await fetch(config.url + "/rest/v1/contact_messages", {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: "Bearer " + config.key,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Mesaj gönderilemedi. Lütfen kısa süre sonra tekrar deneyin.");
    }
  }

  window.AkcaabatSubmissions = { submit: submit };
})();
