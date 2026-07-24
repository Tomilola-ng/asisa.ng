import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Book,
  People,
  ChatSquareText,
  ShieldLock,
  Mortarboard,
  ArrowRight,
} from "react-bootstrap-icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASISA — Actuarial Science & Insurance, UNILAG" },
      {
        name: "description",
        content:
          "The official community platform for Actuarial Science & Insurance students at the University of Lagos.",
      },
      { property: "og:title", content: "ASISA — UNILAG" },
      {
        property: "og:description",
        content:
          "Courses, past questions, class feeds and student groups for ASI at UNILAG.",
      },
    ],
  }),
  beforeLoad: () => {
    // Land signed-in users directly on dashboard (client-only guard is fine
    // since we use localStorage/Supabase in the browser).
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("asisa.demo.user");
      if (raw) throw redirect({ to: "/dashboard" });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-display text-primary-foreground">
              A
            </span>
            <div className="leading-tight">
              <div className="font-display font-semibold">ASISA</div>
              <div className="text-xs text-muted-foreground">UNILAG</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
              Department of Actuarial Science & Insurance · UNILAG
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
              One place for coursework, community and{" "}
              <span className="text-primary">actuarial resources</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              ASISA gathers your course directory, past questions, department
              announcements and class conversations — built for ASI students at
              the University of Lagos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started <ArrowRight className="ml-2" size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "signin" }}>
                  I already have an account
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="asisa-card p-6">
              <div className="thumb-16-5 rounded-md" style={{ background: "var(--color-hunter)" }} />
              <div className="mt-4">
                <div className="text-xs font-medium text-primary">ACT 301 · 300 Level</div>
                <div className="mt-1 font-display text-lg font-semibold">
                  Life Contingencies I
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Survival models, life tables and single-life annuities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 md:grid-cols-4">
          {[
            { icon: Book, title: "Course directory", copy: "Browse every ASI course by level and semester." },
            { icon: Mortarboard, title: "Class feeds", copy: "Private feed scoped to your level and session." },
            { icon: ChatSquareText, title: "Department feed", copy: "Announcements and discussion from ASISA." },
            { icon: People, title: "Groups", copy: "Study circles started by your peers." },
          ].map((f) => (
            <div key={f.title} className="asisa-card p-5">
              <f.icon size={20} className="text-primary" />
              <div className="mt-3 font-display font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldLock size={14} /> Row-level security enforced on every request
          </div>
          <div>© {new Date().getFullYear()} ASISA · UNILAG</div>
        </div>
      </footer>
    </div>
  );
}
