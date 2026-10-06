import type { Course, Module, ModuleItem, Question, QuestionType, Quiz, QuizItem, Resource, ResourceItem, VideoItem } from "@/lib/mock";

/* =============================================================================
   Pure helpers for the course builder: ids, blank items, normalisation (first
   video is the free preview), quiz validation and the review checklist.
   ============================================================================= */

let counter = 0;
/** URL-safe unique id (client-side only; used for new modules, items, questions). */
export function uid(prefix: string) {
  counter = (counter + 1) % 1296;
  return `${prefix}${Date.now().toString(36).slice(-5)}${counter.toString(36).padStart(2, "0")}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export const itemLabel = (t: ModuleItem["type"]) => (t === "video" ? "Lesson" : t === "quiz" ? "Test" : "Resource");

export function newModule(courseId: string, n: number): Module {
  return { id: `mod_${courseId}_${uid("")}`, courseId, title: `Module ${n}`, position: n, items: [] };
}

export function newVideo(moduleId: string): VideoItem {
  const id = uid("v-");
  return {
    id,
    moduleId,
    position: 0,
    type: "video",
    lesson: { id: `ls_${id}`, title: "", description: "", videoPath: "", durationSec: 0, isFreePreview: false, hasCaptions: true },
  };
}

export function newQuestion(type: QuestionType = "single"): Question {
  const id = uid("q");
  if (type === "true_false")
    return {
      id,
      type,
      text: "",
      explanation: "",
      position: 0,
      points: 1,
      options: [
        { id: `${id}_t`, text: "True", isCorrect: true },
        { id: `${id}_f`, text: "False", isCorrect: false },
      ],
    };
  if (type === "short") return { id, type, text: "", explanation: "", position: 0, points: 1, options: [], acceptedAnswers: [] };
  return {
    id,
    type,
    text: "",
    explanation: "",
    position: 0,
    points: 1,
    options: [
      { id: `${id}_o1`, text: "", isCorrect: true },
      { id: `${id}_o2`, text: "", isCorrect: false },
      { id: `${id}_o3`, text: "", isCorrect: false },
    ],
  };
}

export function newQuiz(moduleId: string): QuizItem {
  const id = uid("t-");
  return {
    id,
    moduleId,
    position: 0,
    type: "quiz",
    quiz: { id: `qz_${id}`, title: "", description: "", passPercentage: 70, maxAttempts: 0, isGating: false, questions: [newQuestion("single")] },
  };
}

export function newResource(moduleId: string): ResourceItem {
  const id = uid("r-");
  return { id, moduleId, position: 0, type: "resource", resource: { id: `rs_${id}`, title: "", description: "", fileType: "pdf", url: "" } };
}

/** Renumber positions + module ids, and make sure the first video of the course is a free preview. */
export function normalize(courseId: string, modules: Module[]): Module[] {
  let firstVideoSeen = false;
  return modules.map((m, mi) => ({
    ...m,
    courseId,
    position: mi + 1,
    items: m.items.map((it, ii) => {
      const base = { ...it, moduleId: m.id, position: ii + 1 } as ModuleItem;
      if (base.type === "video" && !firstVideoSeen) {
        firstVideoSeen = true;
        if (!base.lesson.isFreePreview) return { ...base, lesson: { ...base.lesson, isFreePreview: true } };
      }
      return base;
    }),
  }));
}

/** The first video item id in course order (always the free preview). */
export function firstVideoId(modules: Module[]) {
  for (const m of modules) for (const it of m.items) if (it.type === "video") return it.id;
  return null;
}

/** "12:34" / "1:02:03" / "754" -> seconds (NaN when invalid). */
export function parseDuration(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const parts = t.split(":").map((p) => (/^\d{1,2}$/.test(p) ? Number(p) : NaN));
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) return NaN;
  const [h, m, sec] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (sec > 59 || (parts.length === 3 && m > 59)) return NaN;
  return h * 3600 + m * 60 + sec;
}

/* ----------------------------------------------------------------------------- quiz validation */
/** Problems per field of a question (shown under that field in the editor). */
export function questionFieldIssues(q: Question): { text?: string; options?: string; answers?: string } {
  const out: { text?: string; options?: string; answers?: string } = {};
  if (q.text.trim().length < 3) out.text = "Write the question.";
  if (q.type === "short") {
    if (!(q.acceptedAnswers ?? []).some((a) => a.trim())) out.answers = "Add at least one accepted answer.";
    return out;
  }
  const filled = q.options.filter((o) => o.text.trim());
  const correct = q.options.filter((o) => o.isCorrect).length;
  if (q.type !== "true_false" && filled.length < 2) out.options = "Add at least two options.";
  else if (q.type !== "true_false" && filled.length !== q.options.length) out.options = "Fill in or remove empty options.";
  else if (correct === 0) out.options = "Mark the correct answer.";
  else if ((q.type === "single" || q.type === "true_false") && correct > 1) out.options = "Single choice needs exactly one correct answer.";
  return out;
}

export function questionIssues(q: Question): string[] {
  const f = questionFieldIssues(q);
  return [f.text, f.options, f.answers].filter((x): x is string => !!x);
}

export function quizProblems(quiz: Quiz) {
  const perQuestion = Object.fromEntries(quiz.questions.map((q) => [q.id, questionIssues(q)]));
  const broken = quiz.questions.filter((q) => perQuestion[q.id].length).length;
  return { perQuestion, broken, empty: quiz.questions.length === 0 };
}

/* ----------------------------------------------------------------------------- checklist */
export interface CheckItem {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
  hint?: string;
  /** where to fix it */
  tab?: "curriculum" | "details" | "pricing";
}

export function buildChecklist(course: Pick<Course, "promise" | "description" | "thumbnail" | "outcomes" | "title" | "price">, modules: Module[]): CheckItem[] {
  const items = modules.flatMap((m) => m.items);
  const videos = items.filter((i): i is VideoItem => i.type === "video");
  const quizzes = items.filter((i): i is QuizItem => i.type === "quiz");
  const first = videos[0];
  const missingVideo = videos.filter((v) => !v.lesson.videoPath).length;
  const badQuizzes = quizzes.filter((q) => {
    const p = quizProblems(q.quiz);
    return p.empty || p.broken > 0;
  }).length;
  return [
    { id: "module", label: "At least one module with a lesson", ok: modules.length > 0 && videos.length > 0, required: true, tab: "curriculum", hint: "Add a video lesson to a module." },
    { id: "free", label: "First video is marked as the free preview", ok: !!first?.lesson.isFreePreview, required: true, tab: "curriculum", hint: "We do this automatically once you add a video." },
    { id: "uploads", label: "Every lesson has a video uploaded", ok: videos.length > 0 && missingVideo === 0, required: true, tab: "curriculum", hint: missingVideo ? `${missingVideo} ${missingVideo === 1 ? "lesson is" : "lessons are"} still waiting for a file.` : undefined },
    { id: "quizzes", label: "Every test has questions with a correct answer", ok: badQuizzes === 0, required: true, tab: "curriculum", hint: badQuizzes ? `${badQuizzes} ${badQuizzes === 1 ? "test needs" : "tests need"} attention.` : undefined },
    { id: "promise", label: "Course promise is clear", ok: course.promise.trim().length >= 20, required: true, tab: "details", hint: "One line, 20+ characters: what can learners do at the end?" },
    { id: "cover", label: "Cover image is set", ok: !!course.thumbnail, required: true, tab: "details" },
    { id: "desc", label: "Description says what learners will build", ok: course.description.trim().length >= 80, required: false, tab: "details", hint: "80+ characters helps learners decide." },
    { id: "outcomes", label: "Three or more learning outcomes", ok: course.outcomes.filter((o) => o.trim()).length >= 3, required: false, tab: "details" },
    { id: "length", label: "At least three lessons", ok: videos.length >= 3, required: false, tab: "curriculum" },
    { id: "empty", label: "No empty modules", ok: modules.every((m) => m.items.length > 0), required: false, tab: "curriculum" },
  ];
}

/* ----------------------------------------------------------------------------- free preview bookkeeping */
/**
 * The first video of a course is free automatically; any other free video is a tutor's own opt-in.
 * When a reorder changes which video comes first, the old first video loses its automatic free flag
 * (unless the tutor opted it in themselves), so reordering never silently adds paid lessons to the
 * free tier. `manual` holds the lesson ids the tutor opted in; it's updated in place.
 */
export function reconcileFreePreview(prev: Module[], next: Module[], manual: Set<string>): Module[] {
  const pf = firstVideo(prev);
  const nf = firstVideo(next);
  let out = next;
  if (pf && pf.id !== nf?.id && !manual.has(pf.lesson.id)) {
    out = next.map((m) => ({
      ...m,
      items: m.items.map((it) => (it.type === "video" && it.id === pf.id && it.lesson.isFreePreview ? { ...it, lesson: { ...it.lesson, isFreePreview: false } } : it)),
    }));
  }
  // remember explicit choices on every video that isn't first
  const first = firstVideo(out);
  for (const m of out)
    for (const it of m.items) {
      if (it.type !== "video" || it.id === first?.id) continue;
      if (it.lesson.isFreePreview) manual.add(it.lesson.id);
      else manual.delete(it.lesson.id);
    }
  return out;
}

/** Free videos that aren't first: the tutor's own opt-ins. */
export function manualFreeIds(modules: Module[]) {
  const first = firstVideo(modules);
  const ids = new Set<string>();
  for (const m of modules) for (const it of m.items) if (it.type === "video" && it.id !== first?.id && it.lesson.isFreePreview) ids.add(it.lesson.id);
  return ids;
}

export function firstVideo(modules: Module[]): VideoItem | null {
  for (const m of modules) for (const it of m.items) if (it.type === "video") return it;
  return null;
}

/* ----------------------------------------------------------------------------- resources */
export const FILE_TYPE_LABEL: Record<Resource["fileType"], string> = {
  pdf: "PDF",
  zip: "ZIP folder",
  sheet: "Spreadsheet",
  template: "Template",
  link: "Link",
  audio: "Audio",
};

export function formatSize(kb?: number) {
  if (!kb) return "";
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/** "PDF · 312 KB" / "Link" */
export function resourceMeta(r: Pick<Resource, "fileType" | "sizeKb">) {
  return [FILE_TYPE_LABEL[r.fileType], r.fileType !== "link" ? formatSize(r.sizeKb) : ""].filter(Boolean).join(" · ");
}

/** "practice-workbook_v2.xlsx" -> "Practice Workbook V2" */
export function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());
}

/** Accepted short answers, deduped ignoring capitals and spaces (the grader ignores both). */
export function answerKey(a: string) {
  return a.toLowerCase().replace(/\s+/g, "");
}

/* ----------------------------------------------------------------------------- store hygiene */
/** A copy of `obj` without `key` (instead of writing `key: undefined`). */
export function omitKey<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

/** How the demo store persists an explicit undefined (it only revives it on top-level fields). */
const STORE_UNDEF = "__tm_undef__";

/**
 * Deep copy that drops every key whose value is `undefined` (or the store's persisted
 * "cleared" sentinel). The store revives that sentinel only shallowly (FND-08), so a nested
 * undefined would reach learners as the literal string; optional fields are omitted instead.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (v !== undefined && v !== STORE_UNDEF) out[k] = stripUndefined(v);
    return out as T;
  }
  return value;
}
