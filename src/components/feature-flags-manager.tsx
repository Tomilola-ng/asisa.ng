import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setFeatureFlags } from "@/lib/api";
import { useFeatureFlags } from "@/lib/use-feature-flags";
import type { FeatureFlags } from "@/lib/types";

/**
 * Lets a super admin stage the Quiz rollout: course reps first (so they can
 * start publishing quizzes), then students, instead of switching it on for
 * everyone the moment it's ready.
 */
export function FeatureFlagsManager() {
  const queryClient = useQueryClient();
  const { flags } = useFeatureFlags();

  const mutation = useMutation({
    mutationFn: (patch: Partial<FeatureFlags>) => setFeatureFlags(patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Rollout settings updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz rollout</CardTitle>
        <p className="text-sm text-muted-foreground">
          Super admins can always see and manage Quiz. Turn it on for each group when it's ready.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <Label htmlFor="quiz-reps" className="text-sm font-medium">
              Course reps
            </Label>
            <p className="text-xs text-muted-foreground">
              Let course reps upload documents and publish quizzes.
            </p>
          </div>
          <Switch
            id="quiz-reps"
            checked={flags.quizVisibleToCourseReps}
            disabled={mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ quizVisibleToCourseReps: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <Label htmlFor="quiz-students" className="text-sm font-medium">
              Students
            </Label>
            <p className="text-xs text-muted-foreground">
              Let students see the Quiz tab and take published quizzes.
            </p>
          </div>
          <Switch
            id="quiz-students"
            checked={flags.quizVisibleToStudents}
            disabled={mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ quizVisibleToStudents: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
