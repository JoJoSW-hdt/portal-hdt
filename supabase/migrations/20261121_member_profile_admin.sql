-- HERÓIS DO TEMPO — administração de cargos e patentes pelo perfil do membro
-- Execute depois das migrations 20261119 e 20261120.

create table if not exists public.member_admin_audit (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('role_changed','rank_changed')),
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

alter table public.member_admin_audit enable row level security;
drop policy if exists "Founder can read member admin audit" on public.member_admin_audit;
create policy "Founder can read member admin audit"
on public.member_admin_audit for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved' and p.role='founder'));
revoke all on public.member_admin_audit from anon,authenticated;
grant select on public.member_admin_audit to authenticated;

create or replace function public.founder_update_member_role(p_member_id uuid,p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare v_old text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode alterar cargos administrativos.';
  end if;
  if p_role not in ('staff','admin','moderator','organizer','member') then
    raise exception 'Cargo inválido. O cargo Fundador não pode ser atribuído por esta tela.';
  end if;
  select role into v_old from public.profiles where id=p_member_id and status='approved' for update;
  if not found then raise exception 'Membro aprovado não encontrado.'; end if;
  if v_old is distinct from p_role then
    update public.profiles set role=p_role,updated_at=now() where id=p_member_id;
    insert into public.member_admin_audit(member_id,actor_id,action,old_value,new_value)
    values(p_member_id,auth.uid(),'role_changed',v_old,p_role);
  end if;
end;
$$;

create or replace function public.founder_set_member_rank(p_member_id uuid,p_rank_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_old uuid; v_new_name text; v_old_name text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode administrar patentes.';
  end if;
  select community_rank_id into v_old from public.profiles where id=p_member_id and status='approved' for update;
  if not found then raise exception 'Membro aprovado não encontrado.'; end if;
  if p_rank_id is not null and not exists(select 1 from public.community_ranks where id=p_rank_id) then
    raise exception 'Patente não encontrada.';
  end if;
  if v_old is distinct from p_rank_id then
    select name into v_old_name from public.community_ranks where id=v_old;
    select name into v_new_name from public.community_ranks where id=p_rank_id;
    update public.profiles set community_rank_id=p_rank_id,updated_at=now() where id=p_member_id;
    insert into public.member_admin_audit(member_id,actor_id,action,old_value,new_value)
    values(p_member_id,auth.uid(),'rank_changed',coalesce(v_old_name,'Sem patente'),coalesce(v_new_name,'Sem patente'));
  end if;
end;
$$;

grant execute on function public.founder_update_member_role(uuid,text) to authenticated;
grant execute on function public.founder_set_member_rank(uuid,uuid) to authenticated;
