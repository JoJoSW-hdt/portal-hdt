-- HERÓIS DO TEMPO — cargos, patentes, progressão híbrida e notícias
-- Migração incremental: executar UMA vez no SQL Editor do Supabase.
-- Não substitui o schema.sql já executado.

-- 1) Cargos administrativos
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('founder','staff','admin','moderator','organizer','member'));

create table if not exists public.portal_roles (
  role_key text primary key check (role_key = 'staff'),
  display_name text not null default 'Staff',
  permissions jsonb not null default '{"approve_members":true,"grant_badges":true,"publish_news":true}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.portal_roles(role_key,display_name,permissions)
values ('staff','Staff','{"approve_members":true,"grant_badges":true,"publish_news":true}'::jsonb)
on conflict (role_key) do nothing;

alter table public.portal_roles enable row level security;
drop policy if exists "Approved members can read portal roles" on public.portal_roles;
create policy "Approved members can read portal roles" on public.portal_roles
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
);
revoke insert, update, delete on public.portal_roles from anon, authenticated;
grant select on public.portal_roles to authenticated;

create or replace function public.has_portal_permission(p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='approved'
      and (
        p.role in ('founder','admin')
        or (p.role='staff' and coalesce(
          (select (r.permissions->>p_permission)::boolean
           from public.portal_roles r where r.role_key='staff'), false
        ))
      )
  );
$$;

create or replace function public.admin_update_staff_permissions(p_permissions jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='founder' and status='approved') then
    raise exception 'Somente o Fundador pode configurar as permissões da Staff.';
  end if;
  if jsonb_typeof(p_permissions) <> 'object' then raise exception 'Permissões inválidas.'; end if;
  if exists (
    select 1 from jsonb_each(p_permissions) e
    where e.key not in ('approve_members','grant_badges','publish_news')
       or jsonb_typeof(e.value) <> 'boolean'
  ) then raise exception 'A Staff só pode receber permissões administrativas disponíveis.'; end if;
  update public.portal_roles set permissions=p_permissions, updated_at=now() where role_key='staff';
end;
$$;
grant execute on function public.has_portal_permission(text) to authenticated;
grant execute on function public.admin_update_staff_permissions(jsonb) to authenticated;

-- Permitir que Staff com a permissão correspondente consulte cadastros pendentes.
create or replace function public.can_manage_members()
returns boolean language sql stable security definer set search_path=public as $
  select public.has_portal_permission('approve_members')
    or exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved' and p.role in ('moderator','organizer'));
$;

-- 2) Aprovação e badges: Staff recebe somente as permissões configuradas.
create or replace function public.admin_update_member(
  p_member_id uuid, p_status text default null, p_role text default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_portal_permission('approve_members') then
    raise exception 'Você não tem permissão para administrar membros.';
  end if;
  if p_status is not null and p_status not in ('approved','rejected','suspended','pending') then
    raise exception 'Status inválido.';
  end if;
  if p_role is not null then
    if not exists(select 1 from public.profiles where id=auth.uid() and role in ('founder','admin') and status='approved') then
      raise exception 'Somente Fundador/Administrador pode alterar cargos administrativos.';
    end if;
    if p_role not in ('staff','admin','moderator','organizer','member') then raise exception 'Cargo inválido.'; end if;
    if p_member_id=auth.uid() then raise exception 'Você não pode alterar seu próprio cargo.'; end if;
  end if;
  update public.profiles set status=coalesce(p_status,status), role=coalesce(p_role,role), updated_at=now()
  where id=p_member_id;
  if not found then raise exception 'Membro não encontrado.'; end if;
end;
$$;

create or replace function public.admin_grant_badge(p_member_id uuid,p_badge_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_portal_permission('grant_badges') then raise exception 'Você não tem permissão para conceder badges.'; end if;
  insert into public.member_badges(member_id,badge_id,granted_by)
  values(p_member_id,p_badge_id,auth.uid()) on conflict(member_id,badge_id) do nothing;
end;
$$;

create or replace function public.admin_revoke_badge(p_member_badge_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_portal_permission('grant_badges') then raise exception 'Você não tem permissão para retirar badges.'; end if;
  delete from public.member_badges where id=p_member_badge_id;
end;
$$;

-- 3) Patentes da comunidade e progressão híbrida (tempo + participação + aprovação do Fundador).
alter table public.profiles add column if not exists activity_points integer not null default 0 check (activity_points >= 0);
alter table public.profiles add column if not exists community_rank_id uuid;

create table if not exists public.community_ranks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '' check (char_length(description) <= 180),
  color text not null default '#9CA3AF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null unique,
  min_days integer not null default 0 check (min_days >= 0),
  min_points integer not null default 0 check (min_points >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_community_rank_id_fkey;
alter table public.profiles add constraint profiles_community_rank_id_fkey
  foreign key (community_rank_id) references public.community_ranks(id) on delete set null;

insert into public.community_ranks(name,description,color,sort_order,min_days,min_points)
values
 ('Aventureiro','Sua jornada na comunidade está começando.','#9CA3AF',1,0,0),
 ('Explorador','Já conhece os caminhos e participa das aventuras.','#22C55E',2,7,10),
 ('Veterano','Presença constante e participação ativa.','#06B6D4',3,30,35),
 ('Guardião','Ajuda a manter viva a comunidade.','#3B82F6',4,90,80),
 ('Lenda','Uma presença marcante na história do grupo.','#A855F7',5,180,160),
 ('Lenda Viva','O mais alto reconhecimento da comunidade.','#F59E0B',6,365,300)
on conflict (sort_order) do nothing;

update public.profiles p
set community_rank_id=(select r.id from public.community_ranks r where r.sort_order=1)
where p.community_rank_id is null;

create table if not exists public.member_activity (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points > 0 and points <= 100),
  reason text not null check (char_length(reason) between 3 and 180),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rank_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  suggested_rank_id uuid not null references public.community_ranks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique(member_id,suggested_rank_id)
);

alter table public.community_ranks enable row level security;
alter table public.member_activity enable row level security;
alter table public.rank_promotion_requests enable row level security;
drop policy if exists "Community ranks are public" on public.community_ranks;
create policy "Community ranks are public" on public.community_ranks for select to anon,authenticated using (active=true);
drop policy if exists "Activity is visible to member and managers" on public.member_activity;
create policy "Activity is visible to member and managers" on public.member_activity
for select to authenticated using (member_id=auth.uid() or public.can_manage_members());
drop policy if exists "Rank suggestions visible to founder" on public.rank_promotion_requests;
create policy "Rank suggestions visible to founder" on public.rank_promotion_requests
for select to authenticated using (
  member_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved' and p.role='founder')
);
revoke insert,update,delete on public.community_ranks,public.member_activity,public.rank_promotion_requests from anon,authenticated;
grant select on public.community_ranks,public.member_activity,public.rank_promotion_requests to anon,authenticated;

create or replace function public.admin_save_community_rank(
  p_rank_id uuid,p_name text,p_description text,p_color text,p_sort_order integer,p_min_days integer,p_min_points integer,p_active boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode gerenciar patentes.';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'Nome de patente inválido.'; end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Cor inválida.'; end if;
  if p_sort_order < 1 or p_min_days < 0 or p_min_points < 0 then raise exception 'Critérios inválidos.'; end if;
  if p_rank_id is null then
    insert into public.community_ranks(name,description,color,sort_order,min_days,min_points,active)
    values(trim(p_name),coalesce(p_description,''),p_color,p_sort_order,p_min_days,p_min_points,p_active) returning id into v_id;
  else
    update public.community_ranks set name=trim(p_name),description=coalesce(p_description,''),color=p_color,
      sort_order=p_sort_order,min_days=p_min_days,min_points=p_min_points,active=p_active,updated_at=now()
    where id=p_rank_id returning id into v_id;
    if v_id is null then raise exception 'Patente não encontrada.'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_community_rank(p_rank_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode excluir patentes.';
  end if;
  if exists(select 1 from public.profiles where community_rank_id=p_rank_id) then
    raise exception 'Esta patente está atribuída a membros. Reatribua-os antes de excluir.';
  end if;
  delete from public.community_ranks where id=p_rank_id and sort_order<>1;
end;
$$;

create or replace function public.admin_add_activity_points(p_member_id uuid,p_points integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode registrar participação nesta versão.';
  end if;
  if p_points < 1 or p_points > 100 then raise exception 'Informe entre 1 e 100 pontos.'; end if;
  if char_length(trim(p_reason)) not between 3 and 180 then raise exception 'Descreva a participação.'; end if;
  update public.profiles set activity_points=activity_points+p_points where id=p_member_id and status='approved';
  if not found then raise exception 'Membro aprovado não encontrado.'; end if;
  insert into public.member_activity(member_id,points,reason,created_by)
  values(p_member_id,p_points,trim(p_reason),auth.uid());
end;
$$;

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
    and p.activity_points >= r.min_points
  on conflict(member_id,suggested_rank_id) do update set status='pending',created_at=now()
  where rank_promotion_requests.status='rejected';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_review_rank_promotion(p_request_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_member uuid; v_rank uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='founder') then
    raise exception 'Somente o Fundador pode confirmar promoções.';
  end if;
  select member_id,suggested_rank_id into v_member,v_rank
  from public.rank_promotion_requests where id=p_request_id and status='pending';
  if v_member is null then raise exception 'Sugestão não encontrada.'; end if;
  if p_approve then
    update public.profiles set community_rank_id=v_rank where id=v_member;
    update public.rank_promotion_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
  else
    update public.rank_promotion_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
  end if;
end;
$$;

grant execute on function public.admin_save_community_rank(uuid,text,text,text,integer,integer,integer,boolean) to authenticated;
grant execute on function public.admin_delete_community_rank(uuid) to authenticated;
grant execute on function public.admin_add_activity_points(uuid,integer,text) to authenticated;
grant execute on function public.admin_scan_rank_promotions() to authenticated;
grant execute on function public.admin_review_rank_promotion(uuid,boolean) to authenticated;

-- 4) Notícias publicadas pela equipe (rascunhos e publicação protegidos por permissão).
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  summary text not null default '' check (char_length(summary) <= 240),
  body text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.news_posts enable row level security;
drop policy if exists "Published news are public" on public.news_posts;
create policy "Published news are public" on public.news_posts for select to anon,authenticated using (status='published');
revoke insert,update,delete on public.news_posts from anon,authenticated;
grant select on public.news_posts to anon,authenticated;

create or replace function public.admin_save_news(
  p_news_id uuid,p_title text,p_summary text,p_body text,p_cover_image_url text,p_status text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.has_portal_permission('publish_news') then raise exception 'Você não tem permissão para publicar notícias.'; end if;
  if char_length(trim(p_title)) not between 3 and 100 then raise exception 'Título inválido.'; end if;
  if p_status not in ('draft','published') then raise exception 'Status inválido.'; end if;
  if p_news_id is null then
    insert into public.news_posts(title,summary,body,cover_image_url,status,author_id,published_at)
    values(trim(p_title),coalesce(p_summary,''),coalesce(p_body,''),p_cover_image_url,p_status,auth.uid(),case when p_status='published' then now() end)
    returning id into v_id;
  else
    update public.news_posts set title=trim(p_title),summary=coalesce(p_summary,''),body=coalesce(p_body,''),
      cover_image_url=p_cover_image_url,status=p_status,updated_at=now(),
      published_at=case when p_status='published' then coalesce(published_at,now()) else null end
    where id=p_news_id returning id into v_id;
    if v_id is null then raise exception 'Notícia não encontrada.'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_news(p_news_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_portal_permission('publish_news') then raise exception 'Você não tem permissão para excluir notícias.'; end if;
  delete from public.news_posts where id=p_news_id;
end;
$$;
grant execute on function public.admin_save_news(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.admin_delete_news(uuid) to authenticated;
