import { useCallback, useEffect, useRef } from "react";
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
  const publicRequest = useRef(0);
  const profileRequest = useRef(0);

  const loadPublic = useCallback(async () => {
    const requestId = ++publicRequest.current;
    try {
      const data = await fetchPublicPortalData(supabase);
      if (requestId !== publicRequest.current) return;
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
      if (requestId === publicRequest.current) {
        setMessage(error.message || "Não foi possível carregar os dados públicos do portal.");
      }
    }
  }, [supabase, setMembers, setBadges, setAwards, setRanks, setNewsPosts, setEvents, setMessage]);

  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequest.current;
    if (!session?.user?.id) {
      setProfile(null);
      setStaffPermissions({ approve_members: false, grant_badges: false, grant_exp: false, publish_news: false });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchAuthenticatedProfile(supabase, session.user.id);
      if (requestId !== profileRequest.current) return;
      if (result.error) setMessage(result.error.message);
      setStaffPermissions(result.staffPermissions || { approve_members: false, grant_badges: false, grant_exp: false, publish_news: false });
      setProfile(result.profile);
    } catch (error) {
      if (requestId !== profileRequest.current) return;
      setMessage(error.message || "Não foi possível carregar seu perfil.");
      setProfile(null);
    } finally {
      if (requestId === profileRequest.current) setLoading(false);
    }
  }, [supabase, session?.user?.id, setLoading, setMessage, setStaffPermissions, setProfile]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    loadPublic();
    loadProfile();
  }, [hasSupabaseConfig, loadPublic, loadProfile]);

  return { loadPublic, loadProfile };
}
