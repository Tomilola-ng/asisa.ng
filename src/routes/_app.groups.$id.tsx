import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Feed } from "@/components/feed";
import { store } from "@/lib/data";
import { ArrowLeft } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/groups/$id")({
  loader: ({ params }) => {
    const group = store.groups.find((g) => g.id === params.id);
    if (!group) throw notFound();
    return { group };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.group.name} — Groups` : "Group" }],
  }),
  component: GroupPage,
});

function GroupPage() {
  const { group } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/groups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> All groups
      </Link>
      <Feed title={group.name} description={group.description} scope="group" scopeId={group.id} />
    </div>
  );
}
