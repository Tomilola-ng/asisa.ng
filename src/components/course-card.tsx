import { Link } from "@tanstack/react-router";
import type { Course } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { courseThumbnail, useLevelImages } from "@/lib/use-level-images";

interface CourseCardProps {
  course: Course;
  onGuestClick: () => void;
}

export function CourseCard({ course, onGuestClick }: CourseCardProps) {
  const { user } = useAuth();
  const { byLevel } = useLevelImages();
  const thumbnailUrl = courseThumbnail(course, byLevel);

  const card = (
    <Card className="h-full overflow-hidden transition-colors hover:border-primary/40">
      <div
        className="thumb-16-5 bg-cover bg-center"
        style={{
          backgroundColor: "var(--color-hunter)",
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
        }}
      />
      <CardHeader className="pb-2">
        <div className="text-xs font-medium text-primary">{course.code}</div>
        <CardTitle className="text-base">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">
        {course.description ? (
          <p className="line-clamp-2 pb-2 text-xs text-muted-foreground">{course.description}</p>
        ) : null}
        {course.level} Level · Semester {course.semester} · {course.units} units
      </CardContent>
    </Card>
  );

  if (user) {
    return (
      <Link to="/courses/$id" params={{ id: course.id }}>
        {card}
      </Link>
    );
  }

  return (
    <button type="button" className="w-full text-left" onClick={onGuestClick}>
      {card}
    </button>
  );
}
