import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { LEVELS } from "@/lib/data";
import {
  assignRole,
  createDepartment,
  deleteAdminUser,
  deleteDepartment,
  deleteRole,
  listAdminUsers,
  listCourses,
  listDepartments,
  updateAdminUserProfile,
  updateDepartment,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelImagesManager } from "@/components/level-images-manager";
import { FeatureFlagsManager } from "@/components/feature-flags-manager";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building,
  People,
  Book,
  ShieldLock,
  PencilSquare,
  Trash,
  Search,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import type { AdminUser, Role } from "@/lib/types";
import { requireAuthRedirect } from "@/lib/auth-guard";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Super admin · Actuarial Science & Insurance Nexus" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: AdminDashboard,
});

function primaryRoleLabel(user: AdminUser): string {
  if (user.roles.some((r) => r.role === "super_admin")) return "Super admin";
  if (user.roles.some((r) => r.role === "course_rep")) return "Course rep";
  return "Student";
}

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deptForm, setDeptForm] = useState({ code: "", name: "" });
  const [editingDept, setEditingDept] = useState<{ id: string; code: string; name: string } | null>(
    null,
  );
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(null);

  const [userForm, setUserForm] = useState({
    fullName: "",
    matricNumber: "",
    level: "300",
    departmentId: "",
  });
  const [repForm, setRepForm] = useState({ departmentId: "", level: "300" });

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Super admins only");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserForm({
      fullName: selectedUser.fullName,
      matricNumber: selectedUser.matricNumber ?? "",
      level: String(selectedUser.level ?? 300),
      departmentId: selectedUser.departmentId ?? "",
    });
    setRepForm({ departmentId: "", level: "300" });
  }, [selectedUser]);

  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: listAdminUsers });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["departments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
      queryClient.invalidateQueries({ queryKey: ["courses"] }),
    ]);
  };

  const deptCreateMutation = useMutation({
    mutationFn: () => createDepartment(deptForm.code.trim(), deptForm.name.trim()),
    onSuccess: async () => {
      setDeptForm({ code: "", name: "" });
      await invalidateAll();
      toast.success("Department created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deptUpdateMutation = useMutation({
    mutationFn: () =>
      updateDepartment(editingDept!.id, {
        code: editingDept!.code.trim(),
        name: editingDept!.name.trim(),
      }),
    onSuccess: async () => {
      setEditingDept(null);
      await invalidateAll();
      toast.success("Department updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deptDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: async () => {
      setDeleteDeptId(null);
      await invalidateAll();
      toast.success("Department deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveUserMutation = useMutation({
    mutationFn: () =>
      updateAdminUserProfile(selectedUser!.id, {
        fullName: userForm.fullName.trim(),
        matricNumber: userForm.matricNumber.trim(),
        level: Number(userForm.level),
        departmentId: userForm.departmentId || null,
      }),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("User profile updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addRoleMutation = useMutation({
    mutationFn: (input: {
      role: Role;
      departmentId?: string | null;
      level?: number | null;
    }) =>
      assignRole({
        userId: selectedUser!.id,
        role: input.role,
        departmentId: input.departmentId,
        level: input.level,
      }),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Role added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Role removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: async () => {
      setDeleteUserTarget(null);
      setSelectedUser(null);
      await invalidateAll();
      toast.success("User deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const departments = departmentsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.matricNumber?.toLowerCase().includes(q) ?? false),
    );
  }, [users, userSearch]);

  useEffect(() => {
    if (!selectedUser) return;
    const fresh = users.find((u) => u.id === selectedUser.id);
    if (fresh) setSelectedUser(fresh);
  }, [users, selectedUser?.id]);

  const stats = [
    { icon: Book, label: "Courses", value: coursesQuery.data?.length ?? 0 },
    { icon: Building, label: "Departments", value: departments.length },
    { icon: People, label: "Students", value: users.length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white">Administration</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-white">Super admin</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-white">
              <ShieldLock size={14} className="shrink-0 text-white" /> Manage departments, users,
              and platform access.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-primary/15">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-semibold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FeatureFlagsManager />

      <LevelImagesManager />

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {departments.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.code}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Edit ${d.name}`}
                    onClick={() => setEditingDept({ id: d.id, code: d.code, name: d.name })}
                  >
                    <PencilSquare size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => setDeleteDeptId(d.id)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </li>
            ))}
            {departments.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No departments yet.
              </li>
            )}
          </ul>
          <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <Input
              placeholder="Code"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
            />
            <Input
              placeholder="Full department name"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            />
            <Button
              disabled={!deptForm.code.trim() || !deptForm.name.trim() || deptCreateMutation.isPending}
              onClick={() => deptCreateMutation.mutate()}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or matric"
                className="pl-9"
              />
            </div>
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {filteredUsers.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.fullName || u.email || "Unnamed"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {u.email}
                        {u.matricNumber ? ` · ${u.matricNumber}` : ""}
                        {u.level ? ` · ${u.level}L` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary">{primaryRoleLabel(u)}</Badge>
                  </button>
                </li>
              ))}
              {filteredUsers.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No users match your search.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.fullName || selectedUser.email}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="admin-user-name">Full name</Label>
                  <Input
                    id="admin-user-name"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  />
                  <Label htmlFor="admin-user-matric">Matric number</Label>
                  <Input
                    id="admin-user-matric"
                    value={userForm.matricNumber}
                    onChange={(e) => setUserForm({ ...userForm, matricNumber: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Level</Label>
                      <Select
                        value={userForm.level}
                        onValueChange={(v) => setUserForm({ ...userForm, level: v })}
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
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Select
                        value={userForm.departmentId || undefined}
                        onValueChange={(v) => setUserForm({ ...userForm, departmentId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={saveUserMutation.isPending}
                    onClick={() => saveUserMutation.mutate()}
                  >
                    Save profile
                  </Button>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <Label>Roles</Label>
                  <ul className="space-y-2">
                    {selectedUser.roles.map((r) => {
                      const dept = departments.find((d) => d.id === r.departmentId);
                      return (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <div>
                            <Badge variant="secondary">{r.role.replace("_", " ")}</Badge>
                            {dept ? (
                              <span className="ml-2 text-xs text-muted-foreground">{dept.name}</span>
                            ) : null}
                            {r.level ? (
                              <span className="ml-1 text-xs text-muted-foreground">{r.level}L</span>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeRoleMutation.mutate(r.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </li>
                      );
                    })}
                    {selectedUser.roles.length === 0 && (
                      <li className="text-sm text-muted-foreground">No roles assigned.</li>
                    )}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {!selectedUser.roles.some((r) => r.role === "super_admin") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={addRoleMutation.isPending}
                        onClick={() => addRoleMutation.mutate({ role: "super_admin" })}
                      >
                        Make admin
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={addRoleMutation.isPending}
                      onClick={() => addRoleMutation.mutate({ role: "student" })}
                    >
                      Add student role
                    </Button>
                  </div>
                  <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                    <Label className="text-xs text-muted-foreground">Add course rep role</Label>
                    <Select
                      value={repForm.departmentId || undefined}
                      onValueChange={(v) => setRepForm({ ...repForm, departmentId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={repForm.level}
                      onValueChange={(v) => setRepForm({ ...repForm, level: v })}
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
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={!repForm.departmentId || addRoleMutation.isPending}
                      onClick={() =>
                        addRoleMutation.mutate({
                          role: "course_rep",
                          departmentId: repForm.departmentId,
                          level: Number(repForm.level),
                        })
                      }
                    >
                      Add course rep
                    </Button>
                  </div>
                </div>

                {selectedUser.id !== user?.id && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => setDeleteUserTarget(selectedUser)}
                  >
                    Delete user
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit department</AlertDialogTitle>
          </AlertDialogHeader>
          {editingDept && (
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={editingDept.code}
                  onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deptUpdateMutation.isPending}
              onClick={() => deptUpdateMutation.mutate()}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDeptId} onOpenChange={(open) => !open && setDeleteDeptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              This only works if no courses are linked to the department. Remove or reassign courses
              first if deletion fails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDeptId && deptDeleteMutation.mutate(deleteDeptId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteUserTarget}
        onOpenChange={(open) => !open && setDeleteUserTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteUserTarget?.fullName || deleteUserTarget?.email} and
              all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteUserTarget && deleteUserMutation.mutate(deleteUserTarget.id)
              }
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
