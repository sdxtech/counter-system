create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('superadmin', 'staff');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  qty integer not null default 0 check (qty >= 0),
  is_active boolean not null default true,
  active_image_id uuid,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_images (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  bucket text not null default 'menu-images',
  storage_path text not null unique,
  public_url text,
  uploaded_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '10 hours'),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.menu_items
    add constraint menu_items_active_image_id_fkey
    foreign key (active_image_id) references public.menu_images(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff_or_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('staff', 'superadmin'), false)
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'superadmin', false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.take_menu_item(p_menu_item_id uuid)
returns public.menu_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_item public.menu_items;
  previous_qty integer;
begin
  if not public.is_staff_or_superadmin() then
    raise exception 'not authorized';
  end if;

  select qty into previous_qty
  from public.menu_items
  where id = p_menu_item_id
  for update;

  if previous_qty is null then
    raise exception 'menu item not found';
  end if;

  if previous_qty <= 0 then
    raise exception 'qty cannot go below zero';
  end if;

  update public.menu_items
  set qty = qty - 1,
      updated_by = auth.uid()
  where id = p_menu_item_id
  returning * into updated_item;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'take_menu_item',
    'menu_item',
    p_menu_item_id,
    jsonb_build_object('previous_qty', previous_qty, 'next_qty', updated_item.qty)
  );

  return updated_item;
end;
$$;

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_images enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles can read own profile" on public.profiles;
create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_superadmin());

drop policy if exists "superadmins can manage profiles" on public.profiles;
create policy "superadmins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "authenticated can read active menu" on public.menu_items;
create policy "authenticated can read active menu"
on public.menu_items for select
to authenticated
using (true);

drop policy if exists "staff can manage menu" on public.menu_items;
create policy "staff can manage menu"
on public.menu_items for all
to authenticated
using (public.is_staff_or_superadmin())
with check (public.is_staff_or_superadmin());

drop policy if exists "authenticated can read menu images" on public.menu_images;
create policy "authenticated can read menu images"
on public.menu_images for select
to authenticated
using (deleted_at is null);

drop policy if exists "staff can manage menu images" on public.menu_images;
create policy "staff can manage menu images"
on public.menu_images for all
to authenticated
using (public.is_staff_or_superadmin())
with check (public.is_staff_or_superadmin());

drop policy if exists "superadmins can read audit logs" on public.audit_logs;
create policy "superadmins can read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_superadmin());

drop policy if exists "staff can insert audit logs" on public.audit_logs;
create policy "staff can insert audit logs"
on public.audit_logs for insert
to authenticated
with check (public.is_staff_or_superadmin());

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "staff can read menu image objects" on storage.objects;
create policy "staff can read menu image objects"
on storage.objects for select
to authenticated
using (bucket_id = 'menu-images');

drop policy if exists "staff can upload menu image objects" on storage.objects;
create policy "staff can upload menu image objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'menu-images' and public.is_staff_or_superadmin());

drop policy if exists "staff can update menu image objects" on storage.objects;
create policy "staff can update menu image objects"
on storage.objects for update
to authenticated
using (bucket_id = 'menu-images' and public.is_staff_or_superadmin())
with check (bucket_id = 'menu-images' and public.is_staff_or_superadmin());

drop policy if exists "staff can delete menu image objects" on storage.objects;
create policy "staff can delete menu image objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'menu-images' and public.is_staff_or_superadmin());
