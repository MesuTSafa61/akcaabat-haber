/* =========================================================
   AKÇAABAT HABER
   SUPABASE KATEGORİ SERVİSİ
   ========================================================= */

(function () {
    "use strict";

    const SUPABASE_URL =
        "https://wokgvwffbootbhqxfttm.supabase.co";

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

    async function getCategories(options = {}) {

        let query = client
            .from("categories")
            .select("*")
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

        if (
            options.activeOnly === true
        ) {
            query = query.eq(
                "is_active",
                true
            );
        }

        const { data, error } =
            await query;

        if (error) {
            throw error;
        }

        return data || [];
    }

    async function getCategoryById(id) {

        if (!id) {
            return null;
        }

        const { data, error } =
            await client
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

        if (!slug) {
            return null;
        }

        const { data, error } =
            await client
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

        const name =
            String(
                category.name || ""
            ).trim();

        const slug =
            String(
                category.slug ||
                ""
            ).trim();

        if (!name) {
            throw new Error(
                "Kategori adı gerekli."
            );
        }

        if (!slug) {
            throw new Error(
                "Kategori slug gerekli."
            );
        }

        const payload = {
            name,
            slug,

            description:
                category.description ||
                null,

            sort_order:
                Number.isFinite(
                    Number(
                        category.sort_order
                    )
                )
                    ? Number(
                        category.sort_order
                    )
                    : 0,

            is_active:
                category.is_active !==
                false
        };

        const { data, error } =
            await client
                .from("categories")
                .insert(payload)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function updateCategory(
        id,
        category
    ) {

        if (!id) {
            throw new Error(
                "Kategori ID gerekli."
            );
        }

        const name =
            String(
                category.name || ""
            ).trim();

        const slug =
            String(
                category.slug || ""
            ).trim();

        if (!name) {
            throw new Error(
                "Kategori adı gerekli."
            );
        }

        if (!slug) {
            throw new Error(
                "Kategori slug gerekli."
            );
        }

        const payload = {
            name,
            slug,

            description:
                category.description ||
                null,

            sort_order:
                Number.isFinite(
                    Number(
                        category.sort_order
                    )
                )
                    ? Number(
                        category.sort_order
                    )
                    : 0,

            is_active:
                category.is_active !==
                false
        };

        const { data, error } =
            await client
                .from("categories")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function setCategoryActive(
        id,
        isActive
    ) {

        if (!id) {
            throw new Error(
                "Kategori ID gerekli."
            );
        }

        const { data, error } =
            await client
                .from("categories")
                .update({
                    is_active:
                        !!isActive
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async function deleteCategory(id) {

        if (!id) {
            throw new Error(
                "Kategori ID gerekli."
            );
        }

        const { count, error } =
            await client
                .from("news")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "category_id",
                    id
                );

        if (error) {
            throw error;
        }

        if (
            Number(count || 0) > 0
        ) {
            throw new Error(
                "Bu kategoriye bağlı haberler var. Önce haberlerin kategorisini değiştirin."
            );
        }

        const { error:
            deleteError
        } =
            await client
                .from("categories")
                .delete()
                .eq("id", id);

        if (deleteError) {
            throw deleteError;
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