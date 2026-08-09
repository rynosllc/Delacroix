-- Baseline migration: users, recipient_contacts, templates.
--
-- These tables were created via the Supabase dashboard before migration
-- history existed. This file reconstructs their exact remote DDL (introspected
-- 2026-08-09 via pg_catalog) so a fresh `supabase db reset` reproduces the
-- schema. It is recorded as already-applied on the remote via
-- `supabase migration repair --status applied 20260809080000` and never runs
-- there.

-- ---------------------------------------------------------------- users

create table public.users (
  id uuid not null default gen_random_uuid(),
  email text not null,
  phone text,
  display_name text not null,
  subscription_tier text not null default 'free',
  ai_uses_this_month integer not null default 0,
  created_at timestamptz not null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_subscription_tier_check
    check (subscription_tier in ('free', 'paid'))
);

alter table public.users enable row level security;

create policy "Users can insert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- --------------------------------------------------- recipient_contacts

create table public.recipient_contacts (
  id uuid not null default gen_random_uuid(),
  owner_user_id uuid not null,
  display_name text not null,
  phone text,
  email text,
  birthday date,
  relation text,
  claimed_user_id uuid,
  stripe_recipient_id text,
  created_at timestamptz not null default now(),
  constraint recipient_contacts_pkey primary key (id),
  constraint recipient_contacts_owner_user_id_fkey
    foreign key (owner_user_id) references public.users (id) on delete cascade,
  constraint recipient_contacts_claimed_user_id_fkey
    foreign key (claimed_user_id) references public.users (id) on delete set null,
  constraint phone_or_email_required
    check (phone is not null or email is not null)
);

create index recipient_contacts_owner_user_id_idx
  on public.recipient_contacts (owner_user_id);
create index recipient_contacts_email_idx
  on public.recipient_contacts (email);
create index recipient_contacts_phone_idx
  on public.recipient_contacts (phone);

alter table public.recipient_contacts enable row level security;

create policy "Owners can manage their contacts"
  on public.recipient_contacts for all
  using (auth.uid() = owner_user_id);

-- ------------------------------------------------------------ templates

create table public.templates (
  id uuid not null default gen_random_uuid(),
  name text not null,
  ai_prompt_questions jsonb not null default '[]'::jsonb,
  design_asset_ref text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint templates_pkey primary key (id)
);

alter table public.templates enable row level security;

create policy "Templates are publicly readable"
  on public.templates for select
  using (true);

-- ------------------------------------------- auth trigger: mirror users

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
