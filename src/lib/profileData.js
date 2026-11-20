export async function fetchAuthenticatedProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (data?.status !== "approved") {
    return { profile: data, error, staffPermissions: null };
  }

  const [rankResult, roleResult, expResult] = await Promise.all([
    data.community_rank_id
      ? supabase
          .from("community_ranks")
          .select("*")
          .eq("id", data.community_rank_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("portal_roles")
      .select("permissions")
      .eq("role_key", "staff")
      .maybeSingle(),
    supabase
      .from("member_exp_balances")
      .select("exp_total")
      .eq("member_id", data.id)
      .maybeSingle(),
  ]);

  return {
    profile: {
      ...data,
      community_ranks: rankResult.data,
      exp_total: Number(expResult.data?.exp_total || 0),
    },
    error,
    staffPermissions: roleResult.data?.permissions || null,
  };
}
