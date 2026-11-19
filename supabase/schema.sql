-- HERÓIS DO TEMPO — esquema inicial
-- Execute no SQL Editor do seu projeto Supabase.
-- A aprovação e as permissões são verificadas no banco, não apenas na interface.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_url text,
  role text not null default 'member'
    check (role in ('founder','admin','moderator','organizer','member')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

alter table public.profiles enable row level security;

create or replace function public.is_portal_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role in ('founder','admin')
  );
$$;

create or replace function public.can_manage_members()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
      and role in ('founder','admin','moderator','organizer')
  );
$$;

-- Perfil público: apenas membros aprovados. Usuário também pode ler o próprio perfil pendente.
drop policy if exists "Approved profiles are visible" on public.profiles;
create policy "Approved profiles are visible" on public.profiles
for select to anon, authenticated
using (status = 'approved' or id = auth.uid() or public.can_manage_members());

-- Novos perfis são criados pelo trigger; clientes não recebem permissão direta de insert/update.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  chosen_username text;
  chosen_name text;
begin
  chosen_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'aventureiro_' || substr(new.id::text, 1, 8)
  );
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    chosen_username
  );
  insert into public.profiles (id, username, display_name, status, role)
  values (new.id, chosen_username, chosen_name, 'pending', 'member');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

-- Membro só altera campos de perfil permitidos por esta função.
create or replace function public.update_my_profile(
  p_username text,
  p_display_name text,
  p_bio text,
  p_avatar_url text default null
)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login para editar o perfil.'; end if;
  if char_length(trim(p_username)) < 3 or char_length(trim(p_username)) > 24 then
    raise exception 'Nome de usuário deve ter entre 3 e 24 caracteres.';
  end if;
  if char_length(trim(p_display_name)) < 1 or char_length(trim(p_display_name)) > 60 then
    raise exception 'Nome de exibição inválido.';
  end if;
  if char_length(coalesce(p_bio,'')) > 240 then raise exception 'Biografia muito longa.'; end if;

  update public.profiles
  set username = lower(trim(p_username)),
      display_name = trim(p_display_name),
      bio = coalesce(p_bio,''),
      avatar_url = p_avatar_url,
      updated_at = now()
  where id = auth.uid();
end;
$$;

-- Apenas fundador/administrador podem aprovar, recusar, suspender ou mudar cargos.
create or replace function public.admin_update_member(
  p_member_id uuid,
  p_status text default null,
  p_role text default null
)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles
  where id = auth.uid() and status = 'approved'
    and role in ('founder','admin');
  if actor_role is null then raise exception 'Você não tem permissão para administrar membros.'; end if;
  if p_status is not null and p_status not in ('approved','rejected','suspended','pending') then
    raise exception 'Status inválido.';
  end if;
  if p_role is not null and p_role not in ('admin','moderator','organizer','member') then
    raise exception 'Cargo inválido.';
  end if;
  if p_member_id = auth.uid() and p_role is not null then
    raise exception 'Você não pode alterar seu próprio cargo.';
  end if;
  update public.profiles
  set status = coalesce(p_status,status),
      role = coalesce(p_role,role),
      updated_at = now()
  where id = p_member_id;
  if not found then raise exception 'Membro não encontrado.'; end if;
end;
$$;

grant execute on function public.update_my_profile(text,text,text,text) to authenticated;
grant execute on function public.admin_update_member(uuid,text,text) to authenticated;
grant execute on function public.is_portal_admin() to anon, authenticated;
grant execute on function public.can_manage_members() to anon, authenticated;

-- Depois de criar sua conta pelo site, copie o UUID em Authentication > Users
-- e execute UMA vez, substituindo o UUID abaixo pelo seu:
-- update public.profiles set role='founder', status='approved' where id='SEU-UUID-AQUI';

-- SISTEMA DE BADGES E PERFIS ENXUTOS
alter table public.profiles add column if not exists discord_handle text not null default '' check (char_length(discord_handle) <= 40);
alter table public.profiles add column if not exists tagline text not null default '' check (char_length(tagline) <= 120);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  description text not null default '' check (char_length(description) <= 240),
  image_url text not null,
  rarity text not null check (rarity in ('comum','incomum','rara','epica','lendaria','mitica')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_badges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  unique(member_id, badge_id)
);
create index if not exists member_badges_member_idx on public.member_badges(member_id, granted_at desc);

alter table public.badges enable row level security;
alter table public.member_badges enable row level security;

drop policy if exists "Badges are public" on public.badges;
create policy "Badges are public" on public.badges for select to anon, authenticated using (true);
drop policy if exists "Member badge awards are public" on public.member_badges;
create policy "Member badge awards are public" on public.member_badges for select to anon, authenticated using (true);
revoke insert, update, delete on public.badges from anon, authenticated;
revoke insert, update, delete on public.member_badges from anon, authenticated;
grant select on public.badges, public.member_badges to anon, authenticated;

create or replace function public.admin_save_badge(
  p_badge_id uuid, p_name text, p_description text, p_image_url text, p_rarity text
) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  if not public.is_portal_admin() then raise exception 'Apenas a administração pode gerenciar badges.'; end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 50 then raise exception 'Nome da badge inválido.'; end if;
  if p_rarity not in ('comum','incomum','rara','epica','lendaria','mitica') then raise exception 'Raridade inválida.'; end if;
  if p_badge_id is null then
    insert into public.badges(name,description,image_url,rarity) values(trim(p_name),coalesce(p_description,''),p_image_url,p_rarity) returning id into result_id;
  else
    update public.badges set name=trim(p_name), description=coalesce(p_description,''), image_url=p_image_url, rarity=p_rarity, updated_at=now() where id=p_badge_id returning id into result_id;
    if result_id is null then raise exception 'Badge não encontrada.'; end if;
  end if;
  return result_id;
end; $$;

create or replace function public.admin_delete_badge(p_badge_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_portal_admin() then raise exception 'Apenas a administração pode excluir badges.'; end if;
  delete from public.badges where id=p_badge_id;
end; $$;

create or replace function public.admin_grant_badge(p_member_id uuid, p_badge_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_portal_admin() then raise exception 'Apenas a administração pode conceder badges.'; end if;
  insert into public.member_badges(member_id,badge_id,granted_by) values(p_member_id,p_badge_id,auth.uid()) on conflict(member_id,badge_id) do nothing;
end; $$;

create or replace function public.admin_revoke_badge(p_member_badge_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_portal_admin() then raise exception 'Apenas a administração pode retirar badges.'; end if;
  delete from public.member_badges where id=p_member_badge_id;
end; $$;

grant execute on function public.admin_save_badge(uuid,text,text,text,text) to authenticated;
grant execute on function public.admin_delete_badge(uuid) to authenticated;
grant execute on function public.admin_grant_badge(uuid,uuid) to authenticated;
grant execute on function public.admin_revoke_badge(uuid) to authenticated;

-- Bucket público para imagens de avatar e arte das badges.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portal-assets','portal-assets',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/png','image/jpeg','image/webp'];

drop policy if exists "Public can view portal assets" on storage.objects;
create policy "Public can view portal assets" on storage.objects for select using (bucket_id='portal-assets');
drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar" on storage.objects for insert to authenticated with check (bucket_id='portal-assets' and (storage.foldername(name))[1]='avatars' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar" on storage.objects for update to authenticated using (bucket_id='portal-assets' and (storage.foldername(name))[1]='avatars' and (storage.foldername(name))[2]=auth.uid()::text) with check (bucket_id='portal-assets' and (storage.foldername(name))[1]='avatars' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists "Admins manage badge art" on storage.objects;
create policy "Admins manage badge art" on storage.objects for all to authenticated using (bucket_id='portal-assets' and (storage.foldername(name))[1]='badges' and public.is_portal_admin()) with check (bucket_id='portal-assets' and (storage.foldername(name))[1]='badges' and public.is_portal_admin());

create or replace function public.update_my_public_profile(p_discord_handle text, p_tagline text, p_avatar_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Faça login para editar o perfil.'; end if;
  if char_length(coalesce(p_discord_handle,'')) > 40 then raise exception 'Nick do Discord muito longo.'; end if;
  if char_length(coalesce(p_tagline,'')) > 120 then raise exception 'Frase de efeito muito longa.'; end if;
  update public.profiles set discord_handle=trim(coalesce(p_discord_handle,'')), tagline=trim(coalesce(p_tagline,'')), avatar_url=p_avatar_url, updated_at=now() where id=auth.uid();
end; $$;
grant execute on function public.update_my_public_profile(text,text,text) to authenticated;
