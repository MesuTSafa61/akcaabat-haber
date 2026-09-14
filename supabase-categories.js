/* =========================================================
   AKÇAABAT HABER
   SUPABASE - KATEGORİ SERVİSİ
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

    async function getCategories(options = {}) {
        let query = client
            .from("categories")
            .select(`
                id,
                name,
                slug,
                description,
                sort_order,
                is_active,
                created_at,
                updated_at
            `);

        if (options.activeOnly !== false) {
            query = query.eq("is_active", true);
        }

        query = query.order(
            options.orderBy || "sort_order",
            {
                ascending:
                    options.ascending !== false
            }
        );

        const { data, error } = await query;

        if (error) {
            console.error(
                "Kategoriler alınamadı:",
                error
            );
            throw error;
        }

        return data || [];
    }

    async function getCategoryById(id) {
        const { data, error } = await client
            .from("categories")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function getCategoryBySlug(slug) {
        const { data, error } = await client
            .from("categories")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function createCategory(category) {
        const { data, error } = await client
            .from("categories")
            .insert(category)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function updateCategory(id, category) {
        const { data, error } = await client
            .from("categories")
            .update(category)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function setCategoryActive(id, isActive) {
        return updateCategory(id, {
            is_active: Boolean(isActive)
        });
    }

    async function deleteCategory(id) {
        const { error } = await client
            .from("categories")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        return true;
    }

    window.AkcaabatCategoryService = {
        client,
        getCategories,
        getCategoryById,
        getCategoryBySlug,
        createCategory,
        updateCategory,
        setCategoryActive,
        deleteCategory
    };

})();