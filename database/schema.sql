create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('superadmin', 'staff');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.sites (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'staff',
  site_id text references public.sites(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  nutrition_fact text not null default '',
  qty integer not null default 0 check (qty >= 0),
  site_id text references public.sites(id) on delete cascade,
  is_active boolean not null default true,
  active_image_id uuid,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items
  add column if not exists site_id text;

alter table public.menu_items
  add column if not exists nutrition_fact text not null default '';

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

create table if not exists public.menu_images (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  bucket text not null default 'menu-images',
  storage_path text not null unique,
  public_url text,
  uploaded_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '12 hours'),
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

drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at
before update on public.sites
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

alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_images enable row level security;
alter table public.audit_logs enable row level security;

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


-- Site-specific numpad Take mappings.
begin;

create unique index if not exists menu_items_site_id_id_key
  on public.menu_items(site_id, id);

create table if not exists public.menu_key_bindings (
  site_id text not null references public.sites(id) on delete cascade,
  menu_item_id uuid not null,
  numpad_digit smallint not null check (numpad_digit between 0 and 9),
  primary key (site_id, menu_item_id),
  unique (site_id, numpad_digit),
  foreign key (site_id, menu_item_id)
    references public.menu_items(site_id, id) on delete cascade
);

alter table public.menu_key_bindings enable row level security;
revoke all on public.menu_key_bindings from anon, authenticated;
grant select on public.menu_key_bindings to authenticated;

drop policy if exists "read assigned site key map" on public.menu_key_bindings;
create policy "read assigned site key map"
  on public.menu_key_bindings for select to authenticated
  using (public.is_superadmin() or site_id = public.current_user_site_id());

create or replace function public.save_site_menu_keymap(p_site_id text, p_bindings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  binding_count integer;
begin
  if auth.uid() is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_bindings is null or jsonb_typeof(p_bindings) <> 'array' then
    raise exception 'invalid bindings' using errcode = '22023';
  end if;
  binding_count := jsonb_array_length(p_bindings);
  if binding_count > 6 then
    raise exception 'too many bindings' using errcode = '22023';
  end if;

  -- Serialize saves for a site; the delete and insert are one transaction.
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found' using errcode = '22023';
  end if;

  if (
    select count(*) from jsonb_to_recordset(p_bindings)
      as binding(menu_item_id uuid, numpad_digit integer)
    join public.menu_items as menu on menu.id = binding.menu_item_id
      and menu.site_id = p_site_id and menu.is_active
    where binding.numpad_digit between 0 and 9
  ) <> binding_count then
    raise exception 'invalid or inactive menu binding' using errcode = '22023';
  end if;

  delete from public.menu_key_bindings where site_id = p_site_id;
  insert into public.menu_key_bindings(site_id, menu_item_id, numpad_digit)
    select p_site_id, binding.menu_item_id, binding.numpad_digit
    from jsonb_to_recordset(p_bindings)
      as binding(menu_item_id uuid, numpad_digit integer);

  insert into public.audit_logs(actor_id, action, entity_type, metadata)
    values (auth.uid(), 'save_site_menu_keymap', 'site_keymap',
      jsonb_build_object('site_id', p_site_id, 'bindings', p_bindings));
end;
$$;

revoke all on function public.save_site_menu_keymap(text, jsonb) from public, anon;
grant execute on function public.save_site_menu_keymap(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Per-site dashboard backgrounds (202610050001_site_backgrounds.sql).
begin;
alter table public.sites add column if not exists background_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-backgrounds', 'site-backgrounds', true, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
notify pgrst, 'reload schema';
commit;


-- Persistent numpad mappings for menu positions 1 through 6.
begin;

-- This upgrade also works if the previous, menu-ID key-map migration was skipped.
do $$
begin
  if to_regclass('public.site_menu_slot_keys') is null then
    create table public.site_menu_slot_keys (
      site_id text not null references public.sites(id) on delete cascade,
      menu_position smallint not null check (menu_position between 1 and 6),
      numpad_digit smallint not null check (numpad_digit between 0 and 9),
      primary key (site_id, menu_position),
      unique (site_id, numpad_digit)
    );

    -- Convert old assignments once, using the same deterministic order as staff.
    -- Re-running this migration never restores a deliberately cleared key map.
    if to_regclass('public.menu_key_bindings') is not null then
      execute $copy$
        insert into public.site_menu_slot_keys(site_id, menu_position, numpad_digit)
        select menu.site_id, menu.menu_position::smallint, binding.numpad_digit
        from (
          select id, site_id,
            row_number() over (partition by site_id order by created_at desc, id desc) as menu_position
          from public.menu_items where is_active
        ) as menu
        join public.menu_key_bindings as binding
          on binding.site_id = menu.site_id and binding.menu_item_id = menu.id
        where menu.menu_position between 1 and 6
      $copy$;
    end if;
  end if;
end;
$$;

alter table public.site_menu_slot_keys enable row level security;
revoke all on public.site_menu_slot_keys from anon, authenticated;
grant select on public.site_menu_slot_keys to authenticated;

drop policy if exists "read assigned site slot key map" on public.site_menu_slot_keys;
create policy "read assigned site slot key map"
  on public.site_menu_slot_keys for select to authenticated
  using (public.is_superadmin() or site_id = public.current_user_site_id());

create or replace function public.save_site_menu_slot_keymap(p_site_id text, p_bindings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  binding_count integer;
begin
  if auth.uid() is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_bindings is null or jsonb_typeof(p_bindings) <> 'array' then
    raise exception 'invalid bindings' using errcode = '22023';
  end if;
  binding_count := jsonb_array_length(p_bindings);
  if binding_count > 6 then
    raise exception 'too many bindings' using errcode = '22023';
  end if;

  -- A whole-site save is atomic, including swapping keys or clearing all slots.
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found' using errcode = '22023';
  end if;

  if (
    select count(*) from jsonb_to_recordset(p_bindings)
      as binding(menu_position integer, numpad_digit integer)
    where binding.menu_position between 1 and 6 and binding.numpad_digit between 0 and 9
  ) <> binding_count then
    raise exception 'invalid menu position or numpad digit' using errcode = '22023';
  end if;

  delete from public.site_menu_slot_keys where site_id = p_site_id;
  insert into public.site_menu_slot_keys(site_id, menu_position, numpad_digit)
    select p_site_id, binding.menu_position, binding.numpad_digit
    from jsonb_to_recordset(p_bindings)
      as binding(menu_position integer, numpad_digit integer);

  insert into public.audit_logs(actor_id, action, entity_type, metadata)
    values (auth.uid(), 'save_site_menu_slot_keymap', 'site_keymap',
      jsonb_build_object('site_id', p_site_id, 'bindings', p_bindings));
end;
$$;

revoke all on function public.save_site_menu_slot_keymap(text, jsonb) from public, anon;
grant execute on function public.save_site_menu_slot_keymap(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
