import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public claim lookup — recipients have no account, so this function
// is deployed with --no-verify-jwt and uses the service role to read.
// It returns ONLY safe display fields; never internal ids.

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string" || !UUID_RE.test(token)) {
      return json({ error: "Invalid token" }, 400);
    }

    const { data: gift, error } = await supabase
      .from("gifts")
      .select("template_id, message_text, cash_amount, status, users!gifts_sender_id_fkey(display_name)")
      .eq("claim_token", token)
      .single();

    if (error || !gift) {
      return json({ error: "Gift not found" }, 404);
    }

    const sender = gift.users as unknown as { display_name: string } | null;

    // Whitelist output — never expose sender_id, contact ids, stripe ids
    return json({
      sender_name: sender?.display_name ?? "Someone",
      occasion: gift.template_id,
      message_text: gift.message_text,
      cash_amount: gift.cash_amount,
      status: gift.status,
    });
  } catch (_e) {
    return json({ error: "Bad request" }, 400);
  }
});
