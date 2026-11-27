-- Keep suspended or unapproved accounts from changing or deleting community history.
-- Public read access remains unchanged; approved members and authorized moderators
-- retain the controls described by the portal's access model.

drop policy if exists "Authors and moderators delete community posts" on public.community_posts;
create policy "Authors and moderators delete community posts"
on public.community_posts for delete to authenticated
using (
  (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.status = 'approved'
    )
  )
  or (select public.can_moderate_community())
);

drop policy if exists "Members remove their own reactions" on public.community_post_reactions;
create policy "Members remove their own reactions"
on public.community_post_reactions for delete to authenticated
using (
  member_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  )
);

drop policy if exists "Authors and moderators delete comments" on public.community_post_comments;
create policy "Authors and moderators delete comments"
on public.community_post_comments for delete to authenticated
using (
  (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.status = 'approved'
    )
  )
  or (select public.can_moderate_community())
);

-- Apply the same approval gate to uploads and edits of member avatars.
drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portal-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  )
);

drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'portal-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  )
)
with check (
  bucket_id = 'portal-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  )
);

-- A member may remove their own post images only while approved.
-- Founder / authorized Staff moderation remains available.
drop policy if exists "Authors and moderators delete post images" on storage.objects;
create policy "Authors and moderators delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'portal-assets'
  and (
    (
      (storage.foldername(name))[1] = 'posts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.status = 'approved'
      )
    )
    or (select public.can_moderate_community())
  )
);
