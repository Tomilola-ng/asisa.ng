import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { LEVELS, SEMESTERS } from "@/lib/data";
import type { Course } from "@/lib/data";
import {
  coursesHaveSession,
  deleteCourse,
  findOrCreateSession,
  listCourses,
  listDepartments,
  listSessions,
  uploadCourseThumbnail,
  upsertCourse,
} from "@/lib/api";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSquare, ShieldCheck, Trash } from "react-bootstrap-icons";
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
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

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
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
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
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Course saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: async () => {
      setDeleteTarget(null);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "Department";
  const sessionLabel = (id?: string) =>
    sessions.find((s) => s.id === id)?.label ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white">Course management</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-white">
              Course rep dashboard
            </h1>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-white">
              <ShieldCheck size={14} className="shrink-0 text-white" /> Upload materials,
              thumbnails, and Drive links for your level.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setEditing(emptyCourse(scopedDept, (scopedLevel as Course["level"]) ?? 300))
            }
          >
            <Plus size={16} className="mr-1.5" /> Add course
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div
              className="thumb-16-5 bg-cover bg-center"
              style={{
                backgroundColor: "var(--color-hunter)",
                backgroundImage: c.thumbnailUrl ? `url(${c.thumbnailUrl})` : undefined,
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{c.code}</Badge>
                {sessionLabel(c.sessionId) ? (
                  <Badge variant="outline">{sessionLabel(c.sessionId)}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-base">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              <div className="text-xs text-muted-foreground">
                {deptName(c.departmentId)} · {c.level} Level · Semester {c.semester}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <PencilSquare size={13} className="mr-1.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash size={13} className="mr-1.5" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {mine.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No courses in your scope yet. Add your first course to get started.
          </div>
        )}
      </div>

      <CourseDialog
        editing={editing}
        departments={departments}
        sessions={sessions}
        thumbFile={thumbFile}
        onThumbFile={setThumbFile}
        onClose={() => {
          setEditing(null);
          setThumbFile(null);
        }}
        onSave={(course) => saveMutation.mutate(course)}
        onDelete={editing?.id ? () => setDeleteTarget(editing) : undefined}
        saving={saveMutation.isPending}
        onSessionsChange={() => queryClient.invalidateQueries({ queryKey: ["sessions"] })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" will be permanently removed.`
                : "This course will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseDialog({
  editing,
  departments,
  sessions,
  thumbFile,
  onThumbFile,
  onClose,
  onSave,
  onDelete,
  saving,
  onSessionsChange,
}: {
  editing: Course | null;
  departments: Array<{ id: string; code: string; name: string }>;
  sessions: Array<{ id: string; label: string; isCurrent: boolean }>;
  thumbFile: File | null;
  onThumbFile: (f: File | null) => void;
  onClose: () => void;
  onSave: (c: Course) => void;
  onDelete?: () => void;
  saving: boolean;
  onSessionsChange: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Course | null>(editing);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionLabel, setNewSessionLabel] = useState("");

  useEffect(() => {
    if (!editing) {
      setForm(null);
      return;
    }
    const currentSession = sessions.find((s) => s.isCurrent);
    setForm({
      ...editing,
      ...(coursesHaveSession
        ? { sessionId: editing.sessionId ?? currentSession?.id }
        : {}),
    });
    onThumbFile(null);
    setAddSessionOpen(false);
    setNewSessionLabel("");
  }, [editing, sessions, onThumbFile]);

  useEffect(() => {
    if (!thumbFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);

  const addSessionMutation = useMutation({
    mutationFn: () => findOrCreateSession(newSessionLabel.trim()),
    onSuccess: async (session) => {
      setForm((prev) => (prev ? { ...prev, sessionId: session.id } : prev));
      setAddSessionOpen(false);
      setNewSessionLabel("");
      onSessionsChange();
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(`Session "${session.label}" added`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const displayImage = previewUrl ?? form?.thumbnailUrl ?? null;
  const departmentName =
    departments.find((d) => d.id === form?.departmentId)?.name ?? "Select department";
  const sessionValue = form?.sessionId ?? sessions.find((s) => s.isCurrent)?.id ?? "";

  if (!form) return null;

  return (
    <>
      <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit course" : "Add course"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onThumbFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="group relative block w-full overflow-hidden rounded-xl border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Course thumbnail"
                    className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Plus size={22} />
                    <span>Add thumbnail</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                  {displayImage ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
                      <PencilSquare size={16} />
                    </span>
                  ) : null}
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Units</Label>
                <Input
                  type="number"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
                />
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
                <SelectTrigger>
                  <SelectValue placeholder="Select department">{departmentName}</SelectValue>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select
                  value={String(form.level)}
                  onValueChange={(v) => setForm({ ...form, level: Number(v) as Course["level"] })}
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
                <Label>Semester</Label>
                <Select
                  value={String(form.semester)}
                  onValueChange={(v) =>
                    setForm({ ...form, semester: Number(v) as Course["semester"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {coursesHaveSession && (
              <div className="space-y-1.5">
                <Label>Academic session</Label>
                <div className="flex gap-2">
                  <Select
                    value={sessionValue || undefined}
                    onValueChange={(v) => setForm({ ...form, sessionId: v })}
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                          {s.isCurrent ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-12 shrink-0"
                    aria-label="Add academic session"
                    onClick={() => setAddSessionOpen(true)}
                  >
                    <Plus size={18} />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Google Drive folder URL</Label>
              <Input
                value={form.driveFolderUrl ?? ""}
                onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Past questions URL</Label>
              <Input
                value={form.pastQuestionsUrl ?? ""}
                onChange={(e) => setForm({ ...form, pastQuestionsUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {onDelete && form.id ? (
                <Button type="button" variant="destructive" onClick={onDelete}>
                  Delete course
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={saving || !form.code.trim() || !form.title.trim()}
                onClick={() => onSave(form)}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={addSessionOpen} onOpenChange={setAddSessionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New academic session</AlertDialogTitle>
            <AlertDialogDescription>
              e.g. 2026/2027 — this will be available for all courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newSessionLabel}
            onChange={(e) => setNewSessionLabel(e.target.value)}
            placeholder="2026/2027"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!newSessionLabel.trim() || addSessionMutation.isPending}
              onClick={() => addSessionMutation.mutate()}
            >
              Add session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
