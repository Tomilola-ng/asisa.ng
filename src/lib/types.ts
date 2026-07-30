export type Role = "super_admin" | "course_rep" | "student";
export type FeedScope = "public" | "department" | "class" | "group";
export type ReactionKind = "like" | "celebrate" | "insightful";
export type Level = 100 | 200 | 300 | 400 | 500;
export type Semester = 1 | 2;

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface AcademicSession {
  id: string;
  label: string;
  isCurrent: boolean;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  level: Level;
  semester: Semester;
  units: number;
  description: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  driveFolderUrl?: string;
  pastQuestionsUrl?: string;
  representativeId?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  scope: FeedScope;
  scopeId?: string;
  classLevel?: Level;
  body: string;
  imageUrl?: string;
  createdAt: string;
  reactions: number;
  comments: number;
  reactedByMe?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imagePath?: string;
  memberCount: number;
  ownerId: string;
  isPrivate: boolean;
  isMember?: boolean;
}

export const LEVELS = [100, 200, 300, 400, 500] as const;
export const SEMESTERS = [1, 2] as const;

export interface AsisaUser {
  id: string;
  email: string;
  fullName: string;
  matricNumber?: string;
  level?: Level;
  role: Role;
  avatarUrl?: string;
  departmentId?: string;
  scopedDepartmentId?: string;
  scopedLevel?: number;
}
