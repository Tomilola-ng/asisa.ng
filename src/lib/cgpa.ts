export const GRADE_POINTS = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
  F: 0,
} as const;

export type Grade = keyof typeof GRADE_POINTS;

export const GRADES = Object.keys(GRADE_POINTS) as Grade[];

export type CourseRow = {
  id: string;
  code: string;
  units: string;
  grade: Grade | "";
};

export type SemesterBlock = {
  id: string;
  label: string;
  courses: CourseRow[];
};

export type CalcSummary = {
  courses: number;
  units: number;
  qualityPoints: number;
  gpa: number | null;
};

let rowSeq = 0;

function nextId(prefix: string) {
  rowSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${rowSeq}`;
}

export function emptyCourse(id: string): CourseRow {
  return { id, code: "", units: "", grade: "" };
}

export function newCourseRow(): CourseRow {
  return emptyCourse(nextId("course"));
}

export function newSemester(index: number, id = nextId("semester")): SemesterBlock {
  return {
    id,
    label: `Semester ${index}`,
    courses: [newCourseRow(), newCourseRow(), newCourseRow()],
  };
}

/** Stable seed rows for first paint (SSR-safe). */
export const INITIAL_GPA_COURSES: CourseRow[] = [
  emptyCourse("gpa-1"),
  emptyCourse("gpa-2"),
  emptyCourse("gpa-3"),
  emptyCourse("gpa-4"),
];

export const INITIAL_SEMESTERS: SemesterBlock[] = [
  {
    id: "sem-1",
    label: "Semester 1",
    courses: [emptyCourse("s1-1"), emptyCourse("s1-2"), emptyCourse("s1-3")],
  },
  {
    id: "sem-2",
    label: "Semester 2",
    courses: [emptyCourse("s2-1"), emptyCourse("s2-2"), emptyCourse("s2-3")],
  },
];

export function summarizeCourses(courses: CourseRow[]): CalcSummary {
  let units = 0;
  let qualityPoints = 0;
  let counted = 0;

  for (const course of courses) {
    const u = Number(course.units);
    if (!course.grade || !Number.isFinite(u) || u <= 0) continue;
    units += u;
    qualityPoints += GRADE_POINTS[course.grade] * u;
    counted += 1;
  }

  return {
    courses: counted,
    units,
    qualityPoints,
    gpa: units > 0 ? qualityPoints / units : null,
  };
}

export function summarizeSemesters(semesters: SemesterBlock[]): CalcSummary {
  return summarizeCourses(semesters.flatMap((s) => s.courses));
}

/** GPA needed in upcoming units to hit a target CGPA. */
export function requiredGpaForTarget(opts: {
  currentUnits: number;
  currentQualityPoints: number;
  futureUnits: number;
  targetCgpa: number;
}): number | null {
  const { currentUnits, currentQualityPoints, futureUnits, targetCgpa } = opts;
  if (futureUnits <= 0 || !Number.isFinite(targetCgpa)) return null;
  const neededQp = targetCgpa * (currentUnits + futureUnits) - currentQualityPoints;
  return neededQp / futureUnits;
}

export function formatGpa(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}
