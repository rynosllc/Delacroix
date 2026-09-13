-- Money phase: payment and payout state on gifts.
--
--   payment_status: none (no cash) -> pending (PaymentIntent created,
--     awaiting confirmation) -> paid (webhook confirmed) | failed | refunded
--   payout_status:  none -> pending (recipient onboarding started) -> paid
--     (transfer to recipient's Express account completed)
--
-- The delivery worker only delivers cash gifts whose payment_status is
-- 'paid', and auto-refunds paid gifts that end up declined or expired.

alter table public.gifts
  add column if not exists payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid', 'failed', 'refunded')),
  add column if not exists payout_status text not null default 'none'
    check (payout_status in ('none', 'pending', 'paid')),
  add column if not exists stripe_transfer_id text;
