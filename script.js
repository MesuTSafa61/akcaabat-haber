/* =========================================================
   AKÇAABAT HABER
   ANA JAVASCRIPT
   SÜRÜM: SUPABASE CMS + SEO SLUG SİSTEMİ
   ========================================================= */

(function () {

    "use strict";

    /* =========================================================
       STORAGE ANAHTARLARI
       ========================================================= */

    const NEWS_KEY = "akcaabat_haberler";
    const DRAFT_KEY = "akcaabat_taslaklar";

    const FALLBACK_IMAGE =
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";

    const SUPABASE_CDN =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    let supabaseClient = null;
    let supabaseLoading = null;
    let cloudRefreshStarted = false;

    function getCuratedNews() {
        return Array.isArray(window.AKCAABAT_CURRENT_NEWS)
            ? window.AKCAABAT_CURRENT_NEWS.slice()
            : [];
    }

    function mergePublicNews(items) {
        const merged = [];
        const seen = new Set();

        getCuratedNews().concat(Array.isArray(items) ? items : []).forEach(function (item) {
            const slug = String(item && item.slug || "").trim().toLowerCase();
            if (!slug || slug.indexOf("demo-") === 0 || seen.has(slug)) return;
            seen.add(slug);
            merged.push(item);
        });

        return merged.sort(function (a, b) {
            return new Date(b.published_at || b.created_at || 0) -
                new Date(a.published_at || a.created_at || 0);
        });
    }


    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabaseConfig() {

        return window.AKCAABAT_SUPABASE || null;

    }


    function isCloudConfigured() {

        const config =
            getSupabaseConfig();

        return !!(
            config &&
            config.url &&
            config.key
        );

    }


    function loadSupabaseLibrary() {

        if (window.supabase) {
            return Promise.resolve(
                window.supabase
            );
        }

        if (supabaseLoading) {
            return supabaseLoading;
        }

        supabaseLoading =
            new Promise(
                function (resolve, reject) {

                    const existing =
                        document.querySelector(
                            'script[data-akcaabat-supabase]'
                        );

                    if (existing) {

                        existing.addEventListener(
                            "load",
                            function () {

                                if (window.supabase) {
                                    resolve(
                                        window.supabase
                                    );
                                } else {
                                    reject(
                                        new Error(
                                            "Supabase kütüphanesi yüklenemedi."
                                        )
                                    );
                                }

                            }
                        );

                        existing.addEventListener(
                            "error",
                            function () {

                                reject(
                                    new Error(
                                        "Supabase CDN bağlantısı başarısız."
                                    )
                                );

                            }
                        );

                        return;

                    }


                    const script =
                        document.createElement(
                            "script"
                        );

                    script.src =
                        SUPABASE_CDN;

                    script.async =
                        true;

                    script.dataset.akcaabatSupabase =
                        "true";


                    script.onload =
                        function () {

                            if (window.supabase) {

                                resolve(
                                    window.supabase
                                );

                            } else {

                                reject(
                                    new Error(
                                        "Supabase nesnesi bulunamadı."
                                    )
                                );

                            }

                        };


                    script.onerror =
                        function () {

                            reject(
                                new Error(
                                    "Supabase kütüphanesi yüklenemedi."
                                )
                            );

                        };


                    document.head.appendChild(
                        script
                    );

                }
            );

        return supabaseLoading;

    }


    async function getSupabaseClient() {

        if (supabaseClient) {
            return supabaseClient;
        }

        if (!isCloudConfigured()) {
            return null;
        }

        try {

            const library =
                await loadSupabaseLibrary();

            const config =
                getSupabaseConfig();

            supabaseClient =
                library.createClient(
                    config.url,
                    config.key
                );

            return supabaseClient;

        } catch (error) {

            console.error(
                "Supabase bağlantı hatası:",
                error
            );

            return null;

        }

    }


    async function getCurrentUser() {

        const client =
            await getSupabaseClient();

        if (!client) {
            return null;
        }

        try {

            const result =
                await client.auth.getUser();

            if (
                result.error ||
                !result.data ||
                !result.data.user
            ) {
                return null;
            }

            return result.data.user;

        } catch (error) {

            console.error(
                "Kullanıcı bilgisi alınamadı:",
                error
            );

            return null;

        }

    }


    async function isAuthenticated() {

        const user =
            await getCurrentUser();

        return !!user;

    }


    /* =========================================================
       STORAGE
       ========================================================= */

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


    /* =========================================================
       ID
       ========================================================= */

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


    /* =========================================================
       HTML GÜVENLİĞİ
       ========================================================= */

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


    /* =========================================================
       HABER ALANLARI
       ========================================================= */

    function getTitle(item) {

        return (
            item.title ||
            item.baslik ||
            ""
        );

    }


    function getSummary(item) {

        return (
            item.summary ||
            item.ozet ||
            ""
        );

    }


    function getContent(item) {

        return (
            item.content ||
            item.icerik ||
            ""
        );

    }


    function getCategory(item) {

        return (
            item.category ||
            item.kategori ||
            "Genel"
        );

    }


    function getImage(item) {

        return (
            item.image ||
            item.gorsel ||
            item.resim ||
            FALLBACK_IMAGE
        );

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

        return (
            item.id ||
            item.newsId ||
            item.haberId ||
            ""
        );

    }


    function getDate(item) {

        return (
            item.publishedAt ||
            item.createdAt ||
            item.updatedAt ||
            ""
        );

    }


    function isBreaking(item) {

        return (
            item.breaking === true ||
            item.breaking === "true" ||
            item.breaking === 1 ||
            item.breaking === "1"
        );

    }


    function nowIso() {

        return new Date().toISOString();

    }


    /* =========================================================
       DB SATIRI → ESKİ SİSTEM HABER NESNESİ
       ========================================================= */

    function normalizeNewsRow(row) {

        if (!row) {
            return null;
        }

        const category =
            row.categories &&
            row.categories.name
                ? row.categories.name
                : (
                    row.category ||
                    "Genel"
                );


        return {

            id:
                row.id ||
                "",

            title:
                row.title ||
                "",

            slug:
                row.slug ||
                slugify(row.title),

            summary:
                row.summary ||
                "",

            content:
                row.content ||
                "",

            category:
                category,

            categoryId:
                row.category_id ||
                "",

            image:
                row.image_url ||
                FALLBACK_IMAGE,

            views:
                Number(row.views) || 0,

            breaking:
                !!row.is_breaking,

            isHeadline:
                !!row.is_headline,

            headlineOrder:
                Number(row.headline_order) || null,

            status:
                row.status ||
                "published",

            publishedAt:
                row.published_at ||
                "",

            createdAt:
                row.created_at ||
                "",

            updatedAt:
                row.updated_at ||
                "",

            authorId:
                row.author_id ||
                ""

        };

    }


    /* =========================================================
       HABER NESNESİ → DB SATIRI
       ========================================================= */

    function newsToDatabase(item, categoryId) {

        if (!item) {
            return null;
        }

        const status =
            item.status === "draft"
                ? "draft"
                : item.status === "archived"
                    ? "archived"
                    : "published";


        return {

            id:
                isUuid(item.id)
                    ? item.id
                    : undefined,

            title:
                getTitle(item),

            slug:
                item.slug ||
                slugify(
                    getTitle(item)
                ),

            summary:
                getSummary(item),

            content:
                getContent(item),

            category_id:
                categoryId ||
                item.categoryId ||
                null,

            image_url:
                getImage(item),

            status:
                status,

            is_breaking:
                isBreaking(item),

            is_headline:
                item.isHeadline === true || item.is_headline === true,

            headline_order:
                Number(item.headlineOrder || item.headline_order) || null,

            views:
                getViews(item),

            published_at:
                status === "published"
                    ? (
                        item.publishedAt ||
                        nowIso()
                    )
                    : null

        };

    }


    function isUuid(value) {

        if (!value) {
            return false;
        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(
                String(value)
            );

    }


    /* =========================================================
       KATEGORİ
       ========================================================= */

    async function findCategoryId(categoryName) {

        const client =
            await getSupabaseClient();

        if (!client) {
            return null;
        }

        const name =
            String(
                categoryName ||
                "Genel"
            ).trim();


        try {

            const result =
                await client
                    .from("categories")
                    .select(
                        "id,name,slug"
                    )
                    .eq(
                        "name",
                        name
                    )
                    .maybeSingle();


            if (
                !result.error &&
                result.data
            ) {

                return result.data.id;

            }


            const slug =
                slugify(name);


            if (slug) {

                const bySlug =
                    await client
                        .from("categories")
                        .select(
                            "id,name,slug"
                        )
                        .eq(
                            "slug",
                            slug
                        )
                        .maybeSingle();


                if (
                    !bySlug.error &&
                    bySlug.data
                ) {

                    return bySlug.data.id;

                }

            }

        } catch (error) {

            console.error(
                "Kategori alınamadı:",
                error
            );

        }

        return null;

    }


    async function loadCategories() {

        const client =
            await getSupabaseClient();

        if (!client) {
            return [];
        }

        try {

            const result =
                await client
                    .from("categories")
                    .select(
                        "id,name,slug,description,sort_order,is_active"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "sort_order",
                        {
                            ascending: true
                        }
                    );


            if (result.error) {

                console.error(
                    "Kategoriler alınamadı:",
                    result.error
                );

                return [];

            }

            return result.data || [];

        } catch (error) {

            console.error(
                "Kategori bağlantı hatası:",
                error
            );

            return [];

        }

    }


    /* =========================================================
       TARİH
       ========================================================= */

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

        return (
            date.toLocaleDateString(
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
            )
        );

    }


    /* =========================================================
       SEO SLUG
       ========================================================= */

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

            .replace(/Ğ/g, "g")
            .replace(/Ü/g, "u")
            .replace(/Ş/g, "s")
            .replace(/İ/g, "i")
            .replace(/I/g, "i")
            .replace(/Ö/g, "o")
            .replace(/Ç/g, "c")

            .replace(
                /[^a-z0-9\s-]/g,
                ""
            )

            .replace(
                /\s+/g,
                "-"
            )

            .replace(
                /-+/g,
                "-"
            )

            .replace(
                /^-+|-+$/g,
                "");

    }


    /* =========================================================
       BENZERSİZ SLUG
       ========================================================= */

    function createUniqueSlug(
        title,
        newsList,
        currentId
    ) {

        const base =
            slugify(title) ||
            "haber";

        let slug =
            base;

        let counter =
            2;


        while (
            newsList.some(
                function (item) {

                    const itemId =
                        getNewsId(item);

                    return (
                        String(itemId) !==
                            String(
                                currentId || ""
                            ) &&
                        String(
                            item.slug || ""
                        )
                            .toLowerCase() ===
                        String(slug)
                            .toLowerCase()
                    );

                }
            )
        ) {

            slug =
                base +
                "-" +
                counter;

            counter++;

        }

        return slug;

    }


    /* =========================================================
       SLUG'DAN HABER BUL
       ========================================================= */

    function findNewsBySlug(slug) {

        if (!slug) {
            return null;
        }

        const news = mergePublicNews(
            readStorage(NEWS_KEY)
        );

        const normalized =
            String(slug)
                .trim()
                .toLowerCase();

        return (
            news.find(
                function (item) {

                    return (
                        String(
                            item.slug || ""
                        )
                            .trim()
                            .toLowerCase() ===
                        normalized
                    );

                }
            ) ||
            null
        );

    }


    async function findNewsBySlugAsync(slug) {

        if (!slug) {
            return null;
        }

        const client =
            await getSupabaseClient();

        if (!client) {

            return findNewsBySlug(
                slug
            );

        }

        try {

            const result =
                await client
                    .from("news")
                    .select(
                        "*,categories(id,name,slug)"
                    )
                    .eq(
                        "slug",
                        String(slug)
                            .trim()
                            .toLowerCase()
                    )
                    .eq(
                        "status",
                        "published"
                    )
                    .maybeSingle();


            if (
                result.error ||
                !result.data
            ) {

                return findNewsBySlug(
                    slug
                );

            }

            return normalizeNewsRow(
                result.data
            );

        } catch (error) {

            console.error(
                "Haber aranamadı:",
                error
            );

            return findNewsBySlug(
                slug
            );

        }

    }


    /* =========================================================
       HABER URL
       ========================================================= */

    function getNewsUrl(item) {

        const slug =
            item &&
            item.slug
                ? item.slug
                : slugify(
                    getTitle(item)
                );

        if (!slug) {
            return "haber-detay.html";
        }

        return (
            "haber-detay.html?slug=" +
            encodeURIComponent(slug)
        );

    }


    /* =========================================================
       SUPABASE HABERLERİ GETİR
       ========================================================= */

    async function fetchNewsFromSupabase(
        options
    ) {

        const client =
            await getSupabaseClient();

        const settings =
            options || {};

        if (!client) {
            return settings.headline === true
                ? []
                : getCuratedNews();
        }

        try {

            let query =
                client
                    .from("news")
                    .select(
                        "*,categories(id,name,slug)"
                    );


            if (
                settings.includeAll !== true
            ) {

                query =
                    query.eq(
                        "status",
                        "published"
                    );

            }


            query =
                query.order(
                    "published_at",
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                );


            const result =
                await query;


            if (result.error) {

                console.error(
                    "Supabase haberleri alınamadı:",
                    result.error
                );

                return [];

            }


            const rows = (
                result.data || []
            ).map(
                normalizeNewsRow
            );

            return settings.headline === true
                ? rows
                : mergePublicNews(rows);

        } catch (error) {

            console.error(
                "Haber listesi bağlantı hatası:",
                error
            );

            return [];

        }

    }


    async function refreshNewsFromSupabase(
        options
    ) {

        const cloudNews =
            await fetchNewsFromSupabase(
                options
            );


        if (!cloudNews.length) {

            /*
             * Veritabanında gerçekten hiç haber
             * yoksa boş listeyi cache'lemek yerine
             * mevcut local veriyi koruyoruz.
             */

            return [];

        }


        writeStorage(
            NEWS_KEY,
            cloudNews
        );


        initNewsCounters();


        document.dispatchEvent(
            new CustomEvent(
                "akcaabat:news-updated",
                {
                    detail: {
                        news: cloudNews
                    }
                }
            )
        );


        return cloudNews;

    }


    function startCloudNewsRefresh() {

        if (cloudRefreshStarted) {
            return;
        }

        if (!isCloudConfigured()) {
            return;
        }

        cloudRefreshStarted =
            true;


        refreshNewsFromSupabase()
            .catch(
                function (error) {

                    console.warn(
                        "Arka plan haber yenilemesi başarısız:",
                        error
                    );

                }
            );

    }


    /* =========================================================
       SUPABASE HABER KAYDET
       ========================================================= */

    async function upsertNewsToSupabase(
        item
    ) {

        const client =
            await getSupabaseClient();

        if (!client) {

            return {
                success: false,
                reason: "supabase_unavailable"
            };

        }


        const user =
            await getCurrentUser();

        if (!user) {

            return {
                success: false,
                reason: "not_authenticated"
            };

        }


        try {

            const categoryId =
                item.categoryId ||
                await findCategoryId(
                    getCategory(item)
                );


            const row =
                newsToDatabase(
                    item,
                    categoryId
                );


            if (!row) {

                return {
                    success: false,
                    reason: "invalid_data"
                };

            }


            row.author_id =
                user.id;


            if (!row.id) {
                delete row.id;
            }


            const result =
                await client
                    .from("news")
                    .upsert(
                        row,
                        {
                            onConflict:
                                "id"
                        }
                    )
                    .select(
                        "*,categories(id,name,slug)"
                    )
                    .single();


            if (result.error) {

                console.error(
                    "Supabase haber kayıt hatası:",
                    result.error
                );

                return {
                    success: false,
                    reason: "database_error",
                    error: result.error
                };

            }


            const normalized =
                normalizeNewsRow(
                    result.data
                );


            updateLocalNewsCache(
                normalized
            );


            return {
                success: true,
                data: normalized
            };

        } catch (error) {

            console.error(
                "Supabase haber kayıt istisnası:",
                error
            );

            return {
                success: false,
                reason: "exception",
                error: error
            };

        }

    }


    function updateLocalNewsCache(
        item
    ) {

        if (!item) {
            return;
        }

        const news =
            readStorage(
                NEWS_KEY
            );


        const index =
            news.findIndex(
                function (existing) {

                    return (
                        String(
                            getNewsId(existing)
                        ) ===
                        String(
                            getNewsId(item)
                        )
                    );

                }
            );


        if (index >= 0) {

            news[index] =
                item;

        } else {

            news.unshift(
                item
            );

        }


        writeStorage(
            NEWS_KEY,
            news
        );


        initNewsCounters();

    }


    /* =========================================================
       TASLAK SUPABASE
       ========================================================= */

    async function saveDraftToSupabase(
        item
    ) {

        const client =
            await getSupabaseClient();

        if (!client) {

            return {
                success: false,
                reason: "supabase_unavailable"
            };

        }


        const user =
            await getCurrentUser();

        if (!user) {

            return {
                success: false,
                reason: "not_authenticated"
            };

        }


        try {

            const categoryId =
                item.categoryId ||
                await findCategoryId(
                    getCategory(item)
                );


            const row =
                newsToDatabase(
                    item,
                    categoryId
                );


            if (!row) {

                return {
                    success: false
                };

            }


            row.author_id =
                user.id;

            row.status =
                "draft";

            row.published_at =
                null;


            if (!row.id) {
                delete row.id;
            }


            const result =
                await client
                    .from("news")
                    .upsert(
                        row,
                        {
                            onConflict:
                                "id"
                        }
                    )
                    .select(
                        "*,categories(id,name,slug)"
                    )
                    .single();


            if (result.error) {

                console.error(
                    "Supabase taslak kayıt hatası:",
                    result.error
                );

                return {
                    success: false,
                    error: result.error
                };

            }


            return {
                success: true,
                data:
                    normalizeNewsRow(
                        result.data
                    )
            };

        } catch (error) {

            console.error(
                "Supabase taslak istisnası:",
                error
            );

            return {
                success: false,
                error: error
            };

        }

    }


    /* =========================================================
       HABER GÖRÜNTÜLENME SAYISI
       ========================================================= */

    async function incrementNewsViews(
        id
    ) {

        if (!id) {
            return false;
        }

        const client =
            await getSupabaseClient();

        if (!client) {
            return false;
        }


        try {

            const result =
                await client.rpc(
                    "increment_news_views",
                    {
                        news_id: id
                    }
                );

            return !result.error;

        } catch (error) {

            console.error(
                "Görüntülenme güncellenemedi:",
                error
            );

            return false;

        }

    }


    /* =========================================================
       GLOBAL OBJE
       ========================================================= */

    window.AkcaabatHaber = {

        NEWS_KEY:
            NEWS_KEY,

        DRAFT_KEY:
            DRAFT_KEY,

        FALLBACK_IMAGE:
            FALLBACK_IMAGE,

        readNews:
            function () {

                startCloudNewsRefresh();

                return mergePublicNews(
                    readStorage(NEWS_KEY)
                );

            },

        readDrafts:
            function () {

                return readStorage(
                    DRAFT_KEY
                );

            },

        saveNews:
            function (data) {

                return writeStorage(
                    NEWS_KEY,
                    data
                );

            },

        saveDrafts:
            function (data) {

                return writeStorage(
                    DRAFT_KEY,
                    data
                );

            },

        createId:
            createId,

        escapeHtml:
            escapeHtml,

        slugify:
            slugify,

        createUniqueSlug:
            createUniqueSlug,

        findNewsBySlug:
            findNewsBySlug,

        findNewsBySlugAsync:
            findNewsBySlugAsync,

        getNewsUrl:
            getNewsUrl,

        getTitle:
            getTitle,

        getSummary:
            getSummary,

        getContent:
            getContent,

        getCategory:
            getCategory,

        getImage:
            getImage,

        getViews:
            getViews,

        getNewsId:
            getNewsId,

        getDate:
            getDate,

        formatDate:
            formatDate,

        formatDateTime:
            formatDateTime,

        isBreaking:
            isBreaking,

        slugify:
            slugify,

        getSupabaseClient:
            getSupabaseClient,

        isCloudConfigured:
            isCloudConfigured,

        getCurrentUser:
            getCurrentUser,

        isAuthenticated:
            isAuthenticated,

        loadCategories:
            loadCategories,

        getCuratedNews:
            getCuratedNews,

        mergePublicNews:
            mergePublicNews,

        fetchNewsFromSupabase:
            fetchNewsFromSupabase,

        refreshNewsFromSupabase:
            refreshNewsFromSupabase,

        upsertNewsToSupabase:
            upsertNewsToSupabase,

        saveDraftToSupabase:
            saveDraftToSupabase,

        incrementNewsViews:
            incrementNewsViews

    };


    /* =========================================================
       MOBİL MENÜ
       ========================================================= */

    function initMobileMenu() {

        const buttons =
            document.querySelectorAll(
                "[data-mobile-menu]"
            );

        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        document.body.classList.toggle(
                            "mobile-menu-open"
                        );

                    }
                );

            }
        );


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


    /* =========================================================
       RESİM ÖNİZLEME
       ========================================================= */

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


    /* =========================================================
       FORM ELEMENTLERİ
       ========================================================= */

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


    function findInput(
        form,
        selectors
    ) {

        return findFormElement(
            form,
            selectors
        );

    }


    function getFormValue(
        form,
        selectors
    ) {

        const element =
            findFormElement(
                form,
                selectors
            );

        if (!element) {
            return "";
        }

        return String(
            element.value || ""
        ).trim();

    }


    function getFormCheckbox(
        form,
        selectors
    ) {

        const element =
            findFormElement(
                form,
                selectors
            );

        if (!element) {
            return false;
        }

        return !!element.checked;

    }


    /* =========================================================
       HABER FORMU
       ========================================================= */

    function initNewsForm() {

        const form =
            document.querySelector(
                "[data-news-form]"
            );

        if (!form) {
            return;
        }


        const titleInput =
            findInput(
                form,
                [
                    "#title",
                    "#baslik",
                    "[name='title']",
                    "[name='baslik']"
                ]
            );


        const summaryInput =
            findInput(
                form,
                [
                    "#summary",
                    "#ozet",
                    "[name='summary']",
                    "[name='ozet']"
                ]
            );


        const contentInput =
            findInput(
                form,
                [
                    "#content",
                    "#icerik",
                    "[name='content']",
                    "[name='icerik']"
                ]
            );


        const categoryInput =
            findInput(
                form,
                [
                    "#category",
                    "#kategori",
                    "[name='category']",
                    "[name='kategori']"
                ]
            );


        const imageInput =
            findInput(
                form,
                [
                    "#image",
                    "#gorsel",
                    "[name='image']",
                    "[name='gorsel']"
                ]
            );


        const breakingInput =
            findInput(
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


        /* -----------------------------------------------------
           KARAKTER SAYACI
           ----------------------------------------------------- */

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
        ].forEach(
            function (input) {

                if (!input) {
                    return;
                }

                input.addEventListener(
                    "input",
                    updateCounters
                );

            }
        );


        updateCounters();


        /* -----------------------------------------------------
           GÖRSEL
           ----------------------------------------------------- */

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


            return (
                imageInput.value ||
                FALLBACK_IMAGE
            );

        }


        /* -----------------------------------------------------
           EDIT ID
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           TASLAK ID
           ----------------------------------------------------- */

        function getDraftId() {

            const params =
                new URLSearchParams(
                    window.location.search
                );

            return (
                params.get("draft") ||
                ""
            );

        }


        /* -----------------------------------------------------
           MEVCUT HABER
           ----------------------------------------------------- */

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


            return (
                news.find(
                    function (item) {

                        return (
                            String(
                                getNewsId(item)
                            ) ===
                            String(editId)
                        );

                    }
                ) ||
                null
            );

        }


        /* -----------------------------------------------------
           FORM VERİSİ
           ----------------------------------------------------- */

        function collectData(
            existing,
            status
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


            const newsList =
                readStorage(
                    NEWS_KEY
                );


            const slug =
                createUniqueSlug(
                    title,
                    newsList,
                    existing
                        ? existing.id
                        : ""
                );


            return {

                id:
                    existing &&
                    existing.id
                        ? existing.id
                        : createId("haber"),


                title:
                    title,


                slug:
                    slug,


                summary:
                    summary,


                content:
                    content,


                category:
                    category ||
                    "Genel",


                breaking:
                    breaking,


                image:
                    getImageValue(),


                views:
                    existing &&
                    Number.isFinite(
                        Number(
                            existing.views
                        )
                    )
                        ? Number(
                            existing.views
                        )
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
                    status ||
                    "published"

            };

        }


        /* -----------------------------------------------------
           DOĞRULAMA
           ----------------------------------------------------- */

        function validateData(
            data
        ) {

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

                if (titleInput) {
                    titleInput.focus();
                }

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

                if (contentInput) {
                    contentInput.focus();
                }

                return false;

            }


            return true;

        }


        /* -----------------------------------------------------
           LOCAL HABER KAYDET
           ----------------------------------------------------- */

        function saveLocalPublishedNews(
            data
        ) {

            const news =
                readStorage(
                    NEWS_KEY
                );


            const existingIndex =
                news.findIndex(
                    function (item) {

                        return (
                            String(
                                getNewsId(item)
                            ) ===
                            String(
                                data.id
                            )
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


            return writeStorage(
                NEWS_KEY,
                news
            );

        }


        /* -----------------------------------------------------
           YAYINLA
           ----------------------------------------------------- */

        async function savePublishedNews() {

            const existing =
                findExistingNews();


            const data =
                collectData(
                    existing,
                    "published"
                );


            if (
                !validateData(data)
            ) {

                return false;

            }


            /*
             * Önce local cache.
             * Böylece mevcut sayfalar bozulmaz.
             */

            const localSaved =
                saveLocalPublishedNews(
                    data
                );


            if (!localSaved) {

                alert(
                    "Haber kaydedilemedi. Tarayıcı depolama alanını kontrol et."
                );

                return false;

            }


            removeDraftByNewsId(
                data.id
            );


            /*
             * Supabase'e giriş yapılmışsa
             * gerçek veritabanına da gönder.
             */

            if (isCloudConfigured()) {

                const cloud =
                    await upsertNewsToSupabase(
                        data
                    );


                if (
                    cloud.success &&
                    cloud.data
                ) {

                    updateLocalNewsCache(
                        cloud.data
                    );

                } else if (
                    cloud.reason ===
                    "not_authenticated"
                ) {

                    console.warn(
                        "Supabase: Admin girişi yapılmadığı için haber yalnızca yerel kaydedildi."
                    );

                }

            }


            return true;

        }


        /* -----------------------------------------------------
           TASLAK KAYDET
           ----------------------------------------------------- */

        async function saveDraft() {

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


            const requestedDraftId =
                params.get("draft");


            const draftId =
                requestedDraftId ||
                (
                    existing &&
                    existing.id
                        ? existing.id
                        : createId("taslak")
                );


            const drafts =
                readStorage(
                    DRAFT_KEY
                );


            const existingDraft =
                drafts.find(
                    function (item) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                draftId
                            )
                        );

                    }
                );


            const newsList =
                readStorage(
                    NEWS_KEY
                );


            const draft = {

                id:
                    draftId,

                title:
                    title,

                slug:
                    createUniqueSlug(
                        title,
                        newsList,
                        existing
                            ? existing.id
                            : ""
                    ),

                summary:
                    summary,

                content:
                    content,

                category:
                    category ||
                    "Genel",

                breaking:
                    breaking,

                image:
                    getImageValue(),

                createdAt:
                    existingDraft &&
                    existingDraft.createdAt
                        ? existingDraft.createdAt
                        : nowIso(),

                updatedAt:
                    nowIso(),

                status:
                    "draft"

            };


            const index =
                drafts.findIndex(
                    function (item) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                draftId
                            )
                        );

                    }
                );


            if (index >= 0) {

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


            /*
             * Supabase taslak kaydı.
             */

            if (isCloudConfigured()) {

                await saveDraftToSupabase(draft);


            }


            alert(
                "Taslak başarıyla kaydedildi."
            );


            return true;

        }


        /* -----------------------------------------------------
           TASLAK SİL
           ----------------------------------------------------- */

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

                        return (
                            String(
                                item.id
                            ) !==
                            String(id)
                        );

                    }
                );


            writeStorage(
                DRAFT_KEY,
                filtered
            );

        }


        /* -----------------------------------------------------
           YAYINLA BUTONU
           ----------------------------------------------------- */

        if (publishButton) {

            publishButton.addEventListener(
                "click",
                async function (event) {

                    event.preventDefault();


                    const saved =
                        await savePublishedNews();


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


        /* -----------------------------------------------------
           TASLAK BUTONU
           ----------------------------------------------------- */

        if (draftButton) {

            draftButton.addEventListener(
                "click",
                async function (event) {

                    event.preventDefault();

                    await saveDraft();

                }
            );

        }


        /* -----------------------------------------------------
           ÖNİZLEME
           ----------------------------------------------------- */

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


                    const existing =
                        findExistingNews();


                    const temporary =
                        collectData(
                            existing,
                            "preview"
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


    /* =========================================================
       OTOMATİK TASLAK
       ========================================================= */

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


        let timer =
            null;


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
        ].forEach(
            function (input) {

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

            }
        );

    }


    /* =========================================================
       FORM TEMİZLE
       ========================================================= */

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

                    console.warn(
                        error
                    );

                }


                document
                    .querySelectorAll(
                        "[data-title-counter], [data-summary-counter], [data-content-counter]"
                    )
                    .forEach(
                        function (element) {

                            element.textContent =
                                "0";

                        }
                    );

            }
        );

    }


    /* =========================================================
       OTOMATİK TASLAĞI YÜKLE
       ========================================================= */

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


    /* =========================================================
       BUTON ANİMASYONU
       ========================================================= */

    function initButtonEffects() {

        document
            .querySelectorAll(
                "button, .btn, .button"
            )
            .forEach(
                function (button) {

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

                }
            );

    }


    /* =========================================================
       GÖRSEL URL
       ========================================================= */

    function initImageUrlInputs() {

        document
            .querySelectorAll(
                "[data-image-url]"
            )
            .forEach(
                function (input) {

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

                }
            );

    }


    /* =========================================================
       FORM DOĞRULAMA
       ========================================================= */

    function initValidation() {

        document
            .querySelectorAll(
                "form"
            )
            .forEach(
                function (form) {

                    if (
                        form.matches(
                            "[data-no-validation]"
                        )
                    ) {

                        return;

                    }


                    form.addEventListener(
                        "submit",
                        function (event) {

                            const required =
                                form.querySelectorAll(
                                    "[required]"
                                );


                            let valid =
                                true;


                            required.forEach(
                                function (field) {

                                    if (
                                        !String(
                                            field.value || ""
                                        ).trim()
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

                                event.preventDefault();


                                alert(
                                    "Lütfen zorunlu alanları doldur."
                                );

                            }

                        }
                    );

                }
            );

    }


    /* =========================================================
       TARİH
       ========================================================= */

    function initDateElements() {

        document
            .querySelectorAll(
                "[data-current-date]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        new Date()
                            .toLocaleDateString(
                                "tr-TR",
                                {
                                    weekday:
                                        "long",
                                    day:
                                        "2-digit",
                                    month:
                                        "long",
                                    year:
                                        "numeric"
                                }
                            );

                }
            );


        document
            .querySelectorAll(
                "[data-current-year]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        new Date()
                            .getFullYear();

                }
            );

    }


    /* =========================================================
       HABER SAYAÇLARI
       ========================================================= */

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
            .forEach(
                function (element) {

                    element.textContent =
                        news.length;

                }
            );


        document
            .querySelectorAll(
                "[data-draft-count]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        drafts.length;

                }
            );


        document
            .querySelectorAll(
                "[data-breaking-count]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        news.filter(
                            function (item) {

                                return isBreaking(
                                    item
                                );

                            }
                        ).length;

                }
            );


        const views =
            news.reduce(
                function (
                    total,
                    item
                ) {

                    return (
                        total +
                        getViews(item)
                    );

                },
                0
            );


        document
            .querySelectorAll(
                "[data-view-count]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        views.toLocaleString(
                            "tr-TR"
                        );

                }
            );

    }


    /* =========================================================
       ESC
       ========================================================= */

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


    /* =========================================================
       SUPABASE OTOMATİK BAŞLATMA
       ========================================================= */

    function initSupabaseBackground() {

        if (!isCloudConfigured()) {
            return;
        }


        /*
         * Supabase kütüphanesini arka planda yükle.
         * Sayfanın açılmasını bekletmez.
         */

        getSupabaseClient()
            .then(
                function (client) {

                    if (!client) {
                        return;
                    }

                    startCloudNewsRefresh();

                }
            )
            .catch(
                function (error) {

                    console.warn(
                        "Supabase arka plan başlatma hatası:",
                        error
                    );

                }
            );

    }


    /* =========================================================
       BAŞLANGIÇ
       ========================================================= */

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

        initSupabaseBackground();

        if (
            "serviceWorker" in navigator &&
            window.isSecureContext
        ) {
            navigator.serviceWorker.register("sw.js")
                .catch(function (error) {
                    console.warn(
                        "Çevrimdışı destek başlatılamadı:",
                        error
                    );
                });
        }

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
