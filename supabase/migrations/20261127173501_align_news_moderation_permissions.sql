-- Keep news access aligned with the portal's Founder / authorized Staff moderation rule.
-- The legacy admin role must not gain news access through the broader generic permission helper.

drop policy if exists "Published news and manager access" on public.news_posts;
create policy "Published news and moderators"
on public.news_posts
for select
to authenticated
using (
  (status = 'published' and (published_at is null or published_at <= now()))
  or (select public.can_moderate_community())
);

create or replace function public.admin_save_news(
  p_news_id uuid,
  p_title text,
  p_summary text,
  p_body text,
  p_cover_image_url text,
  p_status text,
  p_published_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_published_at timestamptz;
begin
  if not public.can_moderate_community() then
    raise exception 'Somente Founder e Staff autorizado podem publicar notícias.';
  end if;

  if char_length(trim(coalesce(p_title, ''))) not between 3 and 100 then
    raise exception 'Título inválido.';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'Status inválido.';
  end if;

  v_published_at := coalesce(p_published_at, now());

  if p_news_id is null then
    insert into public.news_posts(
      title, summary, body, cover_image_url, status, author_id, published_at
    )
    values (
      trim(p_title), coalesce(p_summary, ''), coalesce(p_body, ''),
      p_cover_image_url, 'published', auth.uid(), v_published_at
    )
    returning id into v_id;
  else
    update public.news_posts
    set title = trim(p_title),
        summary = coalesce(p_summary, ''),
        body = coalesce(p_body, ''),
        cover_image_url = p_cover_image_url,
        status = 'published',
        updated_at = now(),
        published_at = v_published_at
    where id = p_news_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Notícia não encontrada.';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.admin_save_news(uuid, text, text, text, text, text, timestamptz)
from public, anon;
grant execute on function public.admin_save_news(uuid, text, text, text, text, text, timestamptz)
to authenticated;
