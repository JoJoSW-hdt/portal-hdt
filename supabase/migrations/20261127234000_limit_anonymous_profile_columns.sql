-- Keep anonymous profile reads aligned with the public member-card fields.
-- Authenticated members and managers retain their existing table-level access.
revoke select on table public.profiles from anon;
grant select (
  id,
  username,
  display_name,
  avatar_url,
  role,
  status,
  created_at,
  discord_handle,
  tagline,
  community_rank_id
) on table public.profiles to anon;
