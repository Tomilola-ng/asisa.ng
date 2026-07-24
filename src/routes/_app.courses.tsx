import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, LEVELS, SEMESTERS } from "@/lib/data";
import { Search } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/courses")({
  head: () => ({ meta: [{ title: "Courses — ASISA" }] }),
  component: CoursesIndex,
});

function CoursesIndex() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");

  const filtered = store.courses.filter((c) => {
    if (level !== "all" && String(c.level) !== level) return false;
    if (sem !== "all" && String(c.semester) !== sem) return false;
    if (q && !`${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Course directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actuarial Science & Insurance — all levels and semesters.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code or title"
            className="pl-9"
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l} Level</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sem} onValueChange={setSem}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Both semesters</SelectItem>
            {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Link key={c.id} to="/courses/$id" params={{ id: c.id }}>
            <Card className="overflow-hidden transition-colors hover:border-primary/40">
              <div className="thumb-16-5" style={{ background: "var(--color-hunter)" }} />
              <CardHeader className="pb-2">
                <div className="text-xs font-medium text-primary">{c.code}</div>
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {c.level} Level · Semester {c.semester} · {c.units} units
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No courses match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
