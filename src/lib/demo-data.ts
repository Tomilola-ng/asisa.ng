import type { Course, Post } from "./types";

const ASI_DEPT = "d-asi";

export const DEMO_COURSES: Course[] = [
  {
    id: "demo-act-301",
    code: "ACT 301",
    title: "Life Contingencies I",
    description:
      "Introduction to life tables, survival models, and single-life annuities and assurances.",
    departmentId: ASI_DEPT,
    level: 300,
    semester: 1,
    units: 3,
    driveFolderUrl: "https://drive.google.com/drive/folders/example",
  },
  {
    id: "demo-act-302",
    code: "ACT 302",
    title: "Risk Theory",
    description:
      "Individual and collective risk models, ruin theory, and premium calculation principles.",
    departmentId: ASI_DEPT,
    level: 300,
    semester: 2,
    units: 3,
  },
  {
    id: "demo-ins-401",
    code: "INS 401",
    title: "Reinsurance",
    description:
      "Structures of proportional and non-proportional reinsurance and their financial impact.",
    departmentId: ASI_DEPT,
    level: 400,
    semester: 1,
    units: 2,
  },
  {
    id: "demo-act-205",
    code: "ACT 205",
    title: "Financial Mathematics",
    description: "Interest theory, annuities-certain, and loan schedules.",
    departmentId: ASI_DEPT,
    level: 200,
    semester: 1,
    units: 3,
  },
];

export const DEMO_POSTS: Post[] = [
  {
    id: "demo-post-1",
    authorId: "demo-author",
    authorName: "Actuarial Science & Insurance Nexus Rep",
    scope: "public",
    body: "Welcome to the Actuarial Science & Insurance Nexus. Sign in to see announcements, ask questions, and connect with classmates.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    reactions: 12,
    comments: 4,
  },
  {
    id: "demo-post-2",
    authorId: "demo-author-2",
    authorName: "300 Level Rep",
    scope: "public",
    body: "Past questions for ACT 301 are now linked on the course page. Check your level group for study sessions.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    reactions: 8,
    comments: 2,
  },
];
