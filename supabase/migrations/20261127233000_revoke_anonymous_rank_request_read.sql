-- Anonymous visitors do not need access to rank-promotion requests.
-- RLS already has no anon SELECT policy; revoke the unused table privilege
-- so the Data API surface matches the intended member/Founder-only access.
revoke select on table public.rank_promotion_requests from anon;
