(function () {
    "use strict";

    const body = document.body;
    if (!body) return;

    body.classList.add("portal-unified");

    /* =====================================================
       HELPERS
       ===================================================== */

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

    const normalize = (value) =>
        String(value ?? "")
            .toLocaleLowerCase("tr-TR")
            .trim();

    const currentURL = new URL(window.location.href);
    const currentFile =
        currentURL.pathname.split("/").pop() || "index.html";

    const currentCategory =
        currentURL.searchParams.get("kategori") ||
        currentURL.searchParams.get("slug") ||
        "";

    const now = new Date();

    const formattedDate =
        now.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });


    /* =====================================================
       HEADER
       ===================================================== */

    const header = document.createElement("header");

    header.className = "ah-shell";

    header.innerHTML = `

        <div class="ah-top">
            <div class="ah-wrap">

                <div class="ah-top-left">
                    <span>${escapeHTML(formattedDate)}</span>
                </div>

                <div class="ah-top-right">
                    <span>Akçaabat • Trabzon</span>
                    <span id="ahClock">
                        ${escapeHTML(
                            now.toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit"
                            })
                        )}
                    </span>
                </div>

            </div>
        </div>


        <div class="ah-main">
            <div class="ah-wrap">

                <a
                    class="ah-brand"
                    href="index.html"
                    aria-label="Akçaabat Haber ana sayfa"
                >
                    <span class="ah-mark">AH</span>

                    <span class="ah-brand-copy">
                        <strong>AKÇAABAT</strong>
                        <span>HABER</span>
                    </span>
                </a>


                <div class="ah-services">

                    <a
                        class="ah-service"
                        href="haber.html"
                    >
                        SON HABERLER
                    </a>

                    <a
                        class="ah-service"
                        href="arama.html"
                    >
                        HABER ARA
                    </a>

                    <a
                        class="ah-service"
                        href="mac-merkezi.html"
                    >
                        MAÇ MERKEZİ
                    </a>

                    <a
                        class="ah-service"
                        href="kameralar.html"
                    >
                        KAMERALAR
                    </a>

                    <a
                        class="ah-service"
                        href="trafik.html"
                    >
                        TRAFİK
                    </a>

                </div>

            </div>
        </div>


        <nav
            class="ah-nav"
            id="ahNav"
            aria-label="Ana menü"
        >

            <div class="ah-wrap">

                <button
                    class="ah-menu"
                    id="ahMenu"
                    type="button"
                    aria-label="Menüyü aç"
                    aria-expanded="false"
                >
                    ☰
                </button>


                <a
                    href="index.html"
                    data-page="index.html"
                >
                    ANA SAYFA
                </a>


                <a
                    href="kategori.html?kategori=Akçaabat"
                    data-category="Akçaabat"
                >
                    AKÇAABAT
                </a>


                <a
                    href="kategori.html?kategori=Trabzon"
                    data-category="Trabzon"
                >
                    TRABZON
                </a>


                <a
                    href="kategori.html?kategori=Trabzonspor"
                    data-category="Trabzonspor"
                >
                    TRABZONSPOR
                </a>


                <a
                    href="kategori.html?kategori=Gündem"
                    data-category="Gündem"
                >
                    GÜNDEM
                </a>


                <a
                    href="kategori.html?kategori=Spor"
                    data-category="Spor"
                >
                    SPOR
                </a>


                <a
                    href="kategori.html?kategori=Ekonomi"
                    data-category="Ekonomi"
                >
                    EKONOMİ
                </a>


                <a
                    href="kategori.html?kategori=Asayiş"
                    data-category="Asayiş"
                >
                    ASAYİŞ
                </a>


                <a
                    href="mac-merkezi.html"
                    data-page="mac-merkezi.html"
                >
                    MAÇ MERKEZİ
                </a>

                <a
                    href="kameralar.html"
                    data-page="kameralar.html"
                >
                    KAMERALAR
                </a>

                <a
                    href="trafik.html"
                    data-page="trafik.html"
                >
                    TRAFİK
                </a>

                <a
                    href="yazarlar.html"
                    data-page="yazarlar.html"
                >
                    YAZARLAR
                </a>

                <a
                    href="haber.html?breaking=1"
                    class="ah-live"
                >
                    ● SON DAKİKA
                </a>

            </div>

        </nav>


        <div class="ah-breaking">

            <div class="ah-wrap">

                <span class="ah-breaking-label">
                    SON DAKİKA
                </span>

                <span
                    class="ah-breaking-text"
                    id="ahBreaking"
                >
                    Son gelişmeler yükleniyor...
                </span>

            </div>

        </div>
    `;


    /*
     * Ana sayfa kendi yoğun Son Dakika akışını kullanır.
     * Böylece ikinci bir bant üretilmez.
     */
    if (
        body.classList.contains(
            "home-page"
        )
    ) {
        const duplicateBreaking =
            header.querySelector(
                ".ah-breaking"
            );

        if (duplicateBreaking) {
            duplicateBreaking.remove();
        }
    }

    body.insertBefore(
        header,
        body.firstChild
    );


    /* =====================================================
       FOOTER
       ===================================================== */

    const footer =
        document.createElement("footer");

    footer.className =
        "ah-footer";

    footer.innerHTML = `

        <div class="ah-wrap ah-footer-top">

            <div>

                <a
                    class="ah-brand"
                    href="index.html"
                >

                    <span class="ah-mark">
                        AH
                    </span>

                    <span class="ah-brand-copy">

                        <strong>
                            AKÇAABAT
                        </strong>

                        <span>
                            HABER
                        </span>

                    </span>

                </a>


                <p>
                    Akçaabat başta olmak üzere
                    Trabzon'un gündemini,
                    son dakika gelişmelerini,
                    sporu ve yerel yaşamı
                    okuyucularına ulaştıran
                    bağımsız yerel haber platformu.
                </p>

            </div>


            <div>

                <h3>
                    HABERLER
                </h3>

                <a href="kategori.html?kategori=Akçaabat">
                    Akçaabat
                </a>

                <a href="kategori.html?kategori=Trabzon">
                    Trabzon
                </a>

                <a href="kategori.html?kategori=Trabzonspor">
                    Trabzonspor
                </a>

                <a href="kategori.html?kategori=Gündem">
                    Gündem
                </a>

                <a href="kategori.html?kategori=Spor">
                    Spor
                </a>

                <a href="haber.html">
                    Tüm Haberler
                </a>

            </div>


            <div>

                <h3>
                    SERVİSLER
                </h3>

                <a href="arama.html">
                    Haber Ara
                </a>

                <a href="mac-merkezi.html">
                    Maç Merkezi
                </a>

                <a href="kameralar.html">
                    Kameralar / MOBESE
                </a>

                <a href="trafik.html">
                    Trafik
                </a>

                <a href="yazarlar.html">
                    Köşe Yazarları
                </a>

                <a href="iletisim.html">
                    İletişim
                </a>

            </div>


            <div>

                <h3>
                    KURUMSAL
                </h3>

                <a href="hakkimizda.html">
                    Hakkımızda
                </a>

                <a href="kunye.html">
                    Künye
                </a>

                <a href="gizlilik.html">
                    Gizlilik
                </a>

                <a href="kvkk.html">
                    KVKK
                </a>

                <a href="cerez-politikasi.html">
                    Çerez Politikası
                </a>

            </div>

        </div>


        <div class="ah-footer-bottom">

            <div class="ah-wrap">

                © ${now.getFullYear()}
                Akçaabat Haber
                • Tüm hakları saklıdır.

            </div>

        </div>
    `;


    body.appendChild(footer);


    /* =====================================================
       MOBİL MENÜ
       ===================================================== */

    const menu =
        document.getElementById("ahMenu");

    const nav =
        document.getElementById("ahNav");


    if (menu && nav) {

        menu.addEventListener(
            "click",
            () => {

                const opened =
                    nav.classList.toggle(
                        "is-open"
                    );

                menu.setAttribute(
                    "aria-expanded",
                    String(opened)
                );

                menu.setAttribute(
                    "aria-label",
                    opened
                        ? "Menüyü kapat"
                        : "Menüyü aç"
                );

                menu.textContent =
                    opened
                        ? "✕"
                        : "☰";
            }
        );


        nav.querySelectorAll("a")
            .forEach((link) => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <= 900
                        ) {

                            nav.classList.remove(
                                "is-open"
                            );

                            menu.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                            menu.textContent =
                                "☰";
                        }

                    }
                );

            });

    }


    /* =====================================================
       AKTİF MENÜ
       ===================================================== */

    const navLinks =
        document.querySelectorAll(
            ".ah-nav a"
        );


    navLinks.forEach((link) => {

        const page =
            link.dataset.page;

        const category =
            link.dataset.category;


        if (
            page &&
            normalize(page) ===
            normalize(currentFile)
        ) {

            link.classList.add(
                "active"
            );

        }


        if (
            currentFile ===
            "kategori.html" &&
            category &&
            normalize(category) ===
            normalize(currentCategory)
        ) {

            link.classList.add(
                "active"
            );

        }

    });


    /* =====================================================
       SAAT
       ===================================================== */

    function updateClock() {

        const clock =
            document.getElementById(
                "ahClock"
            );

        if (!clock) return;

        clock.textContent =
            new Date()
                .toLocaleTimeString(
                    "tr-TR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );
    }


    updateClock();

    setInterval(
        updateClock,
        30000
    );


    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    async function getClient() {

        try {

            if (
                window.AkcaabatHaber &&
                typeof window.AkcaabatHaber
                    .getSupabaseClient ===
                    "function"
            ) {

                const client =
                    await window.AkcaabatHaber
                        .getSupabaseClient();

                if (
                    client &&
                    typeof client.from ===
                    "function"
                ) {

                    return client;

                }

            }

        } catch (error) {

            console.warn(
                "Portal shell Supabase:",
                error
            );

        }

        return null;
    }


    /* =====================================================
       SON DAKİKA
       ===================================================== */

    async function loadBreakingNews() {
        const breaking =
            document.getElementById(
                "ahBreaking"
            );

        if (!breaking) return;

        const band =
            breaking.closest(
                ".ah-breaking"
            );

        const hideBand = function () {
            if (band) {
                band.hidden = true;
            }

            breaking.textContent = "";
        };

        const showItem = function (item) {
            if (!item || !item.title) {
                hideBand();
                return false;
            }

            breaking.textContent =
                item.title;

            if (band) {
                band.hidden = false;
            }

            return true;
        };

        if (band) {
            band.hidden = true;
        }

        try {
            if (
                window.AkcaabatHaber &&
                typeof window.AkcaabatHaber
                    .fetchNewsFromSupabase ===
                    "function"
            ) {
                const rows =
                    await window.AkcaabatHaber
                        .fetchNewsFromSupabase();

                const selected =
                    Array.isArray(rows)
                        ? rows.find(
                            (item) =>
                                item.is_breaking === true
                        )
                        : null;

                if (showItem(selected)) {
                    return;
                }
            }

            const client =
                await getClient();

            if (!client) {
                hideBand();
                return;
            }

            const result =
                await client
                    .from("news")
                    .select(
                        "id,title,slug,is_breaking,published_at"
                    )
                    .eq(
                        "status",
                        "published"
                    )
                    .eq(
                        "is_breaking",
                        true
                    )
                    .order(
                        "published_at",
                        { ascending: false }
                    )
                    .limit(1);

            if (result.error) {
                throw result.error;
            }

            showItem(
                (result.data || [])[0]
            );

        } catch (error) {
            console.warn(
                "Son dakika yüklenemedi:",
                error
            );

            hideBand();
        }
    }

    /* =====================================================
       HEADER SON DAKİKA HABERİNE TIKLAMA
       ===================================================== */

    async function makeBreakingClickable() {
        const breaking =
            document.getElementById(
                "ahBreaking"
            );

        if (!breaking) return;

        try {
            const client =
                await getClient();

            if (!client) return;

            const response =
                await client
                    .from("news")
                    .select(
                        "id,title,slug,published_at"
                    )
                    .eq(
                        "status",
                        "published"
                    )
                    .eq(
                        "is_breaking",
                        true
                    )
                    .order(
                        "published_at",
                        { ascending: false }
                    )
                    .limit(1);

            if (
                response.error ||
                !response.data ||
                !response.data.length
            ) {
                return;
            }

            const news =
                response.data[0];

            const openNews = function () {
                const value =
                    news.slug ||
                    news.id;

                if (!value) return;

                window.location.href =
                    "haber-detay.html?slug=" +
                    encodeURIComponent(value);
            };

            breaking.style.cursor =
                "pointer";

            breaking.setAttribute(
                "role",
                "link"
            );

            breaking.setAttribute(
                "tabindex",
                "0"
            );

            breaking.addEventListener(
                "click",
                openNews
            );

            breaking.addEventListener(
                "keydown",
                function (event) {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();
                        openNews();
                    }
                }
            );

        } catch (error) {
            console.warn(
                "Son dakika bağlantısı:",
                error
            );
        }
    }

    /* =====================================================
       BAŞLAT
       ===================================================== */

    async function initShell() {

        await loadBreakingNews();

        await makeBreakingClickable();

    }


    initShell();

})();