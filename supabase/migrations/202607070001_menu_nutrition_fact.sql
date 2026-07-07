alter table public.menu_items
  add column if not exists nutrition_fact text not null default '';
