import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// In-app account deletion (App Store guideline 5.1.1(v)).
// Authenticated users delete their own account and all their data:
// sent gifts, contacts (via cascade), profile row, and the auth user.
// Gifts this user claimed from others are unlinked, not deleted —
// they belong to their senders.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    // 1. Unlink gifts this user claimed from other senders
    await supabase.from("gifts").update({ claimed_by: null }).eq("claimed_by", user.id);
    await supabase.from("recipient_contacts").update({ claimed_user_id: null }).eq("claimed_user_id", user.id);

    // 2. Delete gifts this user sent (frees FK references to their contacts)
    const { error: giftsError } = await supabase.from("gifts").delete().eq("sender_id", user.id);
    if (giftsError) throw giftsError;

    // 3. Delete profile row — contacts cascade via owner_user_id FK
    const { error: userRowError } = await supabase.from("users").delete().eq("id", user.id);
    if (userRowError) throw userRowError;

    // 4. Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return json({ ok: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return json({ error: "Could not delete account" }, 500);
  }
});
