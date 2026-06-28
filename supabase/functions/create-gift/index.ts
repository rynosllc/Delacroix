import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateGiftPayload {
  recipient_contact_id: string;
  template_id: string;
  message_text: string;
  message_source: "manual" | "ai_generated" | "ai_polished";
  cash_amount?: number;
  scheduled_send_at: string; // ISO string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the sender
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body: CreateGiftPayload = await req.json();

    // Validate required fields
    if (!body.recipient_contact_id || !body.template_id || !body.message_text || !body.message_source || !body.scheduled_send_at) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!["manual", "ai_generated", "ai_polished"].includes(body.message_source)) {
      return json({ error: "Invalid message_source" }, 400);
    }

    const cashAmount = body.cash_amount ?? null;
    if (cashAmount !== null && cashAmount < 5) {
      return json({ error: "Minimum cash amount is $5" }, 400);
    }

    // Verify the recipient contact belongs to this sender
    const { data: contact, error: contactError } = await supabase
      .from("recipient_contacts")
      .select("id")
      .eq("id", body.recipient_contact_id)
      .eq("owner_user_id", user.id)
      .single();

    if (contactError || !contact) {
      return json({ error: "Recipient contact not found" }, 404);
    }

    // Verify the template exists and is active
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", body.template_id)
      .eq("active", true)
      .single();

    if (templateError || !template) {
      return json({ error: "Template not found" }, 404);
    }

    // Calculate fee (2.9% + $0.30 Stripe pass-through, rounded to cents)
    let feeAmount: number | null = null;
    let paymentIntentId: string | null = null;

    if (cashAmount !== null) {
      feeAmount = Math.round((cashAmount * 0.029 + 0.30) * 100) / 100;
      const totalCents = Math.round((cashAmount + feeAmount) * 100);

      // Create and confirm the Stripe PaymentIntent
      // Payment is charged at send time, not at claim time
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          sender_id: user.id,
          recipient_contact_id: body.recipient_contact_id,
          cash_amount: cashAmount.toString(),
          fee_amount: feeAmount.toString(),
        },
      });

      paymentIntentId = paymentIntent.id;
    }

    // Create the gift row
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
        stripe_payment_intent_id: paymentIntentId,
        status: "scheduled",
        scheduled_send_at: body.scheduled_send_at,
      })
      .select()
      .single();

    if (giftError) {
      // If DB insert fails after creating a PaymentIntent, cancel it to avoid orphaned charges
      if (paymentIntentId) {
        await stripe.paymentIntents.cancel(paymentIntentId).catch(() => {});
      }
      throw giftError;
    }

    return json({ gift }, 201);
  } catch (err) {
    console.error("create-gift error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
