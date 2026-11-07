-- Run once in the Supabase SQL Editor for a new project.
-- Reading and adding dishes requires the shared family sign-in.
-- Visitors cannot update or delete rows. Remove a mistake from the Table Editor.
-- If this project already has the old open policies, run supabase/enable-auth.sql instead.

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  dish text not null,
  category text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint dishes_guest_name_len check (char_length(btrim(guest_name)) between 1 and 80),
  constraint dishes_dish_len check (char_length(btrim(dish)) between 1 and 120),
  constraint dishes_notes_len check (char_length(notes) <= 280),
  constraint dishes_category_ok check (
    category in (
      'appetizer',
      'main',
      'side',
      'bread',
      'dessert',
      'drinks',
      'supplies',
      'other'
    )
  )
);

alter table public.dishes enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select, insert on table public.dishes to authenticated;
revoke select, insert, update, delete on table public.dishes from anon;
