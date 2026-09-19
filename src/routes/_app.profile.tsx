import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { listDepartments, uploadAvatar } from "@/lib/api";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { LEVELS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BoxArrowRight, Mortarboard, Person } from "react-bootstrap-icons";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile · Actuarial Science & Insurance Nexus" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: ProfilePage,
});

type ProfileSection = "general" | "school" | "logout";

const NAV: { id: ProfileSection; label: string; icon: typeof Person }[] = [
  { id: "general", label: "General info", icon: Person },
  { id: "school", label: "School info", icon: Mortarboard },
  { id: "logout", label: "Log out", icon: BoxArrowRight },
];

function roleLabel(role?: Role) {
  if (role === "super_admin") return "Super admin";
  if (role === "course_rep") return "Course rep";
  return "Student";
}

function profileInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<ProfileSection>("general");
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
  });
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    matricNumber: user?.matricNumber ?? "",
    level: String(user?.level ?? 300),
    departmentId: user?.departmentId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setForm({
      fullName: user?.fullName ?? "",
      matricNumber: user?.matricNumber ?? "",
      level: String(user?.level ?? 300),
      departmentId: user?.departmentId ?? "",
    });
  }, [user]);

  async function saveGeneral() {
    setSaving(true);
    try {
      await updateProfile({ fullName: form.fullName });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function saveSchool() {
    setSaving(true);
    try {
      await updateProfile({
        matricNumber: form.matricNumber,
        level: Number(form.level) as 100 | 200 | 300 | 400 | 500,
        departmentId: form.departmentId || undefined,
      });
      toast.success("School info updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file || !user) return;
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile({ avatarUrl: url });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log out");
      setLoggingOut(false);
    }
  }

  const navButtonClass = (id: ProfileSection) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-full border px-4 py-3 text-left text-sm font-medium transition-colors",
      section === id
        ? "border-primary bg-primary/5 text-primary"
        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      id === "logout" &&
        section !== id &&
        "text-destructive hover:border-destructive/40 hover:text-destructive",
      id === "logout" &&
        section === id &&
        "border-destructive/50 bg-destructive/5 text-destructive",
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and student information.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto pb-1 md:w-52 md:flex-col md:gap-1.5 md:overflow-visible md:pb-0">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(navButtonClass(item.id), "shrink-0 md:shrink")}
            >
              <item.icon size={16} className="shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-2xl border border-border p-5 sm:p-6">
          {section === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold">General info</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your photo and display name on Actuarial Science & Insurance Nexus.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
                <Avatar className="h-24 w-24">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                    {profileInitials(user?.fullName || user?.email || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                  <p className="truncate font-display text-xl font-semibold">
                    {user?.fullName || "Actuarial Science & Insurance Nexus member"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex justify-center sm:justify-start">
                    <Badge variant="secondary">{roleLabel(user?.role)}</Badge>
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="avatar" className="sr-only">
                      Profile photo
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fn">Full name</Label>
                  <Input
                    id="fn"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <Button onClick={() => void saveGeneral()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          )}

          {section === "school" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold">School info</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your matric number, level, and department.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mn">Matric number</Label>
                  <Input
                    id="mn"
                    value={form.matricNumber}
                    onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                    placeholder="e.g. 190806012"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
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
                    value={form.departmentId || undefined}
                    onValueChange={(v) => setForm({ ...form, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.code} - {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => void saveSchool()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          )}

          {section === "logout" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Log out</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  End your session on this device.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 px-5 py-6">
                <p className="font-medium">Are you sure you want to log out?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can sign back in anytime with your Actuarial Science & Insurance Nexus
                  account.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Logging out…" : "Yes, log out"}
                  </Button>
                  <Button variant="outline" onClick={() => setSection("general")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
