const deniedStaffPermissions = {
  approve_members: false,
  grant_badges: false,
  grant_exp: false,
  publish_news: false,
};

export async function fetchAuthenticatedProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      profile: null,
      error: error || new Error("Não encontramos o perfil desta conta. Entre em contato com a administração."),
      staffPermissions: deniedStaffPermissions,
    };
  }

  if (data.status !== "approved") {
    return { profile: data, error: null, staffPermissions: deniedStaffPermissions };
  }

  const [rankResult, roleResult, expResult] = await Promise.all([
    data.community_rank_id
      ? supabase
          .from("community_ranks")
          .select("*")
          .eq("id", data.community_rank_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
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

  const staffPermissions = roleResult.error
    ? deniedStaffPermissions
    : {
        approve_members: roleResult.data?.permissions?.approve_members === true,
        grant_badges: roleResult.data?.permissions?.grant_badges === true,
        grant_exp: roleResult.data?.permissions?.grant_exp === true,
        publish_news: roleResult.data?.permissions?.publish_news === true,
      };

  return {
    profile: {
      ...data,
      community_ranks: rankResult.data || null,
      exp_total: Number(expResult.data?.exp_total || 0),
    },
    error: rankResult.error || roleResult.error || expResult.error || null,
    staffPermissions,
  };
}
