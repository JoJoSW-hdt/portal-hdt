export async function updateAuthenticatedProfile(supabase, { profile, avatarFile, discord, tagline }) {
  let url = profile.avatar_url;

  if (avatarFile) {
    const ext = avatarFile.name.split(".").pop();
    const path = `avatars/${profile.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("portal-assets")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
    if (uploadError) throw uploadError;

    url = supabase.storage.from("portal-assets").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.rpc("update_my_public_profile", {
    p_discord_handle: discord,
    p_tagline: tagline,
    p_avatar_url: url,
  });
  if (error) throw error;
}
