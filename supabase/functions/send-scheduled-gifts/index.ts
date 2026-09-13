import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Delivery worker, invoked by pg_cron every 15 minutes (and safe to invoke
// any time — every step is idempotent and guarded by status checks).
//
//   1. Expire: sent gifts past expires_at -> 'expired'
//   2. Deliver: scheduled gifts with scheduled_send_at <= now() -> 'sent',
//      sent_at = now(), expires_at = sent_at + 30 days, then notify the
//      recipient with the claim link: SMS via Twilio when the contact has a
//      phone (and Twilio is configured), falling back to email via Resend.
//
// Notification failures do NOT roll back delivery; they're reported in the
// response and the gift row keeps claim_token usable for manual resend.
// Twilio uses the plain REST API over fetch — no SDK, no npm dependency,
// credentials never leave this function's environment.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DeLacroix <onboarding@resend.dev>";
const CLAIM_BASE_URL = Deno.env.get("CLAIM_BASE_URL") ??
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/claim-page?token=`;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
const smsConfigured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "";

const EXPIRY_DAYS = 30;

const OCCASION_PHRASES: Record<string, string> = {
  birthday: "a birthday gift",
  anniversary: "an anniversary gift",
  thank_you: "a thank-you gift",
  just_because: "a gift, just because",
};

interface DueGift {
  id: string;
  claim_token: string;
  template_id: string;
  cash_amount: number | null;
  payment_status: string;
  recipient_contacts: { display_name: string; email: string | null; phone: string | null } | null;
  users: { display_name: string } | null;
}

// Contacts store US numbers as raw digits; Twilio requires E.164.
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function claimSms(senderName: string, claimUrl: string): string {
  return `${senderName} sent you a gift 🎁\n\nOpen your DeLacroix gift here:\n${claimUrl}\n\n— DeLacroix, it's from the heart`;
}

async function sendTwilioSms(to: string, body: string) {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${data.message ?? JSON.stringify(data)}`);
  }
  return data;
}

function claimEmail(senderName: string, recipientName: string, occasion: string, cashAmount: number | null, claimUrl: string) {
  const phrase = OCCASION_PHRASES[occasion] ?? "a gift";
  const cashLine = cashAmount
    ? `<p style="margin:0 0 24px;color:#F5ECD7;font-size:15px;">It includes a cash gift of <strong style="color:#C9A84C;">$${Number(cashAmount).toFixed(2)}</strong>.</p>`
    : "";
  const text = [
    `${senderName} sent you ${phrase} on DeLacroix.`,
    cashAmount ? `It includes a cash gift of $${Number(cashAmount).toFixed(2)}.` : null,
    ``,
    `Open your gift: ${claimUrl}`,
    ``,
    `it's from the heart`,
  ].filter((l) => l !== null).join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#1C2B1E;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1C2B1E;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#243327;border:1px solid #3A4F3D;border-radius:14px;padding:40px 32px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="color:#C9A84C;font-size:22px;letter-spacing:3px;">DeLacroix</span>
  </td></tr>
  <tr><td align="center" style="padding-bottom:8px;">
    <span style="color:#F5ECD7;font-size:24px;line-height:32px;">${senderName} sent you ${phrase}</span>
  </td></tr>
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="color:#9A8C7A;font-size:14px;font-style:italic;">For ${recipientName}</span>
  </td></tr>
  <tr><td align="center">${cashLine}</td></tr>
  <tr><td align="center" style="padding-bottom:32px;">
    <a href="${claimUrl}" style="display:inline-block;background-color:#D4AF37;color:#1B3A2B;text-decoration:none;font-size:15px;font-weight:bold;letter-spacing:1px;padding:15px 42px;border-radius:10px;font-family:Arial,sans-serif;">Open your gift</a>
  </td></tr>
  <tr><td align="center" style="border-top:1px solid #3A4F3D;padding-top:22px;">
    <span style="color:rgba(212,175,55,0.45);font-size:12px;font-style:italic;letter-spacing:1px;">it's from the heart</span>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { text, html };
}

async function sendResendEmail(to: string, subject: string, text: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text, html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

serve(async (_req) => {
  const nowIso = new Date().toISOString();
  const results = {
    expired: 0,
    delivered: [] as string[],
    smsSent: [] as string[],
    smsErrors: [] as string[],
    emailed: [] as string[],
    emailErrors: [] as string[],
    noChannel: [] as string[],
    awaitingPayment: [] as string[],
    refunded: [] as string[],
    refundErrors: [] as string[],
    smsConfigured,
  };

  try {
    // 1. Expire overdue sent gifts
    const { data: expired } = await supabase
      .from("gifts")
      .update({ status: "expired" })
      .eq("status", "sent")
      .lte("expires_at", nowIso)
      .select("id");
    results.expired = expired?.length ?? 0;

    // 1b. Refund paid gifts that were declined or expired — the sender gets
    // their full charge (gift + fee) back. Guarded by payment_status so each
    // gift is refunded exactly once.
    if (STRIPE_KEY) {
      const { data: refundable } = await supabase
        .from("gifts")
        .select("id, stripe_payment_intent_id")
        .eq("payment_status", "paid")
        .in("status", ["declined", "expired"]);
      for (const g of refundable ?? []) {
        if (!g.stripe_payment_intent_id) continue;
        try {
          const res = await fetch("https://api.stripe.com/v1/refunds", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${STRIPE_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ payment_intent: g.stripe_payment_intent_id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message ?? `Stripe ${res.status}`);
          await supabase
            .from("gifts")
            .update({ payment_status: "refunded" })
            .eq("id", g.id)
            .eq("payment_status", "paid");
          results.refunded.push(g.id);
        } catch (err) {
          console.error(`refund failed for gift ${g.id}:`, err);
          results.refundErrors.push(`${g.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 2. Find due scheduled gifts
    const { data: due, error: dueError } = await supabase
      .from("gifts")
      .select(
        "id, claim_token, template_id, cash_amount, payment_status, recipient_contacts(display_name, email, phone), users!gifts_sender_id_fkey(display_name)",
      )
      .eq("status", "scheduled")
      .lte("scheduled_send_at", nowIso);
    if (dueError) throw dueError;

    for (const gift of (due ?? []) as unknown as DueGift[]) {
      // Cash gifts deliver only once the payment is confirmed; an unpaid
      // gift simply waits for the webhook and the next tick.
      if (gift.cash_amount && gift.payment_status !== "paid") {
        results.awaitingPayment.push(gift.id);
        continue;
      }
      const sentAt = new Date();
      const expiresAt = new Date(sentAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      // Atomic flip — the status guard makes concurrent runs deliver once
      const { data: flipped } = await supabase
        .from("gifts")
        .update({
          status: "sent",
          sent_at: sentAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", gift.id)
        .eq("status", "scheduled")
        .select("id");
      if (!flipped || flipped.length === 0) continue; // another run won
      results.delivered.push(gift.id);

      const senderName = gift.users?.display_name ?? "Someone";
      const recipientName = gift.recipient_contacts?.display_name ?? "you";
      const recipientEmail = gift.recipient_contacts?.email ?? null;
      const recipientPhone = gift.recipient_contacts?.phone
        ? toE164(gift.recipient_contacts.phone)
        : null;
      const claimUrl = `${CLAIM_BASE_URL}${gift.claim_token}`;

      // Channel preference: SMS when a valid phone exists and Twilio is
      // configured; otherwise (or on SMS failure) fall back to email.
      let notified = false;
      if (smsConfigured && recipientPhone) {
        try {
          await sendTwilioSms(recipientPhone, claimSms(senderName, claimUrl));
          results.smsSent.push(gift.id);
          notified = true;
        } catch (err) {
          console.error(`sms failed for gift ${gift.id}:`, err);
          results.smsErrors.push(`${gift.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!notified && recipientEmail) {
        const subject = `${senderName} sent you a DeLacroix gift`;
        const { text, html } = claimEmail(senderName, recipientName, gift.template_id, gift.cash_amount, claimUrl);
        try {
          await sendResendEmail(recipientEmail, subject, text, html);
          results.emailed.push(gift.id);
          notified = true;
        } catch (err) {
          console.error(`email failed for gift ${gift.id}:`, err);
          results.emailErrors.push(`${gift.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!notified) results.noChannel.push(gift.id);
    }

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-scheduled-gifts error:", err);
    return new Response(
      JSON.stringify({ error: String(err), partial: results }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
