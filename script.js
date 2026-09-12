/* =========================================================
   AKÇAABAT HABER
   ANA JAVASCRIPT
   ========================================================= */

(function () {

    "use strict";

    /* ---------------------------------------------------------
       STORAGE ANAHTARLARI
    --------------------------------------------------------- */

    const NEWS_KEY = "akcaabat_haberler";
    const DRAFT_KEY = "akcaabat_taslaklar";


    /* ---------------------------------------------------------
       GENEL AYARLAR
    --------------------------------------------------------- */

    const FALLBACK_IMAGE =
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";


    /* ---------------------------------------------------------
       YARDIMCI FONKSİYONLAR
    --------------------------------------------------------- */

    function readStorage(key) {

        try {

            const value =
                localStorage.getItem(key);

            if (!value) {
                return [];
            }

            const parsed =
                JSON.parse(value);

            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch (error) {

            console.error(
                "Storage okuma hatası:",
                error
            );

            return [];

        }

    }


    function writeStorage(key, data) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {

            console.error(
                "Storage yazma hatası:",
                error
            );

            return false;

        }

    }


    function createId(prefix) {

        const random =
            Math.random()
                .toString(36)
                .substring(2, 9);

        const time =
            Date.now()
                .toString(36);

        return (
            prefix +
            "-" +
            time +
            "-" +
            random
        );

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getTitle(item) {

        return item.title ||
            item.baslik ||
            "";

    }


    function getSummary(item) {

        return item.summary ||
            item.ozet ||
            "";

    }


    function getContent(item) {

        return item.content ||
            item.icerik ||
            "";

    }


    function getCategory(item) {

        return item.category ||
            item.kategori ||
            "Genel";

    }


    function getImage(item) {

        return item.image ||
            item.gorsel ||
            item.resim ||
            FALLBACK_IMAGE;

    }


    function getViews(item) {

        const value =
            item.views !== undefined
                ? item.views
                : item.goruntulenme;

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : 0;

    }


    function getNewsId(item) {

        return item.id ||
            item.newsId ||
            item.haberId ||
            "";

    }


    function getDate(item) {

        return item.publishedAt ||
            item.createdAt ||
            item.updatedAt ||
            "";

    }


    function isBreaking(item) {

        return item.breaking === true ||
            item.breaking === "true";

    }


    function nowIso() {

        return new Date().toISOString();

    }


    function formatDate(value) {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        return date.toLocaleDateString(
            "tr-TR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    }


    function formatDateTime(value) {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        return date.toLocaleDateString(
            "tr-TR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ) +
        " " +
        date.toLocaleTimeString(
            "tr-TR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function slugify(text) {

        return String(text || "")
            .toLowerCase()
            .trim()
            .replace(/ğ/g, "g")
            .replace(/ü/g, "u")
            .replace(/ş/g, "s")
            .replace(/ı/g, "i")
            .replace(/ö/g, "o")
            .replace(/ç/g, "c")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    }


    /* ---------------------------------------------------------
       GLOBAL OBJE
    --------------------------------------------------------- */

    window.AkcaaabatHaber = {

        NEWS_KEY: NEWS_KEY,

        DRAFT_KEY: DRAFT_KEY,

        FALLBACK_IMAGE: FALLBACK_IMAGE,

        readNews: function () {

            return readStorage(
                NEWS_KEY
            );

        },

        readDrafts: function () {

            return readStorage(
                DRAFT_KEY
            );

        },

        saveNews: function (data) {

            return writeStorage(
                NEWS_KEY,
                data
            );

        },

        saveDrafts: function (data) {

            return writeStorage(
                DRAFT_KEY,
                data
            );

        },

        createId: createId,

        escapeHtml: escapeHtml,

        slugify: slugify

    };


    /* ---------------------------------------------------------
       MOBİL MENÜ
    --------------------------------------------------------- */

    function initMobileMenu() {

        const buttons =
            document.querySelectorAll(
                "[data-mobile-menu]"
            );

        buttons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    document.body.classList.toggle(
                        "mobile-menu-open"
                    );

                }
            );

        });


        document.addEventListener(
            "click",
            function (event) {

                const target =
                    event.target;

                if (
                    target.closest(
                        "[data-mobile-menu-close]"
                    )
                ) {

                    document.body.classList.remove(
                        "mobile-menu-open"
                    );

                }

            }
        );

    }


    /* ---------------------------------------------------------
       RESİM ÖNİZLEME
    --------------------------------------------------------- */

    function initImagePreview() {

        const input =
            document.querySelector(
                'input[type="file"][data-image-input]'
            );


        const preview =
            document.querySelector(
                "[data-image-preview]"
            );


        if (!input || !preview) {
            return;
        }


        input.addEventListener(
            "change",
            function () {

                const file =
                    input.files &&
                    input.files[0];


                if (!file) {
                    return;
                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    alert(
                        "Lütfen geçerli bir görsel seç."
                    );

                    input.value = "";

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        preview.src =
                            event.target.result;

                        preview.style.display =
                            "block";

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* ---------------------------------------------------------
       FORM ELEMENT OKUMA
    --------------------------------------------------------- */

    function getFormValue(
        form,
        selectors
    ) {

        for (
            let i = 0;
            i < selectors.length;
            i++
        ) {

            const element =
                form.querySelector(
                    selectors[i]
                );


            if (element) {

                return element.value
                    .trim();

            }

        }

        return "";

    }


    function getFormCheckbox(
        form,
        selectors
    ) {

        for (
            let i = 0;
            i < selectors.length;
            i++
        ) {

            const element =
                form.querySelector(
                    selectors[i]
                );


            if (element) {
                return element.checked;
            }

        }

        return false;

    }


    function findFormElement(
        form,
        selectors
    ) {

        for (
            let i = 0;
            i < selectors.length;
            i++
        ) {

            const element =
                form.querySelector(
                    selectors[i]
                );


            if (element) {
                return element;
            }

        }

        return null;

    }


    /* ---------------------------------------------------------
       HABER FORMU
    --------------------------------------------------------- */

    function initNewsForm() {

        const form =
            document.querySelector(
                "[data-news-form]"
            );


        if (!form) {
            return;
        }


        const titleInput =
            findFormElement(
                form,
                [
                    "#title",
                    "#baslik",
                    "[name='title']",
                    "[name='baslik']"
                ]
            );


        const summaryInput =
            findFormElement(
                form,
                [
                    "#summary",
                    "#ozet",
                    "[name='summary']",
                    "[name='ozet']"
                ]
            );


        const contentInput =
            findFormElement(
                form,
                [
                    "#content",
                    "#icerik",
                    "[name='content']",
                    "[name='icerik']"
                ]
            );


        const categoryInput =
            findFormElement(
                form,
                [
                    "#category",
                    "#kategori",
                    "[name='category']",
                    "[name='kategori']"
                ]
            );


        const imageInput =
            findFormElement(
                form,
                [
                    "#image",
                    "#gorsel",
                    "[name='image']",
                    "[name='gorsel']"
                ]
            );


        const breakingInput =
            findFormElement(
                form,
                [
                    "#breaking",
                    "[name='breaking']"
                ]
            );


        const publishButton =
            form.querySelector(
                "[data-publish]"
            );


        const draftButton =
            form.querySelector(
                "[data-save-draft]"
            );


        const previewButton =
            form.querySelector(
                "[data-preview]"
            );


        const titleCounter =
            document.querySelector(
                "[data-title-counter]"
            );


        const summaryCounter =
            document.querySelector(
                "[data-summary-counter]"
            );


        const contentCounter =
            document.querySelector(
                "[data-content-counter]"
            );


        function updateCounters() {

            if (
                titleInput &&
                titleCounter
            ) {

                titleCounter.textContent =
                    titleInput.value.length;

            }


            if (
                summaryInput &&
                summaryCounter
            ) {

                summaryCounter.textContent =
                    summaryInput.value.length;

            }


            if (
                contentInput &&
                contentCounter
            ) {

                contentCounter.textContent =
                    contentInput.value.length;

            }

        }


        [
            titleInput,
            summaryInput,
            contentInput
        ].forEach(function (input) {

            if (!input) {
                return;
            }

            input.addEventListener(
                "input",
                updateCounters
            );

        });


        updateCounters();


        function getImageValue() {

            if (!imageInput) {
                return FALLBACK_IMAGE;
            }


            if (
                imageInput.type ===
                "file"
            ) {

                const preview =
                    document.querySelector(
                        "[data-image-preview]"
                    );


                if (
                    preview &&
                    preview.src &&
                    preview.src.indexOf(
                        "data:image"
                    ) === 0
                ) {

                    return preview.src;

                }


                return FALLBACK_IMAGE;

            }


            return imageInput.value ||
                FALLBACK_IMAGE;

        }


        function collectData(
            existing
        ) {

            const title =
                titleInput
                    ? titleInput.value.trim()
                    : "";


            const summary =
                summaryInput
                    ? summaryInput.value.trim()
                    : "";


            const content =
                contentInput
                    ? contentInput.value.trim()
                    : "";


            const category =
                categoryInput
                    ? categoryInput.value.trim()
                    : "Genel";


            const breaking =
                breakingInput
                    ? breakingInput.checked
                    : false;


            return {

                id:
                    existing &&
                    existing.id
                        ? existing.id
                        : createId("haber"),

                title: title,

                summary: summary,

                content: content,

                category:
                    category || "Genel",

                breaking: breaking,

                image:
                    getImageValue(),

                views:
                    existing &&
                    Number.isFinite(
                        Number(existing.views)
                    )
                        ? Number(existing.views)
                        : 0,

                createdAt:
                    existing &&
                    existing.createdAt
                        ? existing.createdAt
                        : nowIso(),

                updatedAt:
                    nowIso(),

                publishedAt:
                    existing &&
                    existing.publishedAt
                        ? existing.publishedAt
                        : nowIso(),

                status:
                    "published"

            };

        }


        function validateData(data) {

            if (!data.title) {

                alert(
                    "Lütfen haber başlığını gir."
                );

                if (titleInput) {
                    titleInput.focus();
                }

                return false;

            }


            if (
                data.title.length <
                5
            ) {

                alert(
                    "Haber başlığı en az 5 karakter olmalı."
                );

                titleInput.focus();

                return false;

            }


            if (!data.content) {

                alert(
                    "Lütfen haber içeriğini gir."
                );

                if (contentInput) {
                    contentInput.focus();
                }

                return false;

            }


            if (
                data.content.length <
                20
            ) {

                alert(
                    "Haber içeriği çok kısa."
                );

                contentInput.focus();

                return false;

            }


            return true;

        }


        function getEditId() {

            const params =
                new URLSearchParams(
                    window.location.search
                );


            return (
                params.get("edit") ||
                ""
            );

        }


        function findExistingNews() {

            const editId =
                getEditId();


            if (!editId) {
                return null;
            }


            const news =
                readStorage(
                    NEWS_KEY
                );


            return news.find(
                function (item) {

                    return String(
                        getNewsId(item)
                    ) === String(
                        editId
                    );

                }
            ) || null;

        }


        function savePublishedNews() {

            const existing =
                findExistingNews();


            const data =
                collectData(
                    existing
                );


            if (
                !validateData(data)
            ) {
                return false;
            }


            const news =
                readStorage(
                    NEWS_KEY
                );


            const existingIndex =
                news.findIndex(
                    function (item) {

                        return String(
                            getNewsId(item)
                        ) === String(
                            data.id
                        );

                    }
                );


            if (
                existingIndex >= 0
            ) {

                news[
                    existingIndex
                ] = data;

            } else {

                news.unshift(
                    data
                );

            }


            if (
                !writeStorage(
                    NEWS_KEY,
                    news
                )
            ) {

                alert(
                    "Haber kaydedilemedi. Tarayıcı depolama alanını kontrol et."
                );

                return false;

            }


            /*
             * Eğer bu haber daha önce taslakta
             * bulunuyorsa aynı ID'li taslağı temizle.
             */

            removeDraftByNewsId(
                data.id
            );


            return true;

        }


        function saveDraft() {

            const existing =
                findExistingNews();


            const title =
                titleInput
                    ? titleInput.value.trim()
                    : "";


            const summary =
                summaryInput
                    ? summaryInput.value.trim()
                    : "";


            const content =
                contentInput
                    ? contentInput.value.trim()
                    : "";


            const category =
                categoryInput
                    ? categoryInput.value.trim()
                    : "Genel";


            const breaking =
                breakingInput
                    ? breakingInput.checked
                    : false;


            const params =
                new URLSearchParams(
                    window.location.search
                );


            const draftId =
                params.get("draft") ||
                (
                    existing
                        ? existing.id
                        : createId("taslak")
                );


            const draft = {

                id: draftId,

                title: title,

                summary: summary,

                content: content,

                category:
                    category || "Genel",

                breaking: breaking,

                image:
                    getImageValue(),

                createdAt:
                    nowIso(),

                updatedAt:
                    nowIso()

            };


            const drafts =
                readStorage(
                    DRAFT_KEY
                );


            const index =
                drafts.findIndex(
                    function (item) {

                        return String(
                            item.id
                        ) === String(
                            draftId
                        );

                    }
                );


            if (index >= 0) {

                /*
                 * Eski createdAt bilgisini koru.
                 */

                draft.createdAt =
                    drafts[index].createdAt ||
                    draft.createdAt;


                drafts[index] =
                    draft;

            } else {

                drafts.unshift(
                    draft
                );

            }


            const saved =
                writeStorage(
                    DRAFT_KEY,
                    drafts
                );


            if (!saved) {

                alert(
                    "Taslak kaydedilemedi."
                );

                return false;

            }


            alert(
                "Taslak başarıyla kaydedildi."
            );


            return true;

        }


        function removeDraftByNewsId(
            id
        ) {

            const drafts =
                readStorage(
                    DRAFT_KEY
                );


            const filtered =
                drafts.filter(
                    function (item) {

                        return String(
                            item.id
                        ) !== String(
                            id
                        );

                    }
                );


            writeStorage(
                DRAFT_KEY,
                filtered
            );

        }


        if (publishButton) {

            publishButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    const saved =
                        savePublishedNews();


                    if (!saved) {
                        return;
                    }


                    alert(
                        "Haber başarıyla yayınlandı."
                    );


                    window.location.href =
                        "haber.html";

                }
            );

        }


        if (draftButton) {

            draftButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    saveDraft();

                }
            );

        }


        if (previewButton) {

            previewButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    const title =
                        titleInput
                            ? titleInput.value.trim()
                            : "";


                    if (!title) {

                        alert(
                            "Önizleme için önce başlık gir."
                        );

                        return;

                    }


                    const temporary =
                        collectData(
                            null
                        );


                    sessionStorage.setItem(
                        "akcaabat_preview_haber",
                        JSON.stringify(
                            temporary
                        )
                    );


                    window.open(
                        "haber-onizleme.html",
                        "_blank"
                    );

                }
            );

        }

    }


    /* ---------------------------------------------------------
       OTOMATİK TASLAK
    --------------------------------------------------------- */

    function initAutoDraft() {

        const form =
            document.querySelector(
                "[data-news-form]"
            );


        if (!form) {
            return;
        }


        const title =
            findInput(
                form,
                [
                    "#title",
                    "#baslik",
                    "[name='title']",
                    "[name='baslik']"
                ]
            );


        const summary =
            findInput(
                form,
                [
                    "#summary",
                    "#ozet",
                    "[name='summary']",
                    "[name='ozet']"
                ]
            );


        const content =
            findInput(
                form,
                [
                    "#content",
                    "#icerik",
                    "[name='content']",
                    "[name='icerik']"
                ]
            );


        if (
            !title &&
            !summary &&
            !content
        ) {
            return;
        }


        let timer = null;


        function saveTemporary() {

            const data = {

                title:
                    title
                        ? title.value
                        : "",

                summary:
                    summary
                        ? summary.value
                        : "",

                content:
                    content
                        ? content.value
                        : "",

                savedAt:
                    nowIso()

            };


            /*
             * Tamamen boş formu kaydetme.
             */

            if (
                !data.title &&
                !data.summary &&
                !data.content
            ) {
                return;
            }


            try {

                sessionStorage.setItem(
                    "akcaabat_auto_draft",
                    JSON.stringify(data)
                );

            } catch (error) {

                console.warn(
                    "Otomatik taslak kaydedilemedi.",
                    error
                );

            }

        }


        [
            title,
            summary,
            content
        ].forEach(function (input) {

            if (!input) {
                return;
            }


            input.addEventListener(
                "input",
                function () {

                    clearTimeout(
                        timer
                    );


                    timer =
                        setTimeout(
                            saveTemporary,
                            1200
                        );

                }
            );

        });

    }


    function findInput(
        form,
        selectors
    ) {

        for (
            let i = 0;
            i < selectors.length;
            i++
        ) {

            const input =
                form.querySelector(
                    selectors[i]
                );


            if (input) {
                return input;
            }

        }

        return null;

    }


    /* ---------------------------------------------------------
       FORM TEMİZLEME
    --------------------------------------------------------- */

    function initClearForm() {

        const button =
            document.querySelector(
                "[data-clear-form]"
            );


        const form =
            document.querySelector(
                "[data-news-form]"
            );


        if (!button || !form) {
            return;
        }


        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const confirmed =
                    confirm(
                        "Formdaki tüm bilgiler temizlensin mi?"
                    );


                if (!confirmed) {
                    return;
                }


                form.reset();


                const preview =
                    document.querySelector(
                        "[data-image-preview]"
                    );


                if (preview) {

                    preview.removeAttribute(
                        "src"
                    );

                    preview.style.display =
                        "none";

                }


                try {

                    sessionStorage.removeItem(
                        "akcaabat_auto_draft"
                    );

                } catch (error) {
                    console.warn(error);
                }


                document
                    .querySelectorAll(
                        "[data-title-counter], [data-summary-counter], [data-content-counter]"
                    )
                    .forEach(function (element) {

                        element.textContent =
                            "0";

                    });

            }
        );

    }


    /* ---------------------------------------------------------
       OTOMATİK TASLAĞI YÜKLE
    --------------------------------------------------------- */

    function loadAutoDraft() {

        const form =
            document.querySelector(
                "[data-news-form]"
            );


        if (!form) {
            return;
        }


        const params =
            new URLSearchParams(
                window.location.search
            );


        /*
         * Düzenleme veya gerçek taslak sayfasında
         * otomatik taslak formu ezmesin.
         */

        if (
            params.has("edit") ||
            params.has("draft")
        ) {
            return;
        }


        try {

            const raw =
                sessionStorage.getItem(
                    "akcaabat_auto_draft"
                );


            if (!raw) {
                return;
            }


            const data =
                JSON.parse(raw);


            if (!data) {
                return;
            }


            const title =
                findInput(
                    form,
                    [
                        "#title",
                        "#baslik",
                        "[name='title']",
                        "[name='baslik']"
                    ]
                );


            const summary =
                findInput(
                    form,
                    [
                        "#summary",
                        "#ozet",
                        "[name='summary']",
                        "[name='ozet']"
                    ]
                );


            const content =
                findInput(
                    form,
                    [
                        "#content",
                        "#icerik",
                        "[name='content']",
                        "[name='icerik']"
                    ]
                );


            if (
                title &&
                data.title
            ) {
                title.value =
                    data.title;
            }


            if (
                summary &&
                data.summary
            ) {
                summary.value =
                    data.summary;
            }


            if (
                content &&
                data.content
            ) {
                content.value =
                    data.content;
            }


        } catch (error) {

            console.warn(
                "Otomatik taslak yüklenemedi:",
                error
            );

        }

    }


    /* ---------------------------------------------------------
       BUTON ANİMASYONU
    --------------------------------------------------------- */

    function initButtonEffects() {

        document
            .querySelectorAll(
                "button, .btn, .button"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        button.classList.add(
                            "button-clicked"
                        );


                        setTimeout(
                            function () {

                                button.classList.remove(
                                    "button-clicked"
                                );

                            },
                            180
                        );

                    }
                );

            });

    }


    /* ---------------------------------------------------------
       GÖRSEL URL KONTROLÜ
    --------------------------------------------------------- */

    function initImageUrlInputs() {

        document
            .querySelectorAll(
                "[data-image-url]"
            )
            .forEach(function (input) {

                input.addEventListener(
                    "input",
                    function () {

                        const preview =
                            document.querySelector(
                                "[data-image-preview]"
                            );


                        if (
                            !preview ||
                            !input.value.trim()
                        ) {
                            return;
                        }


                        preview.src =
                            input.value.trim();


                        preview.style.display =
                            "block";


                        preview.onerror =
                            function () {

                                preview.src =
                                    FALLBACK_IMAGE;

                            };

                    }
                );

            });

    }


    /* ---------------------------------------------------------
       FORM DOĞRULAMA
    --------------------------------------------------------- */

    function initValidation() {

        document
            .querySelectorAll(
                "form"
            )
            .forEach(function (form) {

                if (
                    form.matches(
                        "[data-no-validation]"
                    )
                ) {
                    return;
                }


                form.addEventListener(
                    "submit",
                    function () {

                        const required =
                            form.querySelectorAll(
                                "[required]"
                            );


                        let valid = true;


                        required.forEach(
                            function (field) {

                                if (
                                    !field.value.trim()
                                ) {

                                    valid =
                                        false;

                                    field.classList.add(
                                        "input-error"
                                    );

                                } else {

                                    field.classList.remove(
                                        "input-error"
                                    );

                                }

                            }
                        );


                        if (!valid) {

                            alert(
                                "Lütfen zorunlu alanları doldur."
                            );

                        }

                    }
                );

            });

    }


    /* ---------------------------------------------------------
       TARİH GÖSTER
    --------------------------------------------------------- */

    function initDateElements() {

        document
            .querySelectorAll(
                "[data-current-date]"
            )
            .forEach(function (element) {

                element.textContent =
                    new Date()
                        .toLocaleDateString(
                            "tr-TR",
                            {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                            }
                        );

            });


        document
            .querySelectorAll(
                "[data-current-year]"
            )
            .forEach(function (element) {

                element.textContent =
                    new Date()
                        .getFullYear();

            });

    }


    /* ---------------------------------------------------------
       HABER SAYISI GÖSTER
    --------------------------------------------------------- */

    function initNewsCounters() {

        const news =
            readStorage(
                NEWS_KEY
            );


        const drafts =
            readStorage(
                DRAFT_KEY
            );


        document
            .querySelectorAll(
                "[data-news-count]"
            )
            .forEach(function (element) {

                element.textContent =
                    news.length;

            });


        document
            .querySelectorAll(
                "[data-draft-count]"
            )
            .forEach(function (element) {

                element.textContent =
                    drafts.length;

            });


        document
            .querySelectorAll(
                "[data-breaking-count]"
            )
            .forEach(function (element) {

                element.textContent =
                    news.filter(
                        function (item) {

                            return isBreaking(
                                item
                            );

                        }
                    ).length;

            });


        const views =
            news.reduce(
                function (total, item) {

                    return total +
                        getViews(item);

                },
                0
            );


        document
            .querySelectorAll(
                "[data-view-count]"
            )
            .forEach(function (element) {

                element.textContent =
                    views.toLocaleString(
                        "tr-TR"
                    );

            });

    }


    /* ---------------------------------------------------------
       ESC TUŞU
    --------------------------------------------------------- */

    function initEscapeKey() {

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    document.body.classList.remove(
                        "mobile-menu-open"
                    );


                    document
                        .querySelectorAll(
                            ".modal.active, .modal.open"
                        )
                        .forEach(
                            function (modal) {

                                modal.classList.remove(
                                    "active",
                                    "open"
                                );

                            }
                        );

                }

            }
        );

    }


    /* ---------------------------------------------------------
       SAYFA YÜKLENDİĞİNDE
    --------------------------------------------------------- */

    function init() {

        initMobileMenu();

        initImagePreview();

        initNewsForm();

        initAutoDraft();

        loadAutoDraft();

        initClearForm();

        initButtonEffects();

        initImageUrlInputs();

        initValidation();

        initDateElements();

        initNewsCounters();

        initEscapeKey();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }


})();