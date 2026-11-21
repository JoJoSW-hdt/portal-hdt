import { useEffect, useState } from "react";

export function usePortalSession(supabase, { setAdminMode, setView }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setAdminMode(false);
        setView("home");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return [session, setSession];
}
