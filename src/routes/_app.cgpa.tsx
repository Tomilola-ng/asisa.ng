import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  type CourseRow,
  type Grade,
  type SemesterBlock,
  GRADES,
  INITIAL_GPA_COURSES,
  INITIAL_SEMESTERS,
  formatGpa,
  newCourseRow,
  newSemester,
  requiredGpaForTarget,
  summarizeCourses,
  summarizeSemesters,
} from "@/lib/cgpa";
import { ArrowLeft, Plus, Trash } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/cgpa")({
  head: () => ({ meta: [{ title: "GPA & CGPA Calculator · ASISA" }] }),
  component: CgpaPage,
});

type Mode = "gpa" | "cgpa" | "target";

function CgpaPage() {
  const [mode, setMode] = useState<Mode>("gpa");
  const [gpaCourses, setGpaCourses] = useState<CourseRow[]>(INITIAL_GPA_COURSES);
  const [semesters, setSemesters] = useState<SemesterBlock[]>(INITIAL_SEMESTERS);
  const [currentUnits, setCurrentUnits] = useState("");
  const [currentQp, setCurrentQp] = useState("");
  const [futureUnits, setFutureUnits] = useState("");
  const [targetCgpa, setTargetCgpa] = useState("");
  const [showResult, setShowResult] = useState(false);

  const gpaSummary = useMemo(() => summarizeCourses(gpaCourses), [gpaCourses]);
  const cgpaSummary = useMemo(() => summarizeSemesters(semesters), [semesters]);
  const requiredGpa = useMemo(
    () =>
      requiredGpaForTarget({
        currentUnits: Number(currentUnits) || 0,
        currentQualityPoints: Number(currentQp) || 0,
        futureUnits: Number(futureUnits) || 0,
        targetCgpa: Number(targetCgpa) || 0,
      }),
    [currentUnits, currentQp, futureUnits, targetCgpa],
  );

  function resetAll() {
    setGpaCourses(INITIAL_GPA_COURSES.map((c) => ({ ...c })));
    setSemesters(
      INITIAL_SEMESTERS.map((s) => ({
        ...s,
        courses: s.courses.map((c) => ({ ...c })),
      })),
    );
    setCurrentUnits("");
    setCurrentQp("");
    setFutureUnits("");
    setTargetCgpa("");
    setShowResult(false);
  }

  const activeSummary = mode === "cgpa" ? cgpaSummary : gpaSummary;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 gap-1.5 text-muted-foreground">
          <Link to="/dashboard">
            <ArrowLeft size={14} />
            Home
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl bg-primary px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-sm text-white/75">Academic tools</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          UNILAG GPA &amp; CGPA Calculator
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
          Work out a semester GPA, a cumulative CGPA, or the GPA you need next for a target.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "gpa", label: "GPA (one semester)" },
            { id: "cgpa", label: "CGPA (multi-semester)" },
            { id: "target", label: "Target CGPA" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMode(item.id);
              setShowResult(false);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "gpa" && (
        <CourseTable
          courses={gpaCourses}
          onChange={setGpaCourses}
          title="Course entry"
          description="Add your courses for this semester, then calculate."
        />
      )}

      {mode === "cgpa" && (
        <div className="space-y-6">
          {semesters.map((semester, index) => (
            <CourseTable
              key={semester.id}
              courses={semester.courses}
              title={semester.label}
              description={index === 0 ? "Enter courses for each completed semester." : undefined}
              onChange={(courses) =>
                setSemesters((prev) =>
                  prev.map((s) => (s.id === semester.id ? { ...s, courses } : s)),
                )
              }
              onRemove={
                semesters.length > 1
                  ? () => setSemesters((prev) => prev.filter((s) => s.id !== semester.id))
                  : undefined
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setSemesters((prev) => [...prev, newSemester(prev.length + 1)])}
          >
            <Plus size={16} />
            Add semester
          </Button>
        </div>
      )}

      {mode === "target" && (
        <section className="space-y-4 rounded-xl border border-border p-4 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Target CGPA</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your current totals and next term&apos;s units to see the GPA you need.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Current total course units"
              value={currentUnits}
              onChange={setCurrentUnits}
              placeholder="e.g. 48"
            />
            <Field
              label="Current total quality points"
              value={currentQp}
              onChange={setCurrentQp}
              placeholder="e.g. 192"
            />
            <Field
              label="Upcoming course units"
              value={futureUnits}
              onChange={setFutureUnits}
              placeholder="e.g. 20"
            />
            <Field
              label="Target CGPA"
              value={targetCgpa}
              onChange={setTargetCgpa}
              placeholder="e.g. 4.50"
              step="0.01"
            />
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setShowResult(true)}>
          Calculate
        </Button>
        <Button type="button" variant="outline" onClick={resetAll}>
          Reset
        </Button>
      </div>

      {showResult && mode !== "target" && (
        <ResultsCard
          title={mode === "gpa" ? "Semester results" : "Cumulative results"}
          summary={activeSummary}
          primaryLabel={mode === "gpa" ? "Semester GPA" : "CGPA"}
        />
      )}

      {showResult && mode === "target" && (
        <section className="rounded-xl border border-border bg-muted/40 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">What you need</h2>
          {requiredGpa === null ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Enter upcoming units and a target CGPA to see the required GPA.
            </p>
          ) : requiredGpa > 5 ? (
            <p className="mt-3 text-sm leading-relaxed">
              Required semester GPA:{" "}
              <span className="font-semibold text-destructive">{formatGpa(requiredGpa)}</span>. That
              is above 5.0 on the UNILAG scale. Lower the target or take more units next term.
            </p>
          ) : requiredGpa < 0 ? (
            <p className="mt-3 text-sm leading-relaxed">
              You are already at or above this target. A passing GPA in the upcoming units should
              keep you there (estimate only).
            </p>
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold text-hunter">
              {formatGpa(requiredGpa)}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                GPA needed next
              </span>
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Estimate only. Check UNILAG&apos;s official grading rules before you rely on this number.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground sm:px-6">
        <h2 className="font-display text-base font-semibold text-foreground">How it works</h2>
        <p className="mt-2 leading-relaxed">
          UNILAG five-point scale: A=5, B=4, C=3, D=2, E=1, F=0. Quality points for a course = grade
          point × course units. GPA / CGPA = total quality points ÷ total course units. For CGPA,
          sum quality points and units across semesters; do not average semester GPAs unless the
          unit loads match.
        </p>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step={step ?? "1"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CourseTable({
  courses,
  onChange,
  title,
  description,
  onRemove,
}: {
  courses: CourseRow[];
  onChange: (courses: CourseRow[]) => void;
  title: string;
  description?: string;
  onRemove?: () => void;
}) {
  function update(id: string, patch: Partial<CourseRow>) {
    onChange(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <section className="space-y-3 rounded-xl border border-border p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onRemove ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onRemove}>
            <Trash size={14} />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-1 pb-1 font-medium">Course code</th>
              <th className="px-1 pb-1 font-medium">Units</th>
              <th className="px-1 pb-1 font-medium">Grade</th>
              <th className="w-10 px-1 pb-1" />
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="px-1">
                  <Input
                    value={course.code}
                    placeholder="e.g. ACS201"
                    onChange={(e) => update(course.id, { code: e.target.value.toUpperCase() })}
                  />
                </td>
                <td className="w-28 px-1">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={course.units}
                    placeholder="3"
                    onChange={(e) => update(course.id, { units: e.target.value })}
                  />
                </td>
                <td className="w-28 px-1">
                  <Select
                    value={course.grade || undefined}
                    onValueChange={(v) => update(course.id, { grade: v as Grade })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="Remove course"
                    disabled={courses.length <= 1}
                    onClick={() => onChange(courses.filter((c) => c.id !== course.id))}
                  >
                    <Trash size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange([...courses, newCourseRow()])}
      >
        <Plus size={14} />
        Add course
      </Button>
    </section>
  );
}

function ResultsCard({
  title,
  summary,
  primaryLabel,
}: {
  title: string;
  summary: ReturnType<typeof summarizeCourses>;
  primaryLabel: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {summary.gpa === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Add at least one course with units and a grade to calculate.
        </p>
      ) : (
        <>
          <p className="mt-3 font-display text-4xl font-semibold text-hunter">
            {formatGpa(summary.gpa)}
            <span className="ml-2 text-base font-normal text-muted-foreground">{primaryLabel}</span>
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Courses" value={String(summary.courses)} />
            <Stat label="Total units" value={String(summary.units)} />
            <Stat label="Quality points" value={formatGpa(summary.qualityPoints, 0)} />
          </dl>
        </>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Estimate only. Confirm the official grading scale and CGPA rules before you rely on these
        figures.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}
