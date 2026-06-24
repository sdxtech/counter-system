create table if not exists public.sites (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  add column if not exists site_id text;

alter table public.profiles
  drop constraint if exists profiles_site_id_fkey;

alter table public.profiles
  alter column site_id type text using site_id::text;

do $$
begin
  alter table public.profiles
    add constraint profiles_site_id_fkey
    foreign key (site_id) references public.sites(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

update public.profiles as profile
set role = (auth_user.raw_user_meta_data->>'role')::public.app_role
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.raw_user_meta_data->>'role' in ('staff', 'superadmin');

update public.profiles as profile
set site_id = site.id
from auth.users as auth_user
join public.sites as site
  on site.id::text = auth_user.raw_user_meta_data->>'siteId'
where profile.id = auth_user.id
  and profile.site_id is null;

alter table public.menu_items
  add column if not exists site_id text;

alter table public.menu_items
  drop constraint if exists menu_items_site_id_fkey;

alter table public.menu_items
  alter column site_id type text using site_id::text;

do $$
begin
  alter table public.menu_items
    add constraint menu_items_site_id_fkey
    foreign key (site_id) references public.sites(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

update public.menu_items as menu
set site_id = profile.site_id
from public.profiles as profile
where menu.site_id is null
  and menu.created_by = profile.id
  and profile.site_id is not null;

drop function if exists public.current_user_site_id() cascade;

create function public.current_user_site_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select site_id from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_menu_item(p_menu_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_items as menu
    where menu.id = p_menu_item_id
      and (
        public.is_superadmin()
        or (
          public.current_user_role() = 'staff'
          and public.current_user_site_id() is not null
          and menu.site_id = public.current_user_site_id()
        )
      )
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, site_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    case
      when new.raw_user_meta_data->>'role' in ('staff', 'superadmin')
        then (new.raw_user_meta_data->>'role')::public.app_role
      else 'staff'::public.app_role
    end,
    nullif(new.raw_user_meta_data->>'siteId', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.take_menu_item(p_menu_item_id uuid)
returns public.menu_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_item public.menu_items;
  previous_qty integer;
  item_site_id text;
begin
  if not public.is_staff_or_superadmin() then
    raise exception 'not authorized';
  end if;

  select qty, site_id into previous_qty, item_site_id
  from public.menu_items
  where id = p_menu_item_id
  for update;

  if previous_qty is null then
    raise exception 'menu item not found';
  end if;

  if public.current_user_role() = 'staff'
    and (
      public.current_user_site_id() is null
      or item_site_id is distinct from public.current_user_site_id()
    ) then
    raise exception 'not authorized for this site';
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
    jsonb_build_object(
      'previous_qty', previous_qty,
      'next_qty', updated_item.qty,
      'site_id', item_site_id
    )
  );

  return updated_item;
end;
$$;

drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

alter table public.sites enable row level security;

drop policy if exists "authenticated can read assigned site" on public.sites;
create policy "authenticated can read assigned site"
on public.sites for select
to authenticated
using (id = public.current_user_site_id() or public.is_superadmin());

drop policy if exists "superadmins can manage sites" on public.sites;
create policy "superadmins can manage sites"
on public.sites for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "authenticated can read active menu" on public.menu_items;
create policy "authenticated can read active menu"
on public.menu_items for select
to authenticated
using (
  public.is_superadmin()
  or (
    public.current_user_role() = 'staff'
    and public.current_user_site_id() is not null
    and site_id = public.current_user_site_id()
  )
);

drop policy if exists "staff can manage menu" on public.menu_items;
create policy "staff can manage menu"
on public.menu_items for all
to authenticated
using (
  public.is_superadmin()
  or (
    public.current_user_role() = 'staff'
    and public.current_user_site_id() is not null
    and site_id = public.current_user_site_id()
  )
)
with check (
  public.is_superadmin()
  or (
    public.current_user_role() = 'staff'
    and public.current_user_site_id() is not null
    and site_id = public.current_user_site_id()
  )
);

drop policy if exists "authenticated can read menu images" on public.menu_images;
create policy "authenticated can read menu images"
on public.menu_images for select
to authenticated
using (deleted_at is null and public.can_access_menu_item(menu_item_id));

drop policy if exists "staff can manage menu images" on public.menu_images;
create policy "staff can manage menu images"
on public.menu_images for all
to authenticated
using (public.can_access_menu_item(menu_item_id))
with check (public.can_access_menu_item(menu_item_id));

drop policy if exists "staff can read menu image objects" on storage.objects;
create policy "staff can read menu image objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'menu-images'
  and (
    public.is_superadmin()
    or (
      public.current_user_site_id() is not null
      and (storage.foldername(name))[1] = public.current_user_site_id()
    )
  )
);

drop policy if exists "staff can upload menu image objects" on storage.objects;
create policy "staff can upload menu image objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (
    public.is_superadmin()
    or (
      public.current_user_site_id() is not null
      and (storage.foldername(name))[1] = public.current_user_site_id()
    )
  )
);

drop policy if exists "staff can update menu image objects" on storage.objects;
create policy "staff can update menu image objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (
    public.is_superadmin()
    or (
      public.current_user_site_id() is not null
      and (storage.foldername(name))[1] = public.current_user_site_id()
    )
  )
)
with check (
  bucket_id = 'menu-images'
  and (
    public.is_superadmin()
    or (
      public.current_user_site_id() is not null
      and (storage.foldername(name))[1] = public.current_user_site_id()
    )
  )
);

drop policy if exists "staff can delete menu image objects" on storage.objects;
create policy "staff can delete menu image objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (
    public.is_superadmin()
    or (
      public.current_user_site_id() is not null
      and (storage.foldername(name))[1] = public.current_user_site_id()
    )
  )
);
