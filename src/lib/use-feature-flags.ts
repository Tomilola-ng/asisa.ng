import { useQuery } from "@tanstack/react-query";
import { getFeatureFlags } from "./api";
import { DEFAULT_FEATURE_FLAGS } from "./demo-data";
import type { Role } from "./types";

export function useFeatureFlags() {
  const query = useQuery({ queryKey: ["feature-flags"], queryFn: getFeatureFlags });
  return { ...query, flags: query.data ?? DEFAULT_FEATURE_FLAGS };
}

export function isQuizVisibleFor(
  role: Role | undefined,
  flags: { quizVisibleToCourseReps: boolean; quizVisibleToStudents: boolean },
): boolean {
  if (role === "super_admin") return true;
  if (role === "course_rep") return flags.quizVisibleToCourseReps;
  if (role === "student") return flags.quizVisibleToStudents;
  return false;
}
