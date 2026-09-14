/* =========================================================
   AKÇAABAT HABER
   ADMIN - SUPABASE DATA BRIDGE
   ========================================================= */

(function () {
    "use strict";

    function getAuth() {
        if (!window.AkcaabatAuth) {
            throw new Error(
                "Supabase auth servisi yüklenmedi."
            );
        }

        return window.AkcaabatAuth;
    }

    function getNewsService() {
        if (!window.AkcaabatNewsService) {
            throw new Error(
                "Supabase haber servisi yüklenmedi."
            );
        }

        return window.AkcaabatNewsService;
    }

    function getCategoryService() {
        if (!window.AkcaabatCategoryService) {
            throw new Error(
                "Supabase kategori servisi yüklenmedi."
            );
        }

        return window.AkcaabatCategoryService;
    }

    async function checkAccess() {

        const auth = getAuth();

        const session =
            await auth.getSession();

        if (!session) {
            window.location.href =
                "admin-giris.html";

            return false;
        }

        const profile =
            await auth.getCurrentProfile();

        if (!profile) {
            await auth.signOut();

            window.location.href =
                "admin-giris.html";

            return false;
        }

        if (
            profile.role !== "admin" &&
            profile.role !== "editor"
        ) {
            await auth.signOut();

            window.location.href =
                "admin-giris.html";

            return false;
        }

        return true;
    }

    async function getDashboardNews() {

        const service =
            getNewsService();

        return service.getNews({
            limit: 100
        });
    }

    async function getDashboardCategories() {

        const service =
            getCategoryService();

        return service.getCategories();
    }

    async function getPublishedNews() {

        const service =
            getNewsService();

        return service.getNews({
            status: "published",
            limit: 100
        });
    }

    async function getDraftNews() {

        const service =
            getNewsService();

        return service.getNews({
            status: "draft",
            limit: 100
        });
    }

    async function getArchivedNews() {

        const service =
            getNewsService();

        return service.getNews({
            status: "archived",
            limit: 100
        });
    }

    async function createNews(data) {

        const auth = getAuth();
        const service =
            getNewsService();

        const user =
            await auth.getCurrentUser();

        if (!user) {
            throw new Error(
                "Oturum bulunamadı."
            );
        }

        return service.createNews({
            ...data,
            author_id:
                data.author_id ||
                user.id
        });
    }

    async function updateNews(
        id,
        data
    ) {

        return getNewsService()
            .updateNews(
                id,
                data
            );
    }

    async function publishNews(id) {

        return getNewsService()
            .publishNews(id);
    }

    async function archiveNews(id) {

        return getNewsService()
            .archiveNews(id);
    }

    async function deleteNews(id) {

        return getNewsService()
            .deleteNews(id);
    }

    async function createCategory(data) {

        return getCategoryService()
            .createCategory(data);
    }

    async function updateCategory(
        id,
        data
    ) {

        return getCategoryService()
            .updateCategory(
                id,
                data
            );
    }

    async function deleteCategory(id) {

        return getCategoryService()
            .deleteCategory(id);
    }

    async function setCategoryActive(
        id,
        active
    ) {

        return getCategoryService()
            .setCategoryActive(
                id,
                active
            );
    }

    async function logout() {

        return getAuth()
            .signOut();
    }

    window.AkcaabatAdminData = {
        checkAccess,

        getDashboardNews,
        getDashboardCategories,

        getPublishedNews,
        getDraftNews,
        getArchivedNews,

        createNews,
        updateNews,
        publishNews,
        archiveNews,
        deleteNews,

        createCategory,
        updateCategory,
        deleteCategory,
        setCategoryActive,

        logout
    };

})();