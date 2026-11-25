-- Portal Herois: hardening de autorizacao, view publica de EXP e indices.
revoke references, trigger, truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke references, trigger, truncate on tables from anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature, p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    if not f.is_trigger then
      execute format('grant execute on function %s to authenticated', f.signature);
    end if;
  end loop;
end;
$$;
alter default privileges in schema public revoke execute on functions from public;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create or replace function private.member_exp_balance_rows()
returns table(member_id uuid, exp_total bigint)
language sql stable security definer set search_path=pg_catalog,public
as $$
  select p.id, coalesce(sum(t.amount),0)::bigint
  from public.profiles p left join public.member_exp_transactions t on t.member_id=p.id
  where p.status='approved' group by p.id;
$$;
revoke all on function private.member_exp_balance_rows() from public;
grant execute on function private.member_exp_balance_rows() to anon, authenticated;
create or replace view public.member_exp_balances with (security_invoker=true)
as select member_id,exp_total from private.member_exp_balance_rows();
revoke all on public.member_exp_balances from public;
grant select on public.member_exp_balances to anon,authenticated;

alter table public.member_badge_exp_claims enable row level security;
revoke all on public.member_badge_exp_claims from public,anon,authenticated;

drop policy if exists "Approved profiles are visible" on public.profiles;
drop policy if exists "Approved profiles are public" on public.profiles;
drop policy if exists "Profiles visible to approved members and managers" on public.profiles;
create policy "Approved profiles are public" on public.profiles for select to anon using(status='approved');
create policy "Profiles visible to approved members and managers" on public.profiles for select to authenticated
using(status='approved' or id=(select auth.uid()) or (select public.can_manage_members()));

drop policy if exists "Published news are public" on public.news_posts;
drop policy if exists "Published news and manager access" on public.news_posts;
create policy "Published news are public" on public.news_posts for select to anon
using(status='published' and (published_at is null or published_at<=now()));
create policy "Published news and manager access" on public.news_posts for select to authenticated
using((status='published' and (published_at is null or published_at<=now())) or (select public.has_portal_permission('publish_news')));

drop policy if exists "Published events are public" on public.events;
drop policy if exists "Staff can view all events" on public.events;
create policy "Published events are public" on public.events for select to anon using(status='published');
create policy "Published events and staff access" on public.events for select to authenticated
using(status='published' or (select public.can_manage_events()));

drop policy if exists "Approved members create their own posts" on public.community_posts;
create policy "Approved members create their own posts" on public.community_posts for insert to authenticated
with check(author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved'));
drop policy if exists "Authors and moderators update community posts" on public.community_posts;
create policy "Authors and moderators update community posts" on public.community_posts for update to authenticated
using(author_id=(select auth.uid()) or (select public.can_moderate_community()))
with check((author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved')) or (select public.can_moderate_community()));
drop policy if exists "Authors and moderators delete community posts" on public.community_posts;
create policy "Authors and moderators delete community posts" on public.community_posts for delete to authenticated
using(author_id=(select auth.uid()) or (select public.can_moderate_community()));

drop policy if exists "Approved members react as themselves" on public.community_post_reactions;
create policy "Approved members react as themselves" on public.community_post_reactions for insert to authenticated
with check(member_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved') and exists(select 1 from public.community_posts cp where cp.id=post_id));
drop policy if exists "Members remove their own reactions" on public.community_post_reactions;
create policy "Members remove their own reactions" on public.community_post_reactions for delete to authenticated
using(member_id=(select auth.uid()));

drop policy if exists "Approved members comment as themselves" on public.community_post_comments;
create policy "Approved members comment as themselves" on public.community_post_comments for insert to authenticated
with check(author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved') and exists(select 1 from public.community_posts cp where cp.id=post_id));
drop policy if exists "Authors and moderators update comments" on public.community_post_comments;
create policy "Authors and moderators update comments" on public.community_post_comments for update to authenticated
using(author_id=(select auth.uid()) or (select public.can_moderate_community()))
with check((author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved')) or (select public.can_moderate_community()));
drop policy if exists "Authors and moderators delete comments" on public.community_post_comments;
create policy "Authors and moderators delete comments" on public.community_post_comments for delete to authenticated
using(author_id=(select auth.uid()) or (select public.can_moderate_community()));

drop policy if exists "Community ranks are public" on public.community_ranks;
create policy "Community ranks are public" on public.community_ranks for select to anon,authenticated
using(active=true or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved' and p.role='founder'));
drop policy if exists "Rank suggestions visible to founder" on public.rank_promotion_requests;
create policy "Rank suggestions visible to founder" on public.rank_promotion_requests for select to authenticated
using(member_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved' and p.role='founder'));
drop policy if exists "EXP history is visible to member and managers" on public.member_exp_transactions;
create policy "EXP history is visible to member and managers" on public.member_exp_transactions for select to authenticated
using(member_id=(select auth.uid()) or (select public.can_manage_members()));
drop policy if exists "Founder can read member admin audit" on public.member_admin_audit;
create policy "Founder can read member admin audit" on public.member_admin_audit for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved' and p.role='founder'));
drop policy if exists "Approved members can read portal roles" on public.portal_roles;
create policy "Approved members can read portal roles" on public.portal_roles for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='approved'));

create index if not exists community_post_comments_author_id_idx on public.community_post_comments(author_id);
create index if not exists community_post_reactions_member_id_idx on public.community_post_reactions(member_id);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists events_author_id_idx on public.events(author_id);
create index if not exists events_reward_badge_id_idx on public.events(reward_badge_id);
create index if not exists member_admin_audit_actor_id_idx on public.member_admin_audit(actor_id);
create index if not exists member_admin_audit_member_id_idx on public.member_admin_audit(member_id);
create index if not exists member_badges_badge_id_idx on public.member_badges(badge_id);
create index if not exists member_badges_granted_by_idx on public.member_badges(granted_by);
create index if not exists news_posts_author_id_idx on public.news_posts(author_id);
create index if not exists profiles_community_rank_id_idx on public.profiles(community_rank_id);
create index if not exists rank_promotion_requests_reviewed_by_idx on public.rank_promotion_requests(reviewed_by);
create index if not exists rank_promotion_requests_suggested_rank_id_idx on public.rank_promotion_requests(suggested_rank_id);
create index if not exists member_exp_transactions_created_by_idx on public.member_exp_transactions(created_by);
