-- HERÓIS DO TEMPO — mural da comunidade
-- Publicações independentes das notícias institucionais.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body_html text not null check (char_length(body_html) between 1 and 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart' check (reaction = 'heart'),
  created_at timestamptz not null default now(),
  unique(post_id, member_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_post_reactions_post_idx on public.community_post_reactions(post_id);
create index if not exists community_post_comments_post_idx on public.community_post_comments(post_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_comments enable row level security;

drop policy if exists "Community posts are publicly readable" on public.community_posts;
create policy "Community posts are publicly readable"
on public.community_posts for select to anon, authenticated using (true);

drop policy if exists "Approved members create their own posts" on public.community_posts;
create policy "Approved members create their own posts"
on public.community_posts for insert to authenticated
with check (
  author_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
);

drop policy if exists "Authors and moderators update community posts" on public.community_posts;
create policy "Authors and moderators update community posts"
on public.community_posts for update to authenticated
using (
  author_id = auth.uid()
  or public.has_portal_permission('publish_news')
)
with check (
  (author_id = auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved'))
  or public.has_portal_permission('publish_news')
);

drop policy if exists "Authors and moderators delete community posts" on public.community_posts;
create policy "Authors and moderators delete community posts"
on public.community_posts for delete to authenticated
using (author_id = auth.uid() or public.has_portal_permission('publish_news'));

drop policy if exists "Post reactions are publicly readable" on public.community_post_reactions;
create policy "Post reactions are publicly readable"
on public.community_post_reactions for select to anon, authenticated using (true);

drop policy if exists "Approved members react as themselves" on public.community_post_reactions;
create policy "Approved members react as themselves"
on public.community_post_reactions for insert to authenticated
with check (
  member_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
  and exists(select 1 from public.community_posts cp where cp.id=post_id)
);

drop policy if exists "Members remove their own reactions" on public.community_post_reactions;
create policy "Members remove their own reactions"
on public.community_post_reactions for delete to authenticated using (member_id=auth.uid());

drop policy if exists "Post comments are publicly readable" on public.community_post_comments;
create policy "Post comments are publicly readable"
on public.community_post_comments for select to anon, authenticated using (true);

drop policy if exists "Approved members comment as themselves" on public.community_post_comments;
create policy "Approved members comment as themselves"
on public.community_post_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
  and exists(select 1 from public.community_posts cp where cp.id=post_id)
);

drop policy if exists "Authors and moderators update comments" on public.community_post_comments;
create policy "Authors and moderators update comments"
on public.community_post_comments for update to authenticated
using (author_id=auth.uid() or public.has_portal_permission('publish_news'))
with check (
  (author_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved'))
  or public.has_portal_permission('publish_news')
);

drop policy if exists "Authors and moderators delete comments" on public.community_post_comments;
create policy "Authors and moderators delete comments"
on public.community_post_comments for delete to authenticated
using (author_id=auth.uid() or public.has_portal_permission('publish_news'));

revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_post_reactions from anon, authenticated;
revoke all on public.community_post_comments from anon, authenticated;
grant select on public.community_posts, public.community_post_reactions, public.community_post_comments to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant insert, delete on public.community_post_reactions to authenticated;
grant insert, update, delete on public.community_post_comments to authenticated;

-- Imagens do mural ficam no bucket público já usado pelo portal, em pasta própria por membro.
drop policy if exists "Approved members upload post images" on storage.objects;
create policy "Approved members upload post images"
on storage.objects for insert to authenticated
with check (
  bucket_id='portal-assets'
  and (storage.foldername(name))[1]='posts'
  and (storage.foldername(name))[2]=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
);

drop policy if exists "Authors and moderators delete post images" on storage.objects;
create policy "Authors and moderators delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id='portal-assets'
  and (
    (storage.foldername(name))[1]='posts'
    and (storage.foldername(name))[2]=auth.uid()::text
    or public.has_portal_permission('publish_news')
  )
);

-- Founder e Staff (com permissão) são os únicos responsáveis por notícias,
-- eventos e moderação do mural. O cargo legado "admin" não recebe esse acesso.
create or replace function public.can_moderate_community()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='approved'
      and (
        p.role='founder'
        or (p.role='staff' and coalesce(
          (select (r.permissions->>'publish_news')::boolean
           from public.portal_roles r where r.role_key='staff'), false
        ))
      )
  );
$$;
grant execute on function public.can_moderate_community() to authenticated;

-- Substitui a autorização ampla de publicação: somente Founder e Staff autorizado.
create or replace function public.admin_save_news(
  p_news_id uuid,p_title text,p_summary text,p_body text,p_cover_image_url text,p_status text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.can_moderate_community() then raise exception 'Somente Founder e Staff autorizado podem publicar notícias.'; end if;
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
  if not public.can_moderate_community() then raise exception 'Somente Founder e Staff autorizado podem excluir notícias.'; end if;
  delete from public.news_posts where id=p_news_id;
end;
$$;
grant execute on function public.admin_save_news(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.admin_delete_news(uuid) to authenticated;

-- Atualiza políticas de moderação para a mesma regra restrita.
drop policy if exists "Authors and moderators update community posts" on public.community_posts;
create policy "Authors and moderators update community posts"
on public.community_posts for update to authenticated
using (author_id=auth.uid() or public.can_moderate_community())
with check (
  (author_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved'))
  or public.can_moderate_community()
);
drop policy if exists "Authors and moderators delete community posts" on public.community_posts;
create policy "Authors and moderators delete community posts"
on public.community_posts for delete to authenticated
using (author_id=auth.uid() or public.can_moderate_community());
drop policy if exists "Authors and moderators update comments" on public.community_post_comments;
create policy "Authors and moderators update comments"
on public.community_post_comments for update to authenticated
using (author_id=auth.uid() or public.can_moderate_community())
with check (
  (author_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved'))
  or public.can_moderate_community()
);
drop policy if exists "Authors and moderators delete comments" on public.community_post_comments;
create policy "Authors and moderators delete comments"
on public.community_post_comments for delete to authenticated
using (author_id=auth.uid() or public.can_moderate_community());

drop policy if exists "Authors and moderators delete post images" on storage.objects;
create policy "Authors and moderators delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id='portal-assets'
  and (
    ((storage.foldername(name))[1]='posts' and (storage.foldername(name))[2]=auth.uid()::text)
    or public.can_moderate_community()
  )
);
