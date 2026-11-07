-- Run once if public.dishes already exists and still allows anonymous access.
-- After this, the publishable key cannot read or add dishes until someone signs in.

drop policy if exists "Anyone can read dishes" on public.dishes;
drop policy if exists "Anyone can add a dish" on public.dishes;
drop policy if exists "Family can read dishes" on public.dishes;
drop policy if exists "Family can add a dish" on public.dishes;

create policy "Family can read dishes"
  on public.dishes
  for select
  to authenticated
  using (true);

create policy "Family can add a dish"
  on public.dishes
  for insert
  to authenticated
  with check (true);

grant select, insert on table public.dishes to authenticated;
revoke select, insert, update, delete on table public.dishes from anon;
