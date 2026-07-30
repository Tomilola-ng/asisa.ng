import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampusFeedSection } from "@/components/campus-feed-section";
import { CourseCard } from "@/components/course-card";
import { LoginPromptDialog } from "@/components/login-prompt-dialog";
import { GUEST_COURSE_LIMIT, LoginGateFade } from "@/components/login-gate-fade";
import { useAuth } from "@/lib/auth-context";
import { listCourses } from "@/lib/api";
import { LEVELS, SEMESTERS } from "@/lib/data";
import { Funnel, Search } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Home — ASISA" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const filtered = user
    ? courses.filter((c) => {
        if (level !== "all" && String(c.level) !== level) return false;
        if (sem !== "all" && String(c.semester) !== sem) return false;
        if (q && !`${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
    : courses;

  const courseLimit = user ? 9 : GUEST_COURSE_LIMIT;
  const preview = filtered.slice(0, courseLimit);
  const hasMoreCourses = user && filtered.length > preview.length;
  const showGuestFade = !user && !isLoading && courses.length > GUEST_COURSE_LIMIT;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-primary">
        <div className="flex flex-col sm:min-h-[260px] sm:flex-row sm:items-center sm:justify-between">
          <div className="px-6 py-5 text-white sm:px-8 sm:py-10">
            {user ? (
              <>
                <p className="text-sm text-white/75">Welcome back</p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:mt-1.5 sm:text-4xl">
                  {user.fullName || user.email}
                </h1>
                <p className="mt-1.5 text-sm text-white/75 sm:mt-2">
                  {user.level ? `${user.level} Level` : "Student"} · Actuarial Science & Insurance
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/75">Actuarial Science & Insurance, UNILAG</p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:mt-1.5 sm:text-4xl">
                  Your ASISA community hub
                </h1>
                <p className="mt-1.5 text-sm text-white/75 sm:mt-2">
                  Browse courses, peek at the feed, and join to unlock materials and discussions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Create account
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/auth" search={{ mode: "signin" }}>
                      Log in
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="flex min-h-[150px] w-full items-center justify-center px-4 pt-3 sm:min-h-0 sm:h-full sm:w-[260px] sm:items-end sm:justify-end sm:px-6 sm:pt-0">
            <img
              src="/asisa-girl.png"
              alt=""
              className="w-[70%] max-h-[200px] object-contain object-center sm:h-[240px] sm:w-auto sm:max-h-none"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {user ? "Your courses" : "Courses"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {user
              ? "Filter by level or semester, then open a course for Drive files and past questions."
              : "Browse the course directory — sign in to open materials and past questions."}
          </p>
        </div>

        {user && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-12 shrink-0 sm:hidden"
                aria-expanded={filtersOpen}
                aria-label="Filter by level and semester"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Funnel size={16} />
              </Button>
              <div className="hidden items-center gap-2 sm:flex">
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
            </div>

            {filtersOpen && (
              <div className="flex flex-col gap-2 sm:hidden">
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
          </>
        )}

        {showGuestFade ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((c) => (
                <CourseCard key={c.id} course={c} onGuestClick={() => setLoginOpen(true)} />
              ))}
            </div>
            <LoginGateFade
              title=""
              variant="courses"
              message="You need to be logged in to view the full course directory."
            />
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading && (
                <div className="col-span-full py-6 text-center text-sm text-muted-foreground">
                  Loading courses…
                </div>
              )}
              {preview.map((c) => (
                <CourseCard key={c.id} course={c} onGuestClick={() => setLoginOpen(true)} />
              ))}
              {!isLoading && preview.length === 0 && (
                <div className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No courses match your filters.
                </div>
              )}
            </div>

            {user && !isLoading && filtered.length > 0 && (
              <div className="pt-2">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/courses">
                    {hasMoreCourses ? `View all ${filtered.length} courses` : "View all courses"}
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <CampusFeedSection embedded className="border-t border-border pt-6" />

      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Sign in to open this course"
        description="Course materials, Drive files, and past questions are available to ASISA members after you log in."
      />
    </div>
  );
}
