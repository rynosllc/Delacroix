import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Delivery worker, invoked by pg_cron every 15 minutes (and safe to invoke
// any time — every step is idempotent and guarded by status checks).
//
//   1. Expire: sent gifts past expires_at -> 'expired'
//   2. Deliver: scheduled gifts with scheduled_send_at <= now() -> 'sent',
//      sent_at = now(), expires_at = sent_at + 30 days, then email the
//      recipient their claim link via Resend.
//
// Email failures do NOT roll back delivery; they're reported in the
// response and the gift row keeps claim_token usable for manual resend.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DeLacroix <onboarding@resend.dev>";
const CLAIM_BASE_URL = Deno.env.get("CLAIM_BASE_URL") ??
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/claim-page?token=`;

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
  recipient_contacts: { display_name: string; email: string | null } | null;
  users: { display_name: string } | null;
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
  const results = { expired: 0, delivered: [] as string[], emailed: [] as string[], emailErrors: [] as string[] };

  try {
    // 1. Expire overdue sent gifts
    const { data: expired } = await supabase
      .from("gifts")
      .update({ status: "expired" })
      .eq("status", "sent")
      .lte("expires_at", nowIso)
      .select("id");
    results.expired = expired?.length ?? 0;

    // 2. Find due scheduled gifts
    const { data: due, error: dueError } = await supabase
      .from("gifts")
      .select(
        "id, claim_token, template_id, cash_amount, recipient_contacts(display_name, email), users!gifts_sender_id_fkey(display_name)",
      )
      .eq("status", "scheduled")
      .lte("scheduled_send_at", nowIso);
    if (dueError) throw dueError;

    for (const gift of (due ?? []) as unknown as DueGift[]) {
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

      const recipientEmail = gift.recipient_contacts?.email;
      if (!recipientEmail) continue; // phone-only contact: no email channel yet

      const senderName = gift.users?.display_name ?? "Someone";
      const recipientName = gift.recipient_contacts?.display_name ?? "you";
      const claimUrl = `${CLAIM_BASE_URL}${gift.claim_token}`;
      const subject = `${senderName} sent you a DeLacroix gift`;
      const { text, html } = claimEmail(senderName, recipientName, gift.template_id, gift.cash_amount, claimUrl);

      try {
        await sendResendEmail(recipientEmail, subject, text, html);
        results.emailed.push(gift.id);
      } catch (err) {
        console.error(`email failed for gift ${gift.id}:`, err);
        results.emailErrors.push(`${gift.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
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
