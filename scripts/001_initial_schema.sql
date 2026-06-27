-- Delacroix Phase 1 — Initial Schema
-- Run against: https://isiibpadgckrycclkzkm.supabase.co
-- Order: users → templates → recipient_contacts → gifts

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- Sender accounts only. Recipients do not get a row here
-- unless they opt into a full account post-claim.
-- ============================================================
create table public.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,
  phone                text,
  display_name         text not null,
  subscription_tier    text not null default 'free' check (subscription_tier in ('free', 'paid')),
  ai_uses_this_month   int  not null default 0,
  created_at           timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- ============================================================
-- TEMPLATES
-- Preset occasion + design bundles. Seeded below.
-- ============================================================
create table public.templates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  ai_prompt_questions jsonb not null default '[]',
  design_asset_ref    text not null,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table public.templates enable row level security;

-- Templates are public read — any authenticated user can browse them
create policy "Templates are publicly readable"
  on public.templates for select
  using (true);

-- Seed Phase 1 templates
insert into public.templates (name, ai_prompt_questions, design_asset_ref) values
(
  'Birthday',
  '[
    {"id": "relationship", "question": "What is your relationship to this person?", "placeholder": "e.g. best friend, sister, coworker"},
    {"id": "memory",       "question": "Share a favorite memory or inside joke with them.", "placeholder": "Optional — makes it personal"},
    {"id": "wish",         "question": "What do you most want them to feel on their birthday?", "placeholder": "e.g. celebrated, loved, surprised"}
  ]',
  'signature'
),
(
  'Anniversary',
  '[
    {"id": "milestone",    "question": "What anniversary is this?", "placeholder": "e.g. first year, ten years"},
    {"id": "memory",       "question": "What moment stands out most from your time together?", "placeholder": "A trip, a first, a quiet night"},
    {"id": "looking_forward", "question": "What are you most looking forward to next?", "placeholder": "Optional"}
  ]',
  'signature'
),
(
  'Thank You',
  '[
    {"id": "what_for",     "question": "What are you thanking them for?", "placeholder": "Be specific — it lands harder"},
    {"id": "impact",       "question": "How did it make you feel or how did it help?", "placeholder": "Optional but powerful"}
  ]',
  'signature'
),
(
  'Just Because',
  '[
    {"id": "vibe",         "question": "What feeling do you want to send them today?", "placeholder": "e.g. you matter, thinking of you, proud of you"},
    {"id": "reason",       "question": "Anything specific that prompted this?", "placeholder": "Optional — totally fine if there is no reason"}
  ]',
  'signature'
);

-- ============================================================
-- RECIPIENT CONTACTS
-- Each sender's address book entry is its own row.
-- claimed_user_id and stripe_recipient_id are resolved
-- by phone/email match, not by row id.
-- ============================================================
create table public.recipient_contacts (
  id                   uuid primary key default gen_random_uuid(),
  owner_user_id        uuid not null references public.users(id) on delete cascade,
  display_name         text not null,
  phone                text,
  email                text,
  birthday             date,
  relation             text,
  claimed_user_id      uuid references public.users(id) on delete set null,
  stripe_recipient_id  text,
  created_at           timestamptz not null default now(),
  constraint phone_or_email_required check (phone is not null or email is not null)
);

alter table public.recipient_contacts enable row level security;

create policy "Owners can manage their contacts"
  on public.recipient_contacts for all
  using (auth.uid() = owner_user_id);

create index on public.recipient_contacts (owner_user_id);
create index on public.recipient_contacts (phone);
create index on public.recipient_contacts (email);

-- ============================================================
-- GIFTS
-- Core transactional record.
-- Payment is charged at send time, not at claim time.
-- ============================================================
create table public.gifts (
  id                        uuid primary key default gen_random_uuid(),
  sender_id                 uuid not null references public.users(id),
  recipient_contact_id      uuid not null references public.recipient_contacts(id),
  template_id               uuid not null references public.templates(id),
  message_text              text not null,
  message_source            text not null check (message_source in ('manual', 'ai_generated', 'ai_polished')),
  cash_amount               numeric check (cash_amount is null or cash_amount >= 5),
  fee_amount                numeric,
  stripe_payment_intent_id  text,
  status                    text not null default 'scheduled'
                              check (status in ('scheduled', 'sent', 'claimed', 'declined', 'expired')),
  scheduled_send_at         timestamptz not null,
  sent_at                   timestamptz,
  claimed_at                timestamptz,
  expires_at                timestamptz,
  thank_you_message         text,
  created_at                timestamptz not null default now()
);

alter table public.gifts enable row level security;

create policy "Senders can manage their own gifts"
  on public.gifts for all
  using (auth.uid() = sender_id);

-- Edge functions (service role) need to read gifts for cron jobs and claim flow —
-- those bypass RLS via service role key, so no additional policy needed here.

create index on public.gifts (sender_id);
create index on public.gifts (recipient_contact_id);
create index on public.gifts (status);
create index on public.gifts (scheduled_send_at) where status = 'scheduled';
create index on public.gifts (expires_at) where status = 'sent';
