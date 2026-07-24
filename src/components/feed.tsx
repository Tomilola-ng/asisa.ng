import { useState } from "react";
import type { Post } from "@/lib/data";
import { store } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { HandThumbsUp, ChatDots } from "react-bootstrap-icons";
import { useAuth } from "@/lib/auth-context";

interface Props {
  title: string;
  description: string;
  scope: Post["scope"];
  scopeId?: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function Feed({ title, description, scope, scopeId }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [, force] = useState(0);

  const posts = store.posts.filter((p) => p.scope === scope && p.scopeId === scopeId);

  function publish() {
    if (!body.trim() || !user) return;
    store.posts.unshift({
      id: crypto.randomUUID(),
      authorId: user.id,
      authorName: user.fullName || user.email,
      scope,
      scopeId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      reactions: 0,
      comments: 0,
    });
    setBody("");
    force((n) => n + 1);
  }

  function react(id: string) {
    const p = store.posts.find((x) => x.id === id);
    if (p) p.reactions += 1;
    force((n) => n + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(user?.fullName || user?.email || "?")}
              </AvatarFallback>
            </Avatar>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update, a question, an announcement…"
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={publish} disabled={!body.trim()}>
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {initials(p.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.authorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <button className="inline-flex items-center gap-1.5 hover:text-primary" onClick={() => react(p.id)}>
                      <HandThumbsUp size={13} /> {p.reactions}
                    </button>
                    <button className="inline-flex items-center gap-1.5 hover:text-primary">
                      <ChatDots size={13} /> {p.comments}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No posts yet. Be the first to share.
          </div>
        )}
      </div>
    </div>
  );
}
