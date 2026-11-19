-- HERÓIS DO TEMPO — revogação de acesso pelo Fundador, preservando histórico
-- Execute uma única vez no SQL Editor do Supabase após as migrations anteriores.

alter table public.member_admin_audit
  drop constraint if exists member_admin_audit_action_check;
alter table public.member_admin_audit
  add constraint member_admin_audit_action_check
  check (action in ('role_changed','rank_changed','access_revoked'));

create or replace function public.founder_revoke_member_access(p_member_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_old_status text; v_target_role text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode revogar o acesso de membros.';
  end if;
  if p_member_id=auth.uid() then raise exception 'Você não pode revogar seu próprio acesso.'; end if;
  select status,role into v_old_status,v_target_role from public.profiles where id=p_member_id for update;
  if not found then raise exception 'Membro não encontrado.'; end if;
  if v_target_role='founder' then raise exception 'O acesso de outro Fundador não pode ser revogado por esta ação.'; end if;
  if v_old_status='suspended' then raise exception 'Este acesso já está revogado.'; end if;
  if v_old_status<>'approved' then raise exception 'Somente membros aprovados podem ter o acesso revogado por esta ação.'; end if;
  update public.profiles set status='suspended',updated_at=now() where id=p_member_id;
  insert into public.member_admin_audit(member_id,actor_id,action,old_value,new_value)
  values(p_member_id,auth.uid(),'access_revoked',v_old_status,'suspended');
end;
$$;
revoke all on function public.founder_revoke_member_access(uuid) from public,anon;
grant execute on function public.founder_revoke_member_access(uuid) to authenticated;
