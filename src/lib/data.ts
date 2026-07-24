export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  level: 100 | 200 | 300 | 400 | 500;
  semester: 1 | 2;
  units: number;
  description: string;
  thumbnailUrl?: string;
  driveFolderUrl?: string;
  pastQuestionsUrl?: string;
  representativeId?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  scope: "public" | "department" | "class" | "group";
  scopeId?: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  reactions: number;
  comments: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  memberCount: number;
  ownerId: string;
}

export const DEPARTMENTS: Department[] = [
  { id: "d-asi", name: "Actuarial Science & Insurance", code: "ASI" },
  { id: "d-fin", name: "Finance", code: "FIN" },
  { id: "d-acc", name: "Accounting", code: "ACC" },
];

export const SESSIONS = ["2023/2024", "2024/2025", "2025/2026"];
export const LEVELS = [100, 200, 300, 400, 500] as const;
export const SEMESTERS = [1, 2] as const;

const seedCourses: Course[] = [
  {
    id: "c1",
    code: "ACT 301",
    title: "Life Contingencies I",
    departmentId: "d-asi",
    level: 300,
    semester: 1,
    units: 3,
    description:
      "Introduction to life tables, survival models, and single-life annuities and assurances.",
    driveFolderUrl: "https://drive.google.com/drive/folders/example",
  },
  {
    id: "c2",
    code: "ACT 302",
    title: "Risk Theory",
    departmentId: "d-asi",
    level: 300,
    semester: 2,
    units: 3,
    description:
      "Individual and collective risk models, ruin theory, and premium calculation principles.",
  },
  {
    id: "c3",
    code: "INS 401",
    title: "Reinsurance",
    departmentId: "d-asi",
    level: 400,
    semester: 1,
    units: 2,
    description:
      "Structures of proportional and non-proportional reinsurance and their financial impact.",
  },
  {
    id: "c4",
    code: "ACT 205",
    title: "Financial Mathematics",
    departmentId: "d-asi",
    level: 200,
    semester: 1,
    units: 3,
    description: "Interest theory, annuities-certain, and loan schedules.",
  },
];

/**
 * Tiny in-memory store used while the frontend runs without a live Supabase
 * connection. Swap these calls for supabase.from(...).select() once your
 * schema is deployed (see supabase/schema.sql).
 */
class MemoryStore {
  courses: Course[] = [...seedCourses];
  posts: Post[] = [
    {
      id: "p1",
      authorId: "sys",
      authorName: "ASISA",
      scope: "public",
      body: "Welcome to the ASISA platform. Share, discuss and collaborate.",
      createdAt: new Date().toISOString(),
      reactions: 12,
      comments: 3,
    },
  ];
  groups: Group[] = [
    {
      id: "g1",
      name: "SOA Exam Study Circle",
      description: "Weekly discussion for FM/P candidates.",
      memberCount: 24,
      ownerId: "sys",
    },
  ];
}

export const store = new MemoryStore();
