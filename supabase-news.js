/* =========================================================
   AKÇAABAT HABER
   SUPABASE - HABER SERVİSİ
   MANŞET YÖNETİMLİ SÜRÜM
   ========================================================= */

(function () {
    "use strict";

    if (!window.supabase) {
        console.error("Supabase kütüphanesi yüklenmedi.");
        return;
    }

    if (!window.AKCAABAT_SUPABASE) {
        console.error("supabase-config.js yüklenmedi.");
        return;
    }

    const config = window.AKCAABAT_SUPABASE;

    const client = window.supabase.createClient(
        config.url,
        config.key
    );

    const NEWS_SELECT = `
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
    `;

    function cleanData(data) {
        return data || {};
    }

    function normalizeHeadlineOrder(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const order = Number(value);

        if (
            !Number.isInteger(order) ||
            order < 1 ||
            order > 15
        ) {
            throw new Error(
                "Manşet sırası 1 ile 15 arasında olmalıdır."
            );
        }

        return order;
    }

    function prepareNewsPayload(news) {
        const payload = {
            ...cleanData(news)
        };

        if (
            Object.prototype.hasOwnProperty.call(
                payload,
                "headline_order"
            )
        ) {
            payload.headline_order =
                normalizeHeadlineOrder(
                    payload.headline_order
                );
        }

        if (
            Object.prototype.hasOwnProperty.call(
                payload,
                "is_headline"
            )
        ) {
            payload.is_headline =
                payload.is_headline === true;
        }

        if (payload.status !== "published") {
            payload.is_headline = false;
            payload.headline_order = null;
        }

        if (payload.is_headline !== true) {
            payload.headline_order = null;
        }

        if (
            payload.is_headline === true &&
            payload.headline_order === null
        ) {
            throw new Error(
                "Manşete eklenen haber için 1-15 arasında sıra seçilmelidir."
            );
        }

        return payload;
    }

    async function getNews(options = {}) {
        let query = client
            .from("news")
            .select(NEWS_SELECT);

        if (options.status) {
            query = query.eq(
                "status",
                options.status
            );
        }

        if (options.category_id) {
            query = query.eq(
                "category_id",
                options.category_id
            );
        }

        if (options.category) {
            query = query.eq(
                "categories.slug",
                options.category
            );
        }

        if (options.breaking === true) {
            query = query.eq(
                "is_breaking",
                true
            );
        }

        if (options.headline === true) {
            query = query
                .eq("is_headline", true)
                .eq("status", "published")
                .not(
                    "headline_order",
                    "is",
                    null
                );
        }

        if (options.search) {
            const search =
                String(options.search).trim();

            if (search) {
                query = query.or(
                    `title.ilike.%${search}%,summary.ilike.%${search}%`
                );
            }
        }

        if (options.headline === true) {
            query = query.order(
                "headline_order",
                {
                    ascending: true
                }
            );
        } else {
            query = query.order(
                options.orderBy ||
                "created_at",
                {
                    ascending:
                        options.ascending === true
                }
            );
        }

        if (options.limit) {
            query = query.limit(
                Number(options.limit)
            );
        }

        const { data, error } =
            await query;

        if (error) {
            console.error(
                "Haberler alınamadı:",
                error
            );

            throw error;
        }

        return data || [];
    }

    async function getHeadlines(limit = 10) {
        const safeLimit =
            Math.min(
                10,
                Math.max(
                    1,
                    Number(limit) || 10
                )
            );

        const { data, error } =
            await client
                .from("news")
                .select(NEWS_SELECT)
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
                .limit(safeLimit);

        if (error) {
            console.error(
                "Manşetler alınamadı:",
                error
            );

            throw error;
        }

        return data || [];
    }

    async function getHeadlineSlots() {
        const { data, error } =
            await client
                .from("news")
                .select(`
                    id,
                    title,
                    slug,
                    status,
                    is_headline,
                    headline_order
                `)
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

        if (error) {
            console.error(
                "Manşet sıraları alınamadı:",
                error
            );

            throw error;
        }

        return data || [];
    }

    async function getNewsById(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .select(NEWS_SELECT)
                .eq("id", id)
                .maybeSingle();

        if (error) {
            console.error(
                "Haber alınamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function getNewsBySlug(slug) {
        if (!slug) {
            throw new Error(
                "Haber slug gerekli."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .select(NEWS_SELECT)
                .eq("slug", slug)
                .maybeSingle();

        if (error) {
            console.error(
                "Haber alınamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function createNews(news) {
        const payload =
            prepareNewsPayload(news);

        const { data, error } =
            await client
                .from("news")
                .insert(payload)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber oluşturulamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function updateNews(id, news) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const payload =
            prepareNewsPayload(news);

        const { data, error } =
            await client
                .from("news")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber güncellenemedi:",
                error
            );

            throw error;
        }

        return data;
    }

    async function setHeadline(
        id,
        order
    ) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const headlineOrder =
            normalizeHeadlineOrder(order);

        if (headlineOrder === null) {
            throw new Error(
                "Manşet sırası seçilmelidir."
            );
        }

        const newsResult =
            await client
                .from("news")
                .select(
                    "id,status,is_headline,headline_order"
                )
                .eq("id", id)
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

        const occupiedResult =
            await client
                .from("news")
                .select(
                    "id,title,headline_order"
                )
                .eq(
                    "is_headline",
                    true
                )
                .eq(
                    "headline_order",
                    headlineOrder
                )
                .neq("id", id)
                .limit(1);

        if (occupiedResult.error) {
            throw occupiedResult.error;
        }

        if (
            occupiedResult.data &&
            occupiedResult.data.length
        ) {
            throw new Error(
                headlineOrder +
                ". manşet sırası başka bir haber tarafından kullanılıyor."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .update({
                    is_headline: true,
                    headline_order:
                        headlineOrder
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber manşete eklenemedi:",
                error
            );

            throw error;
        }

        return data;
    }

    async function removeHeadline(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .update({
                    is_headline: false,
                    headline_order: null
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber manşetten çıkarılamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function publishNews(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const existing =
            await client
                .from("news")
                .select(
                    "id,published_at"
                )
                .eq("id", id)
                .maybeSingle();

        if (existing.error) {
            throw existing.error;
        }

        if (!existing.data) {
            throw new Error(
                "Haber bulunamadı."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .update({
                    status:
                        "published",

                    published_at:
                        existing.data
                            .published_at ||
                        new Date()
                            .toISOString()
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber yayınlanamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function archiveNews(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .update({
                    status:
                        "archived",

                    is_headline:
                        false,

                    headline_order:
                        null
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber arşivlenemedi:",
                error
            );

            throw error;
        }

        return data;
    }

    async function moveToDraft(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { data, error } =
            await client
                .from("news")
                .update({
                    status:
                        "draft",

                    published_at:
                        null,

                    is_headline:
                        false,

                    headline_order:
                        null
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Haber taslağa alınamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    async function deleteNews(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { error } =
            await client
                .from("news")
                .delete()
                .eq("id", id);

        if (error) {
            console.error(
                "Haber silinemedi:",
                error
            );

            throw error;
        }

        return true;
    }

    async function incrementViews(id) {
        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const { data, error } =
            await client.rpc(
                "increment_news_views",
                {
                    news_id: id
                }
            );

        if (error) {
            console.error(
                "Haber görüntülenme sayısı artırılamadı:",
                error
            );

            throw error;
        }

        return data;
    }

    window.AkcaabatNewsService = {
        client,
        getNews,
        getHeadlines,
        getHeadlineSlots,
        getNewsById,
        getNewsBySlug,
        createNews,
        updateNews,
        setHeadline,
        removeHeadline,
        publishNews,
        archiveNews,
        moveToDraft,
        deleteNews,
        incrementViews
    };

})();
