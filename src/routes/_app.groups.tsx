import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, People } from "react-bootstrap-icons";
import { store } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/groups")({
  head: () => ({ meta: [{ title: "Groups — ASISA" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const [form, setForm] = useState({ name: "", description: "" });

  function create() {
    if (!form.name.trim() || !user) return;
    store.groups.unshift({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      memberCount: 1,
      ownerId: user.id,
    });
    setForm({ name: "", description: "" });
    setOpen(false);
    force((n) => n + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Study circles and interest groups started by ASISA members.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} className="mr-1.5" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gname">Name</Label>
                <Input id="gname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gdesc">Description</Label>
                <Textarea id="gdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {store.groups.map((g) => (
          <Link key={g.id} to="/groups/$id" params={{ id: g.id }}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{g.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <People size={12} /> {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
