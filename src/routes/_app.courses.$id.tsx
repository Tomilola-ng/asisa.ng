import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCourse } from "@/lib/api";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { courseThumbnail, useLevelImages } from "@/lib/use-level-images";
import { ArrowLeft, BoxArrowUpRight, FileEarmarkText, Folder2Open } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/courses/$id")({
  head: () => ({ meta: [{ title: "Course · Actuarial Science & Insurance Nexus" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: CoursePage,
});

function CoursePage() {
  const { id } = Route.useParams();
  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourse(id),
  });
  const { byLevel } = useLevelImages();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading course…</div>;
  }

  if (isError || !course) {
    return (
      <div className="space-y-4">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> All courses
        </Link>
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  const thumbnailUrl = courseThumbnail(course, byLevel);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> All courses
      </Link>

      <div className="asisa-card overflow-hidden">
        <div
          className="thumb-16-5 bg-cover bg-center"
          style={{
            backgroundColor: "var(--color-hunter)",
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          }}
        />
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.code}</Badge>
            <Badge variant="outline">{course.level} Level</Badge>
            <Badge variant="outline">Semester {course.semester}</Badge>
            <Badge variant="outline">{course.units} units</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{course.title}</h1>
          <p className="mt-2 text-muted-foreground">{course.description}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResourceCard
          icon={Folder2Open}
          title="Course files (Google Drive)"
          description="Slides, notes and reading materials curated by the course rep."
          href={course.driveFolderUrl}
        />
        <ResourceCard
          icon={FileEarmarkText}
          title="Past questions"
          description="Previous years' exam and test questions."
          href={course.pastQuestionsUrl}
        />
      </div>
    </div>
  );
}

function ResourceCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Folder2Open;
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <div className="asisa-card flex flex-col p-5">
      <Icon size={20} className="text-primary" />
      <div className="mt-3 font-display font-semibold">{title}</div>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        {href ? (
          <Button asChild size="sm">
            <a href={href} target="_blank" rel="noreferrer">
              Open <BoxArrowUpRight size={12} className="ml-1.5" />
            </a>
          </Button>
        ) : (
          <Button size="sm" disabled variant="outline">
            Not yet added
          </Button>
        )}
      </div>
    </div>
  );
}
