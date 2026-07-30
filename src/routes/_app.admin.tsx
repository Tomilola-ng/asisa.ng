import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { LEVELS } from "@/lib/data";
import {
  assignRole,
  createDepartment,
  createSession,
  listCourses,
  listDepartments,
  listProfilesForAdmin,
  listRolesForAdmin,
  listSessions,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Building, CalendarWeek, Mortarboard, Book, ShieldLock } from "react-bootstrap-icons";
import { toast } from "sonner";
import type { Role } from "@/lib/types";
import { requireAuthRedirect } from "@/lib/auth-guard";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Super admin — ASISA" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Super admins only");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const profilesQuery = useQuery({ queryKey: ["admin-profiles"], queryFn: listProfilesForAdmin });
  const rolesQuery = useQuery({ queryKey: ["admin-roles"], queryFn: listRolesForAdmin });

  const [deptForm, setDeptForm] = useState({ code: "", name: "" });
  const [sessionLabel, setSessionLabel] = useState("");
  const [roleForm, setRoleForm] = useState({
    userId: "",
    role: "course_rep" as Role,
    departmentId: "",
    level: "300",
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["departments"] }),
      queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
      queryClient.invalidateQueries({ queryKey: ["courses"] }),
    ]);
  };

  const deptMutation = useMutation({
    mutationFn: () => createDepartment(deptForm.code.trim(), deptForm.name.trim()),
    onSuccess: async () => {
      setDeptForm({ code: "", name: "" });
      await invalidateAll();
      toast.success("Department created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessionMutation = useMutation({
    mutationFn: () => createSession(sessionLabel.trim(), true),
    onSuccess: async () => {
      setSessionLabel("");
      await invalidateAll();
      toast.success("Session created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: () =>
      assignRole({
        userId: roleForm.userId,
        role: roleForm.role,
        departmentId: roleForm.role === "course_rep" ? roleForm.departmentId : null,
        level: roleForm.role === "course_rep" ? Number(roleForm.level) : null,
      }),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Role assigned");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const departments = departmentsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const stats = [
    { icon: Book, label: "Courses", value: coursesQuery.data?.length ?? 0 },
    { icon: Building, label: "Departments", value: departments.length },
    { icon: CalendarWeek, label: "Sessions", value: sessions.length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Super admin</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldLock size={14} className="text-primary" /> Full control across all departments and levels.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          <CardContent className="space-y-4">
            <ul className="divide-y divide-border">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.name}</span>
                  <Badge variant="outline">{d.code}</Badge>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input
                placeholder="Code"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              />
              <Input
                placeholder="Name"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
              <Button
                disabled={!deptForm.code.trim() || !deptForm.name.trim() || deptMutation.isPending}
                onClick={() => deptMutation.mutate()}
              >
                Add
              </Button>
            </div>
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
                {sessions.map((s) => (
                  <Badge key={s.id} variant={s.isCurrent ? "default" : "outline"}>
                    {s.label}{s.isCurrent ? " · current" : ""}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="2026/2027"
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
              />
              <Button
                disabled={!sessionLabel.trim() || sessionMutation.isPending}
                onClick={() => sessionMutation.mutate()}
              >
                Add session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assign roles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label>User</Label>
              <Select
                value={roleForm.userId || undefined}
                onValueChange={(v) => setRoleForm({ ...roleForm, userId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {(profilesQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || p.email || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={roleForm.role}
                onValueChange={(v) => setRoleForm({ ...roleForm, role: v as Role })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                  <SelectItem value="course_rep">Course rep</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roleForm.role === "course_rep" && (
              <>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select
                    value={roleForm.departmentId || undefined}
                    onValueChange={(v) => setRoleForm({ ...roleForm, departmentId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select
                    value={roleForm.level}
                    onValueChange={(v) => setRoleForm({ ...roleForm, level: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <Button
            disabled={
              !roleForm.userId ||
              roleMutation.isPending ||
              (roleForm.role === "course_rep" && !roleForm.departmentId)
            }
            onClick={() => roleMutation.mutate()}
          >
            Assign role
          </Button>

          <ul className="divide-y divide-border text-sm">
            {(rolesQuery.data ?? []).map((r) => {
              const profile = profilesQuery.data?.find((p) => p.id === r.userId);
              const dept = departments.find((d) => d.id === r.departmentId);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{profile?.fullName || profile?.email || r.userId}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{r.role}</Badge>
                    {dept ? <Badge variant="outline">{dept.code}</Badge> : null}
                    {r.level ? <Badge variant="outline">{r.level}L</Badge> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
