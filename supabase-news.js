/* =========================================================
   AKÇAABAT HABER
   SUPABASE - HABER SERVİSİ
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

    function cleanData(data) {
        return data || {};
    }

    async function getNews(options = {}) {
        let query = client
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

        if (options.status) {
            query = query.eq("status", options.status);
        }

        if (options.category_id) {
            query = query.eq("category_id", options.category_id);
        }

        if (options.category) {
            query = query.eq("categories.slug", options.category);
        }

        if (options.breaking === true) {
            query = query.eq("is_breaking", true);
        }

        if (options.search) {
            const search = String(options.search).trim();

            if (search) {
                query = query.or(
                    `title.ilike.%${search}%,summary.ilike.%${search}%`
                );
            }
        }

        query = query.order(
            options.orderBy || "created_at",
            {
                ascending:
                    options.ascending === true
            }
        );

        if (options.limit) {
            query = query.limit(Number(options.limit));
        }

        const { data, error } = await query;

        if (error) {
            console.error("Haberler alınamadı:", error);
            throw error;
        }

        return data || [];
    }

    async function getNewsById(id) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const { data, error } = await client
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
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Haber alınamadı:", error);
            throw error;
        }

        return data;
    }

    async function getNewsBySlug(slug) {
        if (!slug) {
            throw new Error("Haber slug gerekli.");
        }

        const { data, error } = await client
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
            `)
            .eq("slug", slug)
            .maybeSingle();

        if (error) {
            console.error("Haber alınamadı:", error);
            throw error;
        }

        return data;
    }

    async function createNews(news) {
        const payload = cleanData(news);

        const { data, error } = await client
            .from("news")
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("Haber oluşturulamadı:", error);
            throw error;
        }

        return data;
    }

    async function updateNews(id, news) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const payload = cleanData(news);

        const { data, error } = await client
            .from("news")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Haber güncellenemedi:", error);
            throw error;
        }

        return data;
    }

    async function publishNews(id) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const { data, error } = await client
            .from("news")
            .update({
                status: "published",
                published_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Haber yayınlanamadı:", error);
            throw error;
        }

        return data;
    }

    async function archiveNews(id) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const { data, error } = await client
            .from("news")
            .update({
                status: "archived"
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Haber arşivlenemedi:", error);
            throw error;
        }

        return data;
    }

    async function deleteNews(id) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const { error } = await client
            .from("news")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Haber silinemedi:", error);
            throw error;
        }

        return true;
    }

    async function incrementViews(id) {
        if (!id) {
            throw new Error("Haber ID gerekli.");
        }

        const { data, error } = await client.rpc(
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