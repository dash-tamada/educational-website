/* =============================================================================
   Student area derivations (pure, server- and client-safe). Everything here is
   computed from the db you pass in (useDb() on the client), so actions taken
   in the player, checkout or wishlist show up on the dashboard immediately.
   ============================================================================= */

import {
  MOCK_NOW,
  flattenCurriculum,
  getCertificates,
  getCourseCard,
  getEnrolledCourses,
  getStudentStats,
  getWishlist,
  type CourseProgress,
  type Db,
  type EnrolledCourse,
  type ItemContext,
  type ModuleItem,
} from "@/lib/mock";
import { getItemAccessMap, type AccessResult } from "@/lib/access";
import type { IconName } from "@/components/app";
import type { Tone } from "@/lib/landing-data";

/* ----------------------------------------------------------------------------- enrolments */
/**
 * The learner's enrolled courses, one row per course (most recently active first).
 * The seed can hold two enrolment rows for the same course (e.g. a purchase plus a
 * later grant), so we keep the first and prefer a paid row for order links.
 */
export function getMyCourses(userId: string, db: Db): EnrolledCourse[] {
  const out = new Map<string, EnrolledCourse>();
  for (const e of getEnrolledCourses(userId, db)) {
    const prev = out.get(e.course.id);
    if (!prev) out.set(e.course.id, e);
    else if (!prev.enrollment.orderId && e.enrollment.orderId) out.set(e.course.id, { ...prev, enrollment: e.enrollment });
  }
  return [...out.values()];
}

/* ----------------------------------------------------------------------------- course state */
export type CourseState = "in_progress" | "completed" | "not_started";

export function courseState(p: CourseProgress): CourseState {
  if (p.total > 0 && p.percent >= 100) return "completed";
  if (p.completed === 0 && !p.lastActivityAt) return "not_started";
  return "in_progress";
}

export const STATE_META: Record<CourseState, { label: string; tone: "mint" | "butter" | "neutral" | "blue" }> = {
  in_progress: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "mint" },
  not_started: { label: "Not started", tone: "neutral" },
};

/* ----------------------------------------------------------------------------- dates (IST) */
const IST = 330 * 60_000;
const DAY = 86_400_000;
const dayKey = (t: number) => new Date(t + IST).toISOString().slice(0, 10);
const todayStart = () => {
  const d = new Date(MOCK_NOW.getTime() + IST);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST;
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ----------------------------------------------------------------------------- items */
function itemIndex(db: Db) {
  const map = new Map<string, ModuleItem>();
  for (const mods of Object.values(db.curricula)) for (const m of mods) for (const it of m.items) map.set(it.id, it);
  return map;
}

/** Rough minutes an item takes (videos: real duration; quizzes ~1 min/question; resources 3 min). */
export function itemMinutes(item: ModuleItem): number {
  if (item.type === "video") return Math.max(1, Math.round(item.lesson.durationSec / 60));
  if (item.type === "quiz") return Math.max(2, item.quiz.questions.length);
  return 3;
}

export function itemMeta(item: ModuleItem): { icon: IconName; kind: string; detail: string } {
  if (item.type === "video") return { icon: "play", kind: "Video", detail: `${itemMinutes(item)} min` };
  if (item.type === "quiz")
    return {
      icon: "quiz",
      kind: item.quiz.isGating ? "Checkpoint" : "Quiz",
      detail: `${item.quiz.questions.length} questions · pass ${item.quiz.passPercentage}%`,
    };
  return { icon: "file", kind: "Resource", detail: item.resource.fileType.toUpperCase() };
}

/* ----------------------------------------------------------------------------- activity */
/** Learning events (minutes on a day) from progress, quiz attempts and notes. */
function learningEvents(userId: string, db: Db): { t: number; minutes: number }[] {
  const items = itemIndex(db);
  const out: { t: number; minutes: number }[] = [];
  for (const p of db.lessonProgress) {
    if (p.userId !== userId) continue;
    const it = items.get(p.itemId);
    if (!it) continue;
    const when = new Date(p.completedAt ?? p.updatedAt).getTime();
    if (it.type === "video") {
      const sec = p.completed ? it.lesson.durationSec : p.lastPositionSec;
      if (sec > 0) out.push({ t: when, minutes: sec / 60 });
    } else if (p.completed) out.push({ t: when, minutes: 3 });
  }
  for (const a of db.quizAttempts) {
    if (a.userId !== userId) continue;
    out.push({ t: new Date(a.createdAt).getTime(), minutes: Math.max(2, a.results.length) });
  }
  return out;
}

export type ActivityPoint = { label: string; value: number; key: string };

/** Minutes per day for the last 7 days (oldest first, last = today). */
export function dailyMinutes(userId: string, db: Db, days = 7): ActivityPoint[] {
  const start = todayStart();
  const buckets = new Map<string, number>();
  for (const e of learningEvents(userId, db)) buckets.set(dayKey(e.t), (buckets.get(dayKey(e.t)) ?? 0) + e.minutes);
  return Array.from({ length: days }, (_, i) => {
    const t = start - (days - 1 - i) * DAY;
    const key = dayKey(t + 12 * 3600_000);
    const d = new Date(t + IST + 12 * 3600_000);
    return { key, label: i === days - 1 ? "Today" : WEEKDAYS[d.getUTCDay()], value: Math.round(buckets.get(key) ?? 0) };
  });
}

/**
 * Minutes per week for the last n weeks (rolling 7-day windows ending today).
 * Built from the same rounded daily minutes as dailyMinutes(), so "This week"
 * reads the same number in both chart views.
 */
export function weeklyMinutes(userId: string, db: Db, weeks = 8): ActivityPoint[] {
  const days = dailyMinutes(userId, db, weeks * 7);
  return Array.from({ length: weeks }, (_, i) => {
    const chunk = days.slice(i * 7, i * 7 + 7);
    const [, mm, dd] = chunk[0].key.split("-").map(Number);
    return {
      key: chunk[0].key,
      label: i === weeks - 1 ? "This wk" : `${dd} ${MONTHS[mm - 1]}`,
      value: chunk.reduce((s, x) => s + x.value, 0),
    };
  });
}

/* ----------------------------------------------------------------------------- up next */
export interface UpNextItem {
  course: EnrolledCourse["course"];
  ctx: ItemContext;
  access: AccessResult;
  /** first unfinished step of its course */
  isResume: boolean;
  /** the learner has saved progress on this exact step (part-watched video, or a quiz attempt) */
  hasProgress: boolean;
  /** the learner hasn't opened this course yet */
  fresh: boolean;
}

/**
 * The next unfinished items across active courses (resume item first, then what follows).
 * Courses already in progress come first (most recent activity first, the same pick as the
 * Continue hero), then the ones not started yet.
 */
export function upNext(userId: string, db: Db, perCourse = 2, max = 5): UpNextItem[] {
  const user = { userId, role: "student" as const };
  const out: UpNextItem[] = [];
  const mine = getMyCourses(userId, db).filter((e) => courseState(e.progress) !== "completed");
  const ordered = [...mine.filter((e) => courseState(e.progress) === "in_progress"), ...mine.filter((e) => courseState(e.progress) === "not_started")];
  for (const e of ordered) {
    const flat = flattenCurriculum(e.course.id, db);
    const done = new Set(e.progress.completedItemIds);
    const access = getItemAccessMap(user, e.course, db);
    const start = Math.max(
      0,
      flat.findIndex((x) => x.item.id === e.progress.resumeItemId),
    );
    let n = 0;
    for (let i = start; i < flat.length && n < perCourse; i++) {
      const ctx = flat[i];
      if (done.has(ctx.item.id)) continue;
      out.push({
        course: e.course,
        ctx,
        access: access[ctx.item.id] ?? { allowed: true, reason: "enrolled" },
        isResume: n === 0,
        hasProgress: hasSavedProgress(userId, ctx.item, db),
        fresh: e.progress.completed === 0 && !e.progress.lastActivityAt,
      });
      n++;
    }
  }
  return out.slice(0, max);
}

/** A part-watched video (15s or more, not finished) or a quiz the learner has already attempted. */
export function hasSavedProgress(userId: string, item: ModuleItem, db: Db): boolean {
  if (item.type === "quiz") return db.quizAttempts.some((a) => a.userId === userId && a.itemId === item.id);
  const p = db.lessonProgress.find((x) => x.userId === userId && x.itemId === item.id);
  return !!p && !p.completed && p.lastPositionSec >= 15;
}

/* ----------------------------------------------------------------------------- tiny wins */
export interface TinyWin {
  id: string;
  icon: IconName;
  tone: Tone;
  title: string;
  at: string;
  href?: string;
}

export function tinyWins(userId: string, db: Db, max = 5): TinyWin[] {
  const wins: TinyWin[] = [];
  const courseOf = (id: string) => db.courses.find((c) => c.id === id);
  // quizzes passed (first pass per quiz)
  const seen = new Set<string>();
  for (const a of [...db.quizAttempts].filter((x) => x.userId === userId && x.passed).sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
    if (seen.has(a.itemId)) continue;
    seen.add(a.itemId);
    const c = courseOf(a.courseId);
    const item = flattenCurriculum(a.courseId, db).find((x) => x.item.id === a.itemId)?.item;
    const name = item?.type === "quiz" ? item.quiz.title : "a quiz";
    wins.push({
      id: `q-${a.id}`,
      icon: "check-circle",
      tone: "mint",
      title: `You passed “${name}” with ${a.score}%`,
      at: a.createdAt,
      href: c ? `/learn/${c.slug}/${a.itemId}` : undefined,
    });
  }
  // certificates
  for (const cert of getCertificates(userId, db)) {
    if (!cert.course) continue;
    wins.push({
      id: `c-${cert.id}`,
      icon: "award",
      tone: "sun",
      title: `You finished ${cert.course.title}. Certificate earned!`,
      at: cert.issuedAt,
      href: `/certificates/${cert.code}`,
    });
  }
  // modules finished
  for (const e of getMyCourses(userId, db)) {
    const done = new Set(e.progress.completedItemIds);
    const lp = db.lessonProgress.filter((p) => p.userId === userId && p.courseId === e.course.id);
    for (const m of db.curricula[e.course.id] ?? []) {
      if (!m.items.length || !m.items.every((it) => done.has(it.id))) continue;
      const last = m.items
        .map((it) => lp.find((p) => p.itemId === it.id)?.completedAt ?? db.quizAttempts.find((a) => a.userId === userId && a.itemId === it.id && a.passed)?.createdAt)
        .filter((x): x is string => !!x)
        .sort()
        .pop();
      if (!last) continue;
      wins.push({ id: `m-${m.id}`, icon: "layers", tone: "cyan", title: `You wrapped up “${m.title}” in ${e.course.title}`, at: last, href: `/dashboard/courses` });
    }
  }
  // streak
  const stats = getStudentStats(userId, db);
  if (stats.streakDays >= 2)
    wins.push({
      id: "streak",
      icon: "spark",
      tone: "tangerine",
      title: `You kept a ${stats.streakDays}-day streak going`,
      at: new Date(MOCK_NOW.getTime() - 60_000).toISOString(),
    });
  return wins.sort((a, b) => b.at.localeCompare(a.at)).slice(0, max);
}

/* ----------------------------------------------------------------------------- recommendations */
/**
 * Published courses the learner neither owns nor already saved, nudged towards
 * categories they like. Callers freeze the result per mount (see
 * useFrozenRecommendations) so saving one doesn't reshuffle the grid.
 */
export function recommendations(userId: string, db: Db, n = 3) {
  const enrolled = getMyCourses(userId, db);
  const owned = new Set(enrolled.map((e) => e.course.id));
  const liked = new Map<string, number>();
  for (const e of enrolled) liked.set(e.course.categoryId, (liked.get(e.course.categoryId) ?? 0) + 2);
  const saved = new Set<string>();
  for (const w of getWishlist(userId, db)) {
    saved.add(w.course.id);
    liked.set(w.course.categoryId, (liked.get(w.course.categoryId) ?? 0) + 1);
  }
  const scored = db.courses
    .filter((c) => c.status === "published" && !owned.has(c.id) && !saved.has(c.id))
    .map((c) => ({ c, score: (liked.get(c.categoryId) ?? 0) * 3 + c.rating * 2 + Math.log10(Math.max(10, c.learners)) }))
    .sort((a, b) => b.score - a.score || a.c.title.localeCompare(b.c.title));
  const cards = scored
    .slice(0, n)
    .map(({ c }) => getCourseCard(c.id, db))
    .filter((x): x is NonNullable<typeof x> => !!x);
  // only say "because you're into X" for categories that actually made the cut
  const shown = new Set(cards.map((c) => c.course.categoryId));
  const cats = [...liked.entries()]
    .filter(([id]) => shown.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => db.categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  return { cards, because: cats.slice(0, 2) };
}

/** "MODULE 04 / LESSON 02" -> "M4 · Lesson 02" (compact, but keeps the module). */
export function shortItemLabel(label: string) {
  const [mod, rest] = label.split(" / ");
  const n = mod?.match(/\d+/)?.[0];
  if (!rest || !n) return label;
  const tail = rest.charAt(0) + rest.slice(1).toLowerCase();
  return `M${Number(n)} · ${tail}`;
}

/** "Hey, Priya" from "Priya Nair" (skips a "Dr." prefix). */
export const firstName = (name: string) => name.replace(/^Dr\.\s*/, "").split(/\s+/)[0] ?? name;

/** Greeting by IST hour of MOCK_NOW. */
export function greetingWord() {
  const h = new Date(MOCK_NOW.getTime() + IST).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
