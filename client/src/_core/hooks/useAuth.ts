import { logoutFromFirebase, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const auth = useFirebaseAuth();

  const logout = useCallback(() => logoutFromFirebase(), []);
  const state = useMemo(() => ({
    user: auth.profile,
    loading: auth.loading,
    error: auth.profileError,
    isAuthenticated: Boolean(auth.user),
  }), [auth.profile, auth.loading, auth.profileError, auth.user]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || auth.loading || auth.user || typeof window === "undefined") return;
    const target = redirectPath ?? "/login";
    if (window.location.pathname !== target) window.location.replace(target);
  }, [redirectOnUnauthenticated, redirectPath, auth.loading, auth.user]);

  return { ...state, refresh: auth.refreshProfile, logout };
}
