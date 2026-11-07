-- Run once so a signed-in family member can edit and delete dishes.
-- Anonymous visitors still cannot change the menu.

drop policy if exists "Family can update a dish" on public.dishes;
drop policy if exists "Family can delete a dish" on public.dishes;

create policy "Family can update a dish"
  on public.dishes
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Family can delete a dish"
  on public.dishes
  for delete
  to authenticated
  using (true);

grant update, delete on table public.dishes to authenticated;
