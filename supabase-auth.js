/* =========================================================
   AKÇAABAT HABER
   SUPABASE - AUTH SERVİSİ
   ========================================================= */

(function () {
    "use strict";

    if (!window.supabase) {
        console.error(
            "Supabase kütüphanesi yüklenmedi."
        );
        return;
    }

    if (!window.AKCAABAT_SUPABASE) {
        console.error(
            "supabase-config.js yüklenmedi."
        );
        return;
    }

    const config =
        window.AKCAABAT_SUPABASE;

    const client =
        window.supabase.createClient(
            config.url,
            config.key
        );

    async function getSession() {
        const result =
            await client.auth.getSession();

        if (result.error) {
            throw result.error;
        }

        return result.data.session;
    }

    async function getCurrentUser() {
        const result =
            await client.auth.getUser();

        if (result.error) {
            return null;
        }

        return result.data.user || null;
    }

    async function getCurrentProfile() {
        const user =
            await getCurrentUser();

        if (!user) {
            return null;
        }

        const result =
            await client
                .from("profiles")
                .select(
                    "id, display_name, role"
                )
                .eq("id", user.id)
                .maybeSingle();

        if (result.error) {
            throw result.error;
        }

        return result.data;
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

        if (!profile) {
            return false;
        }

        return profile.role === "admin";
    }

    async function requireStaff(
        redirect = "admin-giris.html"
    ) {
        const session =
            await getSession();

        if (!session) {
            window.location.href =
                redirect;

            return false;
        }

        const staff =
            await isStaff();

        if (!staff) {
            await signOut();

            window.location.href =
                redirect;

            return false;
        }

        return true;
    }

    async function requireAdmin(
        redirect = "admin-giris.html"
    ) {
        const session =
            await getSession();

        if (!session) {
            window.location.href =
                redirect;

            return false;
        }

        const admin =
            await isAdmin();

        if (!admin) {
            await signOut();

            window.location.href =
                redirect;

            return false;
        }

        return true;
    }

    async function signIn(
        email,
        password
    ) {
        const result =
            await client.auth.signInWithPassword({
                email:
                    String(email || "")
                        .trim(),
                password:
                    String(password || "")
            });

        if (result.error) {
            throw result.error;
        }

        return result.data;
    }

    async function signOut() {
        const result =
            await client.auth.signOut();

        if (result.error) {
            throw result.error;
        }

        return true;
    }

    function onAuthStateChange(
        callback
    ) {
        return client.auth.onAuthStateChange(
            function (
                event,
                session
            ) {
                if (
                    typeof callback ===
                    "function"
                ) {
                    callback(
                        event,
                        session
                    );
                }
            }
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

        const staff =
            await isStaff();

        if (!staff) {
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