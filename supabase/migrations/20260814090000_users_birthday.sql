-- Optional user birthday, used by the home screen's birthday moment.
-- Nullable and unset until a profile-edit flow collects it; the existing
-- "Users can update own row" policy already lets users set their own.

alter table public.users add column if not exists birthday date;
