import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public claim experience, reached from the delivery email.
// Deployed with --no-verify-jwt: recipients have no account; the claim
// token is the capability. Only whitelisted display fields ever leave.
//
//   GET  ?token=<uuid>                      -> HTML page for gift status
//   POST { token, action, thank_you_message?, }  -> JSON
//        action: "claim" | "decline" | "thank_you"
//        An optional user Bearer JWT (in-app claim) links claimed_user_id.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OCCASION_PHRASES: Record<string, string> = {
  birthday: "a birthday moment",
  anniversary: "an anniversary moment",
  thank_you: "a thank-you moment",
  just_because: "a just-because moment",
};

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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function fetchGift(token: string) {
  const { data, error } = await supabase
    .from("gifts")
    .select(
      "id, template_id, message_text, cash_amount, status, thank_you_message, users!gifts_sender_id_fkey(display_name)",
    )
    .eq("claim_token", token)
    .single();
  if (error || !data) return null;
  return data;
}

// ---------------------------------------------------------------- HTML

function page(title: string, inner: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#1C2B1E; font-family:Georgia,'Times New Roman',serif; padding:24px; box-sizing:border-box; }
  .card { width:100%; max-width:440px; text-align:center; }
  .wordmark { color:#C9A84C; font-size:24px; letter-spacing:3px; margin-bottom:26px; }
  h1 { color:#F5ECD7; font-size:25px; font-weight:normal; line-height:1.3; margin:0 0 6px; }
  .occasion { color:rgba(212,175,55,.7); font-size:14px; font-style:italic; margin-bottom:26px; }
  .envelope { width:250px; height:170px; margin:0 auto 8px; background:rgba(212,175,55,.08);
              border:1.5px solid rgba(212,175,55,.5); border-radius:16px; cursor:pointer;
              display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; }
  .envelope span { color:#C9A84C; font-size:13px; letter-spacing:1px; }
  .envelope .icon { font-size:52px; }
  .message-card { background:rgba(36,51,39,.9); border:1px solid rgba(212,175,55,.45);
                  border-radius:16px; padding:28px; display:none; }
  .divider { width:40px; height:1px; background:rgba(212,175,55,.5); margin:0 auto 18px; }
  .message { color:#F5ECD7; font-size:17px; line-height:1.6; margin-bottom:14px; white-space:pre-wrap; }
  .from { color:#C9A84C; font-size:14px; font-style:italic; margin-bottom:4px; }
  .cash { color:#F5ECD7; font-size:15px; margin:16px 0 4px; }
  .cash b { color:#C9A84C; font-size:17px; }
  .btn { display:inline-block; width:100%; max-width:300px; box-sizing:border-box; background:#D4AF37;
         color:#1B3A2B; border:none; border-radius:12px; padding:15px 0; font-size:15px; font-weight:bold;
         letter-spacing:1px; cursor:pointer; font-family:Arial,sans-serif; margin-top:16px; }
  .btn.secondary { background:none; border:1.5px solid rgba(212,175,55,.5); color:#C9A84C; font-weight:normal; }
  .subtle { color:#9A8C7A; font-size:13px; line-height:1.5; }
  textarea { width:100%; box-sizing:border-box; background:rgba(28,43,30,.7); border:1px solid #3A4F3D;
             border-radius:10px; color:#F5ECD7; font-family:inherit; font-size:15px; padding:12px;
             min-height:90px; resize:vertical; margin-top:14px; }
  .footer { color:rgba(212,175,55,.45); font-size:12px; font-style:italic; letter-spacing:1px; margin-top:30px; }
  .hidden { display:none !important; }
</style>
</head>
<body>
  <div class="card">
    <div class="wordmark">DeLacroix</div>
    ${inner}
    <div class="footer">it's from the heart</div>
  </div>
</body>
</html>`;
  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function simplePage(title: string, headline: string, sub: string): Response {
  return page(title, `<h1>${esc(headline)}</h1><p class="subtle">${esc(sub)}</p>`);
}

function revealPage(token: string, senderName: string, occasion: string, message: string, cashAmount: number | null, alreadyClaimed: boolean, thankYou: string | null): Response {
  const phrase = OCCASION_PHRASES[occasion] ?? "a special moment";
  const cashHtml = cashAmount
    ? `<p class="cash">They also sent you <b>$${Number(cashAmount).toFixed(2)}</b></p>`
    : "";

  // Three progressive sections: envelope -> message (+claim) -> thank-you
  const inner = `
<h1>${esc(senderName)} sent you a gift</h1>
<div class="occasion">for ${esc(phrase)}</div>

<div class="envelope" id="envelope" ${alreadyClaimed ? 'style="display:none"' : ""}>
  <div class="icon">&#9993;&#65039;</div>
  <span>Tap to open</span>
</div>

<div class="message-card" id="messageCard" ${alreadyClaimed ? 'style="display:block"' : ""}>
  <div class="divider"></div>
  <div class="message">${esc(message)}</div>
  <div class="from">&mdash; ${esc(senderName)}</div>
  ${cashHtml}

  <div id="claimBlock" class="${alreadyClaimed ? "hidden" : ""}">
    <button class="btn" id="claimBtn">Claim your gift</button>
    <button class="btn secondary" id="declineBtn">Politely decline</button>
  </div>

  <div id="thanksBlock" class="${alreadyClaimed && !thankYou ? "" : "hidden"}">
    <p class="subtle" style="margin-top:18px">Send ${esc(senderName)} a thank-you?</p>
    <textarea id="thanksText" placeholder="Write a short thank-you&hellip;"></textarea>
    <button class="btn" id="thanksBtn">Send thank-you</button>
  </div>

  <div id="doneBlock" class="${alreadyClaimed && thankYou ? "" : "hidden"}">
    <p class="subtle" style="margin-top:18px">Your thank-you is on its way to ${esc(senderName)}. &#10003;</p>
  </div>
</div>

<script>
  var TOKEN = ${JSON.stringify(token)};
  function post(action, extra) {
    return fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ token: TOKEN, action: action }, extra || {})),
    }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || "failed"); return b; }); });
  }
  var env = document.getElementById("envelope");
  if (env) env.addEventListener("click", function () {
    env.style.display = "none";
    document.getElementById("messageCard").style.display = "block";
  });
  var claimBtn = document.getElementById("claimBtn");
  if (claimBtn) claimBtn.addEventListener("click", function () {
    claimBtn.disabled = true;
    post("claim").then(function () {
      document.getElementById("claimBlock").classList.add("hidden");
      document.getElementById("thanksBlock").classList.remove("hidden");
    }).catch(function (e) { claimBtn.disabled = false; alert(e.message); });
  });
  var declineBtn = document.getElementById("declineBtn");
  if (declineBtn) declineBtn.addEventListener("click", function () {
    if (!confirm("Politely decline this gift?")) return;
    post("decline").then(function () { window.location.reload(); })
      .catch(function (e) { alert(e.message); });
  });
  var thanksBtn = document.getElementById("thanksBtn");
  if (thanksBtn) thanksBtn.addEventListener("click", function () {
    var msg = document.getElementById("thanksText").value.trim();
    if (!msg) { alert("Write a short note first."); return; }
    thanksBtn.disabled = true;
    post("thank_you", { thank_you_message: msg }).then(function () {
      document.getElementById("thanksBlock").classList.add("hidden");
      document.getElementById("doneBlock").classList.remove("hidden");
    }).catch(function (e) { thanksBtn.disabled = false; alert(e.message); });
  });
</script>`;
  return page(`A gift from ${senderName}`, inner);
}

// ---------------------------------------------------------------- actions

async function resolveAuthedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  return data?.user?.id ?? null;
}

async function handleAction(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const token = body?.token;
  const action = body?.action;
  if (!token || typeof token !== "string" || !UUID_RE.test(token)) {
    return json({ error: "Invalid token" }, 400);
  }

  const gift = await fetchGift(token);
  if (!gift) return json({ error: "Gift not found" }, 404);

  if (action === "claim") {
    const { data: updated } = await supabase
      .from("gifts")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("claim_token", token)
      .eq("status", "sent")
      .select("id, recipient_contact_id");
    if (!updated || updated.length === 0) {
      return json({ error: "This gift can no longer be claimed" }, 409);
    }
    // In-app claims carry the recipient's user JWT — link their account so
    // the gift shows in their RECEIVED tab and the contact links up.
    const userId = await resolveAuthedUserId(req);
    if (userId) {
      await supabase
        .from("gifts")
        .update({ claimed_by: userId })
        .eq("claim_token", token);
      await supabase
        .from("recipient_contacts")
        .update({ claimed_user_id: userId })
        .eq("id", updated[0].recipient_contact_id)
        .is("claimed_user_id", null);
    }
    return json({ ok: true, status: "claimed" });
  }

  if (action === "decline") {
    const { data: updated } = await supabase
      .from("gifts")
      .update({ status: "declined" })
      .eq("claim_token", token)
      .eq("status", "sent")
      .select("id");
    if (!updated || updated.length === 0) {
      return json({ error: "This gift can no longer be declined" }, 409);
    }
    return json({ ok: true, status: "declined" });
  }

  if (action === "thank_you") {
    const msg = body?.thank_you_message;
    if (!msg || typeof msg !== "string" || msg.trim().length === 0 || msg.length > 1000) {
      return json({ error: "Invalid thank-you message" }, 400);
    }
    const { data: updated } = await supabase
      .from("gifts")
      .update({ thank_you_message: msg.trim() })
      .eq("claim_token", token)
      .eq("status", "claimed")
      .is("thank_you_message", null)
      .select("id");
    if (!updated || updated.length === 0) {
      return json({ error: "A thank-you was already sent for this gift" }, 409);
    }
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
}

// ---------------------------------------------------------------- serve

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "POST") return await handleAction(req);

    const token = new URL(req.url).searchParams.get("token") ?? "";
    if (!UUID_RE.test(token)) {
      return simplePage("DeLacroix", "This gift link isn't valid", "The link may be incorrect or the gift may no longer be available.");
    }

    const gift = await fetchGift(token);
    if (!gift) {
      return simplePage("DeLacroix", "This gift link isn't valid", "The link may be incorrect or the gift may no longer be available.");
    }

    const sender = (gift.users as unknown as { display_name: string } | null)?.display_name ?? "Someone";

    switch (gift.status) {
      case "scheduled":
        return simplePage("DeLacroix", "Your gift is on its way", "It hasn't been delivered quite yet — check back soon.");
      case "declined":
        return simplePage("DeLacroix", "This gift was declined", "No further action is needed.");
      case "expired":
        return simplePage("DeLacroix", "This gift has expired", "Gifts can be claimed for 30 days after delivery. Ask your sender to send a new one.");
      case "sent":
        return revealPage(token, sender, gift.template_id, gift.message_text, gift.cash_amount, false, null);
      case "claimed":
        return revealPage(token, sender, gift.template_id, gift.message_text, gift.cash_amount, true, gift.thank_you_message);
      default:
        return simplePage("DeLacroix", "This gift link isn't valid", "The link may be incorrect or the gift may no longer be available.");
    }
  } catch (err) {
    console.error("claim-page error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
