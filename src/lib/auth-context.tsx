import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchAsisaUser, updateProfileRow } from "./api";
import { supabase, supabaseEnabled } from "./supabase";
import type { AsisaUser, Level, Role } from "./types";

export type { AsisaUser, Role };

interface AuthCtx {
  user: AsisaUser | null;
  loading: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    fullName: string;
    matricNumber: string;
    level: number;
  }) => Promise<{ sessionCreated: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: Partial<AsisaUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = "asisa.demo.user";

function readDemo(): AsisaUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as AsisaUser) : null;
  } catch {
    return null;
  }
}

function writeDemo(u: AsisaUser | null) {
  if (typeof window === "undefined") return;
  if (u) window.localStorage.setItem(DEMO_KEY, JSON.stringify(u));
  else window.localStorage.removeItem(DEMO_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AsisaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadFromSession = useCallback(async (userId: string, email: string) => {
    const asisaUser = await fetchAsisaUser(userId, email);
    setUser(asisaUser);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!supabase) {
      setUser(readDemo());
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await loadFromSession(data.session.user.id, data.session.user.email ?? "");
    } else {
      setUser(null);
    }
  }, [loadFromSession]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function bootstrap() {
      if (!supabase) {
        if (mounted) {
          setUser(readDemo());
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        try {
          await loadFromSession(data.session.user.id, data.session.user.email ?? "");
        } catch (err) {
          console.error(err);
          setUser(null);
        }
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
          return;
        }
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setPasswordRecovery(false);
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          try {
            await loadFromSession(session.user.id, session.user.email ?? "");
          } catch (err) {
            console.error(err);
          }
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    }

    void bootstrap();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [loadFromSession]);

  const value: AuthCtx = {
    user,
    loading,
    passwordRecovery,
    refreshUser,
    async signIn(email, password) {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await loadFromSession(data.user.id, data.user.email ?? email);
        }
        return;
      }
      const existing = readDemo();
      const isAdmin = email.toLowerCase().startsWith("admin@");
      const isRep = email.toLowerCase().startsWith("rep@");
      const u: AsisaUser = existing ?? {
        id: crypto.randomUUID(),
        email,
        fullName: email.split("@")[0] ?? "Student",
        role: isAdmin ? "super_admin" : isRep ? "course_rep" : "student",
        level: 300,
        departmentId: "d-asi",
        scopedDepartmentId: "d-asi",
        scopedLevel: 300,
      };
      writeDemo(u);
      setUser(u);
    },
    async signUp(payload) {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: payload.fullName,
              matric_number: payload.matricNumber,
              level: payload.level,
            },
          },
        });
        if (error) throw error;
        if (data.session?.user) {
          await loadFromSession(data.session.user.id, data.session.user.email ?? payload.email);
          return { sessionCreated: true };
        }
        return { sessionCreated: false };
      }
      const u: AsisaUser = {
        id: crypto.randomUUID(),
        email: payload.email,
        fullName: payload.fullName,
        matricNumber: payload.matricNumber,
        level: payload.level as Level,
        role: "student",
        departmentId: "d-asi",
        scopedDepartmentId: "d-asi",
      };
      writeDemo(u);
      setUser(u);
      return { sessionCreated: true };
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      writeDemo(null);
      setUser(null);
    },
    async resetPassword(email) {
      if (!supabase) {
        throw new Error("Password reset requires Supabase. Configure your environment or use demo mode sign-in.");
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    },
    async updatePassword(password) {
      if (!supabase) {
        throw new Error("Password update requires Supabase.");
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordRecovery(false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await loadFromSession(data.session.user.id, data.session.user.email ?? "");
      }
    },
    async updateProfile(patch) {
      if (!user) return;
      const next = { ...user, ...patch };
      if (supabase) {
        await updateProfileRow(user.id, {
          fullName: patch.fullName,
          matricNumber: patch.matricNumber,
          level: patch.level,
          departmentId: patch.departmentId,
          avatarUrl: patch.avatarUrl,
        });
        await refreshUser();
        return;
      }
      writeDemo(next);
      setUser(next);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

export { supabaseEnabled };
