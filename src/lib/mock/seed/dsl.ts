import type {
  Course,
  Lesson,
  Module,
  ModuleItem,
  Question,
  Quiz,
  Resource,
  ResourceFileType,
} from "../types";
import { mmss } from "./util";

/* =============================================================================
   Compact authoring format for course content (keeps the seed readable).

   modules: [{ t: "Module title", s?: "summary", items: [...] }]
   items:
     ["v", "Lesson title", "One-line description", "12:30", chapters?]
     ["r", "Resource title", "description", "pdf", sizeKb?]
     ["q", { t, d?, pass, tries, gate, time?, qs: [...] }]
   questions:
     ["s",  "Single choice?", ["wrong", "*right", "wrong"], "explanation"]
     ["m",  "Pick all that apply", ["*right", "*right", "wrong"], "explanation"]
     ["tf", "Statement", true, "explanation"]
     ["sa", "Short answer?", ["accepted", "also accepted"], "explanation"]
   ============================================================================= */

export type QSeed =
  | ["s" | "m", string, string[], string]
  | ["tf", string, boolean, string]
  | ["sa", string, string[], string];

export type QuizSeed = {
  t: string;
  d?: string;
  pass: number;
  tries: number;
  gate: boolean;
  time?: number;
  qs: QSeed[];
};

export type ItemSeed =
  | ["v", string, string, string, [string, string][]?]
  | ["r", string, string, ResourceFileType, number?]
  | ["q", QuizSeed];

export type ModuleSeed = { t: string; s?: string; items: ItemSeed[] };

export type CourseSeed = Omit<
  Course,
  "currency" | "rating" | "reviewCount" | "learners" | "hasCertificate"
> & {
  /** short code used to build item ids, e.g. "wd" -> wd-1-1 */
  code: string;
  rating: number;
  learners: number;
  hasCertificate?: boolean;
  modules: ModuleSeed[];
};

function buildQuestion(q: QSeed, quizId: string, i: number): Question {
  const id = `${quizId}_q${i + 1}`;
  if (q[0] === "tf") {
    const [, text, answer, explanation] = q;
    return {
      id,
      type: "true_false",
      text,
      explanation,
      position: i + 1,
      points: 1,
      options: [
        { id: `${id}_t`, text: "True", isCorrect: answer },
        { id: `${id}_f`, text: "False", isCorrect: !answer },
      ],
    };
  }
  if (q[0] === "sa") {
    const [, text, accepted, explanation] = q;
    return { id, type: "short", text, explanation, position: i + 1, points: 1, options: [], acceptedAnswers: accepted };
  }
  const [kind, text, opts, explanation] = q;
  return {
    id,
    type: kind === "s" ? "single" : "multiple",
    text,
    explanation,
    position: i + 1,
    points: 1,
    options: opts.map((o, j) => ({
      id: `${id}_o${j + 1}`,
      text: o.replace(/^\*/, ""),
      isCorrect: o.startsWith("*"),
    })),
  };
}

const RES_URL: Record<ResourceFileType, string> = {
  pdf: "/mock/files/resource.pdf",
  zip: "/mock/files/resource.zip",
  sheet: "/mock/files/resource.xlsx",
  template: "/mock/files/resource-template.pdf",
  link: "https://example.com/resource",
  audio: "/mock/files/resource.mp3",
};

/** Builds resolved modules for a course. The first video of the course is the free preview. */
export function buildCurriculum(courseId: string, code: string, modules: ModuleSeed[]): Module[] {
  let firstVideoSeen = false;
  return modules.map((m, mi) => {
    const moduleId = `mod_${code}_${mi + 1}`;
    const items: ModuleItem[] = m.items.map((it, ii) => {
      const id = `${code}-${mi + 1}-${ii + 1}`;
      const base = { id, moduleId, position: ii + 1 };
      if (it[0] === "v") {
        const [, title, description, dur, chapters] = it;
        const isFree = !firstVideoSeen;
        firstVideoSeen = true;
        const lesson: Lesson = {
          id: `ls_${id}`,
          title,
          description,
          videoPath: `courses/${courseId}/${id}.mp4`,
          durationSec: mmss(dur),
          isFreePreview: isFree,
          hasCaptions: (mi + ii) % 5 !== 4,
          chapters: chapters?.map(([at, t]) => ({ atSec: mmss(at), title: t })),
        };
        return { ...base, type: "video", lesson };
      }
      if (it[0] === "r") {
        const [, title, description, fileType, sizeKb] = it;
        const resource: Resource = {
          id: `rs_${id}`,
          title,
          description,
          fileType,
          sizeKb: fileType === "link" ? undefined : (sizeKb ?? 480),
          url: RES_URL[fileType],
        };
        return { ...base, type: "resource", resource };
      }
      const q = it[1];
      const quizId = `qz_${id}`;
      const quiz: Quiz = {
        id: quizId,
        title: q.t,
        description:
          q.d ??
          `${q.qs.length} quick questions. Pass with ${q.pass}% ${q.gate ? "to unlock the next part" : "to lock in what you learned"}.`,
        passPercentage: q.pass,
        maxAttempts: q.tries,
        isGating: q.gate,
        timeLimitMin: q.time,
        questions: q.qs.map((qq, qi) => buildQuestion(qq, quizId, qi)),
      };
      return { ...base, type: "quiz", quiz };
    });
    return { id: moduleId, courseId, title: m.t, summary: m.s, position: mi + 1, items };
  });
}
