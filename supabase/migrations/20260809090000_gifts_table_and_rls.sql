-- Phase A: gifts table + RLS.
--
-- NOTE: the linked project already contains a gifts table (created via the
-- dashboard, outside migration history), so this migration is idempotent:
-- it creates the table only if missing, then normalizes constraints and
-- policies to the spec below regardless of prior state. No data is touched.

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id),
  recipient_contact_id uuid not null references public.recipient_contacts (id),
  template_id text not null,
  message_text text not null,
  message_source text not null default 'manual',
  cash_amount numeric,
  fee_amount numeric,
  stripe_payment_intent_id text,
  status text not null default 'scheduled',
  scheduled_send_at timestamptz not null default now(),
  sent_at timestamptz,
  claimed_at timestamptz,
  expires_at timestamptz,
  thank_you_message text,
  claim_token uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Normalize CHECK constraints: drop whatever exists, re-add the spec'd ones
-- under stable names. (contype 'c' excludes not-null constraints on PG17.)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.gifts'::regclass and contype = 'c'
  loop
    execute format('alter table public.gifts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.gifts
  add constraint gifts_message_source_check
    check (message_source in ('manual', 'ai_generated', 'ai_polished')),
  add constraint gifts_status_check
    check (status in ('scheduled', 'sent', 'claimed', 'declined', 'expired'));

-- Ensure the unique constraint on claim_token exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.conrelid = 'public.gifts'::regclass
      and c.contype = 'u'
      and a.attname = 'claim_token'
  ) then
    alter table public.gifts
      add constraint gifts_claim_token_key unique (claim_token);
  end if;
end $$;

-- Ensure both foreign keys exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.conrelid = 'public.gifts'::regclass
      and c.contype = 'f'
      and a.attname = 'sender_id'
  ) then
    alter table public.gifts
      add constraint gifts_sender_id_fkey
        foreign key (sender_id) references public.users (id);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.conrelid = 'public.gifts'::regclass
      and c.contype = 'f'
      and a.attname = 'recipient_contact_id'
  ) then
    alter table public.gifts
      add constraint gifts_recipient_contact_id_fkey
        foreign key (recipient_contact_id) references public.recipient_contacts (id);
  end if;
end $$;

-- Row level security: senders only. No public/anon access — the recipient
-- claim page will go through an edge function using the service role.
alter table public.gifts enable row level security;

revoke all on table public.gifts from anon;

-- Replace any pre-existing policies (names unknown, created via dashboard)
-- with exactly the three below.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'gifts'
  loop
    execute format('drop policy %I on public.gifts', p.policyname);
  end loop;
end $$;

create policy "Senders can insert their own gifts"
  on public.gifts
  for insert to authenticated
  with check (sender_id = auth.uid());

create policy "Senders can view their own gifts"
  on public.gifts
  for select to authenticated
  using (sender_id = auth.uid());

create policy "Senders can update their own scheduled gifts"
  on public.gifts
  for update to authenticated
  using (sender_id = auth.uid() and status = 'scheduled')
  with check (sender_id = auth.uid());
