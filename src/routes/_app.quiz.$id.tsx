import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuiz } from "@/lib/quiz-api";
import { getCourse } from "@/lib/api";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/quiz/$id")({
  head: () => ({ meta: [{ title: "Quiz · Actuarial Science & Insurance Nexus" }] }),
  beforeLoad: () => requireAuthRedirect(),
  component: TakeQuiz,
});

function TakeQuiz() {
  const { id } = Route.useParams();
  const { data: quiz, isLoading } = useQuery({ queryKey: ["quiz", id], queryFn: () => getQuiz(id) });
  const { data: course } = useQuery({
    queryKey: ["course", quiz?.courseId],
    queryFn: () => getCourse(quiz!.courseId),
    enabled: !!quiz,
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading quiz…</div>;
  }

  if (!quiz) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Quiz not found.</p>
      </div>
    );
  }

  const mcqQuestions = quiz.questions.filter((q) => q.type === "mcq" && q.correctIndex !== undefined);
  const score = submitted
    ? mcqQuestions.filter((q) => answers[q.id] === String(q.correctIndex)).length
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {course && <Badge variant="secondary">{course.code}</Badge>}
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold">{quiz.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
        </p>
      </div>

      {submitted && mcqQuestions.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium">
          Score: {score} / {mcqQuestions.length}
        </div>
      )}

      <div className="space-y-4">
        {quiz.questions.map((q, index) => (
          <div key={q.id} className="rounded-xl border border-border p-5">
            <p className="font-medium">
              {index + 1}. {q.prompt}
            </p>
            {q.type === "mcq" ? (
              <RadioGroup
                className="mt-3"
                value={answers[q.id]}
                onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                disabled={submitted}
              >
                {(q.options ?? []).map((opt, i) => {
                  const isCorrect = submitted && q.correctIndex === i;
                  const isWrongPick =
                    submitted && answers[q.id] === String(i) && q.correctIndex !== i;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                        isCorrect ? "bg-green-500/10" : isWrongPick ? "bg-destructive/10" : ""
                      }`}
                    >
                      <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`} className="font-normal">
                        {opt}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <Textarea
                className="mt-3"
                placeholder="Your answer"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                disabled={submitted}
              />
            )}
          </div>
        ))}
      </div>

      {!submitted ? (
        <Button onClick={() => setSubmitted(true)}>Submit</Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setAnswers({});
            setSubmitted(false);
          }}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/quiz" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft size={14} /> All quizzes
    </Link>
  );
}
