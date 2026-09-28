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
