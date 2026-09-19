import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isQuizVisibleFor, useFeatureFlags } from "@/lib/use-feature-flags";

export const Route = createFileRoute("/_app/quiz")({
  component: QuizLayout,
});

function QuizLayout() {
  const { user, loading: userLoading } = useAuth();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const navigate = useNavigate();

  const ready = !userLoading && !flagsLoading;
  const allowed = isQuizVisibleFor(user?.role, flags);

  useEffect(() => {
    if (ready && user && !allowed) {
      toast.error("Quiz isn't available for your account yet");
      navigate({ to: "/dashboard" });
    }
  }, [ready, user, allowed, navigate]);

  if (!ready || (user && !allowed)) return null;

  return <Outlet />;
}
