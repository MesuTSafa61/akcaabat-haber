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

    async function getSession() {

        const {
            data,
            error
        } = await client.auth.getSession();

        if (error) {
            throw error;
        }

        return data.session || null;
    }

    async function getCurrentUser() {

        const {
            data,
            error
        } = await client.auth.getUser();

        if (error) {
            return null;
        }

        return data.user || null;
    }

    async function getCurrentProfile() {

        const user =
            await getCurrentUser();

        if (!user) {
            return null;
        }

        const {
            data,
            error
        } = await client
            .from("profiles")
            .select(
                "id, display_name, role, created_at, updated_at"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function isStaff() {

        const profile =
            await getCurrentProfile();

        if (!profile) {
            return false;
        }

        return (
            profile.role === "admin" ||
            profile.role === "editor"
        );
    }

    async function isAdmin() {

        const profile =
            await getCurrentProfile();

        return !!(
            profile &&
            profile.role === "admin"
        );
    }

    async function requireStaff(
        redirect = "admin-giris.html"
    ) {

        const session =
            await getSession();

        if (!session) {
            window.location.href =
                redirect;

            return null;
        }

        const allowed =
            await isStaff();

        if (!allowed) {
            await signOut();

            window.location.href =
                redirect;

            return null;
        }

        return session;
    }

    async function requireAdmin(
        redirect = "admin-giris.html"
    ) {

        const session =
            await getSession();

        if (!session) {
            window.location.href =
                redirect;

            return null;
        }

        const allowed =
            await isAdmin();

        if (!allowed) {
            window.location.href =
                redirect;

            return null;
        }

        return session;
    }

    async function signIn(
        email,
        password
    ) {

        email =
            String(
                email || ""
            ).trim();

        password =
            String(
                password || ""
            );

        if (!email) {
            throw new Error(
                "E-posta adresi gerekli."
            );
        }

        if (!password) {
            throw new Error(
                "Şifre gerekli."
            );
        }

        const {
            data,
            error
        } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function signOut() {

        const {
            error
        } = await client.auth.signOut();

        if (error) {
            throw error;
        }

        return true;
    }

    function onAuthStateChange(
        callback
    ) {

        return client.auth.onAuthStateChange(
            callback
        );
    }

    async function redirectIfAuthenticated(
        target = "admin.html"
    ) {

        const session =
            await getSession();

        if (!session) {
            return false;
        }

        const allowed =
            await isStaff();

        if (!allowed) {
            await signOut();
            return false;
        }

        window.location.href =
            target;

        return true;
    }

    window.AkcaabatAuth = {
        client,
        getSession,
        getCurrentUser,
        getCurrentProfile,
        isStaff,
        isAdmin,
        requireStaff,
        requireAdmin,
        signIn,
        signOut,
        onAuthStateChange,
        redirectIfAuthenticated
    };

})();