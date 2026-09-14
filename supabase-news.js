/* =========================================================
   AKÇAABAT HABER
   SUPABASE HABER SERVİSİ
   ========================================================= */

(function () {
    "use strict";

    const SUPABASE_URL =
        "https://wokgvwffbootbhqxfttm.supabase.co";

    /*
     * BURAYA SUPABASE PUBLISHABLE / ANON KEY GELECEK.
     * Service role / secret key kesinlikle kullanılmayacak.
     */
    const SUPABASE_KEY =
        window.SUPABASE_PUBLISHABLE_KEY || "";

    if (!window.supabase) {
        console.error(
            "Supabase JS yüklenmedi."
        );
        return;
    }

    if (!SUPABASE_KEY) {
        console.error(
            "Supabase publishable key bulunamadı."
        );
        return;
    }

    const client =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

    async function getNews(options = {}) {

        let query = client
            .from("news")
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug
                )
            `)
            .order(
                "published_at",
                {
                    ascending: false,
                    nullsFirst: false
                }
            );

        if (options.status) {
            query = query.eq(
                "status",
                options.status
            );
        }

        if (options.categoryId) {
            query = query.eq(
                "category_id",
                options.categoryId
            );
        }

        if (
            Number.isInteger(
                options.limit
            )
        ) {
            query = query.limit(
                options.limit
            );
        }

        const { data, error } =
            await query;

        if (error) {
            throw error;
        }

        return data || [];
    }

    async function getNewsById(id) {

        if (!id) {
            return null;
        }

        const { data, error } =
            await client
                .from("news")
                .select(`
                    *,
                    categories (
                        id,
                        name,
                        slug
                    )
                `)
                .eq("id", id)
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function getNewsBySlug(slug) {

        if (!slug) {
            return null;
        }

        const { data, error } =
            await client
                .from("news")
                .select(`
                    *,
                    categories (
                        id,
                        name,
                        slug
                    )
                `)
                .eq("slug", slug)
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function createNews(news) {

        const payload = {
            title:
                String(
                    news.title || ""
                ).trim(),

            slug:
                String(
                    news.slug || ""
                ).trim(),

            summary:
                news.summary || null,

            content:
                news.content || "",

            category_id:
                news.category_id || null,

            image_url:
                news.image_url || null,

            status:
                news.status || "draft",

            is_breaking:
                !!news.is_breaking,

            views:
                0,

            author_id:
                news.author_id || null,

            published_at:
                news.status === "published"
                    ? (
                        news.published_at ||
                        new Date().toISOString()
                    )
                    : null
        };

        const { data, error } =
            await client
                .from("news")
                .insert(payload)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function updateNews(
        id,
        news
    ) {

        if (!id) {
            throw new Error(
                "Haber ID gerekli."
            );
        }

        const payload = {
            title:
                String(
                    news.title || ""
                ).trim(),

            slug:
                String(
                    news.slug || ""
                ).trim(),

            summary:
                news.summary || null,

            content:
                news.content || "",

            category_id:
                news.category_id || null,

            image_url:
                news.image_url || null,

            status:
                news.status || "draft",

            is_breaking:
                !!news.is_breaking
        };

        if (
            news.status ===
            "published"
        ) {
            payload.published_at =
                news.published_at ||
                new Date().toISOString();
        }

        const { data, error } =
            await client
                .from("news")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

        if (error) {
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

        const { data, error } =
            await client
                .from("news")
                .update({
                    status:
                        "published",

                    published_at:
                        new Date()
                            .toISOString()
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
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
                        "archived"
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
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
            throw error;
        }

        return true;
    }

    async function incrementViews(id) {

        if (!id) {
            return null;
        }

        const { data, error } =
            await client
                .rpc(
                    "increment_news_views",
                    {
                        news_id:
                            id
                    }
                );

        if (error) {
            console.error(
                "Görüntülenme artırma hatası:",
                error
            );

            return null;
        }

        return data;
    }

    window.AkcaabatNewsService = {
        client,
        getNews,
        getNewsById,
        getNewsBySlug,
        createNews,
        updateNews,
        publishNews,
        archiveNews,
        deleteNews,
        incrementViews
    };

})();