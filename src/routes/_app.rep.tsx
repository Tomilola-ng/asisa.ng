import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, LEVELS, SEMESTERS, DEPARTMENTS } from "@/lib/data";
import type { Course } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSquare, ShieldCheck } from "react-bootstrap-icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rep")({
  head: () => ({ meta: [{ title: "Course rep dashboard — ASISA" }] }),
  component: RepDashboard,
});

function RepDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, force] = useState(0);
  const [editing, setEditing] = useState<Course | null>(null);

  useEffect(() => {
    if (user && user.role !== "course_rep" && user.role !== "super_admin") {
      toast.error("Course representatives only");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  // Scope: only courses in the rep's department + level
  const scopedDept = user?.scopedDepartmentId ?? "d-asi";
  const scopedLevel = user?.scopedLevel ?? user?.level;
  const mine = store.courses.filter(
    (c) =>
      c.departmentId === scopedDept &&
      (user?.role === "super_admin" || !scopedLevel || c.level === scopedLevel),
  );

  function save(c: Course) {
    const idx = store.courses.findIndex((x) => x.id === c.id);
    if (idx >= 0) store.courses[idx] = c;
    else store.courses.push(c);
    setEditing(null);
    force((n) => n + 1);
    toast.success("Course saved");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Course rep dashboard</h1>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" /> Scope enforced by RLS: your department & level only.
          </p>
        </div>
        <Button onClick={() => setEditing({
          id: crypto.randomUUID(),
          code: "",
          title: "",
          departmentId: scopedDept,
          level: (scopedLevel as Course["level"]) ?? 300,
          semester: 1,
          units: 3,
          description: "",
        })}>
          <Plus size={16} className="mr-1.5" /> Add course
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="text-xs font-medium text-primary">{c.code}</div>
              <CardTitle className="text-base">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              <div className="text-xs text-muted-foreground">
                {c.level} Level · Semester {c.semester}
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                <PencilSquare size={13} className="mr-1.5" /> Edit resources
              </Button>
            </CardContent>
          </Card>
        ))}
        {mine.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No courses in your scope yet.
          </div>
        )}
      </div>

      <CourseDialog editing={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function CourseDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Course | null;
  onClose: () => void;
  onSave: (c: Course) => void;
}) {
  const [form, setForm] = useState<Course | null>(editing);
  useEffect(() => setForm(editing), [editing]);
  if (!form) return null;
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Course details</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Units</Label>
              <Input type="number" value={form.units} onChange={(e) => setForm({ ...form, units: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={String(form.level)} onValueChange={(v) => setForm({ ...form, level: Number(v) as Course["level"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={String(form.semester)} onValueChange={(v) => setForm({ ...form, semester: Number(v) as Course["semester"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Google Drive folder URL</Label>
            <Input value={form.driveFolderUrl ?? ""} onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })} placeholder="https://drive.google.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label>Past questions URL</Label>
            <Input value={form.pastQuestionsUrl ?? ""} onChange={(e) => setForm({ ...form, pastQuestionsUrl: e.target.value })} placeholder="https://drive.google.com/..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// re-export for typing consistency (avoid unused-import warning if tree-shaken)
export const _departments = DEPARTMENTS;
