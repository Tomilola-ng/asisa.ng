import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { LEVELS, SEMESTERS } from "@/lib/data";
import type { Course } from "@/lib/data";
import { listCourses, listDepartments, uploadCourseThumbnail, upsertCourse } from "@/lib/api";
import { requireAuthRedirect } from "@/lib/auth-guard";
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
  beforeLoad: () => requireAuthRedirect(),
  component: RepDashboard,
});

function emptyCourse(departmentId: string, level: Course["level"]): Course {
  return {
    id: "",
    code: "",
    title: "",
    departmentId,
    level,
    semester: 1,
    units: 3,
    description: "",
  };
}

function RepDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Course | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && user.role !== "course_rep" && user.role !== "super_admin") {
      toast.error("Course representatives only");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const scopedDept =
    user?.scopedDepartmentId ??
    user?.departmentId ??
    departments.find((d) => d.code === "ASI")?.id ??
    "";
  const scopedLevel = user?.scopedLevel ?? user?.level;
  const mine = courses.filter(
    (c) =>
      user?.role === "super_admin" ||
      (c.departmentId === scopedDept && (!scopedLevel || c.level === scopedLevel)),
  );

  const saveMutation = useMutation({
    mutationFn: async (course: Course) => {
      if (!user) throw new Error("Not signed in");
      const saved = await upsertCourse(
        {
          ...course,
          id: course.id || undefined,
          departmentId: course.departmentId || scopedDept || departments[0]?.id || "",
        },
        user.id,
      );
      if (thumbFile && saved.id) {
        await uploadCourseThumbnail(saved.id, user.id, thumbFile);
      }
      return saved;
    },
    onSuccess: async () => {
      setEditing(null);
      setThumbFile(null);
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Course rep dashboard</h1>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" /> Scope enforced by RLS: your department & level only.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing(
              emptyCourse(scopedDept, (scopedLevel as Course["level"]) ?? 300),
            )
          }
        >
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

      <CourseDialog
        editing={editing}
        departments={departments}
        thumbFile={thumbFile}
        onThumbFile={setThumbFile}
        onClose={() => {
          setEditing(null);
          setThumbFile(null);
        }}
        onSave={(c) => saveMutation.mutate(c)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}

function CourseDialog({
  editing,
  departments,
  thumbFile,
  onThumbFile,
  onClose,
  onSave,
  saving,
}: {
  editing: Course | null;
  departments: Array<{ id: string; code: string; name: string }>;
  thumbFile: File | null;
  onThumbFile: (f: File | null) => void;
  onClose: () => void;
  onSave: (c: Course) => void;
  saving: boolean;
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
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={form.departmentId}
              onValueChange={(v) => setForm({ ...form, departmentId: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="space-y-1.5">
            <Label>Thumbnail image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onThumbFile(e.target.files?.[0] ?? null)}
            />
            {thumbFile ? (
              <p className="text-xs text-muted-foreground">{thumbFile.name}</p>
            ) : form.thumbnailUrl ? (
              <p className="text-xs text-muted-foreground">Current thumbnail set</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !form.code.trim() || !form.title.trim()} onClick={() => onSave(form)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
