import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVELS, SEMESTERS } from "@/lib/data";
import { listCourses, courseInDepartment } from "@/lib/api";
import { CourseCard } from "@/components/course-card";
import { LoginPromptDialog } from "@/components/login-prompt-dialog";
import { GUEST_COURSE_LIMIT, LoginGateFade } from "@/components/login-gate-fade";
import { useAuth } from "@/lib/auth-context";
import { Search } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/courses/")({
  head: () => ({ meta: [{ title: "Courses · Actuarial Science & Insurance Nexus" }] }),
  component: CoursesIndex,
});

function CoursesIndex() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const filtered = user
    ? courses.filter((c) => {
        if (
          user.role !== "super_admin" &&
          user.departmentId &&
          !courseInDepartment(c, user.departmentId)
        ) {
          return false;
        }
        if (level !== "all" && String(c.level) !== level) return false;
        if (sem !== "all" && String(c.semester) !== sem) return false;
        if (q && !`${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
    : courses;

  const preview = user ? filtered : filtered.slice(0, GUEST_COURSE_LIMIT);
  const showGuestFade = !user && !isLoading && courses.length > GUEST_COURSE_LIMIT;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Course directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user
            ? "Actuarial Science & Insurance, all levels and semesters."
            : "Sign in to search and filter the full course directory."}
        </p>
      </div>

      {user && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code or title"
              className="pl-10"
            />
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l} Level
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sem} onValueChange={setSem}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Both semesters</SelectItem>
              {SEMESTERS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  Semester {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full text-center text-sm text-muted-foreground">
            Loading courses…
          </div>
        )}
        {preview.map((c) => (
          <CourseCard key={c.id} course={c} onGuestClick={() => setLoginOpen(true)} />
        ))}
        {!isLoading && preview.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No courses match your filters.
          </div>
        )}
      </div>

      {showGuestFade && (
        <LoginGateFade
          title=""
          variant="courses"
          message="You need to be logged in to view the full course directory."
        />
      )}

      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Sign in to open this course"
        description="Course materials, Drive files, and past questions are available after you log in."
      />
    </div>
  );
}
