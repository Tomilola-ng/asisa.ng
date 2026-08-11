import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, supabaseEnabled } from "@/lib/auth-context";
import { AuthHeroPanel } from "@/components/auth-hero-panel";
import { LEVELS } from "@/lib/data";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Actuarial Science & Insurance Nexus" },
      { name: "description", content: "Sign in or create your Actuarial Science & Insurance Nexus account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, updatePassword, passwordRecovery } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryFromHash, setRecoveryFromHash] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return params.get("type") === "recovery";
  });
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    matricNumber: "",
    level: "300",
  });

  const showSetPassword = passwordRecovery || recoveryFromHash;

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (params.get("type") === "recovery") {
      setRecoveryFromHash(true);
    }
  }, [passwordRecovery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (showSetPassword) {
        if (form.password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        if (form.password !== form.confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
        await updatePassword(form.password);
        setRecoveryFromHash(false);
        toast.success("Password updated. You're signed in.");
        navigate({ to: "/dashboard" });
        return;
      }

      if (showForgot) {
        await resetPassword(form.email);
        toast.success("Password reset link sent. Check your email.");
        setShowForgot(false);
        return;
      }

      if (mode === "signup") {
        const { sessionCreated } = await signUp({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          matricNumber: form.matricNumber,
          level: Number(form.level),
        });
        if (sessionCreated) {
          toast.success("Account created");
          navigate({ to: "/dashboard" });
          return;
        }
        toast.success("Account created. Check your email to confirm, then sign in.");
        navigate({ to: "/auth", search: { mode: "signin" } });
        return;
      }

      await signIn(form.email, form.password);
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <AuthHeroPanel className="hidden md:flex" />

      <div className="flex flex-col">
        <AuthHeroPanel compact className="md:hidden" />

        <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <h1 className="font-display text-2xl font-semibold">
            {showSetPassword
              ? "Choose a new password"
              : showForgot
                ? "Reset your password"
                : mode === "signup"
                  ? "Create your account"
                  : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showSetPassword
              ? "You're almost done. Enter a new password for your account."
              : showForgot
                ? "Enter your email and we'll send you a reset link."
                : mode === "signup"
                  ? "Register with your UNILAG student email."
                  : "Sign in to your Actuarial Science & Insurance Nexus account."}
          </p>

          {!supabaseEnabled && !showForgot && !showSetPassword && (
            <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3 text-xs text-secondary-foreground">
              Demo mode: Supabase env vars not set. Emails starting with{" "}
              <code>admin@</code> log in as super admin, <code>rep@</code> as course rep.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {showSetPassword ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving…" : "Update password"}
                </Button>
              </>
            ) : showForgot ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-primary underline-offset-2 hover:underline"
                  onClick={() => setShowForgot(false)}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="matric">Matric number</Label>
                        <Input
                          id="matric"
                          value={form.matricNumber}
                          onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Level</Label>
                        <Select
                          value={form.level}
                          onValueChange={(v) => setForm({ ...form, level: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map((l) => (
                              <SelectItem key={l} value={String(l)}>
                                {l} Level
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs text-primary underline-offset-2 hover:underline"
                        onClick={() => setShowForgot(true)}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </>
            )}
          </form>

          {!showForgot && !showSetPassword && (
            <p className="mt-6 text-sm text-muted-foreground">
              {mode === "signup" ? (
                <>
                  Already a member?{" "}
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
