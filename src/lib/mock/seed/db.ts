import type { Db } from "../types";
import { REFUND_MAX_PROGRESS, REFUND_WINDOW_DAYS } from "../policy";
import { MOCK_NOW, toIST } from "./util";
import { CATEGORIES, DEMO_ADMIN_ID, TUTOR_PROFILES_BASE, USERS } from "./people";
import { COURSES_BASE, CURRICULA } from "./catalog";
import {
  CERTIFICATES,
  COMMENTS,
  LEDGER_BUYERS,
  COUPONS,
  ENROLLMENTS,
  LESSON_PROGRESS,
  NOTES,
  NOTIFICATIONS,
  ORDERS,
  PAYOUTS,
  QUIZ_ATTEMPTS,
  REPORTS,
  REVIEWS,
  TUTOR_APPLICATIONS,
  WISHLIST,
} from "./activity";

/**
 * Recomputes the cached aggregates (course rating / reviewCount from reviews,
 * tutor rating / reviewCount / learners from their courses). Used for the seed
 * and again by the demo store whenever its patches change, so a review added in
 * the demo moves the numbers everywhere.
 */
export function computeAggregates(db: Db): Db {
  const learnerDelta = demoLearnerDelta(db);
  const byCourse = new Map<string, { sum: number; n: number }>();
  for (const r of db.reviews) {
    if (r.hidden) continue;
    const a = byCourse.get(r.courseId) ?? { sum: 0, n: 0 };
    a.sum += r.rating;
    a.n += 1;
    byCourse.set(r.courseId, a);
  }
  const courses = db.courses.map((c) => {
    const a = byCourse.get(c.id);
    const d = learnerDelta.get(c.id) ?? 0;
    const learners = d ? Math.max(0, c.learners + d) : c.learners;
    const rating = a ? Math.round((a.sum / a.n) * 10) / 10 : 0;
    const reviewCount = a ? a.n : 0;
    return rating === c.rating && reviewCount === c.reviewCount && learners === c.learners ? c : { ...c, rating, reviewCount, learners };
  });
  const tutorProfiles = db.tutorProfiles.map((t) => {
    const mine = courses.filter((c) => c.tutorId === t.userId && (c.status === "published" || c.status === "archived"));
    const reviewCount = mine.reduce((s, c) => s + c.reviewCount, 0);
    const rating = reviewCount
      ? Math.round((mine.reduce((s, c) => s + c.rating * c.reviewCount, 0) / reviewCount) * 10) / 10
      : 0;
    const learners = mine.reduce((s, c) => s + c.learners, 0);
    return rating === t.rating && reviewCount === t.reviewCount && learners === t.learners
      ? t
      : { ...t, rating, reviewCount, learners };
  });
  return { ...db, courses, tutorProfiles, notifications: liveAdminQueues(db, courses) };
}

/* Course.learners is a platform-scale number in the seed (the ledger, not db.enrollments). On top of
   it, count what happened in the demo: +1 for each active enrollment that isn't in the seed (demo
   checkouts, grants, free enrolments), -1 for each seed enrollment the demo revoked (refunds). For
   the seed itself both sets are empty, so the numbers are unchanged. Archived/draft courses count too. */
let seedEnrollments: Map<string, boolean> | null = null;
function demoLearnerDelta(db: Db): Map<string, number> {
  const out = new Map<string, number>();
  if (db.enrollments === ENROLLMENTS) return out;
  seedEnrollments ??= new Map(ENROLLMENTS.map((e) => [e.id, !e.revokedAt]));
  const seen = seedEnrollments;
  for (const e of db.enrollments) {
    const wasActive = seen.get(e.id);
    const active = !e.revokedAt;
    const d = wasActive === undefined ? (active ? 1 : 0) : Number(active) - Number(wasActive);
    if (d) out.set(e.courseId, (out.get(e.courseId) ?? 0) + d);
  }
  return out;
}

/* The admin bell's queue notifications describe live queues, so they follow the db:
   - ntf_ad1 "N tutor applications waiting" / ntf_ad2 "N courses awaiting review" are re-counted (and
     marked read with an all-clear title once the queue is empty);
   - each "Refund requested" item is closed (title says what happened, marked read) once its order no
     longer has an open request (refunded or declined), wherever the request came from. */
const dayMs = 86_400_000;
function ago(iso: string): string {
  const d = Math.floor((MOCK_NOW.getTime() - new Date(iso).getTime()) / dayMs);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}
function listTitles(titles: string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles.slice(0, 2).join(", ")} and ${titles.length - 2} more`;
}
function liveAdminQueues(db: Db, courses: Db["courses"]): Db["notifications"] {
  const pending = db.tutorApplications.filter((a) => a.status === "pending").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const inReview = courses.filter((c) => c.status === "in_review").sort((a, b) => (a.submittedAt ?? a.updatedAt).localeCompare(b.submittedAt ?? b.updatedAt));
  const byNumber = new Map(db.orders.map((o) => [o.number, o]));
  let changed = false;
  const out = db.notifications.map((n) => {
    let next = n;
    if (n.id === "ntf_ad1") {
      const k = pending.length;
      next = k
        ? { ...n, title: `${k} tutor application${k === 1 ? "" : "s"} waiting`, body: `Oldest one was submitted ${ago(pending[0].submittedAt)}.` }
        : { ...n, title: "Tutor applications: all caught up", body: "Nobody is waiting on a decision right now.", read: true };
    } else if (n.id === "ntf_ad2") {
      const k = inReview.length;
      next = k
        ? { ...n, title: `${k} course${k === 1 ? "" : "s"} awaiting review`, body: `${listTitles(inReview.map((c) => c.title))}.` }
        : { ...n, title: "Course reviews: all caught up", body: "No courses are waiting for review.", read: true };
    } else if (n.kind === "order" && n.title === "Refund requested" && n.href === "/admin/orders") {
      const num = n.body.match(/TM-\d+/)?.[0];
      const o = num ? byNumber.get(num) : undefined;
      if (o && !(o.status === "paid" && o.refundRequest))
        next = { ...n, title: o.status === "refunded" ? "Refund sent" : "Refund request declined", read: true };
    }
    if (next !== n && (next.title !== n.title || next.body !== n.body || next.read !== n.read)) {
      changed = true;
      return next;
    }
    return n;
  });
  return changed ? out : db.notifications;
}

/** A learner's "last active" is never older than the newest thing they did in the seed. */
function withLastActive(users: typeof USERS): typeof USERS {
  const latest = new Map<string, string>();
  const bump = (userId: string, iso: string) => {
    if ((latest.get(userId) ?? "") < iso) latest.set(userId, iso);
  };
  for (const p of LESSON_PROGRESS) bump(p.userId, p.updatedAt);
  for (const a of QUIZ_ATTEMPTS) bump(a.userId, a.createdAt);
  for (const c of COMMENTS) bump(c.userId, c.createdAt);
  for (const r of REVIEWS) bump(r.userId, r.createdAt);
  for (const n of NOTES) bump(n.userId, n.createdAt);
  for (const o of ORDERS) if (o.provider !== "admin") bump(o.userId, o.createdAt);
  return users.map((u) => {
    const l = latest.get(u.id);
    return l && l > u.lastActiveAt ? { ...u, lastActiveAt: l } : u;
  });
}

/** ...and they joined before the first thing they did (orders, enrollments, reviews, Q&A, progress):
 *  a profile never shows "Joined in August" above an order from last November. */
function withJoinedBeforeActivity(users: typeof USERS): typeof USERS {
  const first = new Map<string, string>();
  const see = (userId: string, iso: string) => {
    const cur = first.get(userId);
    if (!cur || iso < cur) first.set(userId, iso);
  };
  for (const o of ORDERS) see(o.userId, o.createdAt);
  for (const e of ENROLLMENTS) see(e.userId, e.createdAt);
  for (const r of REVIEWS) see(r.userId, r.createdAt);
  for (const c of COMMENTS) see(c.userId, c.createdAt);
  for (const p of LESSON_PROGRESS) see(p.userId, p.updatedAt);
  for (const w of WISHLIST) see(w.userId, w.createdAt);
  return users.map((u) => {
    const f = first.get(u.id);
    if (u.role !== "student" || !f || f >= u.joinedAt) return u;
    // a deterministic 1-12 days before that first action, same wall-clock time as the action
    const back = 1 + ([...u.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 12);
    const t = new Date(new Date(f).getTime() - back * 86_400_000 + 330 * 60_000);
    const p2 = (n: number) => String(n).padStart(2, "0");
    const joinedAt = `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}T${p2(t.getUTCHours())}:${p2(t.getUTCMinutes())}:00+05:30`;
    return { ...u, joinedAt };
  });
}


/* Internal notes for the accounts the seed ships suspended (admin user pages show them). */
const SEEDED_SUSPENSIONS: Record<string, { note: string; by: string; hoursAfterLastActive: number }> = {
  u_s014: {
    note: "Shared screen recordings of paid AI Filmmaking lessons in a public Telegram group. Warned twice first; the links were reported and taken down.",
    by: DEMO_ADMIN_ID,
    hoursAfterLastActive: 5,
  },
  u_s042: {
    note: "Kept posting abusive replies under other learners' capstone questions after a warning. Two learners reported it; review again after 30 days.",
    by: "u_ops_karan",
    hoursAfterLastActive: 26,
  },
};

/** Suspended seed accounts carry a suspension record (note, when, by whom), never dated after MOCK_NOW. */
function withSuspensions(users: typeof USERS): typeof USERS {
  return users.map((u) => {
    if (u.status !== "suspended" || u.suspension) return u;
    const s = SEEDED_SUSPENSIONS[u.id];
    const at = Math.min(new Date(u.lastActiveAt).getTime() + (s?.hoursAfterLastActive ?? 6) * 3_600_000, MOCK_NOW.getTime() - 3_600_000);
    return { ...u, suspension: { note: s?.note ?? "", at: toIST(new Date(at)), by: s?.by ?? DEMO_ADMIN_ID } };
  });
}

/**
 * Seeded refund requests get refundRequest.outsidePolicy exactly like demo.requestRefund()
 * sets it: judged at the moment the learner asked (certificate earned, past the
 * REFUND_WINDOW_DAYS window, or REFUND_MAX_PROGRESS% done), with matching wording
 * phrased as of the request ("you asked 29 days after buying it", not "29 days ago").
 */
function withRefundPolicy(orders: typeof ORDERS): typeof ORDERS {
  const DAY = 86_400_000;
  return orders.map((o) => {
    const req = o.refundRequest;
    if (!req || req.outsidePolicy) return o;
    const asked = new Date(req.requestedAt).getTime();
    const before = (iso: string | undefined) => !!iso && new Date(iso).getTime() <= asked;
    const age = Math.floor((asked - new Date(o.createdAt).getTime()) / DAY);
    const cert = CERTIFICATES.some((c) => c.userId === o.userId && c.courseId === o.courseId && before(c.issuedAt));
    const total = (CURRICULA[o.courseId] ?? []).reduce((n, m) => n + m.items.length, 0);
    const done = new Set<string>();
    for (const p of LESSON_PROGRESS) if (p.userId === o.userId && p.courseId === o.courseId && p.completed && before(p.completedAt ?? p.updatedAt)) done.add(p.itemId);
    for (const a of QUIZ_ATTEMPTS) if (a.userId === o.userId && a.courseId === o.courseId && a.passed && before(a.createdAt)) done.add(a.itemId);
    const progress = total ? Math.round((done.size / total) * 100) : 0;
    const outsidePolicy = cert
      ? "You've earned the certificate for this course, so it's outside our refund policy."
      : age > REFUND_WINDOW_DAYS
        ? `Refunds are available for ${REFUND_WINDOW_DAYS} days after purchase, and you asked ${age} days after buying it.`
        : progress >= REFUND_MAX_PROGRESS
          ? `You've completed ${progress}% of the course. Refunds cover courses under ${REFUND_MAX_PROGRESS}% done.`
          : null;
    return outsidePolicy ? { ...o, refundRequest: { ...req, outsidePolicy } } : o;
  });
}

/** The immutable seed. Never mutate it: the demo store layers patches on top. */
export const SEED_DB: Db = computeAggregates({
  users: withSuspensions(withJoinedBeforeActivity(withLastActive([...USERS, ...LEDGER_BUYERS]))),
  tutorProfiles: TUTOR_PROFILES_BASE.map((t) => ({ ...t, rating: 0, reviewCount: 0, learners: 0 })),
  categories: CATEGORIES,
  courses: COURSES_BASE,
  curricula: CURRICULA,
  enrollments: ENROLLMENTS,
  orders: withRefundPolicy(ORDERS),
  coupons: COUPONS,
  payouts: PAYOUTS,
  lessonProgress: LESSON_PROGRESS,
  quizAttempts: QUIZ_ATTEMPTS,
  notes: NOTES,
  reviews: REVIEWS,
  wishlist: WISHLIST,
  certificates: CERTIFICATES,
  comments: COMMENTS,
  tutorApplications: TUTOR_APPLICATIONS,
  notifications: NOTIFICATIONS,
  reports: REPORTS,
});
