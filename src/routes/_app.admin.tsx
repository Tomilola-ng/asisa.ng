import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENTS, SESSIONS, LEVELS, store } from "@/lib/data";
import { Building, CalendarWeek, Mortarboard, Book, People, ShieldLock } from "react-bootstrap-icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Super admin — ASISA" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Super admins only");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const stats = [
    { icon: Book, label: "Courses", value: store.courses.length },
    { icon: People, label: "Groups", value: store.groups.length },
    { icon: Building, label: "Departments", value: DEPARTMENTS.length },
    { icon: CalendarWeek, label: "Sessions", value: SESSIONS.length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Super admin</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldLock size={14} className="text-primary" /> Full control across all departments and levels.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <s.icon size={20} className="text-primary" />
                <div className="mt-3 text-sm text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-semibold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {DEPARTMENTS.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.name}</span>
                  <Badge variant="outline">{d.code}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Academic structure</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Levels</div>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <Badge key={l} variant="secondary" className="inline-flex items-center gap-1">
                    <Mortarboard size={11} /> {l}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Sessions</div>
              <div className="flex flex-wrap gap-1.5">
                {SESSIONS.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
