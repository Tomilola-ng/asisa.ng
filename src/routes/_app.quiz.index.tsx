import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { listCourses } from "@/lib/api";
import { createQuiz, listQuizzes } from "@/lib/quiz-api";
import {
  extractTextFromFile,
  isImageQuizFile,
  isSupportedQuizFile,
  parseQuestionsFromText,
} from "@/lib/quiz-parser";
import type { QuizQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileEarmarkArrowUp, PatchQuestion, Plus, Trash } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/quiz/")({
  head: () => ({ meta: [{ title: "Quiz · Actuarial Science & Insurance Nexus" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: QuizHub,
});

function QuizHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canPublish = user?.role === "super_admin" || user?.role === "course_rep";
  const [createOpen, setCreateOpen] = useState(false);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => listQuizzes(),
  });
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: listCourses });

  const courseName = (id: string) => {
    const c = courses.find((c) => c.id === id);
    return c ? `${c.code} · ${c.title}` : "Unknown course";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white">Practice</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-white">Quiz</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-white">
              <PatchQuestion size={14} className="shrink-0 text-white" /> Auto-extracted
              questions, published per course.
            </p>
          </div>
          {canPublish && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-1.5" /> New quiz
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full text-center text-sm text-muted-foreground">
            Loading quizzes…
          </div>
        )}
        {quizzes.map((quiz) => (
          <Card key={quiz.id}>
            <CardHeader className="pb-2">
              <Badge variant="secondary" className="w-fit">
                {courseName(quiz.courseId)}
              </Badge>
              <CardTitle className="text-base">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
              </p>
              <Button asChild size="sm">
                <Link to="/quiz/$id" params={{ id: quiz.id }}>
                  Take quiz
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && quizzes.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No quizzes published yet.
          </div>
        )}
      </div>

      {canPublish && (
        <CreateQuizDialog
          open={createOpen}
          courses={courses}
          userId={user!.id}
          onClose={() => setCreateOpen(false)}
          onPublished={async () => {
            setCreateOpen(false);
            await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast.success("Quiz published");
          }}
        />
      )}
    </div>
  );
}

type Step = "upload" | "preview" | "publish";

function CreateQuizDialog({
  open,
  courses,
  userId,
  onClose,
  onPublished,
}: {
  open: boolean;
  courses: Array<{ id: string; code: string; title: string; level: number }>;
  userId: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [extracting, setExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [twoColumn, setTwoColumn] = useState(false);

  function reset() {
    setStep("upload");
    setExtracting(false);
    setOcrProgress(null);
    setFileName("");
    setQuestions([]);
    setTitle("");
    setCourseId("");
    setTwoColumn(false);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (!isSupportedQuizFile(file.name)) {
      toast.error("Upload a .pdf, .txt, .md, or image (.png/.jpg/.webp) file.");
      return;
    }
    setExtracting(true);
    setOcrProgress(isImageQuizFile(file.name) ? 0 : null);
    try {
      const text = await extractTextFromFile(
        file,
        isImageQuizFile(file.name) ? setOcrProgress : undefined,
        { twoColumn },
      );
      const parsed = parseQuestionsFromText(text);
      if (parsed.length === 0) {
        toast.error("Couldn't find any questions in that document. Try editing it and re-uploading.");
        return;
      }
      setFileName(file.name);
      setQuestions(parsed);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file");
    } finally {
      setExtracting(false);
      setOcrProgress(null);
    }
  }

  function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(id: string, index: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id || !q.options) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      }),
    );
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  const publishMutation = useMutation({
    mutationFn: () =>
      createQuiz({
        courseId,
        title: title.trim(),
        createdBy: userId,
        questions,
      }),
    onSuccess: () => {
      onPublished();
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New quiz</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a document or a photo/scan of a question sheet. We'll extract the
              questions (using OCR for images) so you can review before publishing.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,image/*"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={extracting}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/40 disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileEarmarkArrowUp size={24} />
              {extracting
                ? ocrProgress !== null
                  ? `Scanning image… ${Math.round(ocrProgress * 100)}%`
                  : "Reading document…"
                : "Click to choose a .pdf, .txt, .md, or image file"}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={twoColumn}
                onCheckedChange={(v) => setTwoColumn(v === true)}
                disabled={extracting}
              />
              This is a photo/scan with two columns (like an exam paper)
            </label>
            <p className="text-xs text-muted-foreground">
              We try to detect columns automatically — check this if the scan came out jumbled
              (text from both columns mixed on one line).
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Extracted from <span className="font-medium">{fileName}</span> — edit anything the
              scan got wrong.
            </p>
            <div className="space-y-4">
              {questions.map((q, index) => (
                <QuestionEditor
                  key={q.id}
                  index={index}
                  question={q}
                  onChange={(patch) => updateQuestion(q.id, patch)}
                  onChangeOption={(i, value) => updateOption(q.id, i, value)}
                  onRemove={() => removeQuestion(q.id)}
                />
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All questions removed. Go back and upload another document.
                </p>
              )}
            </div>
          </div>
        )}

        {step === "publish" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quiz title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the course this quiz belongs to" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {c.title} ({c.level}L)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {questions.length} question{questions.length === 1 ? "" : "s"} will be published.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step === "preview" && (
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
            )}
            {step === "publish" && (
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Cancel
            </Button>
            {step === "preview" && (
              <Button disabled={questions.length === 0} onClick={() => setStep("publish")}>
                Continue
              </Button>
            )}
            {step === "publish" && (
              <Button
                disabled={!title.trim() || !courseId || publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? "Publishing…" : "Publish quiz"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionEditor({
  index,
  question,
  onChange,
  onChangeOption,
  onRemove,
}: {
  index: number;
  question: QuizQuestion;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onChangeOption: (index: number, value: string) => void;
  onRemove: () => void;
}) {
  const isMcq = question.type === "mcq";
  const options = useMemo(() => question.options ?? [], [question.options]);

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <Label className="text-xs text-muted-foreground">
          Question {index + 1} · {isMcq ? "Multiple choice" : "Short answer"}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          aria-label="Remove question"
          onClick={onRemove}
        >
          <Trash size={13} />
        </Button>
      </div>
      <Textarea
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        className="min-h-[60px]"
      />
      {isMcq && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={question.correctIndex === i}
                onChange={() => onChange({ correctIndex: i })}
                aria-label={`Mark option ${i + 1} as correct`}
                className="shrink-0"
              />
              <Input value={opt} onChange={(e) => onChangeOption(i, e.target.value)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Select the radio button next to the correct option.
          </p>
        </div>
      )}
    </div>
  );
}
