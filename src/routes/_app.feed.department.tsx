import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/feed";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/feed/department")({
  head: () => ({ meta: [{ title: "Department feed — ASISA" }] }),
  component: DeptFeed,
});

function DeptFeed() {
  const { user } = useAuth();
  return (
    <Feed
      title="Department feed"
      description="Posts scoped to Actuarial Science & Insurance."
      scope="department"
      scopeId={user?.scopedDepartmentId ?? "d-asi"}
    />
  );
}
