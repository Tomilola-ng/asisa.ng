import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/feed";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/feed/class")({
  head: () => ({ meta: [{ title: "Class feed — ASISA" }] }),
  component: ClassFeed,
});

function ClassFeed() {
  const { user } = useAuth();
  return (
    <Feed
      title={`Class feed · ${user?.level ?? ""} Level`}
      description="Private feed for your level and session."
      scope="class"
      scopeId={`level-${user?.level ?? ""}`}
    />
  );
}
