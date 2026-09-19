import { useQuery } from "@tanstack/react-query";
import { listLevelImages } from "./api";
import type { Course, Level } from "./types";

export function useLevelImages() {
  const query = useQuery({ queryKey: ["level-images"], queryFn: listLevelImages });
  const byLevel = new Map<Level, string | undefined>(
    (query.data ?? []).map((img) => [img.level, img.imageUrl]),
  );
  return { ...query, byLevel };
}

export function courseThumbnail(course: Course, byLevel: Map<Level, string | undefined>) {
  return byLevel.get(course.level) ?? course.thumbnailUrl;
}
