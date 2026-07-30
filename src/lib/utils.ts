import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 5) return "few minutes ago";
  if (diffMin < 60) return diffMin + " minutes ago";

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? "1 hour ago" : diffHr + " hours ago";

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 7) return diffDay + " days ago";

  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
