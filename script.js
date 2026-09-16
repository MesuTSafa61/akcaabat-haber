/* =========================================================
   AKÇAABAT HABER
   ANA JAVASCRIPT
   SUPABASE CMS + SEO + MANŞET SİSTEMİ
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       AYARLAR
       ===================================================== */

    const NEWS_KEY = "akcaabat_haberler";
    const DRAFT_KEY = "akcaabat_taslaklar";

    const FALLBACK_IMAGE =
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";

    const SUPABASE_CDN =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    let supabaseClient = null;
    let supabaseLoading = null;
    let cloudRefreshStarted = false;


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabaseConfig() {
        return window.AKCAABAT_SUPABASE || null;
    }


    function isCloudConfigured() {
        const config = getSupabaseConfig();

        return !!(
            config &&
            config.url &&
            (config.key || config.anonKey)
        );
    }


    function loadSupabaseLibrary() {
        if (window.supabase) {
            return Promise.resolve(window.supabase);
        }

        if (supabaseLoading) {
            return supabaseLoading;
        }

        supabaseLoading = new Promise(function (resolve, reject) {
            const existing = document.querySelector(
                "script[data-akcaabat-supabase]"
            );

            if (existing) {
                existing.addEventListener("load", function () {
                    if (window.supabase) {
                        resolve(window.supabase);
                    } else {
                        reject(
                            new Error(
                                "Supabase kütüphanesi yüklenemedi."
                            )
                        );
                    }
                });

                existing.addEventListener("error", function () {
                    reject(
                        new Error(
                            "Supabase CDN bağlantısı başarısız."
                        )
                    );
                });

                return;
            }

            const script = document.createElement("script");

            script.src = SUPABASE_CDN;
            script.async = true;
            script.dataset.akcaabatSupabase = "true";

            script.onload = function () {
                if (window.supabase) {
                    resolve(window.supabase);
                } else {
                    reject(
                        new Error(
                            "Supabase nesnesi bulunamadı."
                        )
                    );
                }
            };

            script.onerror = function () {
                reject(
                    new Error(
                        "Supabase kütüphanesi yüklenemedi."
                    )
                );
            };

            document.head.appendChild(script);
        });

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
            const library = await loadSupabaseLibrary();
            const config = getSupabaseConfig();

            supabaseClient = library.createClient(
                config.url,
                config.key || config.anonKey
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
        const client = await getSupabaseClient();

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
        return !!(await getCurrentUser());
    }


    /* =====================================================
       STORAGE
       ===================================================== */

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


    /* =====================================================
       YARDIMCI FONKSİYONLAR
       ===================================================== */

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


    function nowIso() {
        return new Date().toISOString();
    }


    function isUuid(value) {
        if (!value) {
            return false;
        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(String(value));
    }


    /* =====================================================
       HABER ALANLARI
       ===================================================== */

    function getTitle(item) {
        return (
            item?.title ||
            item?.baslik ||
            ""
        );
    }


    function getSummary(item) {
        return (
            item?.summary ||
            item?.ozet ||
            ""
        );
    }


    function getContent(item) {
        return (
            item?.content ||
            item?.icerik ||
            ""
        );
    }


    function getCategory(item) {
        if (
            item?.categories &&
            item.categories.name
        ) {
            return item.categories.name;
        }

        if (
            item?.category &&
            typeof item.category === "object" &&
            item.category.name
        ) {
            return item.category.name;
        }

        return (
            item?.category ||
            item?.kategori ||
            "Genel"
        );
    }


    function getImage(item) {
        return (
            item?.image_url ||
            item?.image ||
            item?.gorsel ||
            item?.resim ||
            ""
        );
    }


    function getViews(item) {
        const value =
            item?.views !== undefined
                ? item.views
                : item?.goruntulenme;

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    function getNewsId(item) {
        return (
            item?.id ||
            item?.newsId ||
            item?.haberId ||
            ""
        );
    }


    function getDate(item) {
        return (
            item?.published_at ||
            item?.publishedAt ||
            item?.created_at ||
            item?.createdAt ||
            item?.updated_at ||
            item?.updatedAt ||
            ""
        );
    }


    function isBreaking(item) {
        return (
            item?.is_breaking === true ||
            item?.breaking === true ||
            item?.breaking === "true" ||
            item?.breaking === 1 ||
            item?.breaking === "1"
        );
    }


    function isHeadline(item) {
        if (!item) {
            return false;
        }

        const selected =
            item.is_headline === true ||
            item.is_headline === 1 ||
            item.is_headline === "1" ||
            item.is_headline === "true";

        const order =
            Number(item.headline_order);

        return (
            selected &&
            Number.isInteger(order) &&
            order >= 1 &&
            order <= 10 &&
            (
                !item.status ||
                item.status === "published"
            )
        );
    }


    function getHeadlineOrder(item) {
        const value =
            Number(item?.headline_order);

        if (
            !Number.isInteger(value) ||
            value < 1 ||
            value > 10
        ) {
            return null;
        }

        return value;
    }


    /* =====================================================
       DB → HABER NESNESİ
       ===================================================== */

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

        const headlineOrder =
            row.headline_order === null ||
            row.headline_order === undefined
                ? null
                : Number(row.headline_order);

        const validHeadlineOrder =
            Number.isInteger(headlineOrder) &&
            headlineOrder >= 1 &&
            headlineOrder <= 10
                ? headlineOrder
                : null;

        const headline =
            row.status === "published" &&
            row.is_headline === true &&
            validHeadlineOrder !== null;

        return {
            id:
                row.id || "",

            title:
                row.title || "",

            slug:
                row.slug ||
                slugify(row.title),

            summary:
                row.summary || "",

            content:
                row.content || "",

            category:
                category,

            categoryId:
                row.category_id || "",

            category_id:
                row.category_id || null,

            image:
                row.image_url || "",

            image_url:
                row.image_url || "",

            views:
                Number(row.views) || 0,

            breaking:
                row.is_breaking === true,

            is_breaking:
                row.is_breaking === true,

            is_headline:
                headline,

            headline_order:
                headline
                    ? validHeadlineOrder
                    : null,

            status:
                row.status || "published",

            publishedAt:
                row.published_at || "",

            published_at:
                row.published_at || "",

            createdAt:
                row.created_at || "",

            created_at:
                row.created_at || "",

            updatedAt:
                row.updated_at || "",

            updated_at:
                row.updated_at || "",

            authorId:
                row.author_id || "",

            author_id:
                row.author_id || null
        };
    }


    /* =====================================================
       HABER NESNESİ → DB
       ===================================================== */

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

        const requestedHeadline =
            status === "published" &&
            item.is_headline === true;

        const order =
            getHeadlineOrder(item);

        const headline =
            requestedHeadline &&
            order !== null;

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
                item.category_id ||
                null,

            image_url:
                getImage(item) || null,

            status:
                status,

            is_breaking:
                isBreaking(item),

            is_headline:
                headline,

            headline_order:
                headline
                    ? order
                    : null,

            views:
                getViews(item),

            published_at:
                status === "published"
                    ? (
                        item.published_at ||
                        item.publishedAt ||
                        nowIso()
                    )
                    : null
        };
    }


    /* =====================================================
       KATEGORİLER
       ===================================================== */

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
            let result =
                await client
                    .from("categories")
                    .select("id,name,slug")
                    .eq("name", name)
                    .maybeSingle();

            if (
                !result.error &&
                result.data
            ) {
                return result.data.id;
            }

            const slug =
                slugify(name);

            if (!slug) {
                return null;
            }

            result =
                await client
                    .from("categories")
                    .select("id,name,slug")
                    .eq("slug", slug)
                    .maybeSingle();

            if (
                !result.error &&
                result.data
            ) {
                return result.data.id;
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
                    )
                    .order(
                        "name",
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


    /* =====================================================
       TARİH
       ===================================================== */

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

        return date.toLocaleString(
            "tr-TR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    /* =====================================================
       SEO SLUG
       ===================================================== */

    function slugify(text) {
        return String(text || "")
            .toLocaleLowerCase("tr-TR")
            .trim()
            .replace(/ğ/g, "g")
            .replace(/ü/g, "u")
            .replace(/ş/g, "s")
            .replace(/ı/g, "i")
            .replace(/ö/g, "o")
            .replace(/ç/g, "c")
            .replace(/â/g, "a")
            .replace(/î/g, "i")
            .replace(/û/g, "u")
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
                ""
            );
    }


    function createUniqueSlug(
        title,
        newsList,
        currentId
    ) {
        const base =
            slugify(title) ||
            "haber";

        let slug = base;
        let counter = 2;

        while (
            (newsList || []).some(
                function (item) {
                    return (
                        String(
                            getNewsId(item)
                        ) !==
                        String(
                            currentId || ""
                        ) &&
                        String(
                            item.slug || ""
                        ).toLowerCase() ===
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


    /* =====================================================
       HABER BUL
       ===================================================== */

    function findNewsBySlug(slug) {
        if (!slug) {
            return null;
        }

        const news =
            readStorage(
                NEWS_KEY
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
            return findNewsBySlug(slug);
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

            return findNewsBySlug(slug);
        }
    }


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


    /* =====================================================
       SUPABASE HABERLER
       ===================================================== */

    async function fetchNewsFromSupabase(
        options
    ) {
        const client =
            await getSupabaseClient();

        if (!client) {
            return [];
        }

        const settings =
            options || {};

        try {
            let query =
                client
                    .from("news")
                    .select(`
                        id,
                        title,
                        slug,
                        summary,
                        content,
                        category_id,
                        image_url,
                        status,
                        is_breaking,
                        is_headline,
                        headline_order,
                        views,
                        author_id,
                        published_at,
                        created_at,
                        updated_at,
                        categories (
                            id,
                            name,
                            slug
                        )
                    `);

            if (
                settings.includeAll !== true
            ) {
                query =
                    query.eq(
                        "status",
                        "published"
                    );
            }

            if (
                settings.headline === true
            ) {
                query =
                    query
                        .eq(
                            "status",
                            "published"
                        )
                        .eq(
                            "is_headline",
                            true
                        )
                        .not(
                            "headline_order",
                            "is",
                            null
                        )
                        .order(
                            "headline_order",
                            {
                                ascending: true
                            }
                        )
                        .limit(10);

            } else {
                query =
                    query.order(
                        "published_at",
                        {
                            ascending: false,
                            nullsFirst: false
                        }
                    );
            }

            if (settings.limit) {
                query =
                    query.limit(
                        Number(
                            settings.limit
                        )
                    );
            }

            const result =
                await query;

            if (result.error) {
                console.error(
                    "Supabase haberleri alınamadı:",
                    result.error
                );

                return [];
            }

            return (
                result.data || []
            )
                .map(normalizeNewsRow)
                .filter(Boolean);

        } catch (error) {
            console.error(
                "Haber listesi bağlantı hatası:",
                error
            );

            return [];
        }
    }


    async function getHeadlines() {
        const rows =
            await fetchNewsFromSupabase({
                headline: true,
                limit: 10
            });

        return rows
            .filter(isHeadline)
            .sort(
                function (a, b) {
                    return (
                        getHeadlineOrder(a) -
                        getHeadlineOrder(b)
                    );
                }
            )
            .slice(0, 10);
    }


    async function refreshNewsFromSupabase(
        options
    ) {
        const cloudNews =
            await fetchNewsFromSupabase(
                options
            );

        /*
         * Supabase gerçekten boş dönerse
         * eski cache'i yanlışlıkla silmiyoruz.
         */
        if (!cloudNews.length) {
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

        cloudRefreshStarted = true;

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


    /* =====================================================
       LOCAL CACHE
       ===================================================== */

    function updateLocalNewsCache(item) {
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
            news[index] = item;
        } else {
            news.unshift(item);
        }

        writeStorage(
            NEWS_KEY,
            news
        );

        initNewsCounters();
    }


    /* =====================================================
       SUPABASE HABER KAYDET
       ===================================================== */

    async function upsertNewsToSupabase(item) {
        const client =
            await getSupabaseClient();

        if (!client) {
            return {
                success: false,
                reason:
                    "supabase_unavailable"
            };
        }

        const user =
            await getCurrentUser();

        if (!user) {
            return {
                success: false,
                reason:
                    "not_authenticated"
            };
        }

        try {
            const categoryId =
                item.categoryId ||
                item.category_id ||
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
                    reason:
                        "invalid_data"
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
                    reason:
                        "database_error",
                    error:
                        result.error
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
                reason:
                    "exception",
                error:
                    error
            };
        }
    }


    /* =====================================================
       TASLAK
       ===================================================== */

    async function saveDraftToSupabase(item) {
        const client =
            await getSupabaseClient();

        if (!client) {
            return {
                success: false,
                reason:
                    "supabase_unavailable"
            };
        }

        const user =
            await getCurrentUser();

        if (!user) {
            return {
                success: false,
                reason:
                    "not_authenticated"
            };
        }

        try {
            const categoryId =
                item.categoryId ||
                item.category_id ||
                await findCategoryId(
                    getCategory(item)
                );

            const row =
                newsToDatabase(
                    {
                        ...item,
                        status: "draft",
                        is_headline: false,
                        headline_order: null
                    },
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

            /*
             * TASLAK MANŞETTE KALAMAZ
             */
            row.is_headline =
                false;

            row.headline_order =
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
                    error:
                        result.error
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
                error:
                    error
            };
        }
    }


    /* =====================================================
       MANŞET YÖNETİMİ
       ===================================================== */

    async function getHeadlineSlots() {
        const client =
            await getSupabaseClient();

        if (!client) {
            return [];
        }

        try {
            const result =
                await client
                    .from("news")
                    .select(
                        "id,title,slug,status,is_headline,headline_order"
                    )
                    .eq(
                        "status",
                        "published"
                    )
                    .eq(
                        "is_headline",
                        true
                    )
                    .not(
                        "headline_order",
                        "is",
                        null
                    )
                    .order(
                        "headline_order",
                        {
                            ascending: true
                        }
                    );

            if (result.error) {
                console.error(
                    "Manşet sıraları alınamadı:",
                    result.error
                );

                return [];
            }

            return result.data || [];

        } catch (error) {
            console.error(
                "Manşet sıraları alınamadı:",
                error
            );

            return [];
        }
    }


    async function setHeadline(
        newsId,
        order
    ) {
        const client =
            await getSupabaseClient();

        if (!client) {
            throw new Error(
                "Supabase bağlantısı kurulamadı."
            );
        }

        const position =
            Number(order);

        if (
            !Number.isInteger(position) ||
            position < 1 ||
            position > 10
        ) {
            throw new Error(
                "Manşet sırası 1 ile 10 arasında olmalıdır."
            );
        }

        const newsResult =
            await client
                .from("news")
                .select(
                    "id,status"
                )
                .eq(
                    "id",
                    newsId
                )
                .maybeSingle();

        if (newsResult.error) {
            throw newsResult.error;
        }

        if (!newsResult.data) {
            throw new Error(
                "Haber bulunamadı."
            );
        }

        if (
            newsResult.data.status !==
            "published"
        ) {
            throw new Error(
                "Yalnızca yayınlanmış haberler manşete eklenebilir."
            );
        }

        const occupied =
            await client
                .from("news")
                .select(
                    "id,title"
                )
                .eq(
                    "is_headline",
                    true
                )
                .eq(
                    "headline_order",
                    position
                )
                .neq(
                    "id",
                    newsId
                )
                .limit(1);

        if (occupied.error) {
            throw occupied.error;
        }

        if (
            occupied.data &&
            occupied.data.length
        ) {
            throw new Error(
                position +
                ". manşet sırası başka bir haber tarafından kullanılıyor."
            );
        }

        const result =
            await client
                .from("news")
                .update({
                    is_headline:
                        true,
                    headline_order:
                        position
                })
                .eq(
                    "id",
                    newsId
                )
                .select(
                    "*,categories(id,name,slug)"
                )
                .single();

        if (result.error) {
            throw result.error;
        }

        const normalized =
            normalizeNewsRow(
                result.data
            );

        updateLocalNewsCache(
            normalized
        );

        return normalized;
    }


    async function removeHeadline(
        newsId
    ) {
        const client =
            await getSupabaseClient();

        if (!client) {
            throw new Error(
                "Supabase bağlantısı kurulamadı."
            );
        }

        const result =
            await client
                .from("news")
                .update({
                    is_headline:
                        false,
                    headline_order:
                        null
                })
                .eq(
                    "id",
                    newsId
                )
                .select(
                    "*,categories(id,name,slug)"
                )
                .single();

        if (result.error) {
            throw result.error;
        }

        const normalized =
            normalizeNewsRow(
                result.data
            );

        updateLocalNewsCache(
            normalized
        );

        return normalized;
    }


    /* =====================================================
       GÖRÜNTÜLENME
       ===================================================== */

    async function incrementNewsViews(id) {
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
                        news_id:
                            id
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


    /* =====================================================
       MOBİL MENÜ
       ===================================================== */

    function initMobileMenu() {
        document
            .querySelectorAll(
                "[data-mobile-menu]"
            )
            .forEach(
                function (button) {
                    button.addEventListener(
                        "click",
                        function () {
                            document.body
                                .classList
                                .toggle(
                                    "mobile-menu-open"
                                );
                        }
                    );
                }
            );

        document.addEventListener(
            "click",
            function (event) {
                if (
                    event.target.closest(
                        "[data-mobile-menu-close]"
                    )
                ) {
                    document.body
                        .classList
                        .remove(
                            "mobile-menu-open"
                        );
                }
            }
        );
    }


    /* =====================================================
       TARİH / YIL
       ===================================================== */

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


    /* =====================================================
       HABER SAYAÇLARI
       ===================================================== */

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
                            isBreaking
                        ).length;
                }
            );

        document
            .querySelectorAll(
                "[data-headline-count]"
            )
            .forEach(
                function (element) {
                    element.textContent =
                        news.filter(
                            isHeadline
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


    /* =====================================================
       ESC
       ===================================================== */

    function initEscapeKey() {
        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                document.body
                    .classList
                    .remove(
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
        );
    }


    /* =====================================================
       BUTON EFEKTİ
       ===================================================== */

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


    /* =====================================================
       SUPABASE ARKA PLAN
       ===================================================== */

    function initSupabaseBackground() {
        if (!isCloudConfigured()) {
            return;
        }

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


    /* =====================================================
       GLOBAL API
       ===================================================== */

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

                return readStorage(
                    NEWS_KEY
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

        isHeadline:
            isHeadline,

        getHeadlineOrder:
            getHeadlineOrder,

        normalizeNewsRow:
            normalizeNewsRow,

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

        fetchNewsFromSupabase:
            fetchNewsFromSupabase,

        refreshNewsFromSupabase:
            refreshNewsFromSupabase,

        getHeadlines:
            getHeadlines,

        getHeadlineSlots:
            getHeadlineSlots,

        setHeadline:
            setHeadline,

        removeHeadline:
            removeHeadline,

        upsertNewsToSupabase:
            upsertNewsToSupabase,

        saveDraftToSupabase:
            saveDraftToSupabase,

        incrementNewsViews:
            incrementNewsViews
    };


    /* =====================================================
       BAŞLAT
       ===================================================== */

    function init() {
        initMobileMenu();
        initDateElements();
        initNewsCounters();
        initEscapeKey();
        initButtonEffects();
        initSupabaseBackground();

        if (
            "serviceWorker" in navigator &&
            window.isSecureContext
        ) {
            navigator.serviceWorker
                .register("/sw.js")
                .catch(
                    function (error) {
                        console.warn(
                            "Çevrimdışı destek başlatılamadı:",
                            error
                        );
                    }
                );
        }
    }


    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})();