export async function saveStaffPermissions(supabase, permissions) {
  const { error } = await supabase.rpc("admin_update_staff_permissions", { p_permissions: permissions });
  if (error) throw error;
}

export async function saveCommunityRank(supabase, editingRank, rank) {
  const { error } = await supabase.rpc("admin_save_community_rank", {
    p_rank_id: editingRank?.id || null,
    p_name: rank.name,
    p_description: rank.description,
    p_color: rank.color,
    p_sort_order: Number(rank.sort_order),
    p_min_days: Number(rank.min_days),
    p_min_exp: Number(rank.min_exp),
    p_active: rank.active,
  });
  if (error) throw error;
}

export async function deleteCommunityRank(supabase, rankId) {
  const { error } = await supabase.rpc("admin_delete_community_rank", { p_rank_id: rankId });
  if (error) throw error;
}

export async function adjustMemberExp(supabase, memberId, amount, reason) {
  const { error } = await supabase.rpc("founder_adjust_exp", {
    p_member_id: memberId,
    p_amount: Number(amount),
    p_reason: reason,
  });
  if (error) throw error;
}

export async function scanRankPromotions(supabase) {
  const { data, error } = await supabase.rpc("admin_scan_rank_promotions");
  if (error) throw error;
  return data || 0;
}

export async function reviewRankPromotion(supabase, requestId, approve) {
  const { error } = await supabase.rpc("admin_review_rank_promotion", {
    p_request_id: requestId,
    p_approve: approve,
  });
  if (error) throw error;
}

export async function updateStaffRole(supabase, memberId, role) {
  const { error } = await supabase.rpc("admin_update_member", {
    p_member_id: memberId,
    p_status: null,
    p_role: role,
  });
  if (error) throw error;
}
