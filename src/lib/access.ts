/* =============================================================================
   ACCESS RULES: the single source of truth for "can this person open this item?"

   An item is accessible if it is a free preview, OR the user is enrolled, OR the
   user is the course's tutor, OR the user is an admin. For enrolled learners a
   gating quiz locks every later item until it is passed. A course that is not
   published (draft / in review / rejected / archived) stays open to its tutor,
   admins and learners already enrolled in it (they keep what they paid for);
   everyone else gets "unavailable", and free previews only work while the
   course is published.

   Works on the server (seed db) and the client (pass useDb()).
   ============================================================================= */

import type { Course, Db, ModuleItem, Role } from "@/lib/mock/types";
import { SEED_DB, flattenCurriculum, hasPassedQuiz, isEnrolled } from "@/lib/mock";

export type AccessReason =
  | "free" // free preview (not enrolled)
  | "enrolled" // enrolled learner
  | "owner" // the course's tutor
  | "admin" // platform admin
  | "paywall" // logged in, not enrolled
  | "gated" // enrolled, but an earlier gating quiz isn't passed yet
  | "login" // logged out and not a free preview
  | "unavailable"; // course not published and you're not its tutor/admin

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  /** for "gated": the quiz item that must be passed first */
  blockedBy?: ModuleItem;
}

/** Anything with an id + role (a DemoSession or a Profile both work). null = logged out. */
export type AccessUser = { id?: string; userId?: string; role: Role } | null | undefined;
const uid = (u: AccessUser) => (u ? (u.userId ?? u.id ?? null) : null);

/** Course-level access summary (what the course page / player header needs). */
export function getCourseAccess(user: AccessUser, course: Course, db: Db = SEED_DB) {
  const id = uid(user);
  const admin = user?.role === "admin";
  const owner = !!id && course.tutorId === id;
  const enrolled = isEnrolled(id, course.id, db);
  const published = course.status === "published";
  return {
    admin,
    owner,
    enrolled,
    /** can open every item (ignoring quiz gates) */
    fullAccess: admin || owner || enrolled,
    /** on sale and this person doesn't own it yet (not enrolled, not its tutor, not an admin).
     *  Still true for a tutor looking at someone else's course: use `canBuy` for buy buttons. */
    purchasable: published && !enrolled && !owner && !admin,
    /** the course itself is on sale (published), whoever is looking */
    forSale: published,
    /** this viewer can check out right now: purchasable AND a student or logged out
     *  (tutors and admins browse with their own accounts and don't buy courses) */
    canBuy: published && !enrolled && !owner && !admin && (!user || user.role === "student"),
    /** course page / free preview visible to this person */
    visible: published || enrolled || owner || admin,
  };
}

/**
 * canAccessItem(user, course, item, db?)
 *   -> { allowed: true,  reason: "free" | "enrolled" | "owner" | "admin" }
 *   -> { allowed: false, reason: "paywall" | "login" | "gated" | "unavailable", blockedBy? }
 */
export function canAccessItem(user: AccessUser, course: Course, item: ModuleItem, db: Db = SEED_DB): AccessResult {
  const a = getCourseAccess(user, course, db);
  if (a.admin) return { allowed: true, reason: "admin" };
  if (a.owner) return { allowed: true, reason: "owner" };
  if (!a.visible) return { allowed: false, reason: "unavailable" };
  if (!a.enrolled) {
    if (item.type === "video" && item.lesson.isFreePreview && course.status === "published") return { allowed: true, reason: "free" };
    return { allowed: false, reason: user ? "paywall" : "login" };
  }
  const blockedBy = firstUnpassedGate(uid(user)!, course.id, item.id, db);
  if (blockedBy) return { allowed: false, reason: "gated", blockedBy };
  return { allowed: true, reason: "enrolled" };
}

/** The first gating quiz BEFORE itemId that the user hasn't passed (null = none). */
function firstUnpassedGate(userId: string, courseId: string, itemId: string, db: Db): ModuleItem | null {
  for (const { item } of flattenCurriculum(courseId, db)) {
    if (item.id === itemId) return null;
    if (item.type === "quiz" && item.quiz.isGating && !hasPassedQuiz(userId, item.id, db)) return item;
  }
  return null;
}

/**
 * Access for every item of a course in one pass (sidebars, curriculum lists).
 * Returns itemId -> AccessResult.
 */
export function getItemAccessMap(user: AccessUser, course: Course, db: Db = SEED_DB): Record<string, AccessResult> {
  const a = getCourseAccess(user, course, db);
  const id = uid(user);
  const out: Record<string, AccessResult> = {};
  let gate: ModuleItem | null = null;
  for (const { item } of flattenCurriculum(course.id, db)) {
    if (a.admin) out[item.id] = { allowed: true, reason: "admin" };
    else if (a.owner) out[item.id] = { allowed: true, reason: "owner" };
    else if (!a.visible) out[item.id] = { allowed: false, reason: "unavailable" };
    else if (!a.enrolled) {
      out[item.id] =
        item.type === "video" && item.lesson.isFreePreview && course.status === "published"
          ? { allowed: true, reason: "free" }
          : { allowed: false, reason: id ? "paywall" : "login" };
    } else {
      out[item.id] = gate ? { allowed: false, reason: "gated", blockedBy: gate } : { allowed: true, reason: "enrolled" };
      if (!gate && item.type === "quiz" && item.quiz.isGating && !hasPassedQuiz(id!, item.id, db)) gate = item;
    }
  }
  return out;
}

/** Human copy for a locked reason (player + course page). */
export const accessCopy: Record<Exclude<AccessReason, "free" | "enrolled" | "owner" | "admin">, { title: string; body: string; cta: string }> = {
  paywall: { title: "This lesson is part of the full course.", body: "The first video is free. Unlock the course to keep going, with lifetime access.", cta: "Unlock the course" },
  login: { title: "Log in to keep watching.", body: "The first video is free for everyone. Log in or create an account to unlock the rest.", cta: "Log in" },
  gated: { title: "Pass the checkpoint first.", body: "This course uses tiny tests as checkpoints. Pass the one before this lesson to unlock it.", cta: "Take the test" },
  unavailable: { title: "This course isn't available.", body: "It's not published right now. Browse the library for something just as good.", cta: "Browse courses" },
};
