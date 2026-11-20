export async function fetchPublicPortalData(supabase) {
  const [profilesResult, badgesResult, awardsResult, ranksResult, newsResult, eventsResult, expResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,username,display_name,discord_handle,tagline,avatar_url,role,status,created_at,community_rank_id,community_ranks(name,color,sort_order)")
        .order("created_at", { ascending: false }),
      supabase.from("badges").select("*").order("created_at"),
      supabase.from("member_badges").select("*,badges(*)").order("granted_at", { ascending: false }),
      supabase.from("community_ranks").select("*").order("sort_order"),
      supabase.from("news_posts").select("*").order("published_at", { ascending: false }),
      supabase.from("events").select("*,badges(name,image_url,rarity)").order("starts_at", { ascending: true }),
      supabase.from("member_exp_balances").select("member_id,exp_total"),
    ]);

  const totals = new Map(
    (expResult.data || []).map((item) => [item.member_id, Number(item.exp_total || 0)])
  );

  return {
    members: (profilesResult.data || []).map((member) => ({
      ...member,
      exp_total: totals.get(member.id) || 0,
    })),
    badges: badgesResult.data || [],
    awards: awardsResult.data || [],
    ranks: ranksResult.data || [],
    newsPosts: newsResult.data || [],
    events: eventsResult.data || [],
  };
}
