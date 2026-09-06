-- Gifts tab overhaul support:
--  1. gifts.claimed_by — set when a signed-in user claims a gift, so their
--     RECEIVED tab can show it. (Denormalized onto gifts because RLS policy
--     subqueries against recipient_contacts would be filtered by that
--     table's owner-only policy for the recipient.)
--  2. Recipients can read gifts they claimed.
--  3. Senders can delete (cancel) a gift while it is still scheduled.

alter table public.gifts
  add column if not exists claimed_by uuid references public.users (id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gifts'
      and policyname = 'Recipients can view gifts they claimed'
  ) then
    create policy "Recipients can view gifts they claimed"
      on public.gifts
      for select to authenticated
      using (claimed_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gifts'
      and policyname = 'Senders can cancel their scheduled gifts'
  ) then
    create policy "Senders can cancel their scheduled gifts"
      on public.gifts
      for delete to authenticated
      using (sender_id = auth.uid() and status = 'scheduled');
  end if;
end $$;
