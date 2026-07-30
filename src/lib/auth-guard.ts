import { redirect } from "@tanstack/react-router";
import { supabase, supabaseEnabled } from "./supabase";

const DEMO_KEY = "asisa.demo.user";

export function isAuthenticatedClient(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(DEMO_KEY)) return true;
  return false;
}

export async function requireAuthRedirect() {
  if (typeof window === "undefined") return;

  if (isAuthenticatedClient()) return;

  if (supabaseEnabled && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
  }

  throw redirect({ to: "/auth", search: { mode: "signin" } });
}
