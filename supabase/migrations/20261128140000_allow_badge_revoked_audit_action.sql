-- Allow the badge revocation RPC to persist its audit event.
alter table public.member_admin_audit
  drop constraint if exists member_admin_audit_action_check;

alter table public.member_admin_audit
  add constraint member_admin_audit_action_check
  check (action in ('role_changed', 'rank_changed', 'access_revoked', 'badge_revoked'));
