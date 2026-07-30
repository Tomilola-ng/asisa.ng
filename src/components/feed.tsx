import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedScope } from "@/lib/types";
import { createComment, createPost, listComments, listPosts, toggleReaction } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoginPromptDialog } from "@/components/login-prompt-dialog";
import { HandThumbsUp, ChatDots } from "react-bootstrap-icons";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  title?: string;
  description?: string;
  scope?: FeedScope;
  scopeId?: string;
  classLevel?: number;
  /** Compact heading when embedded on the homepage */
  embedded?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function Feed({
  title = "Feed",
  description,
  scope = "public",
  scopeId,
  classLevel,
  embedded = false,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<"post" | "feed" | "interact">("feed");

  const postsQuery = useQuery({
    queryKey: ["posts", scope, scopeId ?? null, classLevel ?? null],
    queryFn: () =>
      listPosts({
        scope,
        scopeId,
        classLevel,
        userId: user?.id,
      }),
    enabled: scope === "public" || Boolean(user),
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", openComments],
    queryFn: () => listComments(openComments as string),
    enabled: Boolean(openComments && user),
  });

  const openLogin = (reason: typeof loginReason) => {
    setLoginReason(reason);
    setLoginOpen(true);
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      await createPost({
        authorId: user.id,
        scope,
        scopeId,
        classLevel,
        body: body.trim(),
      });
    },
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reactMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not signed in");
      return toggleReaction(postId, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !openComments) throw new Error("Not signed in");
      await createComment({
        postId: openComments,
        authorId: user.id,
        body: commentBody.trim(),
      });
    },
    onSuccess: async () => {
      setCommentBody("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["comments", openComments] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
      ]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const posts = postsQuery.data ?? [];
  const visiblePosts = user ? posts : posts.slice(0, 1);
  const hasComposerText = body.trim().length > 0;
  const showGuestFeedCta = !user && !postsQuery.isLoading && visiblePosts.length > 0;

  const loginCopy =
    loginReason === "post"
      ? {
          title: "Sign in to post",
          description: "Join ASISA to share updates, ask questions, and join the conversation.",
        }
      : loginReason === "interact"
        ? {
            title: "Sign in to interact",
            description: "Log in to like posts, read comments, and reply to classmates.",
          }
        : {
            title: "Sign in to see the full feed",
            description: "Log in to read what the community is saying and take part in discussions.",
          };

  const handlePublish = () => {
    if (!user) {
      openLogin("post");
      return;
    }
    publishMutation.mutate();
  };

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-2xl space-y-6"}>
      {(title || description) && (
        <div>
          <h2
            className={`font-display font-semibold ${embedded ? "text-xl" : "text-3xl"}`}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}

      <div className="relative">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share an update, a question, an announcement…"
          className="min-h-[100px] resize-none rounded-2xl pb-12"
        />
        {hasComposerText && (
          <Button
            size="sm"
            className="absolute bottom-2 right-2"
            onClick={handlePublish}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? "Posting…" : "Post"}
          </Button>
        )}
      </div>

      <div>
        {postsQuery.isLoading && (
          <div className="border-b border-border py-10 text-center text-sm text-muted-foreground">
            Loading posts…
          </div>
        )}
        {visiblePosts.map((p) => (
          <article key={p.id} className="border-b border-border py-4 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                {p.authorAvatar ? <AvatarImage src={p.authorAvatar} alt="" /> : null}
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {initials(p.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 truncate font-medium">{p.authorName}</div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(p.createdAt)}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
            <div className="mt-3 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 gap-1.5 px-3 text-xs ${p.reactedByMe ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => (user ? reactMutation.mutate(p.id) : openLogin("interact"))}
              >
                <HandThumbsUp size={13} /> {p.reactions}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs text-muted-foreground"
                onClick={() =>
                  user
                    ? setOpenComments((cur) => (cur === p.id ? null : p.id))
                    : openLogin("interact")
                }
              >
                <ChatDots size={13} /> {p.comments}
              </Button>
            </div>

            {user && openComments === p.id && (
              <div className="mt-4 space-y-3 border-t border-border pt-3">
                {(commentsQuery.data ?? []).map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      {c.authorAvatar ? <AvatarImage src={c.authorAvatar} alt="" /> : null}
                      <AvatarFallback className="bg-secondary text-[10px]">
                        {initials(c.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{c.authorName}</div>
                      <p className="text-sm">{c.body}</p>
                    </div>
                  </div>
                ))}
                <div className="relative">
                  <Textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Write a comment…"
                    className="min-h-[72px] resize-none rounded-2xl pb-12"
                  />
                  {commentBody.trim() && (
                    <Button
                      size="sm"
                      className="absolute bottom-2 right-2"
                      disabled={commentMutation.isPending}
                      onClick={() => commentMutation.mutate()}
                    >
                      Reply
                    </Button>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}

        {showGuestFeedCta && (
          <div className="rounded-2xl border border-border bg-muted/30 px-5 py-6 text-center">
            <p className="font-medium">See what the community is saying</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Log in to read the full campus feed and join the conversation.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => openLogin("feed")}>
                Log in to view feed
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create account
                </Link>
              </Button>
            </div>
          </div>
        )}

        {!postsQuery.isLoading && posts.length === 0 && (
          <div className="border-b border-border py-10 text-center text-sm text-muted-foreground">
            {user ? "No posts yet. Be the first to share." : "No posts yet. Sign in to be the first to share."}
          </div>
        )}
      </div>

      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title={loginCopy.title}
        description={loginCopy.description}
      />
    </div>
  );
}
