import type { QuizQuestion } from "./types";

const SUPPORTED_TEXT_EXTENSIONS = ["txt", "md"];
const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp"];

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedQuizFile(fileName: string): boolean {
  const ext = extensionOf(fileName);
  return (
    ext === "pdf" ||
    SUPPORTED_TEXT_EXTENSIONS.includes(ext) ||
    SUPPORTED_IMAGE_EXTENSIONS.includes(ext)
  );
}

export function isImageQuizFile(fileName: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(extensionOf(fileName));
}

/**
 * Pulls raw text out of an uploaded .pdf/.txt/.md/image file so it can be
 * scanned for questions. Images (a photo or screenshot of a question sheet)
 * go through OCR since they have no embedded text layer.
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (fraction: number) => void,
  options?: { twoColumn?: boolean },
): Promise<string> {
  const ext = extensionOf(file.name);
  if (ext === "pdf") return extractTextFromPdf(file);
  if (SUPPORTED_TEXT_EXTENSIONS.includes(ext)) return file.text();
  if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
    return extractTextFromImage(file, onProgress, options?.twoColumn ?? false);
  }
  throw new Error(
    "Unsupported file type. Upload a .pdf, .txt, .md, or image (.png/.jpg/.webp) file with the questions.",
  );
}

/**
 * Exam-style sheets are often laid out in two columns. Tesseract reads
 * left-to-right across the *whole* image width, so it stitches column-1 and
 * column-2 text together mid-line instead of reading column 1 top-to-bottom
 * then column 2. We look for a vertical band of mostly-blank pixels near the
 * horizontal middle of the image; if one exists, we split there and OCR each
 * half separately, in the correct reading order.
 */
async function findColumnGutter(file: File): Promise<number | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);

  const { width, height } = canvas;
  const bodyTop = Math.floor(height * 0.12); // skip header band
  const { data } = ctx.getImageData(0, bodyTop, width, height - bodyTop);
  const rowStep = 2;
  const colDarkness = new Array(width).fill(0);
  const rows = height - bodyTop;
  for (let y = 0; y < rows; y += rowStep) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 150) colDarkness[x]++;
    }
  }

  const searchStart = Math.floor(width * 0.35);
  const searchEnd = Math.floor(width * 0.65);
  const winRadius = Math.max(2, Math.floor(width * 0.008));
  let bestX = -1;
  let bestScore = Infinity;
  for (let x = searchStart; x <= searchEnd; x++) {
    let sum = 0;
    for (let dx = -winRadius; dx <= winRadius; dx++) {
      const xi = x + dx;
      if (xi >= 0 && xi < width) sum += colDarkness[xi];
    }
    if (sum < bestScore) {
      bestScore = sum;
      bestX = x;
    }
  }

  const avgDark = colDarkness.reduce((a, b) => a + b, 0) / width;
  const windowWidth = winRadius * 2 + 1;
  if (bestX < 0 || avgDark === 0 || bestScore / windowWidth > avgDark * 0.2) {
    return null; // no confident whitespace gutter — likely a single column
  }
  return bestX;
}

async function cropImage(file: File, x0: number, x1: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = x1 - x0;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, x0, 0, x1 - x0, bitmap.height, 0, 0, x1 - x0, bitmap.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

async function runOcr(
  input: File | Blob,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(input);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromImage(
  file: File,
  onProgress?: (fraction: number) => void,
  forceTwoColumn = false,
): Promise<string> {
  let gutterX = await findColumnGutter(file);
  const bitmap = await createImageBitmap(file);
  if (gutterX == null && forceTwoColumn) {
    gutterX = Math.round(bitmap.width / 2);
  }

  if (gutterX == null) {
    return runOcr(file, onProgress);
  }
  const [leftBlob, rightBlob] = await Promise.all([
    cropImage(file, 0, gutterX),
    cropImage(file, gutterX, bitmap.width),
  ]);

  const leftText = await runOcr(leftBlob, (f) => onProgress?.(f * 0.5));
  const rightText = await runOcr(rightBlob, (f) => onProgress?.(0.5 + f * 0.5));
  return `${leftText}\n${rightText}`;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import("pdfjs-dist"),
    // `?url` makes Vite emit this as a hashed static asset and rewrite the
    // import to its real production URL. The previous `new URL(specifier,
    // import.meta.url)` form isn't reliably rewritten by the TanStack
    // Start/Nitro SSR build, so in prod it could point at a 404 — pdf.js
    // then fails inside the worker with an opaque, unhelpful error.
    import("pdfjs-dist/build/pdf.worker.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
  try {
    doc = await pdfjs.getDocument({ data: buffer }).promise;
  } catch (err) {
    throw new Error(
      `Couldn't read that PDF (${err instanceof Error ? err.message : String(err)}). Try re-exporting or re-scanning it, or upload a .txt/.md/image instead.`,
    );
  }
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // pdf.js gives us a flat run of text fragments per page, not lines — each
    // fragment marks whether it ends a visual line via `hasEOL`. The parser
    // below expects one question/option per text line, so we have to
    // reassemble real lines here instead of joining the whole page into one
    // string (which silently hides every question from the line-based regexes).
    let currentLine = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      currentLine += item.str;
      if ("hasEOL" in item && item.hasEOL) {
        lines.push(currentLine);
        currentLine = "";
      } else {
        currentLine += " ";
      }
    }
    if (currentLine.trim()) lines.push(currentLine);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n");
}

const QUESTION_START = /^\s*(?:q(?:uestion)?\.?\s*)?(\d{1,3})[.)]\s+(.*)$/i;
// Moodle-style exports ("Q: <stem>") number questions only in a separate
// header line (see BOILERPLATE_LINE below), not next to the stem itself.
const QUESTION_START_Q = /^\s*q\s*[:.]\s+(.*)$/i;
const ANSWER_LINE = /^\s*(?:answer|ans|correct)\s*[:-]\s*\(?([A-Da-d])\)?/i;
// Moodle quiz-export boilerplate that shows up interleaved with real
// question text ("Question 6", "Not yet answered", "Marked out of 1",
// "Select one:") — must be dropped outright rather than falling through to
// the "continuation of the previous line" branch, or it gets silently
// appended onto the prior question's last option.
const BOILERPLATE_LINE =
  /^\s*(?:question\s+\d+|not yet answered|marked out of \d+(?:\.\d+)?|select one:?|[◄◀]?\s*announcement\s*[►▶]?\s*(?:jump to\.{0,3})?)\s*$/i;
// Matches every "A. ...", "B) ..." marker in a line, not just one — a
// column-width OCR pass sometimes flattens several stacked options (or an
// option plus the next question's number) onto a single text line.
const INLINE_OPTION = /(?:^|\s)\(?([A-Da-d])[.)](?=\s)/g;

function splitInlineOptions(line: string): { letter: string; text: string }[] {
  const matches = [...line.matchAll(INLINE_OPTION)];
  if (matches.length === 0) return [];
  const out: { letter: string; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : line.length;
    const text = line
      .slice(start, end)
      .trim()
      .replace(/[,;]\s*$/, "");
    if (text) out.push({ letter: m[1].toUpperCase(), text });
  }
  return out;
}

/**
 * Heuristic extraction: looks for "1. ..." style question stems, "A) ..."
 * style options (including several flattened onto one line), and an
 * optional "Answer: B" line. A line that matches nothing is treated as a
 * continuation of whatever came right before it (a wrapped option or a
 * wrapped question stem) instead of being dropped, since OCR commonly
 * breaks a single option across two lines. Anything left over that never
 * looks like multiple choice is kept as a short-answer prompt so nothing
 * from the source document is silently lost.
 */
export function parseQuestionsFromText(text: string): QuizQuestion[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Some Moodle exports wrap "Question 26" onto two separate text lines
  // ("Question" then "26"), which BOILERPLATE_LINE can't match as a unit —
  // left alone, the bare "26" line (and everything after it, since nothing
  // else matches either) gets silently appended onto the previous
  // question's last option. Re-fuse the pair before the main pass.
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (/^question$/i.test(rawLines[i]) && /^\d{1,3}$/.test(rawLines[i + 1] ?? "")) {
      lines.push(`Question ${rawLines[i + 1]}`);
      i++;
      continue;
    }
    lines.push(rawLines[i]);
  }

  type Block = {
    prompt: string[];
    options: { letter: string; text: string }[];
    answerLetter?: string;
  };
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of lines) {
    if (BOILERPLATE_LINE.test(line)) continue;

    const questionMatch = line.match(QUESTION_START) ?? line.match(QUESTION_START_Q);

    // A new question marker always starts a new block, even if OCR fused
    // trailing option text onto the same visual line as the question stem.
    if (questionMatch) {
      current = { prompt: [], options: [] };
      blocks.push(current);
      const tail = questionMatch[questionMatch.length - 1];
      const tailMatches = [...tail.matchAll(INLINE_OPTION)];
      if (tailMatches.length > 0) {
        const promptPart = tail.slice(0, tailMatches[0].index).trim();
        if (promptPart) current.prompt.push(promptPart);
        for (const opt of splitInlineOptions(tail)) {
          if (current.options.length < 8) current.options.push(opt);
        }
      } else if (tail) {
        current.prompt.push(tail);
      }
      continue;
    }
    if (!current) continue;

    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      current.answerLetter = answerMatch[1].toUpperCase();
      continue;
    }

    const inlineOptions = splitInlineOptions(line);
    if (inlineOptions.length > 0) {
      for (const opt of inlineOptions) {
        if (current.options.length >= 8) break;
        current.options.push(opt);
      }
      continue;
    }

    // No marker on this line — it's a wrapped continuation of the option or
    // prompt line directly above it.
    if (current.options.length === 0) {
      current.prompt.push(line);
    } else {
      const last = current.options[current.options.length - 1];
      last.text = `${last.text} ${line}`.trim();
    }
  }

  return blocks
    .map((block): QuizQuestion | null => {
      const prompt = block.prompt.join(" ").trim();
      if (!prompt) return null;
      if (block.options.length >= 2) {
        const options = block.options.map((o) => o.text);
        const correctIndex = block.answerLetter
          ? block.options.findIndex((o) => o.letter === block.answerLetter)
          : -1;
        return {
          id: crypto.randomUUID(),
          type: "mcq",
          prompt,
          options,
          correctIndex: correctIndex >= 0 ? correctIndex : undefined,
        };
      }
      return { id: crypto.randomUUID(), type: "short", prompt };
    })
    .filter((q): q is QuizQuestion => q !== null);
}
