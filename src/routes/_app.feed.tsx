import { createFileRoute } from "@tanstack/react-router";
import { CampusFeedSection } from "@/components/campus-feed-section";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({ meta: [{ title: "Campus feed — ASISA" }] }),
  component: () => <CampusFeedSection />,
});
