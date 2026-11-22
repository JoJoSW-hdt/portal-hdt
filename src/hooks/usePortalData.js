import { useCallback, useEffect } from "react";
import { fetchPublicPortalData } from "../lib/portalData";
import { fetchAuthenticatedProfile } from "../lib/profileData";

export function usePortalData({
  supabase,
  hasSupabaseConfig,
  session,
  setMembers,
  setBadges,
  setAwards,
  setRanks,
  setNewsPosts,
  setEvents,
  setStaffPermissions,
  setProfile,
  setLoading,
  setMessage,
}) {
  const loadPublic = useCallback(async () => {
    try {
      const data = await fetchPublicPortalData(supabase);
      setMembers(data.members);
      setBadges(data.badges);
      setAwards(data.awards);
      setRanks(data.ranks);
      setNewsPosts(data.newsPosts);
      setEvents(data.events);
      if (data.errors?.length) {
        setMessage(data.errors.map(item => `Falha ao carregar ${item.resource}: ${item.message}`).join(" · "));
      }
    } catch (error) {
      setMessage(error.message || "Não foi possível carregar os dados públicos do portal.");
    }
  }, [supabase, setMembers, setBadges, setAwards, setRanks, setNewsPosts, setEvents, setMessage]);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const result = await fetchAuthenticatedProfile(supabase, session.user.id);
      if (result.error) setMessage(result.error.message);
      if (result.staffPermissions) setStaffPermissions(result.staffPermissions);
      setProfile(result.profile);
    } catch (error) {
      setMessage(error.message || "Não foi possível carregar seu perfil.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, session?.user?.id, setLoading, setMessage, setStaffPermissions, setProfile]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    loadPublic();
    if (session?.user) loadProfile();
    else {
      setProfile(null);
      setLoading(false);
    }
  }, [hasSupabaseConfig, session?.user?.id, loadPublic, loadProfile, setProfile, setLoading]);

  return { loadPublic, loadProfile };
}
