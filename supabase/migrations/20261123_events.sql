-- HERÓIS DO TEMPO — agenda de eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  summary text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  event_type text not null default 'Encontro',
  description_html text not null default '',
  has_badge_reward boolean not null default false,
  reward_badge_id uuid references public.badges(id) on delete set null,
  reward_description text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_starts_at_idx on public.events(starts_at);
alter table public.events enable row level security;

create or replace function public.can_manage_events()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='approved' and p.role in ('founder','staff')
  );
$$;
revoke all on function public.can_manage_events() from public, anon;
grant execute on function public.can_manage_events() to authenticated;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public" on public.events
for select to anon, authenticated using (status='published');

drop policy if exists "Staff can view all events" on public.events;
create policy "Staff can view all events" on public.events
for select to authenticated using (public.can_manage_events());



create or replace function public.admin_save_event(
  p_event_id uuid,
  p_title text,
  p_summary text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text,
  p_event_type text,
  p_description_html text,
  p_has_badge_reward boolean,
  p_reward_badge_id uuid,
  p_reward_description text,
  p_status text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.can_manage_events() then raise exception 'Somente Founder e Staff podem gerenciar eventos.'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 3 and 120 then raise exception 'Informe um nome de evento entre 3 e 120 caracteres.'; end if;
  if p_starts_at is null then raise exception 'Informe a data e o horário do evento.'; end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'O término não pode ser anterior ao início.'; end if;
  if p_status not in ('draft','published') then raise exception 'Status inválido.'; end if;
  if p_has_badge_reward and p_reward_badge_id is not null and not exists(select 1 from public.badges b where b.id=p_reward_badge_id) then raise exception 'Badge de premiação não encontrada.'; end if;
  if p_event_id is null then
    insert into public.events(title,summary,starts_at,ends_at,location,event_type,description_html,has_badge_reward,reward_badge_id,reward_description,status,author_id)
    values(trim(p_title),coalesce(p_summary,''),p_starts_at,p_ends_at,coalesce(p_location,''),coalesce(p_event_type,'Encontro'),coalesce(p_description_html,''),coalesce(p_has_badge_reward,false),case when p_has_badge_reward then p_reward_badge_id else null end,coalesce(p_reward_description,''),p_status,auth.uid())
    returning id into v_id;
  else
    update public.events set title=trim(p_title),summary=coalesce(p_summary,''),starts_at=p_starts_at,ends_at=p_ends_at,
      location=coalesce(p_location,''),event_type=coalesce(p_event_type,'Encontro'),description_html=coalesce(p_description_html,''),
      has_badge_reward=coalesce(p_has_badge_reward,false),reward_badge_id=case when p_has_badge_reward then p_reward_badge_id else null end,
      reward_description=coalesce(p_reward_description,''),status=p_status,updated_at=now()
    where id=p_event_id returning id into v_id;
    if v_id is null then raise exception 'Evento não encontrado.'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_event(p_event_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_events() then raise exception 'Somente Founder e Staff podem excluir eventos.'; end if;
  delete from public.events where id=p_event_id;
end;
$$;
revoke all on function public.admin_save_event(uuid,text,text,timestamptz,timestamptz,text,text,text,boolean,uuid,text,text) from public, anon;
revoke all on function public.admin_delete_event(uuid) from public, anon;
grant execute on function public.admin_save_event(uuid,text,text,timestamptz,timestamptz,text,text,text,boolean,uuid,text,text) to authenticated;
grant execute on function public.admin_delete_event(uuid) to authenticated;
