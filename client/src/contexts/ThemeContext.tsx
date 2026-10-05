import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { firebaseApi } from "@/lib/firebase-api";
import { defaultVisualPreferences, type VisualPreferences } from "@/lib/firestore-data";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";

type ThemeContextType = {
  theme: "dark";
  preferences: VisualPreferences;
  updatePreferences: (next: VisualPreferences) => void;
};

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", preferences: defaultVisualPreferences, updatePreferences: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const saved = firebaseApi.appearance.preferences.useQuery();
  const utils = firebaseApi.useUtils();
  const save = firebaseApi.appearance.savePreferences.useMutation();
  const [preferences, setPreferences] = useState<VisualPreferences>(defaultVisualPreferences);

  useEffect(() => {
    setPreferences(saved.data ?? defaultVisualPreferences);
  }, [auth.user?.uid, saved.data]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    root.dataset.accent = preferences.accent;
    root.dataset.surface = preferences.surface;
    root.dataset.texture = preferences.texture;
    root.dataset.density = preferences.density;
    localStorage.removeItem("theme");
  }, [preferences]);

  const updatePreferences = useCallback((next: VisualPreferences) => {
    setPreferences(next);
    save.mutate(next, {
      onSuccess: () => {
        void utils.appearance.preferences.invalidate();
        toast.success("Aparência salva para esta conta.");
      },
      onError: error => {
        setPreferences(saved.data ?? defaultVisualPreferences);
        toast.error(`Não foi possível salvar a aparência: ${error.message}`);
      },
    });
  }, [save, saved.data, utils]);

  const value = useMemo(() => ({ theme: "dark" as const, preferences, updatePreferences }), [preferences, updatePreferences]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
