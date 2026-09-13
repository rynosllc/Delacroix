import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stripe webhook: the authoritative signal that money actually moved.
// Verifies the Stripe-Signature header (HMAC-SHA256 over `${t}.${payload}`)
// and updates gifts.payment_status by stripe_payment_intent_id.
// Deployed with --no-verify-jwt; the signature IS the authentication.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") ||
  Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

async function verifySignature(payload: string, header: string): Promise<boolean> {
  if (!WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=", 2) as [string, string]),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  // Reject events older than 5 minutes (replay window)
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  // constant-time compare
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  try {
    const payload = await req.text();
    const ok = await verifySignature(payload, req.headers.get("Stripe-Signature") ?? "");
    if (!ok) return new Response("invalid signature", { status: 400 });

    const event = JSON.parse(payload);
    const pi = event.data?.object;

    if (event.type === "payment_intent.succeeded" && pi?.id) {
      await supabase
        .from("gifts")
        .update({ payment_status: "paid" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("payment_status", "pending");
    } else if (event.type === "payment_intent.payment_failed" && pi?.id) {
      await supabase
        .from("gifts")
        .update({ payment_status: "failed" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("payment_status", "pending");
    }
    // Unhandled event types are acknowledged so Stripe stops retrying.

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response("error", { status: 500 });
  }
});
