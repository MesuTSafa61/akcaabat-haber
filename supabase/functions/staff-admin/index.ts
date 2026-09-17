import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = new Set(["admin", "editor", "moderator", "writer", "reporter"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Yalnızca POST isteği desteklenir." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json({ error: "Yetkilendirme bilgileri eksik." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Geçerli oturum bulunamadı." }, 401);

    const { data: callerProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role,is_active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile || !callerProfile.is_active || callerProfile.role !== "admin") {
      return json({ error: "Bu işlem için yönetici yetkisi gerekli." }, 403);
    }

    const body = await req.json();
    const action = String(body.action || "invite");
    const role = String(body.role || "").trim();

    if (action === "list") {
      const { data: profiles, error } = await serviceClient
        .from("profiles")
        .select("id,display_name,role,is_active,created_at,updated_at")
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 400);

      const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return json({ error: usersError.message }, 400);
      const emailById = new Map(usersData.users.map((user) => [user.id, user.email || ""]));
      return json({
        users: (profiles || []).map((profile) => ({
          user_id: profile.id,
          email: emailById.get(profile.id) || "",
          display_name: profile.display_name,
          role: profile.role,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        })),
      });
    }

    if (action === "update") {
      const userId = String(body.user_id || "");
      const displayName = String(body.display_name || "").trim();
      const isActive = body.is_active === true;
      if (!/^[0-9a-f-]{36}$/i.test(userId) || !allowedRoles.has(role)) {
        return json({ error: "Geçersiz kullanıcı veya rol bilgisi." }, 400);
      }

      const { data: current, error: currentError } = await serviceClient
        .from("profiles")
        .select("id,role,is_active")
        .eq("id", userId)
        .maybeSingle();
      if (currentError || !current) return json({ error: currentError?.message || "Kullanıcı bulunamadı." }, 404);
      if (userId === userData.user.id && (role !== "admin" || !isActive)) {
        return json({ error: "Kendi yönetici hesabınızı pasifleştiremez veya yetkisini düşüremezsiniz." }, 400);
      }
      if (current.role === "admin" && current.is_active && (role !== "admin" || !isActive)) {
        const { count, error: countError } = await serviceClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("is_active", true);
        if (countError) return json({ error: countError.message }, 400);
        if ((count || 0) <= 1) return json({ error: "Sistemde en az bir aktif yönetici bulunmalıdır." }, 400);
      }

      const { error: updateError } = await serviceClient.from("profiles").update({
        display_name: displayName || null,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (updateError) return json({ error: updateError.message }, 400);

      await serviceClient.from("audit_logs").insert({
        actor_id: userData.user.id,
        action: "staff_profile_updated",
        entity_type: "profile",
        entity_id: userId,
        details: { old_role: current.role, new_role: role, old_active: current.is_active, new_active: isActive },
      });
      return json({ ok: true });
    }

    if (action !== "invite") return json({ error: "Geçersiz işlem." }, 400);

    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.display_name || "").trim();
    const siteUrl = String(body.site_url || "https://akcaabathaber.com.tr").replace(/\/$/, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Geçerli bir e-posta adresi girin." }, 400);
    if (!allowedRoles.has(role)) return json({ error: "Geçersiz kullanıcı rolü." }, 400);

    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/admin-giris.html`,
      data: { display_name: displayName || email.split("@")[0] },
    });

    if (inviteError || !inviteData.user) {
      return json({ error: inviteError?.message || "Davet gönderilemedi." }, 400);
    }

    const { error: upsertError } = await serviceClient.from("profiles").upsert({
      id: inviteData.user.id,
      display_name: displayName || email.split("@")[0],
      role,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (upsertError) return json({ error: upsertError.message }, 400);

    await serviceClient.from("audit_logs").insert({
      actor_id: userData.user.id,
      action: "staff_invited",
      entity_type: "profile",
      entity_id: inviteData.user.id,
      details: { email, role },
    });

    return json({ ok: true, user_id: inviteData.user.id, email, role });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, 500);
  }
});
