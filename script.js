/* =========================================================
   AKÇAABAT HABER - ANA JAVASCRIPT
   Sürüm: 1.0
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    /* ---------------------------------------------------------
       GENEL YARDIMCI FONKSİYONLAR
       --------------------------------------------------------- */
    function get(selector, parent = document) {
        return parent.querySelector(selector);
    }
    function getAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }
    function showMessage(message, type = "success") {
        let oldMessage = get(".site-message");
        if (oldMessage) {
            oldMessage.remove();
        }
        const box = document.createElement("div");
        box.className = "site-message " + type;
        box.textContent = message;
        document.body.appendChild(box);
        setTimeout(function () {
            box.classList.add("show");
        }, 20);
        setTimeout(function () {
            box.classList.remove("show");
            setTimeout(function () {
                box.remove();
            }, 300);
        }, 3000);
    }
    function saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("LocalStorage hatası:", error);
            return false;
        }
    }
    function getFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        } catch (error) {
            console.error("LocalStorage okuma hatası:", error);
            return null;
        }
    }
    /* ---------------------------------------------------------
       MOBİL MENÜ
       --------------------------------------------------------- */
    const menuButton =
        get(".mobile-menu-btn") ||
        get(".menu-toggle") ||
        get("#mobileMenuBtn");
    const mobileMenu =
        get(".mobile-menu") ||
        get(".sidebar") ||
        get("#mobileMenu");
    if (menuButton && mobileMenu) {
        menuButton.addEventListener("click", function () {
            mobileMenu.classList.toggle("active");
            menuButton.classList.toggle("active");
            const isOpen =
                mobileMenu.classList.contains("active");
            menuButton.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );
        });
    }
    /* ---------------------------------------------------------
       MOBİL MENÜ DIŞINA TIKLAYINCA KAPAT
       --------------------------------------------------------- */
    document.addEventListener("click", function (event) {
        if (!mobileMenu || !menuButton) {
            return;
        }
        const clickedInsideMenu =
            mobileMenu.contains(event.target);
        const clickedButton =
            menuButton.contains(event.target);
        if (!clickedInsideMenu && !clickedButton) {
            mobileMenu.classList.remove("active");
            menuButton.classList.remove("active");
            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });
    /* ---------------------------------------------------------
       GÖRSEL ÖNİZLEME
       --------------------------------------------------------- */
    const imageInput =
        get("#newsImage") ||
        get("#imageInput") ||
        get('input[type="file"]');
    const imagePreview =
        get("#imagePreview") ||
        get(".image-preview");
    if (imageInput && imagePreview) {
        imageInput.addEventListener("change", function () {
            const file = this.files && this.files[0];
            if (!file) {
                return;
            }
            if (!file.type.startsWith("image/")) {
                showMessage(
                    "Lütfen geçerli bir görsel seçin.",
                    "error"
                );
                this.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = function (event) {
                if (imagePreview.tagName === "IMG") {
                    imagePreview.src = event.target.result;
                    imagePreview.style.display = "block";
                } else {
                    imagePreview.innerHTML = "";
                    const image =
                        document.createElement("img");
                    image.src = event.target.result;
                    image.alt = "Haber görseli önizleme";
                    imagePreview.appendChild(image);
                    imagePreview.classList.add("has-image");
                }
            };
            reader.readAsDataURL(file);
        });
    }
    /* ---------------------------------------------------------
       HABER FORMU
       --------------------------------------------------------- */
    const newsForm =
        get("#newsForm") ||
        get(".news-form") ||
        get("form[data-news-form]");
    if (newsForm) {
        newsForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const title =
                get("#newsTitle", newsForm) ||
                get('[name="title"]', newsForm);
            const category =
                get("#newsCategory", newsForm) ||
                get('[name="category"]', newsForm);
            const content =
                get("#newsContent", newsForm) ||
                get('[name="content"]', newsForm) ||
                get("textarea", newsForm);
            const summary =
                get("#newsSummary", newsForm) ||
                get('[name="summary"]', newsForm);
            const breaking =
                get("#breakingNews", newsForm) ||
                get('[name="breaking"]', newsForm) ||
                get('[name="isBreaking"]', newsForm);
            const publishButton =
                get("#publishNews", newsForm) ||
                get('[type="submit"]', newsForm);
            /* ---------------------------------------------
               BAŞLIK KONTROLÜ
               --------------------------------------------- */
            if (title && title.value.trim().length < 5) {
                showMessage(
                    "Haber başlığı en az 5 karakter olmalıdır.",
                    "error"
                );
                title.focus();
                return;
            }
            /* ---------------------------------------------
               KATEGORİ KONTROLÜ
               --------------------------------------------- */
            if (category && category.value.trim() === "") {
                showMessage(
                    "Lütfen haber kategorisini seçin.",
                    "error"
                );
                category.focus();
                return;
            }
            /* ---------------------------------------------
               İÇERİK KONTROLÜ
               --------------------------------------------- */
            if (content && content.value.trim().length < 20) {
                showMessage(
                    "Haber içeriği en az 20 karakter olmalıdır.",
                    "error"
                );
                content.focus();
                return;
            }
            /* ---------------------------------------------
               HABER VERİSİNİ OLUŞTUR
               --------------------------------------------- */
            const newsData = {
                id:
                    "news_" +
                    Date.now(),
                title:
                    title ?
                    title.value.trim() :
                    "",
                category:
                    category ?
                    category.value.trim() :
                    "",
                summary:
                    summary ?
                    summary.value.trim() :
                    "",
                content:
                    content ?
                    content.value.trim() :
                    "",
                breaking:
                    breaking ?
                    breaking.checked :
                    false,
                status:
                    "published",
                createdAt:
                    new Date().toISOString(),
                updatedAt:
                    new Date().toISOString()
            };
            /* ---------------------------------------------
               YAYINLAMA
               --------------------------------------------- */
            const existingNews =
                getFromStorage("akcaabat_haberler") || [];
            existingNews.unshift(newsData);
            const saved =
                saveToStorage(
                    "akcaabat_haberler",
                    existingNews
                );
            if (!saved) {
                showMessage(
                    "Haber kaydedilemedi.",
                    "error"
                );
                return;
            }
            showMessage(
                "Haber başarıyla yayınlandı.",
                "success"
            );
            if (publishButton) {
                publishButton.disabled = true;
                setTimeout(function () {
                    publishButton.disabled = false;
                }, 1500);
            }
        });
    }
    /* ---------------------------------------------------------
       TASLAK KAYDETME
       --------------------------------------------------------- */
    const draftButton =
        get("#saveDraft") ||
        get("#save-draft") ||
        get('[data-action="draft"]');
    if (draftButton) {
        draftButton.addEventListener("click", function (event) {
            event.preventDefault();
            const title =
                get("#newsTitle") ||
                get('[name="title"]');
            const category =
                get("#newsCategory") ||
                get('[name="category"]');
            const summary =
                get("#newsSummary") ||
                get('[name="summary"]');
            const content =
                get("#newsContent") ||
                get('[name="content"]') ||
                get("textarea");
            const breaking =
                get("#breakingNews") ||
                get('[name="breaking"]');
            const draft = {
                id:
                    "draft_" +
                    Date.now(),
                title:
                    title ?
                    title.value.trim() :
                    "",
                category:
                    category ?
                    category.value.trim() :
                    "",
                summary:
                    summary ?
                    summary.value.trim() :
                    "",
                content:
                    content ?
                    content.value.trim() :
                    "",
                breaking:
                    breaking ?
                    breaking.checked :
                    false,
                status:
                    "draft",
                savedAt:
                    new Date().toISOString()
            };
            const drafts =
                getFromStorage("akcaabat_taslaklar") || [];
            drafts.unshift(draft);
            const saved =
                saveToStorage(
                    "akcaabat_taslaklar",
                    drafts
                );
            if (saved) {
                showMessage(
                    "Taslak başarıyla kaydedildi.",
                    "success"
                );
            } else {
                showMessage(
                    "Taslak kaydedilemedi.",
                    "error"
                );
            }
        });
    }
    /* ---------------------------------------------------------
       SON DAKİKA KONTROLÜ
       --------------------------------------------------------- */
    const breakingCheckbox =
        get("#breakingNews") ||
        get('[name="breaking"]') ||
        get('[name="isBreaking"]');
    const breakingLabel =
        get("#breakingLabel") ||
        get(".breaking-label");
    if (breakingCheckbox) {
        function updateBreakingState() {
            if (
                breakingCheckbox.checked &&
                breakingLabel
            ) {
                breakingLabel.classList.add("active");
            } else if (breakingLabel) {
                breakingLabel.classList.remove("active");
            }
        }
        breakingCheckbox.addEventListener(
            "change",
            updateBreakingState
        );
        updateBreakingState();
    }
    /* ---------------------------------------------------------
       KARAKTER SAYACI
       --------------------------------------------------------- */
    const textareas =
        getAll("textarea");
    textareas.forEach(function (textarea) {
        const counter =
            document.querySelector(
                '[data-counter-for="' +
                textarea.id +
                '"]'
            );
        if (!counter) {
            return;
        }
        function updateCounter() {
            const length =
                textarea.value.length;
            counter.textContent =
                length + " karakter";
        }
        textarea.addEventListener(
            "input",
            updateCounter
        );
        updateCounter();
    });
    /* ---------------------------------------------------------
       OTOMATİK TASLAK
       --------------------------------------------------------- */
    const autoDraftFields = [
        "#newsTitle",
        "#newsSummary",
        "#newsContent"
    ];
    function collectAutoDraft() {
        const data = {};
        autoDraftFields.forEach(function (selector) {
            const field = get(selector);
            if (field) {
                data[selector] =
                    field.value;
            }
        });
        const category =
            get("#newsCategory");
        if (category) {
            data.category =
                category.value;
        }
        const breaking =
            get("#breakingNews");
        if (breaking) {
            data.breaking =
                breaking.checked;
        }
        return data;
    }
    function restoreAutoDraft() {
        const saved =
            getFromStorage(
                "akcaabat_otomatik_taslak"
            );
        if (!saved) {
            return;
        }
        autoDraftFields.forEach(function (selector) {
            const field = get(selector);
            if (
                field &&
                saved[selector] !== undefined
            ) {
                field.value =
                    saved[selector];
            }
        });
        const category =
            get("#newsCategory");
        if (
            category &&
            saved.category !== undefined
        ) {
            category.value =
                saved.category;
        }
        const breaking =
            get("#breakingNews");
        if (
            breaking &&
            saved.breaking !== undefined
        ) {
            breaking.checked =
                saved.breaking;
        }
    }
    if (
        newsForm ||
        get("#newsTitle") ||
        get("#newsContent")
    ) {
        restoreAutoDraft();
        setInterval(function () {
            const draft =
                collectAutoDraft();
            const hasContent =
                Object.values(draft).some(function (value) {
                    if (typeof value === "boolean") {
                        return value;
                    }
                    return String(value || "").trim() !== "";
                });
            if (hasContent) {
                saveToStorage(
                    "akcaabat_otomatik_taslak",
                    draft
                );
            }
        }, 10000);
    }
    /* ---------------------------------------------------------
       SAYFADAN ÇIKARKEN OTOMATİK TASLAK
       --------------------------------------------------------- */
    window.addEventListener(
        "beforeunload",
        function () {
            if (!newsForm) {
                return;
            }
            const draft =
                collectAutoDraft();
            saveToStorage(
                "akcaabat_otomatik_taslak",
                draft
            );
        }
    );
    /* ---------------------------------------------------------
       FORM TEMİZLEME
       --------------------------------------------------------- */
    const clearButton =
        get("#clearNewsForm") ||
        get("#clearForm") ||
        get('[data-action="clear"]');
    if (clearButton && newsForm) {
        clearButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                const confirmed =
                    window.confirm(
                        "Formdaki tüm bilgiler silinsin mi?"
                    );
                if (!confirmed) {
                    return;
                }
                newsForm.reset();
                localStorage.removeItem(
                    "akcaabat_otomatik_taslak"
                );
                if (imagePreview) {
                    if (
                        imagePreview.tagName === "IMG"
                    ) {
                        imagePreview.removeAttribute(
                            "src"
                        );
                        imagePreview.style.display =
                            "none";
                    } else {
                        imagePreview.innerHTML = "";
                        imagePreview.classList.remove(
                            "has-image"
                        );
                    }
                }
                showMessage(
                    "Form temizlendi.",
                    "success"
                );
            }
        );
    }
    /* ---------------------------------------------------------
       GENEL BUTON ANİMASYONU
       --------------------------------------------------------- */
    const buttons =
        getAll("button");
    buttons.forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                if (
                    button.disabled
                ) {
                    return;
                }
                button.classList.add(
                    "clicked"
                );
                setTimeout(function () {
                    button.classList.remove(
                        "clicked"
                    );
                }, 250);
            }
        );
    });
    /* ---------------------------------------------------------
       SAYFA HAZIR
       --------------------------------------------------------- */
    document.body.classList.add(
        "js-ready"
    );
});