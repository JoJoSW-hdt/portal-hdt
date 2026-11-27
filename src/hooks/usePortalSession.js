import { useEffect, useState } from "react";

export function usePortalSession(supabase, { setAdminMode, setView }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    let receivedAuthEvent = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setAdminMode(false);
        setView("home");
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (active && !receivedAuthEvent) {
          setSession(error ? null : data.session);
        }
      })
      .catch(() => {
        if (active && !receivedAuthEvent) setSession(null);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, setAdminMode, setView]);

  return [session, setSession];
}
