-- Serialize EXP/badge grants with member status changes and audit badge revocations.

create or replace function public.admin_grant_exp(
  p_member_id uuid,
  p_amount integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_member_status text;
begin
  if not public.has_portal_permission('grant_exp') then
    raise exception 'Você não tem permissão para conceder EXP.';
  end if;

  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception 'Informe uma quantidade entre 1 e 100.000 EXP.';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 180 then
    raise exception 'Informe o motivo da concessão.';
  end if;

  select status into v_member_status
  from public.profiles
  where id = p_member_id
  for update;

  if not found or v_member_status <> 'approved' then
    raise exception 'Membro aprovado não encontrado.';
  end if;

  insert into public.member_exp_transactions(member_id, amount, source_type, reason, created_by)
  values (p_member_id, p_amount, 'manual', trim(p_reason), auth.uid());
end;
$function$;

revoke all on function public.admin_grant_exp(uuid, integer, text) from public, anon;
grant execute on function public.admin_grant_exp(uuid, integer, text) to authenticated;

create or replace function public.admin_grant_badge(
  p_member_id uuid,
  p_badge_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_inserted integer;
  v_claimed integer;
  v_badge_id uuid;
  v_member_status text;
begin
  if not public.has_portal_permission('grant_badges') then
    raise exception 'Você não tem permissão para conceder badges.';
  end if;

  select id into v_badge_id
  from public.badges
  where id = p_badge_id
  for key share;

  if not found then
    raise exception 'Badge não encontrada.';
  end if;

  select status into v_member_status
  from public.profiles
  where id = p_member_id
  for update;

  if not found or v_member_status <> 'approved' then
    raise exception 'Somente membros aprovados podem receber badges.';
  end if;

  insert into public.member_badges(member_id, badge_id, granted_by)
  values (p_member_id, p_badge_id, auth.uid())
  on conflict (member_id, badge_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    insert into public.member_badge_exp_claims(member_id, badge_id)
    values (p_member_id, p_badge_id)
    on conflict (member_id, badge_id) do nothing;

    get diagnostics v_claimed = row_count;

    if v_claimed > 0 then
      insert into public.member_exp_transactions(member_id, amount, source_type, source_key, reason, created_by)
      select p_member_id, b.exp_reward, 'badge', b.id::text,
        'EXP por conquistar a badge: ' || b.name, auth.uid()
      from public.badges b
      where b.id = p_badge_id and b.exp_reward > 0
      on conflict (member_id, source_type, source_key)
        where source_type = 'badge' and source_key is not null do nothing;
    end if;
  end if;
end;
$function$;

revoke all on function public.admin_grant_badge(uuid, uuid) from public, anon;
grant execute on function public.admin_grant_badge(uuid, uuid) to authenticated;

create or replace function public.admin_revoke_badge(p_member_badge_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_member_id uuid;
  v_badge_name text;
begin
  if not public.has_portal_permission('grant_badges') then
    raise exception 'Você não tem permissão para retirar badges.';
  end if;

  select mb.member_id, b.name
    into v_member_id, v_badge_name
  from public.member_badges mb
  join public.badges b on b.id = mb.badge_id
  where mb.id = p_member_badge_id
  for update of mb;

  if not found then
    raise exception 'Conquista não encontrada.';
  end if;

  delete from public.member_badges where id = p_member_badge_id;

  insert into public.member_admin_audit(member_id, actor_id, action, old_value, new_value)
  values (v_member_id, auth.uid(), 'badge_revoked', v_badge_name, null);
end;
$function$;

revoke all on function public.admin_revoke_badge(uuid) from public, anon;
grant execute on function public.admin_revoke_badge(uuid) to authenticated;
