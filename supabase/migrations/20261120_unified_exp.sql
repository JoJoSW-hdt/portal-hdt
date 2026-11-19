-- HERÓIS DO TEMPO — EXP unificado
-- Execute depois de 20261119_staff_ranks_news.sql.
-- Saldo sempre calculado pelo histórico; não existe total editável no perfil.

-- Permissão configurável para a Staff conceder EXP.
update public.portal_roles
set permissions = jsonb_set(coalesce(permissions,'{}'::jsonb),'{grant_exp}','true'::jsonb,true),
    updated_at = now()
where role_key='staff';

-- Recompensa configurável por badge.
alter table public.badges
  add column if not exists exp_reward integer not null default 0
  check (exp_reward >= 0 and exp_reward <= 100000);

-- Substitui os antigos pontos de atividade por um livro-razão único.
create table if not exists public.member_exp_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0 and amount between -100000 and 100000),
  source_type text not null check (source_type in ('manual','badge','adjustment')),
  source_key text,
  reason text not null check (char_length(reason) between 3 and 180),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists member_exp_badge_once
  on public.member_exp_transactions(member_id,source_type,source_key)
  where source_type='badge' and source_key is not null;

-- Marca a primeira concessão, inclusive quando a recompensa da badge for zero.
-- Assim não há EXP retroativa ao alterar a recompensa e reconceder a badge.
create table if not exists public.member_badge_exp_claims (
  member_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null,
  claimed_at timestamptz not null default now(),
  primary key(member_id,badge_id)
);
alter table public.member_badge_exp_claims enable row level security;
revoke all on public.member_badge_exp_claims from anon,authenticated;
create index if not exists member_exp_member_created_idx
  on public.member_exp_transactions(member_id,created_at desc);

alter table public.member_exp_transactions enable row level security;
drop policy if exists "EXP history is visible to member and managers" on public.member_exp_transactions;
create policy "EXP history is visible to member and managers"
on public.member_exp_transactions for select to authenticated
using (member_id=auth.uid() or public.can_manage_members());
revoke insert,update,delete on public.member_exp_transactions from anon,authenticated;
grant select on public.member_exp_transactions to authenticated;

-- View pública apenas com o saldo agregado dos membros aprovados.
create or replace view public.member_exp_balances as
select p.id as member_id, coalesce(sum(t.amount),0)::bigint as exp_total
from public.profiles p
left join public.member_exp_transactions t on t.member_id=p.id
where p.status='approved'
group by p.id;
grant select on public.member_exp_balances to anon,authenticated;

-- Limpa o sistema paralelo anterior. O histórico EXP passa a ser a única fonte.
drop function if exists public.admin_add_activity_points(uuid,integer,text);
drop table if exists public.member_activity;
alter table public.profiles drop column if exists activity_points;

-- Critério principal passa a ser EXP; tempo de casa continua opcional.
alter table public.community_ranks rename column min_points to min_exp;
update public.community_ranks set min_exp=case sort_order
  when 1 then 0 when 2 then 300 when 3 then 1000
  when 4 then 2500 when 5 then 5000 when 6 then 10000
  else min_exp end;

-- Substitui a função antiga, que usava activity_points.
create or replace function public.admin_scan_rank_promotions()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode gerar sugestões de promoção.';
  end if;
  insert into public.rank_promotion_requests(member_id,suggested_rank_id)
  select p.id,r.id
  from public.profiles p
  join public.community_ranks current_r on current_r.id=p.community_rank_id
  join public.community_ranks r on r.active=true and r.sort_order=current_r.sort_order+1
  where p.status='approved'
    and floor(extract(epoch from (now()-p.created_at))/86400)::integer >= r.min_days
    and coalesce((select sum(t.amount) from public.member_exp_transactions t where t.member_id=p.id),0) >= r.min_exp
  on conflict(member_id,suggested_rank_id) do update set status='pending',created_at=now()
  where rank_promotion_requests.status='rejected';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Atualiza a função de salvar patente para aceitar min_exp no lugar de min_points.
drop function if exists public.admin_save_community_rank(uuid,text,text,text,integer,integer,integer,boolean);
create function public.admin_save_community_rank(
  p_rank_id uuid,p_name text,p_description text,p_color text,p_sort_order integer,
  p_min_days integer,p_min_exp integer,p_active boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode gerenciar patentes.';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'Nome de patente inválido.'; end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Cor inválida.'; end if;
  if p_sort_order < 1 or p_min_days < 0 or p_min_exp < 0 then raise exception 'Critérios inválidos.'; end if;
  if p_rank_id is null then
    insert into public.community_ranks(name,description,color,sort_order,min_days,min_exp,active)
    values(trim(p_name),coalesce(p_description,''),p_color,p_sort_order,p_min_days,p_min_exp,p_active)
    returning id into v_id;
  else
    update public.community_ranks set name=trim(p_name),description=coalesce(p_description,''),
      color=p_color,sort_order=p_sort_order,min_days=p_min_days,min_exp=p_min_exp,
      active=p_active,updated_at=now()
    where id=p_rank_id returning id into v_id;
    if v_id is null then raise exception 'Patente não encontrada.'; end if;
  end if;
  return v_id;
end;
$$;
grant execute on function public.admin_save_community_rank(uuid,text,text,text,integer,integer,integer,boolean) to authenticated;

-- EXP manual: Fundador e Staff (se habilitado) podem conceder com justificativa.
create or replace function public.admin_grant_exp(p_member_id uuid,p_amount integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_portal_permission('grant_exp') then
    raise exception 'Você não tem permissão para conceder EXP.';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception 'Informe uma quantidade entre 1 e 100.000 EXP.';
  end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 180 then
    raise exception 'Informe o motivo da concessão.';
  end if;
  insert into public.member_exp_transactions(member_id,amount,source_type,reason,created_by)
  select p_member_id,p_amount,'manual',trim(p_reason),auth.uid()
  where exists(select 1 from public.profiles where id=p_member_id and status='approved');
  if not found then raise exception 'Membro aprovado não encontrado.'; end if;
end;
$$;
grant execute on function public.admin_grant_exp(uuid,integer,text) to authenticated;

-- Correções positivas ou negativas são exclusivas do Fundador e ficam no histórico.
create or replace function public.founder_adjust_exp(p_member_id uuid,p_amount integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='founder' and status='approved') then
    raise exception 'Somente o Fundador pode corrigir o saldo de EXP.';
  end if;
  if p_amount is null or p_amount=0 or abs(p_amount)>100000 then raise exception 'Valor de ajuste inválido.'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 180 then raise exception 'Informe o motivo do ajuste.'; end if;
  insert into public.member_exp_transactions(member_id,amount,source_type,reason,created_by)
  select p_member_id,p_amount,'adjustment',trim(p_reason),auth.uid()
  where exists(select 1 from public.profiles where id=p_member_id and status='approved');
  if not found then raise exception 'Membro aprovado não encontrado.'; end if;
end;
$$;
grant execute on function public.founder_adjust_exp(uuid,integer,text) to authenticated;

-- A concessão da badge gera EXP somente no primeiro crédito daquele membro/badge.
-- Retirar e conceder novamente a mesma badge não gera EXP duplicado.
create or replace function public.admin_grant_badge(p_member_id uuid,p_badge_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_inserted integer;
begin
  if not public.has_portal_permission('grant_badges') then
    raise exception 'Você não tem permissão para conceder badges.';
  end if;
  insert into public.member_badges(member_id,badge_id,granted_by)
  values(p_member_id,p_badge_id,auth.uid())
  on conflict(member_id,badge_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    insert into public.member_exp_transactions(member_id,amount,source_type,source_key,reason,created_by)
    select p_member_id,b.exp_reward,'badge',b.id::text,
      'EXP por conquistar a badge: '||b.name,auth.uid()
    from public.badges b
    where b.id=p_badge_id and b.exp_reward>0
    on conflict (member_id,source_type,source_key)
      where source_type='badge' and source_key is not null do nothing;
  end if;
end;
$$;

-- A função de salvar badge passa a aceitar a recompensa em EXP.
drop function if exists public.admin_save_badge(uuid,text,text,text,text);
create function public.admin_save_badge(
  p_badge_id uuid,p_name text,p_description text,p_image_url text,p_rarity text,p_exp_reward integer default 0
) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  if not public.has_portal_permission('grant_badges') then
    raise exception 'Você não tem permissão para gerenciar badges.';
  end if;
  if char_length(trim(p_name)) not between 2 and 50 then raise exception 'Nome da badge inválido.'; end if;
  if p_rarity not in ('comum','incomum','rara','epica','lendaria','mitica') then raise exception 'Raridade inválida.'; end if;
  if coalesce(p_exp_reward,0)<0 or p_exp_reward>100000 then raise exception 'Recompensa de EXP inválida.'; end if;
  if p_badge_id is null then
    insert into public.badges(name,description,image_url,rarity,exp_reward)
    values(trim(p_name),coalesce(p_description,''),p_image_url,p_rarity,p_exp_reward)
    returning id into result_id;
  else
    update public.badges set name=trim(p_name),description=coalesce(p_description,''),
      image_url=p_image_url,rarity=p_rarity,exp_reward=p_exp_reward,updated_at=now()
    where id=p_badge_id returning id into result_id;
    if result_id is null then raise exception 'Badge não encontrada.'; end if;
  end if;
  return result_id;
end;
$$;
grant execute on function public.admin_save_badge(uuid,text,text,text,text,integer) to authenticated;

-- Saldo público calculado e sem possibilidade de edição pelo cliente.

-- A permissão de EXP também precisa ser aceita pelo editor de permissões da Staff.
create or replace function public.admin_update_staff_permissions(p_permissions jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='founder' and status='approved') then
    raise exception 'Somente o Fundador pode configurar as permissões da Staff.';
  end if;
  if jsonb_typeof(p_permissions) is distinct from 'object' then raise exception 'Permissões inválidas.'; end if;
  if exists (
    select 1 from jsonb_each(p_permissions) e
    where e.key not in ('approve_members','grant_badges','grant_exp','publish_news')
       or jsonb_typeof(e.value) <> 'boolean'
  ) then raise exception 'Permissões inválidas para a Staff.'; end if;
  update public.portal_roles set permissions=p_permissions,updated_at=now() where role_key='staff';
end;
$$;
grant execute on function public.admin_update_staff_permissions(jsonb) to authenticated;

-- Garante que a recompensa seja creditada no máximo uma vez por membro/badge,
-- mesmo se a badge for retirada e concedida novamente ou seu valor mudar.
create or replace function public.admin_grant_badge(p_member_id uuid,p_badge_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_inserted integer; v_claimed integer;
begin
  if not public.has_portal_permission('grant_badges') then
    raise exception 'Você não tem permissão para conceder badges.';
  end if;
  insert into public.member_badges(member_id,badge_id,granted_by)
  values(p_member_id,p_badge_id,auth.uid())
  on conflict(member_id,badge_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    insert into public.member_badge_exp_claims(member_id,badge_id)
    values(p_member_id,p_badge_id) on conflict(member_id,badge_id) do nothing;
    get diagnostics v_claimed = row_count;
    if v_claimed > 0 then
      insert into public.member_exp_transactions(member_id,amount,source_type,source_key,reason,created_by)
      select p_member_id,b.exp_reward,'badge',b.id::text,
        'EXP por conquistar a badge: '||b.name,auth.uid()
      from public.badges b
      where b.id=p_badge_id and b.exp_reward>0
      on conflict (member_id,source_type,source_key)
        where source_type='badge' and source_key is not null do nothing;
    end if;
  end if;
end;
$$;
