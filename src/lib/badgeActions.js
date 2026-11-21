export async function saveBadgeRecord(supabase, { editingBadge, badgeFile, badgeName, badgeDesc, badgeRarity, badgeExp }) {
  let imageUrl = editingBadge?.image_url || "";

  if (badgeFile) {
    const extension = badgeFile.name.split(".").pop();
    const path = `badges/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("portal-assets")
      .upload(path, badgeFile, { contentType: badgeFile.type });
    if (uploadError) throw uploadError;

    imageUrl = supabase.storage.from("portal-assets").getPublicUrl(path).data.publicUrl;
  }

  if (!imageUrl) throw new Error("Escolha a arte da badge.");

  const { error } = await supabase.rpc("admin_save_badge", {
    p_badge_id: editingBadge?.id || null,
    p_name: badgeName,
    p_description: badgeDesc,
    p_image_url: imageUrl,
    p_rarity: badgeRarity,
    p_exp_reward: Number(badgeExp),
  });
  if (error) throw error;
}

export async function deleteBadgeRecord(supabase, badgeId) {
  const { error } = await supabase.rpc("admin_delete_badge", { p_badge_id: badgeId });
  if (error) throw error;
}

export async function grantBadgeToMember(supabase, memberId, badgeId) {
  const { error } = await supabase.rpc("admin_grant_badge", {
    p_member_id: memberId,
    p_badge_id: badgeId,
  });
  if (error) throw error;
}

export async function revokeMemberBadge(supabase, memberBadgeId) {
  const { error } = await supabase.rpc("admin_revoke_badge", {
    p_member_badge_id: memberBadgeId,
  });
  if (error) throw error;
}
