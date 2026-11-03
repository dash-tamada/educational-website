/* =============================================================================
   Mock data selectors. Every selector takes the db as its LAST argument and
   defaults to the immutable seed, so:
     - Server components:  getCourseBySlug(slug)              (seed)
     - Client components:  getCourseBySlug(slug, useDb())     (seed + demo store overlay)
   Swap these for real queries later; the shapes mirror the planned tables.
   ============================================================================= */

import type {
  AnalyticsRange,
  Category,
  Coupon,
  Certificate,
  Course,
  CourseLevel,
  CourseStatus,
  Db,
  Enrollment,
  ItemContext,
  LessonComment,
  Module,
  ModuleItem,
  Notification,
  Order,
  OrderStatus,
  Profile,
  Quiz,
  Report,
  QuizAnswers,
  QuizForTaking,
  Review,
  Role,
  SeriesPoint,
  Tutor,
  TutorAnalytics,
  TutorApplication,
  ApplicationStatus,
} from "./types";
import { SEED_DB } from "./seed/db";
import { PLATFORM_SERIES, dailySeries } from "./seed/analytics";
import {
  COURSE_SALES,
  CURRENT_MONTH,
  MONTH_DAYS_SO_FAR,
  dayLabelOf,
  grossOf,
  revenueOf,
  lastDays,
  monthLabelOf,
  monthRange,
  platformDaily,
  type CourseSalesRow,
} from "./seed/sales";
import { MOCK_NOW, MOCK_NOW_ISO, monthKey, rng } from "./seed/util";
import { formatINR, formatNumber, pad2, plural, timeAgo } from "./format";
import { REFUND_MAX_PROGRESS, REFUND_WINDOW_DAYS } from "./policy";

export * from "./types";
export * from "./format";
export { SEED_DB } from "./seed/db";
export { computeAggregates } from "./seed/db";
export { MOCK_NOW, MOCK_NOW_ISO } from "./seed/util";
export { DEMO_STUDENT_ID, DEMO_TUTOR_ID, DEMO_ADMIN_ID } from "./seed/people";
export { GST_RATE, COUPON_FACTOR, LEDGER_FROM } from "./seed/sales";

/* ============================================================================= pagination */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
export function paginate<T>(all: T[], page = 1, pageSize = 12): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  return { items: all.slice((p - 1) * pageSize, p * pageSize), total: all.length, page: p, pageSize, pageCount };
}
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const matches = (q: string | undefined, ...fields: (string | undefined)[]) => {
  if (!q?.trim()) return true;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hay = norm(fields.filter(Boolean).join(" "));
  return words.every((w) => hay.includes(w));
};
const daysBetween = (a: string, b: string | Date = MOCK_NOW) =>
  ((typeof b === "string" ? new Date(b) : b).getTime() - new Date(a).getTime()) / 86_400_000;

/* ============================================================================= categories */
export function getCategories(db: Db = SEED_DB): Category[] {
  return [...db.categories].sort((a, b) => a.position - b.position);
}
export function getCategory(idOrSlug: string, db: Db = SEED_DB): Category | null {
  return db.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
}
/** Published course count per category id. */
export function getCategoryCounts(db: Db = SEED_DB): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of db.courses) if (c.status === "published") out[c.categoryId] = (out[c.categoryId] ?? 0) + 1;
  return out;
}

/* ============================================================================= courses */
export type CourseSort = "popular" | "newest" | "rating" | "price-asc" | "price-desc" | "title";
export interface CourseQuery {
  search?: string;
  /** category slug or id */
  category?: string;
  level?: CourseLevel | CourseLevel[];
  /** default "published"; "any" returns every status */
  status?: CourseStatus | CourseStatus[] | "any";
  tutorId?: string;
  priceMax?: number;
  minRating?: number;
  featured?: boolean;
  ids?: string[];
  sort?: CourseSort;
  page?: number;
  pageSize?: number;
}

/** Filter + search + sort + paginate. Search covers title, promise, tags, tutor and category names, level and language. */
export function getCourses(q: CourseQuery = {}, db: Db = SEED_DB): Page<Course> {
  const cat = q.category ? getCategory(q.category, db) : null;
  const statuses = q.status === "any" ? null : Array.isArray(q.status) ? q.status : [q.status ?? "published"];
  const levels = q.level ? (Array.isArray(q.level) ? q.level : [q.level]) : null;
  let list = db.courses.filter((c) => {
    if (statuses && !statuses.includes(c.status)) return false;
    if (q.category && c.categoryId !== cat?.id) return false;
    if (levels && !levels.includes(c.level)) return false;
    if (q.tutorId && c.tutorId !== q.tutorId) return false;
    if (q.priceMax !== undefined && c.price > q.priceMax) return false;
    if (q.minRating !== undefined && c.rating < q.minRating) return false;
    if (q.featured && !c.featured) return false;
    if (q.ids && !q.ids.includes(c.id)) return false;
    if (q.search) {
      const tutor = db.users.find((u) => u.id === c.tutorId)?.name;
      const category = db.categories.find((x) => x.id === c.categoryId)?.name;
      if (!matches(q.search, c.title, c.promise, c.tags.join(" "), tutor, category, c.level, c.language)) return false;
    }
    return true;
  });
  const sort = q.sort ?? "popular";
  list = [...list].sort((a, b) => {
    switch (sort) {
      case "newest":
        return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
      case "rating":
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return b.learners - a.learners;
    }
  });
  return paginate(list, q.page ?? 1, q.pageSize ?? 12);
}
/** Every course row (any status), unsorted. */
export const getAllCourses = (db: Db = SEED_DB): Course[] => db.courses;
export function getCourseBySlug(slug: string, db: Db = SEED_DB): Course | null {
  return db.courses.find((c) => c.slug === slug) ?? null;
}
export function getCourseById(id: string, db: Db = SEED_DB): Course | null {
  return db.courses.find((c) => c.id === id) ?? null;
}
/** Accepts an id ("crs_aifilm") or a slug ("ai-filmmaking"). */
export function getCourse(idOrSlug: string, db: Db = SEED_DB): Course | null {
  return db.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
}
/** Published courses with the most learners. */
export function getTopCourses(n = 5, db: Db = SEED_DB): Course[] {
  return getCourses({ sort: "popular", pageSize: n }, db).items;
}
/** Same category first, then the same tutor, excluding the course itself. */
export function getRelatedCourses(courseId: string, n = 3, db: Db = SEED_DB): Course[] {
  const c = getCourseById(courseId, db);
  if (!c) return [];
  const pub = db.courses.filter((x) => x.status === "published" && x.id !== courseId);
  const score = (x: Course) => (x.categoryId === c.categoryId ? 2 : 0) + (x.tutorId === c.tutorId ? 1 : 0) + x.learners / 1e5;
  return [...pub].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/* ============================================================================= curriculum */
export function getCurriculum(courseId: string, db: Db = SEED_DB): Module[] {
  return db.curricula[courseId] ?? [];
}
/** Every item in course order with module, index, label and prev/next. */
export function flattenCurriculum(courseId: string, db: Db = SEED_DB): ItemContext[] {
  const mods = getCurriculum(courseId, db);
  // Numbered per type inside the module: "MODULE 01 / LESSON 03", "MODULE 01 / TEST 01".
  const flat: { item: ModuleItem; module: Module; nth: number }[] = mods.flatMap((m) => {
    const seen: Record<ModuleItem["type"], number> = { video: 0, quiz: 0, resource: 0 };
    return m.items.map((item) => ({ item, module: m, nth: ++seen[item.type] }));
  });
  return flat.map(({ item, module, nth }, index) => ({
    item,
    module,
    index,
    label: `MODULE ${pad2(module.position)} / ${item.type === "quiz" ? "TEST" : item.type === "resource" ? "RESOURCE" : "LESSON"} ${pad2(nth)}`,
    prev: flat[index - 1]?.item ?? null,
    next: flat[index + 1]?.item ?? null,
  }));
}
/** Item by id inside a course (course id or slug). */
export function getItem(courseIdOrSlug: string, itemId: string, db: Db = SEED_DB): ItemContext | null {
  const c = getCourse(courseIdOrSlug, db);
  if (!c) return null;
  return flattenCurriculum(c.id, db).find((x) => x.item.id === itemId) ?? null;
}
/** The free preview video (the first video of the course). */
export function getFirstFreeItem(courseId: string, db: Db = SEED_DB): ModuleItem | null {
  const all = getCurriculum(courseId, db).flatMap((m) => m.items);
  return all.find((i) => i.type === "video" && i.lesson.isFreePreview) ?? all.find((i) => i.type === "video") ?? null;
}
export interface CourseStats {
  modules: number;
  videos: number;
  quizzes: number;
  resources: number;
  items: number;
  totalSec: number;
  freePreviews: number;
}
export function getCourseStats(courseId: string, db: Db = SEED_DB): CourseStats {
  const mods = getCurriculum(courseId, db);
  const all = mods.flatMap((m) => m.items);
  return {
    modules: mods.length,
    videos: all.filter((i) => i.type === "video").length,
    quizzes: all.filter((i) => i.type === "quiz").length,
    resources: all.filter((i) => i.type === "resource").length,
    items: all.length,
    totalSec: all.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0),
    freePreviews: all.filter((i) => i.type === "video" && i.lesson.isFreePreview).length,
  };
}
export function itemTitle(item: ModuleItem): string {
  return item.type === "video" ? item.lesson.title : item.type === "quiz" ? item.quiz.title : item.resource.title;
}

/* ============================================================================= quizzes */
/** Strips correct answers + explanations: safe to render before submission. */
export function getQuizForTaking(quiz: Quiz): QuizForTaking {
  return {
    ...quiz,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      position: q.position,
      points: q.points,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}
const normAns = (s: string) => s.toLowerCase().replace(/[^a-z0-9.+]/g, "");
/** Grades an attempt. Multiple choice must match exactly; short answers are case/space-insensitive. */
export function gradeQuiz(quiz: Quiz, answers: QuizAnswers) {
  const results = quiz.questions.map((q) => {
    const a = answers[q.id];
    let correct = false;
    if (q.type === "short") {
      const text = typeof a === "string" ? a : (a?.[0] ?? "");
      correct = !!text.trim() && (q.acceptedAnswers ?? []).some((x) => normAns(x) === normAns(text));
    } else {
      const picked = new Set(Array.isArray(a) ? a : a ? [a] : []);
      const right = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      correct = picked.size === right.length && right.every((id) => picked.has(id));
    }
    return { questionId: q.id, correct };
  });
  const total = quiz.questions.reduce((s, q) => s + q.points, 0) || 1;
  const got = quiz.questions.reduce((s, q, i) => s + (results[i].correct ? q.points : 0), 0);
  const score = Math.round((got / total) * 100);
  return { score, passed: score >= quiz.passPercentage, results };
}
export function getQuizAttempts(userId: string, itemId: string, db: Db = SEED_DB) {
  return db.quizAttempts
    .filter((a) => a.userId === userId && a.itemId === itemId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function hasPassedQuiz(userId: string, itemId: string, db: Db = SEED_DB): boolean {
  return db.quizAttempts.some((a) => a.userId === userId && a.itemId === itemId && a.passed);
}

/* ============================================================================= people */
export function getUser(id: string, db: Db = SEED_DB): Profile | null {
  return db.users.find((u) => u.id === id) ?? null;
}
export interface UserQuery {
  search?: string;
  role?: Role | "all";
  status?: "active" | "suspended" | "all";
  tutorStatus?: Profile["tutorStatus"];
  sort?: "newest" | "oldest" | "name" | "active";
  page?: number;
  pageSize?: number;
}
export function getUsers(q: UserQuery = {}, db: Db = SEED_DB): Page<Profile> {
  let list = db.users.filter(
    (u) =>
      (!q.role || q.role === "all" || u.role === q.role) &&
      (!q.status || q.status === "all" || u.status === q.status) &&
      (!q.tutorStatus || u.tutorStatus === q.tutorStatus) &&
      matches(q.search, u.name, u.email, u.city),
  );
  const s = q.sort ?? "newest";
  list = [...list].sort((a, b) =>
    s === "name"
      ? a.name.localeCompare(b.name)
      : s === "oldest"
        ? a.joinedAt.localeCompare(b.joinedAt)
        : s === "active"
          ? b.lastActiveAt.localeCompare(a.lastActiveAt)
          : b.joinedAt.localeCompare(a.joinedAt),
  );
  return paginate(list, q.page ?? 1, q.pageSize ?? 20);
}
/** Tutor (profile + public tutor profile) by user id or slug. */
export function getTutor(idOrSlug: string, db: Db = SEED_DB): Tutor | null {
  const tp = db.tutorProfiles.find((t) => t.userId === idOrSlug || t.slug === idOrSlug);
  if (!tp) return null;
  const p = getUser(tp.userId, db);
  return p ? { ...p, ...tp } : null;
}
export function getTutors(db: Db = SEED_DB): Tutor[] {
  return db.tutorProfiles
    .map((t) => getTutor(t.userId, db))
    .filter((t): t is Tutor => !!t && t.role === "tutor" && t.status === "active")
    .sort((a, b) => b.learners - a.learners);
}
/** Courses by a tutor. Public pages: published only (default). Tutor area: pass { all: true }. */
export function getTutorCourses(tutorId: string, opts: { all?: boolean } = {}, db: Db = SEED_DB): Course[] {
  return db.courses
    .filter((c) => c.tutorId === tutorId && (opts.all || c.status === "published"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ============================================================================= reviews */
export type ReviewWithUser = Review & { user: Profile | null };
export function getReviews(
  courseId: string,
  q: { page?: number; pageSize?: number; sort?: "newest" | "helpful" | "highest" | "lowest"; rating?: number; includeHidden?: boolean } = {},
  db: Db = SEED_DB,
): Page<ReviewWithUser> {
  const s = q.sort ?? "newest";
  const list = db.reviews
    .filter((r) => r.courseId === courseId && (q.includeHidden || !r.hidden) && (!q.rating || r.rating === q.rating))
    .sort((a, b) =>
      s === "helpful" ? b.helpful - a.helpful : s === "highest" ? b.rating - a.rating : s === "lowest" ? a.rating - b.rating : b.createdAt.localeCompare(a.createdAt),
    )
    .map((r) => ({ ...r, user: getUser(r.userId, db) }));
  return paginate(list, q.page ?? 1, q.pageSize ?? 6);
}
/** Count of reviews per star (5..1) + average. */
export function getRatingBreakdown(courseId: string, db: Db = SEED_DB) {
  const rs = db.reviews.filter((r) => r.courseId === courseId && !r.hidden);
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rs) counts[r.rating as 1 | 2 | 3 | 4 | 5]++;
  const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
  return { counts, total: rs.length, average: Math.round(avg * 10) / 10 };
}
/** Reviews across all of a tutor's courses (newest first). */
export function getTutorReviews(tutorId: string, db: Db = SEED_DB): (ReviewWithUser & { course: Course })[] {
  const ids = new Set(db.courses.filter((c) => c.tutorId === tutorId).map((c) => c.id));
  return db.reviews
    .filter((r) => ids.has(r.courseId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((r) => {
      const course = getCourseById(r.courseId, db);
      return course ? [{ ...r, user: getUser(r.userId, db), course }] : [];
    });
}

/* ============================================================================= enrollments + progress */
export function getEnrollment(userId: string, courseId: string, db: Db = SEED_DB): Enrollment | null {
  return db.enrollments.find((e) => e.userId === userId && e.courseId === courseId && !e.revokedAt) ?? null;
}
export function isEnrolled(userId: string | null | undefined, courseId: string, db: Db = SEED_DB): boolean {
  return !!userId && !!getEnrollment(userId, courseId, db);
}
export interface CourseProgress {
  completedItemIds: string[];
  completed: number;
  total: number;
  /** 0..100 */
  percent: number;
  /** item to resume: last touched incomplete item, else the first incomplete item */
  resumeItemId: string | null;
  resumePositionSec: number;
  lastActivityAt: string | null;
  passedQuizIds: string[];
}
/** Progress counts videos, resources and quizzes (quizzes count when passed). */
export function getCourseProgress(userId: string, courseId: string, db: Db = SEED_DB): CourseProgress {
  const flat = flattenCurriculum(courseId, db);
  const lp = db.lessonProgress.filter((p) => p.userId === userId && p.courseId === courseId);
  const done = new Set(lp.filter((p) => p.completed).map((p) => p.itemId));
  const passed = new Set(db.quizAttempts.filter((a) => a.userId === userId && a.courseId === courseId && a.passed).map((a) => a.itemId));
  const completedItemIds = flat.filter((x) => (x.item.type === "quiz" ? passed.has(x.item.id) : done.has(x.item.id))).map((x) => x.item.id);
  const completedSet = new Set(completedItemIds);
  const touched = [...lp].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const lastIncomplete = touched.find((p) => !p.completed);
  const firstIncomplete = flat.find((x) => !completedSet.has(x.item.id));
  const resumeItemId = lastIncomplete?.itemId ?? firstIncomplete?.item.id ?? flat[0]?.item.id ?? null;
  const attempts = db.quizAttempts.filter((a) => a.userId === userId && a.courseId === courseId);
  const lastActivityAt = [...touched.map((p) => p.updatedAt), ...attempts.map((a) => a.createdAt)].sort().pop() ?? null;
  return {
    completedItemIds,
    completed: completedItemIds.length,
    total: flat.length,
    percent: flat.length ? Math.round((completedItemIds.length / flat.length) * 100) : 0,
    resumeItemId,
    resumePositionSec: lastIncomplete?.lastPositionSec ?? 0,
    lastActivityAt,
    passedQuizIds: [...passed],
  };
}
export interface EnrolledCourse {
  course: Course;
  enrollment: Enrollment;
  progress: CourseProgress;
  tutor: Tutor | null;
}
/** A learner's active enrollments, most recently active first. */
export function getEnrolledCourses(userId: string, db: Db = SEED_DB): EnrolledCourse[] {
  return db.enrollments
    .filter((e) => e.userId === userId && !e.revokedAt)
    .flatMap((enrollment) => {
      // A stale row (e.g. a client-only course removed by a reset in another tab) is skipped, never thrown on.
      const course = getCourseById(enrollment.courseId, db);
      if (!course) return [];
      return [{ course, enrollment, progress: getCourseProgress(userId, course.id, db), tutor: getTutor(course.tutorId, db) }];
    })
    .sort((a, b) => (b.progress.lastActivityAt ?? b.enrollment.createdAt).localeCompare(a.progress.lastActivityAt ?? a.enrollment.createdAt));
}
/** Learners enrolled in any of a tutor's courses (for the tutor area). */
export function getTutorLearners(tutorId: string, db: Db = SEED_DB) {
  const ids = new Set(db.courses.filter((c) => c.tutorId === tutorId).map((c) => c.id));
  return db.enrollments
    .filter((e) => ids.has(e.courseId) && !e.revokedAt)
    .flatMap((e) => {
      const user = getUser(e.userId, db);
      const course = getCourseById(e.courseId, db);
      return user && course ? [{ enrollment: e, user, course, progress: getCourseProgress(e.userId, e.courseId, db) }] : [];
    })
    .sort((a, b) => b.enrollment.createdAt.localeCompare(a.enrollment.createdAt));
}

/* ============================================================================= wishlist, notes, certificates */
export function getWishlist(userId: string, db: Db = SEED_DB): { id: string; createdAt: string; course: Course }[] {
  return db.wishlist
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((w) => {
      const course = getCourseById(w.courseId, db);
      return course ? [{ id: w.id, createdAt: w.createdAt, course }] : [];
    });
}
export const isWishlisted = (userId: string | null | undefined, courseId: string, db: Db = SEED_DB) =>
  !!userId && db.wishlist.some((w) => w.userId === userId && w.courseId === courseId);
export function getNotes(userId: string, courseId?: string, db: Db = SEED_DB) {
  return db.notes
    .filter((n) => n.userId === userId && (!courseId || n.courseId === courseId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getCertificates(userId: string, db: Db = SEED_DB): (Certificate & { course: Course })[] {
  return db.certificates
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .flatMap((c) => {
      const course = getCourseById(c.courseId, db);
      return course ? [{ ...c, course }] : [];
    });
}
/** Public verification (/certificates/[code]). Case-insensitive. */
export function getCertificateByCode(code: string, db: Db = SEED_DB) {
  const cert = db.certificates.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
  if (!cert) return null;
  const course = getCourseById(cert.courseId, db);
  const user = getUser(cert.userId, db);
  if (!course || !user) return null;
  return { certificate: cert, course, user, tutor: getTutor(course.tutorId, db) };
}

/* ============================================================================= lesson Q&A */
export type CommentWithUser = LessonComment & { user: Profile | null };
export interface CommentThread {
  question: CommentWithUser;
  replies: CommentWithUser[];
  /** a reply exists from the course tutor, or the tutor started the thread (an update: nothing to answer) */
  answered: boolean;
  /** the top-level post was written by the course tutor: an update/announcement, not a learner question */
  byTutor: boolean;
}
export function getComments(courseId: string, itemId?: string, db: Db = SEED_DB): CommentThread[] {
  const course = getCourseById(courseId, db);
  const all = db.comments.filter((c) => c.courseId === courseId && (!itemId || c.itemId === itemId));
  const withUser = (c: LessonComment): CommentWithUser => ({ ...c, user: getUser(c.userId, db) });
  return all
    .filter((c) => !c.parentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => {
      const replies = all.filter((r) => r.parentId === q.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(withUser);
      const byTutor = !!course && q.userId === course.tutorId;
      return { question: withUser(q), replies, byTutor, answered: byTutor || replies.some((r) => r.userId === course?.tutorId) };
    });
}
/** True when this user's like is recorded on the comment (demo.likeComment(id, userId)). */
export function hasLikedComment(comment: Pick<LessonComment, "likedBy">, userId: string | null | undefined): boolean {
  return !!userId && !!comment.likedBy?.includes(userId);
}
/**
 * Every question on a tutor's courses (tutor inbox), still-open first. A thread is handled once the
 * tutor has replied OR it was marked resolved, so `unansweredOnly` (the Questions nav badge,
 * getTutorStats().pendingQuestions) skips both. Threads the tutor started themselves (updates, see
 * CommentThread.byTutor) are not questions and are left out of the inbox entirely.
 */
export function getTutorQuestions(tutorId: string, opts: { unansweredOnly?: boolean } = {}, db: Db = SEED_DB) {
  const courses = db.courses.filter((c) => c.tutorId === tutorId);
  const handled = (t: CommentThread) => t.answered || !!t.question.resolved;
  return courses
    .flatMap((c) =>
      getComments(c.id, undefined, db)
        .filter((t) => !t.byTutor)
        .map((t) => ({ ...t, course: c, item: getItem(c.id, t.question.itemId, db)?.item ?? null })),
    )
    .filter((t) => !opts.unansweredOnly || !handled(t))
    .sort((a, b) => Number(handled(a)) - Number(handled(b)) || b.question.createdAt.localeCompare(a.question.createdAt));
}

/* ============================================================================= commerce */
export type OrderRow = Order & { user: Profile | null; course: Course | null };
export interface OrderQuery {
  userId?: string;
  courseId?: string;
  tutorId?: string;
  status?: OrderStatus | "grant" | "all";
  search?: string;
  sort?: "newest" | "oldest" | "amount";
  page?: number;
  pageSize?: number;
}
export function getOrders(q: OrderQuery = {}, db: Db = SEED_DB): Page<OrderRow> {
  const tutorCourses = q.tutorId ? new Set(db.courses.filter((c) => c.tutorId === q.tutorId).map((c) => c.id)) : null;
  let rows = db.orders
    .filter(
      (o) =>
        (!q.userId || o.userId === q.userId) &&
        (!q.courseId || o.courseId === q.courseId) &&
        (!tutorCourses || tutorCourses.has(o.courseId)) &&
        (!q.status || q.status === "all" || (q.status === "grant" ? o.provider === "admin" : o.status === q.status && o.provider !== "admin")),
    )
    .map((o) => ({ ...o, user: getUser(o.userId, db), course: getCourseById(o.courseId, db) }));
  if (q.search) rows = rows.filter((o) => matches(q.search, o.number, o.user?.name, o.user?.email, o.course?.title, o.providerRef, o.couponCode));
  const s = q.sort ?? "newest";
  rows.sort((a, b) => (s === "amount" ? b.amount - a.amount : s === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  return paginate(rows, q.page ?? 1, q.pageSize ?? 20);
}
export function getOrder(idOrNumber: string, db: Db = SEED_DB): OrderRow | null {
  const o = db.orders.find((x) => x.id === idOrNumber || x.number === idOrNumber);
  return o ? { ...o, user: getUser(o.userId, db), course: getCourseById(o.courseId, db) } : null;
}
/* Refund policy (mirrors /terms#refunds and the FAQ): within 7 days of purchase,
   less than 25% of the course completed, no certificate earned. The constants
   live in ./policy so the seed builder can flag seeded requests too. */
export { REFUND_MAX_PROGRESS, REFUND_WINDOW_DAYS };
export type RefundEligibilityCode =
  | "eligible"
  | "requested"
  | "refunded"
  | "not_paid"
  | "grant"
  | "window_passed"
  | "too_much_progress"
  | "certificate";
export interface RefundEligibility {
  /** inside the policy: a request is very likely approved */
  eligible: boolean;
  /** a request can be sent at all (paid, real money, nothing pending); may still be outside policy */
  canRequest: boolean;
  code: RefundEligibilityCode;
  /** learner-facing one-liner */
  message: string;
  /** whole days left in the 7-day window (0 when passed) */
  daysLeft: number;
  /** course completion (0..100) */
  progress: number;
}
/** Refund policy check for an order (student "Request a refund" + admin context). */
export function getRefundEligibility(orderOrId: Order | string, db: Db = SEED_DB): RefundEligibility {
  const order = typeof orderOrId === "string" ? db.orders.find((o) => o.id === orderOrId || o.number === orderOrId) : orderOrId;
  const progress = order ? getCourseProgress(order.userId, order.courseId, db).percent : 0;
  // demo orders are stamped a few seconds after MOCK_NOW: clamp so a fresh purchase reads "7 days", never 8
  const age = order ? Math.max(0, daysBetween(order.createdAt)) : Infinity;
  const daysLeft = Math.min(REFUND_WINDOW_DAYS, Math.max(0, Math.ceil(REFUND_WINDOW_DAYS - age)));
  const out = (code: RefundEligibilityCode, message: string, canRequest = false): RefundEligibility => ({
    eligible: code === "eligible",
    canRequest,
    code,
    message,
    daysLeft,
    progress,
  });
  if (!order) return out("not_paid", "We couldn't find that order.");
  if (order.status === "refunded") return out("refunded", "This order has already been refunded.");
  if (order.status !== "paid") return out("not_paid", "Only paid orders can be refunded.");
  if (order.provider === "admin" || order.amount <= 0) return out("grant", "This course was a free grant, so there's nothing to refund.");
  if (order.refundRequest) return out("requested", "Refund requested. We usually reply within two working days.");
  if (db.certificates.some((c) => c.userId === order.userId && c.courseId === order.courseId))
    return out("certificate", "You've earned the certificate for this course, so it's outside our refund policy.", true);
  if (age > REFUND_WINDOW_DAYS) return out("window_passed", `Refunds are available for ${REFUND_WINDOW_DAYS} days after purchase, and you bought this one ${timeAgo(order.createdAt)}.`, true);
  if (progress >= REFUND_MAX_PROGRESS) return out("too_much_progress", `You've completed ${progress}% of the course. Refunds cover courses under ${REFUND_MAX_PROGRESS}% done.`, true);
  return out("eligible", `You can ask for a full refund for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}.`, true);
}

export const getCoupons = (db: Db = SEED_DB) => [...db.coupons].sort((a, b) => Number(b.active) - Number(a.active) || b.startsAt.localeCompare(a.startsAt));
/** Who is redeeming a coupon (for per-user rules such as Coupon.firstPurchaseOnly). */
export interface CouponContext {
  userId?: string | null;
}
export type CouponCheck =
  | { valid: true; discount: number; total: number; message: string; coupon: Coupon }
  | { valid: false; discount: number; total: number; message: string; coupon: Coupon | null };
const isDbArg = (x: unknown): x is Db => !!x && typeof x === "object" && Array.isArray((x as Db).coupons);
/** True once the user has a paid order with an amount (free admin grants and refunded orders don't count). */
export function hasPaidPurchase(userId: string, db: Db = SEED_DB) {
  return db.orders.some((o) => o.userId === userId && o.status === "paid" && o.amount > 0);
}
/**
 * Checks a coupon for a course at MOCK_NOW.
 *   validateCoupon(code, courseId, db)                       // anyone (a visitor)
 *   validateCoupon(code, courseId, { userId }, db)           // also applies per-user rules
 * Pass the buyer whenever you know them: first-purchase-only codes (WELCOME10) fail for someone who
 * has already bought a course, with "This one's for your first course...". Without a user they pass.
 */
export function validateCoupon(code: string, courseId: string, ctxOrDb?: CouponContext | Db | null, maybeDb?: Db): CouponCheck {
  const db = isDbArg(ctxOrDb) ? ctxOrDb : (maybeDb ?? SEED_DB);
  const userId = isDbArg(ctxOrDb) ? null : (ctxOrDb?.userId ?? null);
  const course = getCourseById(courseId, db);
  const cp = db.coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
  const fail = (message: string): CouponCheck => ({ valid: false, discount: 0, total: course?.price ?? 0, message, coupon: cp ?? null });
  if (!course) return fail("Course not found.");
  if (!cp) return fail("That code doesn't exist. Check the spelling?");
  if (!cp.active) return fail("This code has been switched off.");
  if (MOCK_NOW_ISO < cp.startsAt) return fail("This code isn't live yet.");
  if (MOCK_NOW_ISO > cp.endsAt) return fail("This code has expired.");
  if (cp.redemptions >= cp.maxRedemptions) return fail("This code has been fully used up.");
  if (cp.courseIds && !cp.courseIds.includes(courseId)) return fail("This code doesn't apply to this course.");
  if (cp.minAmount && course.price < cp.minAmount) return fail(`This code needs a course of ${formatINR(cp.minAmount)} or more.`);
  if (cp.firstPurchaseOnly && userId && hasPaidPurchase(userId, db)) {
    // point a returning buyer at the first code the "codes that work" hint lists for them
    // (same user context and order as getWorkingCoupons, so the message and the hint never disagree)
    const alt = getWorkingCoupons(courseId, userId, db).find((c) => c.id !== cp.id);
    return fail(`This one's for your first course, and you've already bought one.${alt ? ` Try ${alt.code} instead?` : ""}`);
  }
  const discount = cp.kind === "percent" ? Math.round((course.price * cp.value) / 100) : Math.min(cp.value, course.price);
  return { valid: true as const, discount, total: course.price - discount, message: `${cp.code} applied: ${cp.description}.`, coupon: cp };
}
/**
 * Coupons that would work on this course right now for this buyer, course-specific codes first, then A-Z.
 * With a userId, first-purchase-only codes drop out for returning buyers; logged out (null), every
 * generally valid code is listed. validateCoupon's "Try X instead?" suggestion is the first entry here,
 * so a hint list built from this (or catalog's workingCoupons) always agrees with that message.
 */
export function getWorkingCoupons(courseId: string, userId?: string | null, db: Db = SEED_DB): Coupon[] {
  // returning buyers skip first-purchase codes up front; this also keeps validateCoupon from recursing
  const returning = !!userId && hasPaidPurchase(userId, db);
  return db.coupons
    .filter((c) => c.active && !(returning && c.firstPurchaseOnly) && validateCoupon(c.code, courseId, { userId: userId ?? null }, db).valid)
    .sort((a, b) => Number(!!b.courseIds) - Number(!!a.courseIds) || a.code.localeCompare(b.code));
}
export function getPayouts(tutorId?: string, db: Db = SEED_DB) {
  return db.payouts.filter((p) => !tutorId || p.tutorId === tutorId).sort((a, b) => b.period.localeCompare(a.period));
}

/* ============================================================================= operations */
export function getTutorApplications(status?: ApplicationStatus | "all", db: Db = SEED_DB): TutorApplication[] {
  return db.tutorApplications
    .filter((a) => !status || status === "all" || a.status === status)
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.submittedAt.localeCompare(a.submittedAt));
}
/* ----------------------------------------------------------------------------- application details */
const YEARS_LABELS: Record<string, string> = {
  lt1: "Less than a year",
  "1-3": "1 to 3 years",
  "3-7": "3 to 7 years",
  "7+": "7 years or more",
};
/** "3-7" -> "3 to 7 years" (labels pass through; empty -> ""). */
export function applicationYearsLabel(years?: string | null): string {
  if (!years) return "";
  return YEARS_LABELS[years.trim()] ?? years.trim();
}
/** "AE" -> "United Arab Emirates" (names pass through). */
export function applicationCountryLabel(country?: string | null): string {
  if (!country) return "";
  const c = country.trim();
  if (/^[A-Za-z]{2}$/.test(c)) {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(c.toUpperCase()) ?? c;
    } catch {
      return c.toUpperCase();
    }
  }
  return c;
}
const GST_LABELS = { yes: "GST registered", no: "Not GST registered", unsure: "Not sure about GST yet" } as const;
/** Old demo rows stored years + languages as a tail on experience:
 *  "… (3 to 7 years teaching; teaches in English, Hindi.)". */
const LEGACY_EXP_TAIL = /\s*\(([^()]*) teaching; teaches in ([^()]*)\.\)\s*$/;

export interface ApplicationDetails {
  /** experience text without the legacy machine tail */
  experience: string;
  /** "3 to 7 years" or "" */
  years: string;
  languages: string[];
  website: string | null;
  payout: { country: string; countryLabel: string; method: string; gst: "yes" | "no" | "unsure" | null; gstLabel: string | null; gstin: string | null } | null;
  /** ready-to-render label/value rows (only the facts the applicant gave) */
  facts: { label: string; value: string; href?: string }[];
}
/** Everything the tutor wizard collected, cleaned up for display (admin drawer, user detail).
 *  Works for new rows (website / languages / years / payout fields) and old ones (legacy tail). */
export function getApplicationDetails(app: TutorApplication): ApplicationDetails {
  const m = app.experience.match(LEGACY_EXP_TAIL);
  const experience = (m ? app.experience.replace(LEGACY_EXP_TAIL, "") : app.experience).trim();
  const years = applicationYearsLabel(app.years) || (m ? m[1].trim() : "");
  const languages = app.languages?.length
    ? app.languages
    : m
      ? m[2].split(",").map((x) => x.trim()).filter(Boolean)
      : [];
  const website = app.website?.trim() || null;
  // GST only applies to Indian payouts
  const indian = !!app.payout && /^(in|india)$/i.test(app.payout.country.trim());
  const payout = app.payout
    ? {
        country: app.payout.country,
        countryLabel: applicationCountryLabel(app.payout.country),
        method: app.payout.method,
        gst: indian ? (app.payout.gst ?? null) : null,
        gstLabel: indian && app.payout.gst ? GST_LABELS[app.payout.gst] : null,
        gstin: (indian && app.payout.gstin?.trim()) || null,
      }
    : null;
  const facts: ApplicationDetails["facts"] = [];
  if (years) facts.push({ label: "Teaching for", value: years });
  if (languages.length) facts.push({ label: "Teaches in", value: languages.join(", ") });
  if (website) facts.push({ label: "Website", value: website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: /^https?:\/\//.test(website) ? website : `https://${website}` });
  if (payout) {
    facts.push({ label: "Payout country", value: payout.countryLabel });
    facts.push({ label: "Payout method", value: payout.method });
    if (payout.gstLabel) facts.push({ label: "GST", value: payout.gstin ? `${payout.gstLabel} · ${payout.gstin}` : payout.gstLabel });
  }
  return { experience, years, languages, website, payout, facts };
}

export function getNotifications(userId: string, db: Db = SEED_DB): Notification[] {
  return db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getReports(db: Db = SEED_DB) {
  return [...db.reports].sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || b.createdAt.localeCompare(a.createdAt));
}
/** The viewer's OPEN report on a target (comment/review/course id), or undefined. Pair with demo.addReport / withdrawReport. */
export function getUserReport(userId: string, kind: Report["kind"], targetId: string, db: Db = SEED_DB): Report | undefined {
  return db.reports.find((r) => r.status === "open" && r.reporterId === userId && r.kind === kind && r.targetId === targetId);
}

/* ============================================================================= stats */
const lastFull = (s: SeriesPoint[]) => s[s.length - 2];
const prevFull = (s: SeriesPoint[]) => s[s.length - 3];
const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : 0);

/** Admin control-room numbers. Learner/revenue totals are platform-scale aggregates. */
export function getPlatformStats(db: Db = SEED_DB) {
  const pub = db.courses.filter((c) => c.status === "published");
  const rev = PLATFORM_SERIES.revenue;
  const totalLearners = Math.round(db.courses.reduce((s, c) => s + c.learners, 0) * 0.86) + db.users.filter((u) => u.role === "student").length;
  return {
    totalLearners,
    learnersDelta: 6.4,
    activeTutors: db.users.filter((u) => u.role === "tutor" && u.status === "active").length,
    publishedCourses: pub.length,
    /** last full month (September) */
    monthlyRevenue: lastFull(rev).value,
    revenueDelta: delta(lastFull(rev).value, prevFull(rev).value),
    /** October so far, plus purchases made in the demo store (they're dated just after MOCK_NOW) */
    monthToDateRevenue: rev[rev.length - 1].value + demoPaidOrders(db).reduce((s, o) => s + o.amount, 0),
    /** ledger sales in the last full month and the average sale (incl. GST): pair these with
     *  monthlyRevenue, never an average over the db.orders sample */
    salesLastMonth: lastFull(PLATFORM_SERIES.enrollments).value,
    averageOrder: lastFull(PLATFORM_SERIES.enrollments).value ? Math.round(lastFull(rev).value / lastFull(PLATFORM_SERIES.enrollments).value) : 0,
    signupsThisMonth: lastFull(PLATFORM_SERIES.signups).value,
    pendingApplications: db.tutorApplications.filter((a) => a.status === "pending").length,
    coursesInReview: db.courses.filter((c) => c.status === "in_review").length,
    openReports: db.reports.filter((r) => r.status === "open").length,
    refundRequests: db.orders.filter((o) => o.status === "paid" && !!o.refundRequest).length,
    pendingPayments: db.orders.filter((o) => o.status === "pending").length,
    suspendedUsers: db.users.filter((u) => u.status === "suspended").length,
  };
}
/** Rescales a modelled daily series so each month's days add up to that month's share of
 *  the monthly series (the open month: all of its month-to-date value). Keeps the daily
 *  shape; rounding carries over so the totals match exactly. */
function fitDailyToMonthly(daily: SeriesPoint[], monthly: SeriesPoint[]): SeriesPoint[] {
  const openKey = monthly[monthly.length - 1].key;
  const groups = new Map<string, SeriesPoint[]>();
  for (const p of daily) groups.set(p.key.slice(0, 7), [...(groups.get(p.key.slice(0, 7)) ?? []), p]);
  const out = new Map<string, number>();
  for (const [key, pts] of groups) {
    const m = monthly.find((x) => x.key === key);
    if (!m) continue;
    const [y, mo] = key.split("-").map(Number);
    const daysInMonth = key === openKey ? MONTH_DAYS_SO_FAR : new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const target = (m.value * pts.length) / daysInMonth;
    const raw = pts.reduce((t, p) => t + p.value, 0) || 1;
    let carry = 0;
    for (const p of pts) {
      const exact = (p.value * target) / raw + carry;
      const v = Math.round(exact);
      carry = exact - v;
      out.set(p.key, v);
    }
  }
  return daily.map((p) => ({ ...p, value: out.get(p.key) ?? p.value }));
}

/** Platform series for a range: 12m/all = monthly, 30d/7d = daily. */
export function getPlatformSeries(range: AnalyticsRange = "12m") {
  if (range === "12m" || range === "all") return PLATFORM_SERIES;
  const days = range === "7d" ? 7 : 30;
  const cut = (s: SeriesPoint[]) => s.slice(-days);
  // revenue + enrollments: the same sales ledger as the monthly points (30 days = 6 Sep..5 Oct)
  const ledger = platformDaily(days);
  return {
    revenue: ledger.revenue,
    // modelled daily shape, scaled so 1-5 Oct adds up to "October so far" and September's days to September
    signups: cut(fitDailyToMonthly(dailySeries(12, lastFull(PLATFORM_SERIES.signups).value / 30), PLATFORM_SERIES.signups)),
    enrollments: ledger.enrollments,
    activeLearners: cut(dailySeries(14, 770, 0.002)),
  };
}

/** Student dashboard numbers. */
export function getStudentStats(userId: string, db: Db = SEED_DB) {
  const lp = db.lessonProgress.filter((p) => p.userId === userId);
  const allItems = new Map<string, ModuleItem>();
  for (const mods of Object.values(db.curricula)) for (const m of mods) for (const it of m.items) allItems.set(it.id, it);
  let seconds = 0;
  let lessonsFinished = 0;
  for (const p of lp) {
    const it = allItems.get(p.itemId);
    if (it?.type !== "video") continue;
    seconds += p.completed ? it.lesson.durationSec : p.lastPositionSec;
    if (p.completed) lessonsFinished++;
  }
  const attempts = db.quizAttempts.filter((a) => a.userId === userId);
  const activity = new Set(
    [...lp.map((p) => p.updatedAt), ...attempts.map((a) => a.createdAt), ...db.notes.filter((n) => n.userId === userId).map((n) => n.createdAt)].map((iso) =>
      new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10),
    ),
  );
  let streak = 0;
  const today = new Date(MOCK_NOW.getTime() + 330 * 60_000);
  for (let d = 0; d < 365; d++) {
    const key = new Date(today.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    if (activity.has(key)) streak++;
    else if (d > 0) break;
  }
  const enrolled = getEnrolledCourses(userId, db);
  return {
    minutesLearned: Math.round(seconds / 60),
    lessonsFinished,
    streakDays: streak,
    coursesCompleted: enrolled.filter((e) => e.progress.percent === 100).length,
    coursesInProgress: enrolled.filter((e) => e.progress.percent < 100).length,
    quizzesPassed: new Set(attempts.filter((a) => a.passed).map((a) => a.itemId)).size,
    certificates: db.certificates.filter((c) => c.userId === userId).length,
    /** active days in the last 14 days, oldest first (for a streak strip) */
    last14: Array.from({ length: 14 }, (_, i) => activity.has(new Date(today.getTime() - (13 - i) * 86_400_000).toISOString().slice(0, 10))),
  };
}

/* ----------------------------------------------------------------------------- sales + learning model */
const hashStr = (str: string) => str.split("").reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

/** Completion % per video lesson: a smooth, asymptotic drop-off (a bigger dip after the
 *  first module), strictly decreasing, no floor. Deterministic per course. */
function lessonCompletion(courseId: string, db: Db) {
  if (!COURSE_SALES[courseId]) return measuredLessonCompletion(courseId, db);
  const r = rng(hashStr(courseId) ^ 0xc0ffee);
  let c = 96 - r.int(0, 3);
  let prev = 101;
  let lastModule = 0;
  // per-course shape: how steep the early drop is, how fast it settles, how much a new module
  // costs, and one lesson that loses more people than its neighbours (a tricky topic)
  const early = 0.03 + r.next() * 0.045;
  const settle = 5 + r.next() * 5;
  const firstGap = 0.012 + r.next() * 0.04;
  const laterGap = 0.004 + r.next() * 0.016;
  const videos = flattenCurriculum(courseId, db).filter((x) => x.item.type === "video");
  const tricky = videos.length > 3 ? r.int(2, videos.length - 1) : -1;
  const trickyDrop = 0.03 + r.next() * 0.05;
  return videos
    .map((x, i) => {
      if (i > 0) {
        const newModule = x.module.position !== lastModule;
        const d =
          early * Math.exp(-i / settle) + 0.009 + (newModule && x.module.position === 2 ? firstGap : newModule ? laterGap : 0) + (i === tricky ? trickyDrop : 0) + r.next() * 0.014;
        c *= 1 - d;
      }
      lastModule = x.module.position;
      const v = Math.max(1, Math.min(prev - 1, Math.round(c)));
      prev = v;
      return { itemId: x.item.id, title: itemTitle(x.item), completion: v };
    });
}

/* Courses with no sales-ledger history (published in the demo, or with only a handful of demo
   buyers) are described by what their actual learners did in the db, not by the modelled curve:
   a course one person bought five minutes ago has 0% completion, not 77%. */
function activeLearnerIds(courseId: string, db: Db) {
  return [...new Set(db.enrollments.filter((e) => e.courseId === courseId && !e.revokedAt).map((e) => e.userId))];
}
function measuredLessonCompletion(courseId: string, db: Db) {
  const ids = activeLearnerIds(courseId, db);
  const done = new Set(db.lessonProgress.filter((p) => p.courseId === courseId && p.completed).map((p) => `${p.userId}|${p.itemId}`));
  return flattenCurriculum(courseId, db)
    .filter((x) => x.item.type === "video")
    .map((x) => ({
      itemId: x.item.id,
      title: itemTitle(x.item),
      completion: ids.length ? Math.round((ids.filter((u) => done.has(`${u}|${x.item.id}`)).length / ids.length) * 100) : 0,
    }));
}
function measuredQuizStats(courseId: string, db: Db) {
  return flattenCurriculum(courseId, db)
    .filter((x) => x.item.type === "quiz")
    .flatMap((x) => {
      const attempts = db.quizAttempts.filter((a) => a.courseId === courseId && a.itemId === x.item.id);
      if (!attempts.length) return [];
      const users = [...new Set(attempts.map((a) => a.userId))];
      const passed = users.filter((u) => attempts.some((a) => a.userId === u && a.passed)).length;
      const retried = users.filter((u) => attempts.filter((a) => a.userId === u).length > 1).length;
      return [
        {
          itemId: x.item.id,
          title: itemTitle(x.item),
          passRate: Math.round((passed / users.length) * 100),
          retryRate: Math.round((retried / users.length) * 100),
          avgScore: Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length),
        },
      ];
    });
}
/** Average progress of a course's learners (%): the mean of its lesson completion curve. */
export function getCourseCompletion(courseId: string, db: Db = SEED_DB): number {
  // no learners, no progress: a course nobody has bought can't have an average completion
  if (!(getCourseById(courseId, db)?.learners ?? 0)) return 0;
  if (!COURSE_SALES[courseId]) {
    const ids = activeLearnerIds(courseId, db);
    return ids.length ? Math.round(ids.reduce((sum, u) => sum + getCourseProgress(u, courseId, db).percent, 0) / ids.length) : 0;
  }
  const curve = lessonCompletion(courseId, db);
  return curve.length ? Math.round(curve.reduce((s, x) => s + x.completion, 0) / curve.length) : 0;
}

/** Quiz pass / retry rates. Deterministic per course: which test is the hard one, and how hard,
 *  varies from course to course (a course with one test may have no stand-out at all). */
function quizStatsFor(courseId: string, db: Db) {
  if (!COURSE_SALES[courseId]) return measuredQuizStats(courseId, db);
  const r = rng(hashStr(courseId) ^ 0x5e11);
  const quizzes = flattenCurriculum(courseId, db).filter((x) => x.item.type === "quiz");
  const hard = quizzes.length > 1 || r.next() < 0.5 ? r.int(0, Math.max(0, quizzes.length - 1)) : -1;
  return quizzes.map((x, i) => {
    const retryRate = i === hard ? r.int(31, 47) : r.int(9, 29);
    const passRate = Math.max(40, 100 - Math.round(retryRate * (0.5 + r.next() * 0.25)) - r.int(0, 6));
    return { itemId: x.item.id, title: itemTitle(x.item), passRate, retryRate, avgScore: Math.min(94, Math.round(passRate * 0.55 + r.int(28, 40))) };
  });
}

/** "Most replayed" moments: three different videos per course (deterministic per course), the
 *  moment inside each lesson, and replay counts that scale with the course's learners. */
function replayHotspots(courseId: string, learners: number, db: Db) {
  // replays aren't tracked per learner in the demo: only ledger-scale courses get the modelled hotspots
  if (!COURSE_SALES[courseId]) return [];
  const r = rng(hashStr(courseId) ^ 0x51ed);
  const videos = flattenCurriculum(courseId, db).filter((x) => x.item.type === "video");
  // skip the free preview (everyone watches it once, few rewatch it) when there's enough to choose from
  const pool = videos.length > 4 ? videos.slice(1) : videos;
  const picks: typeof videos = [];
  const idx = pool.map((_, i) => i);
  while (picks.length < 3 && idx.length) picks.push(pool[idx.splice(r.int(0, idx.length - 1), 1)[0]]);
  let share = 0.22 + r.next() * 0.24;
  return picks
    .map((x) => {
      const dur = x.item.type === "video" ? x.item.lesson.durationSec : 600;
      const atSec = Math.round(Math.min(dur - 15, Math.max(20, dur * (0.15 + r.next() * 0.7))));
      const replays = Math.max(1, Math.round(learners * share));
      share *= 0.5 + r.next() * 0.3;
      return { itemId: x.item.id, title: itemTitle(x.item), atSec: Math.max(0, atSec), replays };
    })
    .sort((a, b) => b.replays - a.replays);
}

type Bucket = { key: string; label: string; get: (row: CourseSalesRow) => number };
/** Time buckets for a range: days for 7d/30d, the last 12 months for 12m, months since `since` for all. */
function salesBuckets(range: AnalyticsRange, since?: string): Bucket[] {
  if (range === "7d" || range === "30d")
    return lastDays(range === "7d" ? 7 : 30).map((key) => ({ key, label: dayLabelOf(key), get: (row) => row.days[key] ?? 0 }));
  const twelve = monthKey(11);
  const from = range === "all" && since && since < twelve ? since : twelve;
  const keys = monthRange(from, CURRENT_MONTH);
  const withYear = keys.length > 12;
  return keys.map((key) => ({ key, label: monthLabelOf(key, withYear), get: (row) => row.months[key] ?? 0 }));
}

/**
 * One course's sales from the sales ledger (the same numbers as payouts and analytics).
 *   range "month" (default) = the last full month (September): use it for "₹1.9L/mo" on cards.
 *   revenue = tutor gross (after coupons, ex-GST: the payout basis); enrollments = sales.
 *   db (optional, last): pass useDb() to add the paid orders made in the demo store (demo
 *   checkouts, also for courses created/published in the demo, which have no ledger history).
 *   Demo orders are dated just after MOCK_NOW, so they land in today's / October's bucket and
 *   never change "month" (September). Their revenue = amount minus GST (the same payout basis).
 */
export function getCourseSales(courseId: string, range: AnalyticsRange | "month" = "month", db: Db = SEED_DB) {
  const row = COURSE_SALES[courseId];
  const extra = demoCourseOrders(courseId, db);
  if (range === "month") {
    const key = monthKey(1);
    const add = extra.filter((o) => o.month === key);
    const units = (row?.months[key] ?? 0) + add.length;
    const revenue = (row ? grossOf(row.price, row.months[key] ?? 0) : 0) + add.reduce((s, o) => s + o.gross, 0);
    return { range, period: key as string | null, enrollments: units, revenue: Math.round(revenue), series: [] as SeriesPoint[] };
  }
  const buckets = salesBuckets(range, row?.from.slice(0, 7));
  const daily = range === "7d" || range === "30d";
  const extraIn = (key: string) => extra.filter((o) => (daily ? o.day : o.month) === key);
  const series = buckets.map((b) => ({ key: b.key, label: b.label, value: (row ? b.get(row) : 0) + extraIn(b.key).length }));
  const ledgerUnits = row ? buckets.reduce((s, b) => s + b.get(row), 0) : 0;
  const extraGross = buckets.reduce((s, b) => s + extraIn(b.key).reduce((t, o) => t + o.gross, 0), 0);
  const enrollments = series.reduce((s, p) => s + p.value, 0);
  return { range, period: null as string | null, enrollments, revenue: Math.round((row ? grossOf(row.price, ledgerUnits) : 0) + extraGross), series };
}

let seedOrderIds: Set<string> | null = null;
/** Paid orders for a course that exist only in the demo store overlay (not in the seed). */
function demoCourseOrders(courseId: string, db: Db): { day: string; month: string; gross: number }[] {
  if (db === SEED_DB || !courseId) return [];
  seedOrderIds ??= new Set(SEED_DB.orders.map((o) => o.id));
  const ids = seedOrderIds;
  return db.orders
    .filter((o) => o.courseId === courseId && o.status === "paid" && o.amount > 0 && !ids.has(o.id))
    .map((o) => {
      const ist = toISTKey(o.createdAt);
      return { day: ist, month: ist.slice(0, 7), gross: Math.max(0, o.amount - o.tax) };
    });
}
/** IST date key (YYYY-MM-DD) of an ISO timestamp. */
const toISTKey = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);

/** Tutor studio numbers. */
export function getTutorStats(tutorId: string, db: Db = SEED_DB) {
  const mine = db.courses.filter((c) => c.tutorId === tutorId);
  const live = mine.filter((c) => c.status === "published" || c.status === "archived");
  const payouts = getPayouts(tutorId, db);
  const thisMonth = payouts.find((p) => p.period === CURRENT_MONTH);
  const lastMonth = payouts.find((p) => p.period === monthKey(1));
  const prev = payouts.find((p) => p.period === monthKey(2));
  const t = getTutor(tutorId, db);
  const weight = live.reduce((s, c) => s + c.learners, 0);
  return {
    publishedCourses: mine.filter((c) => c.status === "published").length,
    drafts: mine.filter((c) => c.status === "draft").length,
    inReview: mine.filter((c) => c.status === "in_review").length,
    rejected: mine.filter((c) => c.status === "rejected").length,
    learners: mine.reduce((s, c) => s + c.learners, 0),
    rating: t?.rating ?? 0,
    reviewCount: t?.reviewCount ?? 0,
    /** learner-weighted average progress across live courses (= analytics avgCompletion) */
    completionRate: weight ? Math.round(live.reduce((s, c) => s + getCourseCompletion(c.id, db) * c.learners, 0) / weight) : 0,
    /** month-to-date net (October, 5 days): the scheduled payout row is a full-month projection */
    monthEarnings: thisMonth ? Math.round((thisMonth.net * MONTH_DAYS_SO_FAR) / 31) : 0,
    lastMonthEarnings: lastMonth?.net ?? 0,
    earningsDelta: lastMonth && prev ? delta(lastMonth.net, prev.net) : 0,
    pendingQuestions: getTutorQuestions(tutorId, { unansweredOnly: true }, db).length,
  };
}

/**
 * Tutor analytics. Revenue / enrollments come from the sales ledger, so they match the
 * payouts (revenue = tutor gross, after coupons and GST), byCourse splits exactly the
 * same totals, avgCompletion is the learner-weighted mean of byCourse completion, and
 * "all" runs from the month the tutor joined. Course-level panels (modules, lessons,
 * quizzes, replays) describe `courseId` (default: the tutor's first live course).
 */
export function getTutorAnalytics(tutorId: string, range: AnalyticsRange = "30d", courseId?: string, db: Db = SEED_DB): TutorAnalytics {
  const r = rng(tutorId.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) * 31 + range.length);
  const courses = db.courses.filter((c) => c.tutorId === tutorId && (c.status === "published" || c.status === "archived"));
  const focus = (courseId && courses.find((c) => c.id === courseId)) || courses[0];
  const learners = courses.reduce((s, c) => s + c.learners, 0);
  const tutor = getTutor(tutorId, db);
  const rows = courses.map((c) => COURSE_SALES[c.id]).filter((x): x is CourseSalesRow => !!x);
  const firstSale = rows.reduce((m, x) => (x.from.slice(0, 7) < m ? x.from.slice(0, 7) : m), CURRENT_MONTH);
  const joined = tutor?.joinedAt.slice(0, 7) ?? firstSale;
  const buckets = salesBuckets(range, joined < firstSale ? joined : firstSale);

  // paid orders made in the demo store (checkouts after MOCK_NOW) land in their day / month bucket,
  // exactly like getCourseSales(…, db) and the Earnings page count them (revenue = amount - GST)
  const daily = range === "7d" || range === "30d";
  const extra = new Map(courses.map((c) => [c.id, demoCourseOrders(c.id, db)]));
  const extraIn = (courseId: string, key: string) => (extra.get(courseId) ?? []).filter((o) => (daily ? o.day : o.month) === key);
  const allExtraIn = (key: string) => courses.flatMap((c) => extraIn(c.id, key));

  const revenue: SeriesPoint[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: Math.round(rows.reduce((s, x) => s + grossOf(x.price, b.get(x)), 0) + allExtraIn(b.key).reduce((s, o) => s + o.gross, 0)),
  }));
  const enrollments: SeriesPoint[] = buckets.map((b) => ({ key: b.key, label: b.label, value: rows.reduce((s, x) => s + b.get(x), 0) + allExtraIn(b.key).length }));

  const byCourse = courses.map((c) => {
    const row = COURSE_SALES[c.id];
    const units = row ? buckets.reduce((s, b) => s + b.get(row), 0) : 0;
    const add = buckets.flatMap((b) => extraIn(c.id, b.key));
    return {
      courseId: c.id,
      revenue: Math.round((row ? grossOf(row.price, units) : 0) + add.reduce((s, o) => s + o.gross, 0)),
      enrollments: units + add.length,
      completion: getCourseCompletion(c.id, db),
      rating: c.rating,
    };
  });

  const base = focus?.learners ?? 0;
  // A focus course with no learners has no behaviour to describe: the lesson curve, quiz
  // stats and replay hotspots come back empty (and its completion is 0, see getCourseCompletion).
  const hasLearners = !!focus && base > 0;
  const curve = hasLearners ? lessonCompletion(focus.id, db) : [];
  const mods = focus ? getCurriculum(focus.id, db) : [];
  const flat = focus ? flattenCurriculum(focus.id, db) : [];
  const moduleOf = new Map(flat.map((f) => [f.item.id, f.module.position]));
  // reached module m: everyone for module 1, then those who finished the previous module's last lesson
  const learnersByModule = mods.map((m, i) => {
    const label = `M${pad2(m.position)} ${m.title}`;
    if (i === 0) return { courseId: focus!.id, module: label, learners: base };
    const prevVideos = curve.filter((x) => moduleOf.get(x.itemId) === mods[i - 1].position);
    const reach = prevVideos.length ? prevVideos[prevVideos.length - 1].completion : hasLearners ? 100 : 0;
    return { courseId: focus!.id, module: label, learners: Math.round((base * reach) / 100) };
  });
  const quizStats = hasLearners ? quizStatsFor(focus.id, db) : [];
  const replays = hasLearners ? replayHotspots(focus.id, base, db) : [];

  const weighted = (f: (id: string) => number) => (learners ? Math.round(courses.reduce((s, c) => s + f(c.id) * c.learners, 0) / learners) : 0);
  const quizPass = (id: string) => {
    const q = quizStatsFor(id, db);
    return q.length ? q.reduce((s, x) => s + x.passRate, 0) / q.length : 0;
  };
  return {
    tutorId,
    range,
    revenue,
    enrollments,
    totals: {
      revenue: byCourse.reduce((s, b) => s + b.revenue, 0),
      enrollments: byCourse.reduce((s, b) => s + b.enrollments, 0),
      avgCompletion: weighted((id) => byCourse.find((b) => b.courseId === id)?.completion ?? 0),
      quizPassRate: weighted(quizPass),
      previewToPurchase: 7 + r.int(0, 7),
      learners,
      rating: tutor?.rating ?? 0,
    },
    learnersByModule,
    completionByLesson: curve,
    quizStats,
    replays,
    byCourse,
  };
}

/* ============================================================================= card data */
export interface CourseCardData {
  course: Course;
  tutor: Tutor | null;
  category: Category | null;
  stats: CourseStats;
  firstFreeItemId: string | null;
}
/** Everything a CourseCard needs, in one call. */
export function getCourseCard(courseIdOrSlug: string, db: Db = SEED_DB): CourseCardData | null {
  const course = getCourse(courseIdOrSlug, db);
  if (!course) return null;
  return {
    course,
    tutor: getTutor(course.tutorId, db),
    category: getCategory(course.categoryId, db),
    stats: getCourseStats(course.id, db),
    firstFreeItemId: getFirstFreeItem(course.id, db)?.id ?? null,
  };
}

/** Days since an ISO date (relative to MOCK_NOW). */
export const daysSince = (iso: string) => Math.floor(daysBetween(iso));

/* =============================================================================
   SALES LEDGER vs ORDER SAMPLE (one source per number)

   The platform runs at ledger scale: ~27.7k lifetime sales, ₹44.7L in September
   (seed/sales.ts drives getPlatformStats, getPlatformSeries, payouts and tutor
   analytics). db.orders holds only a browsable SAMPLE of ~390 order rows (complete
   for the demo tutor's courses since LEDGER_FROM), and db.users a sample of ~140
   accounts. Shipping 27k order rows to the browser isn't worth it, so:

     - Money / enrollment totals, charts, best sellers, category splits, coupon
       impact: use the LEDGER selectors below (getSalesBreakdown, getCouponImpact,
       getLedgerMonth, getPlatformStats, getPlatformSeries). They agree exactly.
     - Order tables, refunds, receipts, per-learner history: use db.orders /
       getOrders, and label the list as a sample with LEDGER_SAMPLE.note (or
       getLedgerSample(range, db).note for a windowed list).
     - Never put a sum of db.orders next to a ledger total without that label.

   Demo-store purchases (paid orders that aren't in the seed) are added on top of
   the ledger, so a demo checkout moves both the sample and the totals.
   ============================================================================= */

/** Time windows for ledger figures: the analytics ranges, the last 90 days ("90d" =
 *  8 July to 5 October), the last full month ("month" = September) and the open month
 *  to date ("mtd" = 1-5 October). */
export type SalesWindow = AnalyticsRange | "90d" | "month" | "mtd";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthNameOf = (key: string) => MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key;

/** Human label for a window: "the last 30 days", "September", "October so far"... */
export function salesWindowLabel(w: SalesWindow): string {
  switch (w) {
    case "7d":
      return "the last 7 days";
    case "30d":
      return "the last 30 days";
    case "90d":
      return "the last 90 days";
    case "12m":
      return "the last 12 months";
    case "all":
      return "all time";
    case "month":
      return monthNameOf(monthKey(1));
    case "mtd":
      return `${monthNameOf(CURRENT_MONTH)} so far`;
  }
}

/** Ledger units of one course inside a window. "12m" = the 12 monthly points of
 *  getPlatformSeries (November to October so far), so totals match the charts. */
function unitsInWindow(row: CourseSalesRow, w: SalesWindow): number {
  if (w === "7d" || w === "30d") return lastDays(w === "7d" ? 7 : 30).reduce((s, k) => s + (row.days[k] ?? 0), 0);
  if (w === "90d") return unitsInLast90(row);
  if (w === "month") return row.months[monthKey(1)] ?? 0;
  if (w === "mtd") return row.months[CURRENT_MONTH] ?? 0;
  if (w === "12m") return monthRange(monthKey(11), CURRENT_MONTH).reduce((s, k) => s + (row.months[k] ?? 0), 0);
  return Object.values(row.months).reduce((s, v) => s + v, 0);
}

/** "90d": daily figures where the ledger has them (September and October), whole months in
 *  between, and the on-sale share of the first, partial month (from 8 July). */
function unitsInLast90(row: CourseSalesRow): number {
  const days = lastDays(90);
  const first = days[0];
  const dailyFrom = monthKey(1); // September: it and October carry daily figures
  let units = 0;
  for (const k of monthRange(first.slice(0, 7), CURRENT_MONTH)) {
    const n = row.months[k] ?? 0;
    if (!n) continue;
    if (k >= dailyFrom) {
      units += days.filter((d) => d.startsWith(k)).reduce((s, d) => s + (row.days[d] ?? 0), 0);
    } else if (k === first.slice(0, 7)) {
      // share of the month's on-sale days that fall inside the window
      const dim = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0)).getUTCDate();
      const lo = Math.max(1, row.from.slice(0, 7) === k ? Number(row.from.slice(8, 10)) : 1);
      const hi = row.to.slice(0, 7) === k ? Number(row.to.slice(8, 10)) : dim;
      const start = Math.max(lo, Number(first.slice(8, 10)));
      units += hi >= lo ? Math.round((n * Math.max(0, hi - start + 1)) / (hi - lo + 1)) : 0;
    } else units += n;
  }
  return units;
}

/** Does an ISO timestamp fall inside a window (IST calendar days, relative to MOCK_NOW)? */
function inSalesWindow(iso: string, w: SalesWindow): boolean {
  if (w === "all") return true;
  const day = toISTKey(iso);
  if (w === "7d" || w === "30d") return day >= lastDays(w === "7d" ? 7 : 30)[0];
  if (w === "90d") return day >= lastDays(90)[0];
  if (w === "month") return day.slice(0, 7) === monthKey(1);
  if (w === "mtd") return day.slice(0, 7) === CURRENT_MONTH;
  return day.slice(0, 7) >= monthKey(11);
}

/** Paid, real-money orders created in the demo store (not part of the seed sample). */
function demoPaidOrders(db: Db): Order[] {
  if (db === SEED_DB) return [];
  seedOrderIds ??= new Set(SEED_DB.orders.map((o) => o.id));
  const ids = seedOrderIds;
  return db.orders.filter((o) => !ids.has(o.id) && o.status === "paid" && o.provider !== "admin" && o.amount > 0);
}

export interface SalesBreakdownRow {
  /** course id, category id or tutor id */
  id: string;
  label: string;
  /** where an admin goes next (course review, categories, the tutor's profile) */
  href: string;
  enrollments: number;
  /** what buyers paid, incl. 18% GST, after coupons (same basis as getPlatformSeries().revenue) */
  revenue: number;
  /** ex-GST: the payout basis */
  gross: number;
  /** % of the window's revenue, one decimal */
  share: number;
}
export interface SalesBreakdown {
  by: "course" | "category" | "tutor";
  range: SalesWindow;
  /** "September", "the last 30 days"... */
  label: string;
  total: { enrollments: number; revenue: number; gross: number };
  /** sorted by revenue, highest first (all rows unless `limit`) */
  rows: SalesBreakdownRow[];
}

/**
 * Platform sales split by course, category or tutor, from the full sales ledger (plus
 * demo-store purchases). Use it for "Best sellers", "What sells, by category", tutor
 * leaderboards: `total.revenue` for "month" equals getPlatformStats().monthlyRevenue and for
 * "12m" the sum of getPlatformSeries("12m").revenue (give or take rupee rounding), so these
 * cards agree with the KPI tiles and charts on the same screen.
 *   getSalesBreakdown({ by: "category", range: "month" }, db)
 *   getSalesBreakdown({ by: "course", range: "all", limit: 6 }, db)
 */
export function getSalesBreakdown(
  q: { by?: "course" | "category" | "tutor"; range?: SalesWindow; limit?: number } = {},
  db: Db = SEED_DB,
): SalesBreakdown {
  const by = q.by ?? "course";
  const range = q.range ?? "month";
  const acc = new Map<string, { enrollments: number; revenue: number; gross: number }>();
  const add = (courseId: string, enrollments: number, revenue: number, gross: number) => {
    const course = getCourseById(courseId, db);
    if (!course || !enrollments) return;
    const key = by === "course" ? course.id : by === "category" ? course.categoryId : course.tutorId;
    const cur = acc.get(key) ?? { enrollments: 0, revenue: 0, gross: 0 };
    cur.enrollments += enrollments;
    cur.revenue += revenue;
    cur.gross += gross;
    acc.set(key, cur);
  };
  for (const row of Object.values(COURSE_SALES)) {
    const units = unitsInWindow(row, range);
    add(row.courseId, units, revenueOf(row.price, units), grossOf(row.price, units));
  }
  for (const o of demoPaidOrders(db)) if (inSalesWindow(o.createdAt, range)) add(o.courseId, 1, o.amount, Math.max(0, o.amount - o.tax));

  const totalRevenue = [...acc.values()].reduce((s, v) => s + v.revenue, 0);
  const rows: SalesBreakdownRow[] = [...acc.entries()].map(([id, v]) => {
    let label = id;
    let href = "/admin";
    if (by === "course") {
      label = getCourseById(id, db)?.title ?? id;
      href = `/admin/courses/${id}`;
    } else if (by === "category") {
      label = getCategory(id, db)?.name ?? "Other";
      href = "/admin/categories";
    } else {
      label = getUser(id, db)?.name ?? id;
      href = `/admin/users/${id}`;
    }
    return {
      id,
      label,
      href,
      enrollments: v.enrollments,
      revenue: Math.round(v.revenue),
      gross: Math.round(v.gross),
      share: totalRevenue ? Math.round((v.revenue / totalRevenue) * 1000) / 10 : 0,
    };
  });
  rows.sort((a, b) => b.revenue - a.revenue || a.label.localeCompare(b.label));
  return {
    by,
    range,
    label: salesWindowLabel(range),
    total: {
      enrollments: rows.reduce((s, r) => s + r.enrollments, 0),
      revenue: Math.round(totalRevenue),
      gross: Math.round([...acc.values()].reduce((s, v) => s + v.gross, 0)),
    },
    rows: q.limit ? rows.slice(0, q.limit) : rows,
  };
}

export interface LedgerSample {
  range: SalesWindow;
  label: string;
  /** order rows in db.orders for the window (every status, grants included) */
  orders: number;
  /** paid, real-money rows in the sample and what they add up to (incl. GST) */
  paidOrders: number;
  sampleRevenue: number;
  /** the full ledger for the same window */
  sales: number;
  revenue: number;
  /** sampleRevenue / revenue (0..1) */
  ratio: number;
  /** ratio as text: "1.5%" */
  coverage: string;
  /** one sentence for under an order table (or next to a figure computed from it) */
  note: string;
  /** a few words for a Badge: "Sample · 380 of 27,732 sales" */
  short: string;
}

/**
 * How the order rows in db.orders relate to the full ledger for a window. Put `note` under
 * any order list (or a figure computed from it) that shares a screen with ledger totals;
 * `short` fits a Badge.
 *   getLedgerSample("30d", useDb()).note
 */
export function getLedgerSample(range: SalesWindow = "all", db: Db = SEED_DB): LedgerSample {
  const rows = db.orders.filter((o) => inSalesWindow(o.createdAt, range));
  const paid = rows.filter((o) => o.status === "paid" && o.provider !== "admin" && o.amount > 0);
  const sampleRevenue = paid.reduce((s, o) => s + o.amount, 0);
  const ledger = getSalesBreakdown({ by: "course", range }, db).total;
  const ratio = ledger.revenue ? Math.min(1, sampleRevenue / ledger.revenue) : 1;
  const pct = ratio * 100;
  const label = salesWindowLabel(range);
  const where = range === "all" ? "" : ` from ${label}`;
  return {
    range,
    label,
    orders: rows.length,
    paidOrders: paid.length,
    sampleRevenue,
    sales: ledger.enrollments,
    revenue: ledger.revenue,
    ratio,
    coverage: `${pct >= 10 || pct === 0 ? Math.round(pct) : pct.toFixed(1)}%`,
    note:
      `This list is a browsable sample: ${plural(paid.length, "paid order")} (${formatINR(sampleRevenue, { compact: true })})${where}, ` +
      `out of ${formatNumber(ledger.enrollments)} sales (${formatINR(ledger.revenue, { compact: true })}) in the full ledger. Totals and charts use the full ledger.`,
    short: `Sample · ${formatNumber(paid.length)} of ${formatNumber(ledger.enrollments)} sales`,
  };
}

export interface CouponImpact {
  coupon: Coupon;
  /** platform-scale uses (coupon.redemptions; demo checkouts bump it) */
  redemptions: number;
  /** estimated discount given at platform scale: redemptions x the average discount on the
   *  courses the code applies to (weighted by lifetime sales) */
  discount: number;
  /** the same code inside the order sample (drill-down only) */
  sampleOrders: number;
  sampleDiscount: number;
}

/**
 * Coupon usage at platform scale, so "Coupons at work" sits on the same scale as the revenue
 * tiles (the order sample only holds a handful of coupon orders). Most-used first.
 */
export function getCouponImpact(db: Db = SEED_DB): CouponImpact[] {
  const sales = Object.values(COURSE_SALES);
  const lifetime = (row: CourseSalesRow) => Object.values(row.months).reduce((s, v) => s + v, 0);
  return db.coupons
    .map((coupon) => {
      let units = 0;
      let off = 0;
      for (const row of sales) {
        if (coupon.courseIds && !coupon.courseIds.includes(row.courseId)) continue;
        if (coupon.minAmount && row.price < coupon.minAmount) continue;
        const n = lifetime(row) || 1;
        units += n;
        off += n * (coupon.kind === "percent" ? (row.price * coupon.value) / 100 : Math.min(coupon.value, row.price));
      }
      const avg = units ? off / units : coupon.kind === "flat" ? coupon.value : 0;
      const sample = db.orders.filter((o) => o.couponCode === coupon.code && o.status === "paid");
      return {
        coupon,
        redemptions: coupon.redemptions,
        discount: Math.round(coupon.redemptions * avg),
        sampleOrders: sample.length,
        sampleDiscount: sample.reduce((s, o) => s + o.discount, 0),
      };
    })
    .sort((a, b) => b.redemptions - a.redemptions || a.coupon.code.localeCompare(b.coupon.code));
}

/** Ledger figures for the last full month (September), the month the KPI tiles describe. */
export function getLedgerMonth(db: Db = SEED_DB) {
  const t = getSalesBreakdown({ by: "course", range: "month" }, db).total;
  return {
    period: monthKey(1),
    label: salesWindowLabel("month"),
    sales: t.enrollments,
    revenue: t.revenue,
    /** average sale incl. GST, after coupons */
    averageOrder: t.enrollments ? Math.round(t.revenue / t.enrollments) : 0,
  };
}

/**
 * The seed's sample sizes, for honest labels: `note` / `short` describe the order list,
 * `accountsNote` the people list. For a windowed or demo-aware version use
 * getLedgerSample(range, useDb()).
 */
export const LEDGER_SAMPLE = (() => {
  const s = getLedgerSample("all");
  const learners = getPlatformStats().totalLearners;
  const shown = SEED_DB.users.length;
  return {
    ...s,
    accounts: { shown, learners },
    accountsNote: `This list is a sample of ${formatNumber(shown)} accounts. Platform totals count all ${formatNumber(learners)} learners.`,
  };
})();
