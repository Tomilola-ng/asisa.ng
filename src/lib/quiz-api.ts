import { requireSupabase, supabaseEnabled } from "./supabase";
import type { Quiz, QuizQuestion } from "./types";

const DEMO_QUIZZES_KEY = "asisa.demo.quizzes";

function readDemoQuizzes(): Quiz[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_QUIZZES_KEY);
    return raw ? (JSON.parse(raw) as Quiz[]) : [];
  } catch {
    return [];
  }
}

function writeDemoQuizzes(quizzes: Quiz[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_QUIZZES_KEY, JSON.stringify(quizzes));
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listQuizzes(courseId?: string): Promise<Quiz[]> {
  if (!supabaseEnabled) {
    const all = readDemoQuizzes();
    return courseId ? all.filter((q) => q.courseId === courseId) : all;
  }
  const client = requireSupabase();
  let query = (client as any)
    .from("quizzes")
    .select("*, quiz_questions(*)")
    .order("created_at", { ascending: false });
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map(
    (row: any): Quiz => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      createdBy: row.created_by,
      createdAt: row.created_at,
      questions: (row.quiz_questions ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map(
          (q: any): QuizQuestion => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            options: q.options ?? undefined,
            correctIndex: q.correct_index ?? undefined,
          }),
        ),
    }),
  );
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  if (!supabaseEnabled) {
    return readDemoQuizzes().find((q) => q.id === id) ?? null;
  }
  const all = await listQuizzes();
  return all.find((q) => q.id === id) ?? null;
}

export async function createQuiz(input: {
  courseId: string;
  title: string;
  createdBy: string;
  questions: QuizQuestion[];
}): Promise<Quiz> {
  if (!supabaseEnabled) {
    const quiz: Quiz = {
      id: crypto.randomUUID(),
      courseId: input.courseId,
      title: input.title,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      questions: input.questions,
    };
    writeDemoQuizzes([quiz, ...readDemoQuizzes()]);
    return quiz;
  }

  const client = requireSupabase();
  const { data: quizRow, error } = await (client as any)
    .from("quizzes")
    .insert({ course_id: input.courseId, title: input.title, created_by: input.createdBy })
    .select("*")
    .single();
  throwIfError(error);

  const { error: questionsError } = await (client as any).from("quiz_questions").insert(
    input.questions.map((q, index) => ({
      quiz_id: quizRow.id,
      position: index,
      type: q.type,
      prompt: q.prompt,
      options: q.options ?? null,
      correct_index: q.correctIndex ?? null,
    })),
  );
  throwIfError(questionsError);

  return {
    id: quizRow.id,
    courseId: quizRow.course_id,
    title: quizRow.title,
    createdBy: quizRow.created_by,
    createdAt: quizRow.created_at,
    questions: input.questions,
  };
}

export async function deleteQuiz(id: string): Promise<void> {
  if (!supabaseEnabled) {
    writeDemoQuizzes(readDemoQuizzes().filter((q) => q.id !== id));
    return;
  }
  const client = requireSupabase();
  const { error } = await (client as any).from("quizzes").delete().eq("id", id);
  throwIfError(error);
}
