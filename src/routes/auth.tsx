import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { LEVELS } from "@/lib/data";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ASISA" },
      { name: "description", content: "Sign in or create your ASISA account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    matricNumber: "",
    level: "300",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          matricNumber: form.matricNumber,
          level: Number(form.level),
        });
        toast.success("Account created");
      } else {
        await signIn(form.email, form.password);
        toast.success("Signed in");
      }
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
      <div className="hidden flex-col justify-between p-10 md:flex" style={{ background: "var(--color-evergreen)", color: "white" }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-foreground font-display text-primary">
            A
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold">ASISA</div>
            <div className="text-xs opacity-70">UNILAG</div>
          </div>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight text-white">
            Your class, your coursework, your community.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Sign in with your student credentials to access course files, class
            feeds and ASISA announcements.
          </p>
        </div>
        <p className="text-xs opacity-60">
          Department of Actuarial Science & Insurance, University of Lagos.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Register with your UNILAG student email."
              : "Sign in to your ASISA account."}
          </p>

          {!supabaseEnabled && (
            <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3 text-xs text-secondary-foreground">
              Demo mode — Supabase env vars not set. Emails starting with{" "}
              <code>admin@</code> log in as super admin, <code>rep@</code> as
              course rep.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <Label htmlFor="password">Password</Label>
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
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already a member?{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="text-primary underline-offset-2 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="text-primary underline-offset-2 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
