import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseEnabled } from "./supabase";

export type Role = "super_admin" | "course_rep" | "student";

export interface AsisaUser {
  id: string;
  email: string;
  fullName: string;
  matricNumber?: string;
  level?: 100 | 200 | 300 | 400 | 500;
  role: Role;
  avatarUrl?: string;
  scopedDepartmentId?: string;
  scopedLevel?: number;
}

interface AuthCtx {
  user: AsisaUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    fullName: string;
    matricNumber: string;
    level: number;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<AsisaUser>) => Promise<void>;
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

  useEffect(() => {
    let mounted = true;

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
        // TODO: fetch from profiles table
        const u = data.session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          fullName: (u.user_metadata?.full_name as string) ?? "",
          role: ((u.user_metadata?.role as Role) ?? "student"),
        });
      }
      setLoading(false);

      supabase.auth.onAuthStateChange((_e, session) => {
        if (!session) setUser(null);
      });
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    async signIn(email, password) {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }
      // Demo mode
      const existing = readDemo();
      const isAdmin = email.toLowerCase().startsWith("admin@");
      const isRep = email.toLowerCase().startsWith("rep@");
      const u: AsisaUser = existing ?? {
        id: crypto.randomUUID(),
        email,
        fullName: email.split("@")[0],
        role: isAdmin ? "super_admin" : isRep ? "course_rep" : "student",
        level: 300,
      };
      writeDemo(u);
      setUser(u);
    },
    async signUp(payload) {
      if (supabase) {
        const { error } = await supabase.auth.signUp({
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
        return;
      }
      const u: AsisaUser = {
        id: crypto.randomUUID(),
        email: payload.email,
        fullName: payload.fullName,
        matricNumber: payload.matricNumber,
        level: payload.level as AsisaUser["level"],
        role: "student",
      };
      writeDemo(u);
      setUser(u);
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      writeDemo(null);
      setUser(null);
    },
    async updateProfile(patch) {
      const next = { ...(user as AsisaUser), ...patch };
      setUser(next);
      if (!supabase) writeDemo(next);
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
