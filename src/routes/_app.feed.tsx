import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/feed";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({ meta: [{ title: "Public feed — ASISA" }] }),
  component: () => (
    <Feed
      title="Public feed"
      description="Announcements and discussion visible to all ASISA members."
      scope="public"
    />
  ),
});
