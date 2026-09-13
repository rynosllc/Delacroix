import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cash-gift creation: validates the request, creates a Stripe PaymentIntent,
// and inserts the gift with payment_status 'pending'. The app confirms the
// payment with Stripe's PaymentSheet using the returned client_secret; the
// stripe-webhook function flips payment_status to 'paid', which is what the
// delivery worker requires before a cash gift is delivered.
//
// No-cash gifts do not use this function (the app inserts those directly
// under RLS). Stripe is called over plain REST — no SDK.
//
// While the sandbox is active, STRIPE_SECRET_KEY_TEST takes precedence over
// the live key; remove the test secret to go live.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_MODE = Deno.env.get("STRIPE_SECRET_KEY_TEST") ? "test" : "live";

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

async function stripe(path: string, body: Record<string, string>): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
  return data;
}

interface CreateGiftPayload {
  recipient_contact_id: string;
  // Occasion slug — templates.id is text ('birthday', 'anniversary', ...)
  template_id: string;
  message_text: string;
  message_source: "manual" | "ai_generated" | "ai_polished";
  cash_amount: number;
  scheduled_send_at: string; // ISO string
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    if (!STRIPE_KEY) return json({ error: "Payments are not configured" }, 503);

    const body: CreateGiftPayload = await req.json();

    if (!body.recipient_contact_id || !body.template_id || !body.message_text || !body.scheduled_send_at) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!["manual", "ai_generated", "ai_polished"].includes(body.message_source)) {
      return json({ error: "Invalid message_source" }, 400);
    }
    const cashAmount = Number(body.cash_amount);
    if (!Number.isFinite(cashAmount) || cashAmount < 5 || cashAmount > 2000) {
      return json({ error: "Cash amount must be between $5 and $2,000" }, 400);
    }

    // Verify the recipient contact belongs to this sender
    const { data: contact } = await supabase
      .from("recipient_contacts")
      .select("id")
      .eq("id", body.recipient_contact_id)
      .eq("owner_user_id", user.id)
      .single();
    if (!contact) return json({ error: "Recipient contact not found" }, 404);

    // Verify the template exists and is active
    const { data: template } = await supabase
      .from("templates")
      .select("id")
      .eq("id", body.template_id)
      .eq("active", true)
      .single();
    if (!template) return json({ error: "Template not found" }, 404);

    // Stripe pass-through fee (2.9% + $0.30), rounded to cents
    const feeAmount = Math.round((cashAmount * 0.029 + 0.30) * 100) / 100;
    const totalCents = Math.round((cashAmount + feeAmount) * 100);

    // allow_redirects 'never' keeps confirmation card-based, which the
    // PaymentSheet supports and server-side test confirmation requires.
    const paymentIntent = await stripe("payment_intents", {
      amount: String(totalCents),
      currency: "usd",
      "automatic_payment_methods[enabled]": "true",
      "automatic_payment_methods[allow_redirects]": "never",
      "metadata[sender_id]": user.id,
      "metadata[recipient_contact_id]": body.recipient_contact_id,
      "metadata[cash_amount]": cashAmount.toFixed(2),
      "metadata[fee_amount]": feeAmount.toFixed(2),
      "metadata[mode]": STRIPE_MODE,
    });

    const { data: gift, error: giftError } = await supabase
      .from("gifts")
      .insert({
        sender_id: user.id,
        recipient_contact_id: body.recipient_contact_id,
        template_id: body.template_id,
        message_text: body.message_text,
        message_source: body.message_source,
        cash_amount: cashAmount,
        fee_amount: feeAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: "scheduled",
        payment_status: "pending",
        scheduled_send_at: body.scheduled_send_at,
      })
      .select()
      .single();

    if (giftError) {
      await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${STRIPE_KEY}` },
      }).catch(() => {});
      throw giftError;
    }

    return json({
      gift_id: gift.id,
      client_secret: paymentIntent.client_secret,
      total_cents: totalCents,
      mode: STRIPE_MODE,
    }, 201);
  } catch (err) {
    console.error("create-gift error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
