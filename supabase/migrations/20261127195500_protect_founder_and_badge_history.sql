-- Protect the Founder account, constrain approval RPC transitions,
-- and preserve badge-award history from cascading catalog deletion.

create or replace function public.admin_update_member(
  p_member_id uuid,
  p_status text default null,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_target_status text;
  v_target_role text;
begin
  if not public.has_portal_permission('approve_members') then
    raise exception 'Você não tem permissão para administrar membros.';
  end if;

  if p_status is null and p_role is null then
    raise exception 'Nenhuma alteração foi informada.';
  end if;

  if p_status is not null and p_role is not null then
    raise exception 'Aprove/recuse o cadastro e altere o cargo em ações separadas.';
  end if;

  if p_status is not null then
    if p_status not in ('approved', 'rejected') then
      raise exception 'Esta ação só pode aprovar ou recusar cadastros pendentes.';
    end if;

    select status, role
      into v_target_status, v_target_role
    from public.profiles
    where id = p_member_id
    for update;

    if not found then
      raise exception 'Membro não encontrado.';
    end if;

    if v_target_role = 'founder' then
      raise exception 'A conta Founder não pode ser alterada por este fluxo.';
    end if;

    if v_target_status <> 'pending' then
      raise exception 'Somente cadastros pendentes podem ser aprovados ou recusados.';
    end if;

    update public.profiles
    set status = p_status,
        updated_at = now()
    where id = p_member_id;

    return;
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'founder'
      and status = 'approved'
  ) then
    raise exception 'Somente o Fundador pode alterar cargos administrativos.';
  end if;

  if p_role not in ('staff', 'admin', 'moderator', 'organizer', 'member') then
    raise exception 'Cargo inválido.';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Você não pode alterar seu próprio cargo.';
  end if;

  select status, role
    into v_target_status, v_target_role
  from public.profiles
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Membro não encontrado.';
  end if;

  if v_target_status <> 'approved' then
    raise exception 'Somente membros aprovados podem receber alteração de cargo.';
  end if;

  if v_target_role = 'founder' then
    raise exception 'O cargo de outro Founder não pode ser alterado por esta ação.';
  end if;

  if v_target_role is distinct from p_role then
    update public.profiles
    set role = p_role,
        updated_at = now()
    where id = p_member_id;

    insert into public.member_admin_audit(member_id, actor_id, action, old_value, new_value)
    values (p_member_id, auth.uid(), 'role_changed', v_target_role, p_role);
  end if;
end;
$function$;

revoke all on function public.admin_update_member(uuid, text, text) from public, anon;
grant execute on function public.admin_update_member(uuid, text, text) to authenticated;

create or replace function public.founder_update_member_role(
  p_member_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_old text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'founder'
  ) then
    raise exception 'Somente o Fundador pode alterar cargos administrativos.';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Não é possível alterar o próprio cargo de Fundador.';
  end if;

  if p_role not in ('staff', 'admin', 'moderator', 'organizer', 'member') then
    raise exception 'Cargo inválido. O cargo Fundador não pode ser atribuído por esta tela.';
  end if;

  select role
    into v_old
  from public.profiles
  where id = p_member_id and status = 'approved'
  for update;

  if not found then
    raise exception 'Membro aprovado não encontrado.';
  end if;

  if v_old = 'founder' then
    raise exception 'O cargo de outro Founder não pode ser alterado por esta ação.';
  end if;

  if v_old is distinct from p_role then
    update public.profiles
    set role = p_role, updated_at = now()
    where id = p_member_id;

    insert into public.member_admin_audit(member_id, actor_id, action, old_value, new_value)
    values (p_member_id, auth.uid(), 'role_changed', v_old, p_role);
  end if;
end;
$function$;

revoke all on function public.founder_update_member_role(uuid, text) from public, anon;
grant execute on function public.founder_update_member_role(uuid, text) to authenticated;

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

  if not exists (
    select 1 from public.profiles
    where id = p_member_id and status = 'approved'
  ) then
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

create or replace function public.admin_delete_badge(p_badge_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_badge_id uuid;
begin
  if not public.is_portal_admin() then
    raise exception 'Apenas a administração pode excluir badges.';
  end if;

  select id into v_badge_id
  from public.badges
  where id = p_badge_id
  for update;

  if not found then
    raise exception 'Badge não encontrada.';
  end if;

  if exists (
    select 1 from public.member_badges
    where badge_id = p_badge_id
  ) then
    raise exception 'Esta badge já foi conquistada. Retire as concessões antes de excluí-la para preservar o histórico dos membros.';
  end if;

  delete from public.badges where id = p_badge_id;
end;
$function$;

revoke all on function public.admin_delete_badge(uuid) from public, anon;
grant execute on function public.admin_delete_badge(uuid) to authenticated;
