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
