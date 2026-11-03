/* =============================================================================
   Extra mock data + helpers for the public catalog area (catalog, course page,
   tutor profile, checkout). Deterministic, built on the foundation types and
   selectors; never mutates SEED_DB.
   ============================================================================= */

import type { Course, Db, Order, Tutor } from "@/lib/mock/types";
import { REFUND_MAX_PROGRESS, REFUND_WINDOW_DAYS, SEED_DB, runtimeShort, validateCoupon, type CourseStats } from "@/lib/mock";

/* ----------------------------------------------------------------------------- names */
/** "Dr. Vikram Iyer" -> "Vikram" (honorifics dropped, for friendly copy). */
export const firstName = (name: string | null | undefined, fallback = "the tutor") =>
  (name ?? "").replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, "").trim().split(/\s+/)[0] || fallback;


/* ----------------------------------------------------------------------------- course page */
export function whatsIncluded(course: Course, stats: CourseStats) {
  return [
    { icon: "video", text: `${runtimeShort(stats.totalSec)} of video, watch at your own pace` },
    { icon: "play-circle", text: `${stats.videos} video lessons` },
    ...(stats.quizzes ? [{ icon: "quiz", text: `${stats.quizzes} checkpoint tests that unlock the next module` }] : []),
    ...(stats.resources ? [{ icon: "download", text: `${stats.resources} downloadable resource${stats.resources === 1 ? "" : "s"}` }] : []),
    { icon: "chat", text: "Q&A with the tutor under every lesson" },
    ...(course.hasCertificate ? [{ icon: "award", text: "Certificate you can verify online" }] : []),
    { icon: "globe", text: `Taught in ${course.language}` },
    { icon: "clock", text: "Lifetime access, phone or laptop" },
  ];
}

const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Course-specific FAQ (answers use the course's own numbers). */
export function courseFaqs(course: Course, stats: CourseStats, tutor: Tutor | null, viewer: { learnerOwns?: boolean } = {}) {
  const first = firstName(tutor?.name);
  const onSale = course.status === "published";
  const archived = course.status === "archived";
  // a learner who owns a course that has left the catalogue: no review-queue talk
  const offShelfOwner = !onSale && !archived && !!viewer.learnerOwns;
  if (offShelfOwner) {
    return [
      {
        q: "What do I get?",
        a: `${n(stats.videos, "video lesson")} (${runtimeShort(stats.totalSec)} in total)${stats.quizzes ? `, ${n(stats.quizzes, "checkpoint test")}` : ""}${stats.resources ? `, ${n(stats.resources, "downloadable resource")}` : ""} and a Q&A thread under every lesson.`,
      },
      {
        q: "Why isn't it in the catalogue?",
        a: "It's off the shelf for now, so new learners can't buy it. You already own it, so nothing changes for you.",
      },
      {
        q: "Will I keep access?",
        a: "Yes. Your lessons, progress, notes and any certificate stay right where they are.",
      },
      {
        q: "Can I watch on my phone?",
        a: "Yes. Lessons are short and work on phone, tablet and laptop. Your progress syncs, so you can start on the metro and finish on the sofa.",
      },
    ];
  }
  return [
    {
      q: "What do I get?",
      a: `${n(stats.videos, "video lesson")} (${runtimeShort(stats.totalSec)} in total)${stats.quizzes ? `, ${n(stats.quizzes, "checkpoint test")}` : ""}${stats.resources ? `, ${n(stats.resources, "downloadable resource")}` : ""} and a Q&A thread under every lesson where ${first} answers questions.`,
    },
    onSale
      ? {
          q: "Is the first video really free?",
          a: "Yes. The first video of every course is open to everyone, no account and no card needed. Watch it, then decide.",
        }
      : archived
        ? {
            q: "Can I still buy it?",
            a: `Not right now. ${first} archived this course, so it's off the shelf. People who already own it keep full access, progress and certificates included.`,
          }
        : {
            q: "When can learners buy it?",
            a: "Once it's published. Until then only its tutor and the Tamada team can open this page, and the free first video stays private too.",
          },
    {
      q: "How long do I have access?",
      a: "For as long as the course exists. One payment, lifetime access, including any lessons the tutor adds or re-records later.",
    },
    {
      q: "Can I watch on my phone?",
      a: "Yes. Lessons are short and work on phone, tablet and laptop. Your progress syncs, so you can start on the metro and finish on the sofa.",
    },
    {
      q: "Do I get a certificate?",
      a: course.hasCertificate
        ? "Yes. Finish every lesson and pass the tests and you get a certificate with a code anyone can verify on our site."
        : "Not for this one. It's a quick, practical course, so we skipped the certificate.",
    },
    onSale
      ? {
          q: "What if it's not for me?",
          a: `Ask for a refund within ${REFUND_WINDOW_DAYS} days of buying, as long as you've watched less than ${REFUND_MAX_PROGRESS}% of the course. No awkward questions.`,
        }
      : archived
        ? {
            q: "I own it. Will it disappear?",
            a: "No. Archived just means it's not for sale any more. Your lessons, notes and certificate stay right where they are.",
          }
        : {
            q: "Will buyers keep access?",
            a: "Yes, lifetime access once it's live. Lessons added or re-recorded later are included too.",
          },
  ];
}

/** Review-form placeholders that fit the course's subject (category id -> headline, body). */
const REVIEW_HINTS: Record<string, [string, string]> = {
  cat_film: ["e.g. Finished my first 60-second short", "What did you make after the course?"],
  cat_musicvideo: ["e.g. Made a full video for our band", "What did you release after the course?"],
  cat_ads: ["e.g. Landed my first brand film", "What did you pitch or deliver after the course?"],
};
export const reviewHints = (course: Course | null | undefined): [string, string] =>
  (course && REVIEW_HINTS[course.categoryId]) || ["e.g. Finally clicked", "What did you make or do after the course?"];

/* ----------------------------------------------------------------------------- checkout */
export const PAYMENT_METHODS: { value: Order["method"]; label: string; description: string; icon: string }[] = [
  { value: "UPI", label: "UPI", description: "GPay, PhonePe, Paytm or any UPI app. No-cost EMI on supported apps", icon: "spark" },
  { value: "Card", label: "Debit or credit card", description: "Visa, Mastercard, RuPay. 3 no-cost EMIs on supported cards", icon: "wallet" },
  { value: "Netbanking", label: "Netbanking", description: "All major Indian banks", icon: "briefcase" },
  { value: "Wallet", label: "Wallet", description: "Paytm, Amazon Pay, Mobikwik", icon: "receipt" },
];

/**
 * Coupon codes that would work on this course right now for this buyer (for the
 * "demo codes" hint). With a userId, first-purchase-only codes drop out for
 * returning buyers; logged out, every generally valid code is listed.
 */
export function workingCoupons(courseId: string, userId: string | null | undefined, db: Db = SEED_DB): string[] {
  return db.coupons
    .filter((c) => c.active && validateCoupon(c.code, courseId, { userId: userId ?? null }, db).valid)
    .sort((a, b) => Number(!!b.courseIds) - Number(!!a.courseIds) || a.code.localeCompare(b.code))
    .map((c) => c.code)
    .slice(0, 3);
}

/**
 * The "Demo codes that work here" line. Logged out, first-purchase-only codes are
 * labelled, because every demo account has already bought something and the code
 * would fail right after login.
 */
export function couponHintLine(courseId: string, userId: string | null | undefined, db: Db = SEED_DB): string {
  const codes = workingCoupons(courseId, userId, db);
  if (!codes.length) return "No demo coupons apply to this course right now.";
  const label = (code: string) => {
    const c = db.coupons.find((x) => x.code === code);
    return !userId && c?.firstPurchaseOnly ? `${code} (first course only)` : code;
  };
  return `Demo codes that work here: ${codes.map(label).join(", ")}`;
}

/** Refund promise shown at checkout, built from the shared policy constants. */
export const REFUND_LINE = `Lifetime access. ${REFUND_WINDOW_DAYS}-day refund if you've watched less than ${REFUND_MAX_PROGRESS}%.`;

/** GST included in an inclusive price (18%). */
export const gstIncluded = (amount: number) => Math.round(amount - amount / 1.18);
