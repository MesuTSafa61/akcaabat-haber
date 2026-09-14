/* =========================================================
   AKÇAABAT HABER
   SUPABASE - STORAGE SERVİSİ
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

    const BUCKET =
        "news-images";

    function createFileName(file) {
        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const random =
            Math.random()
                .toString(36)
                .substring(2, 10);

        const timestamp =
            Date.now();

        return (
            timestamp +
            "-" +
            random +
            "." +
            extension
        );
    }

    function validateFile(file) {
        if (!file) {
            throw new Error(
                "Görsel seçilmedi."
            );
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {
            throw new Error(
                "Desteklenmeyen görsel formatı."
            );
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            throw new Error(
                "Görsel 10 MB'dan büyük olamaz."
            );
        }
    }

    async function uploadImage(
        file,
        folder = "news"
    ) {
        validateFile(file);

        const fileName =
            createFileName(file);

        const safeFolder =
            String(folder)
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    ""
                );

        const path =
            safeFolder +
            "/" +
            fileName;

        const result =
            await client.storage
                .from(BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",
                        upsert: false,
                        contentType:
                            file.type
                    }
                );

        if (result.error) {
            console.error(
                "Görsel yüklenemedi:",
                result.error
            );

            throw result.error;
        }

        const publicResult =
            client.storage
                .from(BUCKET)
                .getPublicUrl(path);

        return {
            path: path,
            url:
                publicResult.data
                    .publicUrl
        };
    }

    async function deleteImage(path) {
        if (!path) {
            throw new Error(
                "Görsel yolu gerekli."
            );
        }

        const { error } =
            await client.storage
                .from(BUCKET)
                .remove([path]);

        if (error) {
            console.error(
                "Görsel silinemedi:",
                error
            );

            throw error;
        }

        return true;
    }

    function getPublicUrl(path) {
        if (!path) {
            return "";
        }

        return client.storage
            .from(BUCKET)
            .getPublicUrl(path)
            .data
            .publicUrl;
    }

    window.AkcaabatStorageService = {
        client,
        bucket: BUCKET,
        uploadImage,
        deleteImage,
        getPublicUrl,
        validateFile
    };

})();