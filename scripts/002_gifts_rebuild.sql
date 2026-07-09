-- Delacroix — Phase A: rebuild gifts table to gifting-backend spec
-- Run against: https://isiibpadgckrycclkzkm.supabase.co
-- Safe: gifts table is empty (verified before writing this migration).

-- ============================================================
-- Drop old gifts table (uuid template FK version, no claim_token)
-- ============================================================
drop table if exists public.gifts;

-- ============================================================
-- GIFTS — core transactional record
-- template_id is a text occasion slug for now
-- ('birthday' | 'anniversary' | 'thank_you' | 'just_because');
-- the templates table joins back in later.
-- claim_token is the unguessable token in the recipient's link.
-- ============================================================
create table public.gifts (
  id                        uuid primary key default gen_random_uuid(),
  sender_id                 uuid not null references public.users(id),
  recipient_contact_id      uuid not null references public.recipient_contacts(id),
  template_id               text not null,
  message_text              text not null,
  message_source            text not null default 'manual'
                              check (message_source in ('manual', 'ai_generated', 'ai_polished')),
  cash_amount               numeric,
  fee_amount                numeric,
  stripe_payment_intent_id  text,
  status                    text not null default 'scheduled'
                              check (status in ('scheduled', 'sent', 'claimed', 'declined', 'expired')),
  scheduled_send_at         timestamptz not null default now(),
  sent_at                   timestamptz,
  claimed_at                timestamptz,
  expires_at                timestamptz,
  thank_you_message         text,
  claim_token               uuid not null unique default gen_random_uuid(),
  created_at                timestamptz not null default now()
);

alter table public.gifts enable row level security;

-- ============================================================
-- RLS — sender-side only.
-- The recipient claim page never touches this table directly;
-- it goes through an edge function using the service role.
-- ============================================================
create policy "Senders can insert own gifts"
  on public.gifts for insert
  with check (auth.uid() = sender_id);

create policy "Senders can read own gifts"
  on public.gifts for select
  using (auth.uid() = sender_id);

create policy "Senders can update own scheduled gifts"
  on public.gifts for update
  using (auth.uid() = sender_id and status = 'scheduled')
  with check (auth.uid() = sender_id);

-- ============================================================
-- Indexes
-- ============================================================
create index on public.gifts (sender_id);
create index on public.gifts (recipient_contact_id);
create index on public.gifts (status);
create index on public.gifts (scheduled_send_at) where status = 'scheduled';
create index on public.gifts (expires_at) where status = 'sent';
