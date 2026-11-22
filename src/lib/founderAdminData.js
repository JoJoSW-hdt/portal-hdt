export async function fetchRankPromotionSuggestions(supabase) {
  const { data, error } = await supabase
    .from("rank_promotion_requests")
    .select("*,profiles!rank_promotion_requests_member_id_fkey(display_name,username,created_at),community_ranks!rank_promotion_requests_suggested_rank_id_fkey(name,color,min_exp)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMemberExpHistory(supabase) {
  const { data, error } = await supabase
    .from("member_exp_transactions")
    .select("*,profiles!member_exp_transactions_member_id_fkey(display_name,username)")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return data || [];
}
