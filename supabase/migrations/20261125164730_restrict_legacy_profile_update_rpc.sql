-- Remove an obsolete self-service RPC that allowed members to edit fields
-- outside the current profile contract (username, display_name and bio).
-- The active client uses update_my_public_profile for Discord, tagline and avatar only.
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
