export async function updateMemberStatus(supabase, memberId, status, role = null) {
  const { error } = await supabase.rpc("admin_update_member", {
    p_member_id: memberId,
    p_status: status,
    p_role: role,
  });
  if (error) throw error;
}

export async function updateFounderManagedMember(supabase, type, memberId, value) {
  const rpc = type === "role" ? "founder_update_member_role" : "founder_set_member_rank";
  const args = type === "role"
    ? { p_member_id: memberId, p_role: value }
    : { p_member_id: memberId, p_rank_id: value || null };
  const { error } = await supabase.rpc(rpc, args);
  if (error) throw error;
}

export async function revokeMemberPortalAccess(supabase, memberId) {
  const { error } = await supabase.rpc("founder_revoke_member_access", {
    p_member_id: memberId,
  });
  if (error) throw error;
}
