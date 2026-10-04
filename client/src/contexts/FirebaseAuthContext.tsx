import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { firebaseAuth, firebaseConfigured, isAdminUid, requireAuth, requireFirestore } from "@/lib/firebase";

export type AppRole = "admin" | "student";

export type AppProfile = {
  uid: string;
  name: string;
  email: string;
  role: AppRole;
};

type AuthState = {
  user: User | null;
  profile: AppProfile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const pendingRegistrationNames = new Map<string, string>();

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function ensureProfile(firebaseUser: User, preferredName?: string): Promise<AppProfile> {
  const db = requireFirestore();
  const profileRef = doc(db, "users", firebaseUser.uid);
  const pendingName = firebaseUser.email ? pendingRegistrationNames.get(firebaseUser.email.toLowerCase()) : undefined;
  const snapshot = await getDoc(profileRef);
  const stored = snapshot.exists() ? snapshot.data() : {};
  const name = preferredName?.trim() || pendingName?.trim() || firebaseUser.displayName?.trim() || safeText(stored.name).trim() || firebaseUser.email?.split("@")[0] || "Estudante";
  const email = firebaseUser.email ?? safeText(stored.email);
  const role: AppRole = isAdminUid(firebaseUser.uid) ? "admin" : "student";

  if (!snapshot.exists()) {
    await setDoc(profileRef, {
      uid: firebaseUser.uid,
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (safeText(stored.name) !== name || safeText(stored.email) !== email || safeText(stored.role) !== role) {
    // The UID allowlist is the authority; client-editable profile data cannot grant admin access.
    await updateDoc(profileRef, { name, email, role, updatedAt: serverTimestamp() });
  }

  return { uid: firebaseUser.uid, name, email, role };
}

export async function registerStudent(name: string, email: string, password: string): Promise<void> {
  const auth = requireAuth();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  pendingRegistrationNames.set(normalizedEmail, normalizedName);
  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    await updateProfile(credential.user, { displayName: normalizedName });
    await ensureProfile(credential.user, normalizedName);
  } finally {
    pendingRegistrationNames.delete(normalizedEmail);
  }
}

export async function loginWithPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(requireAuth(), email.trim().toLowerCase(), password);
}

export async function logoutFromFirebase(): Promise<void> {
  await signOut(requireAuth());
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!firebaseAuth?.currentUser) {
      setProfile(null);
      return;
    }
    const nextProfile = await ensureProfile(firebaseAuth.currentUser);
    setProfile(nextProfile);
    setProfileError(null);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return;
    }

    let active = true;
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async nextUser => {
        if (!active) return;
        setUser(nextUser);
        setProfile(null);
        setProfileError(null);
        if (!nextUser) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const nextProfile = await ensureProfile(nextUser);
          if (active) setProfile(nextProfile);
        } catch {
          if (active) setProfileError("Não foi possível ler o perfil no Firestore. Confira as regras e a configuração do projeto.");
        } finally {
          if (active) setLoading(false);
        }
      },
      () => {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setProfileError("A sessão do Firebase não pôde ser verificada.");
        setLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({ user, profile, loading, profileError, refreshProfile }), [user, profile, loading, profileError, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useFirebaseAuth deve ser usado dentro de FirebaseAuthProvider.");
  return state;
}
