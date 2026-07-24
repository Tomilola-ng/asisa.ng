import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, People, ChatSquareText, Mortarboard, ArrowRight } from "react-bootstrap-icons";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/data";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ASISA" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const myCourses = store.courses.filter((c) => c.level === (user?.level ?? 300)).slice(0, 3);

  const tiles = [
    { icon: Book, title: "Courses", to: "/courses", count: store.courses.length },
    { icon: ChatSquareText, title: "Public feed", to: "/feed", count: store.posts.length },
    { icon: Mortarboard, title: "My class", to: "/feed/class", count: 0 },
    { icon: People, title: "Groups", to: "/groups", count: store.groups.length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          {user?.fullName || user?.email}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="group">
            <Card className="border-border transition-colors group-hover:border-primary/40">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <t.icon size={20} className="text-primary" />
                  <div className="mt-3 font-display text-sm font-medium">{t.title}</div>
                  <div className="text-2xl font-semibold">{t.count}</div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your courses</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/courses">See all</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCourses.map((c) => (
            <Link key={c.id} to="/courses/$id" params={{ id: c.id }}>
              <Card className="overflow-hidden transition-colors hover:border-primary/40">
                <div className="thumb-16-5" style={{ background: "var(--color-hunter)" }} />
                <CardHeader className="pb-2">
                  <div className="text-xs font-medium text-primary">{c.code}</div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {c.level} Level · Semester {c.semester} · {c.units} units
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
