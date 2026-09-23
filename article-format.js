/* Haber metni için editör ve okur sayfasının ortak güvenli biçimlendirmesi. */
(function () {
    "use strict";

    const fonts = {
        arial: "Arial", georgia: "Georgia", verdana: "Verdana",
        "times new roman": "Times New Roman", "system-ui": "system-ui"
    };
    const sizes = new Set([14, 16, 18, 20, 24, 28, 32]);
    const legacySizes = { "2": 14, "3": 16, "4": 18, "5": 24, "6": 32 };
    const permitted = new Set([
        "p", "h2", "h3", "strong", "em", "u", "blockquote",
        "ul", "ol", "li", "a", "br", "span"
    ]);
    const dropped = new Set([
        "script", "style", "iframe", "svg", "math", "object", "embed",
        "form", "input", "button", "textarea", "video", "audio", "noscript"
    ]);

    function escapeText(value) {
        return String(value || "").replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }

    function isRichHtml(value) {
        return /<(?:p|div|h[1-3]|strong|b|em|i|u|blockquote|ul|ol|li|a|span|font|br)\b[^>]*>/i.test(String(value || ""));
    }

    function plainToHtml(value) {
        const text = String(value || "").replace(/\r\n?/g, "\n").trim();
        if (!text) return "";
        return text.split(/\n{2,}/).map(function (paragraph) {
            return "<p>" + escapeText(paragraph).replace(/\n/g, "<br>") + "</p>";
        }).join("");
    }

    function safeStyle(input, output, tag) {
        const style = input.style;
        const family = String(style.fontFamily || (tag === "font" ? input.getAttribute("face") : "") || "")
            .replace(/["']/g, "").trim().toLowerCase();
        if (fonts[family]) output.style.fontFamily = fonts[family];

        const rawSize = tag === "font" && input.getAttribute("size")
            ? legacySizes[input.getAttribute("size")]
            : Number.parseInt(style.fontSize, 10);
        if (sizes.has(rawSize)) output.style.fontSize = rawSize + "px";

        const color = String(style.color || (tag === "font" ? input.getAttribute("color") : "") || "").trim();
        if (/^#[0-9a-f]{6}$/i.test(color)) output.style.color = color.toLowerCase();
    }

    function sanitize(value) {
        const template = document.createElement("template");
        template.innerHTML = String(value || "");
        const result = document.createElement("div");

        function append(node, target) {
            if (node.nodeType === 3) {
                target.appendChild(document.createTextNode(node.textContent || ""));
                return;
            }
            if (node.nodeType !== 1) return;
            const tag = node.localName.toLowerCase();
            if (dropped.has(tag)) return;
            const normalized = { b: "strong", i: "em", font: "span", div: "p", h1: "h2" }[tag] || tag;
            if (!permitted.has(normalized)) {
                [...node.childNodes].forEach(child => append(child, target));
                return;
            }

            const element = document.createElement(normalized);
            if (normalized === "span") safeStyle(node, element, tag);
            if (normalized === "a") {
                try {
                    const href = new URL(node.getAttribute("href") || "", location.href);
                    if (["http:", "https:"].includes(href.protocol)) {
                        element.href = href.href;
                        element.target = "_blank";
                        element.rel = "noopener noreferrer nofollow";
                    }
                } catch (_) { /* geçersiz bağlantı metin olarak kalır */ }
                if (!element.href) {
                    [...node.childNodes].forEach(child => append(child, target));
                    return;
                }
            }
            [...node.childNodes].forEach(child => append(child, element));
            target.appendChild(element);
        }

        [...template.content.childNodes].forEach(node => append(node, result));
        return result.innerHTML;
    }

    function render(value) {
        return isRichHtml(value) ? sanitize(value) : plainToHtml(value);
    }

    function plainText(value) {
        if (!isRichHtml(value)) return String(value || "");
        const element = document.createElement("div");
        element.innerHTML = sanitize(value);
        return element.textContent || "";
    }

    window.AkcaabatArticleFormat = { sanitize, render, plainText, isRichHtml };
})();
