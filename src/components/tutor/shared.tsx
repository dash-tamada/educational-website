"use client";

import Image from "next/image";
import clsx from "clsx";
import { useMemo } from "react";
import { toneBg, type Tone } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import { DEMO_TUTOR_ID, formatINR, getCourseSales, getTutor, type Db } from "@/lib/mock";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { Icon, type IconName } from "@/components/app";

/** The signed-in tutor (falls back to the default demo tutor), the live db and the hydration flag. */
export function useTutorContext() {
  const session = useDemoSession();
  const db = useDb();
  const hydrated = useStoreHydrated();
  const userId = session?.role === "tutor" ? session.userId : DEMO_TUTOR_ID;
  const tutor = useMemo(() => getTutor(userId, db), [userId, db]);
  const profile = useMemo(() => db.users.find((u) => u.id === userId) ?? null, [userId, db]);
  return { userId, db, tutor, profile, hydrated, firstName: (tutor?.name ?? profile?.name ?? "there").split(" ")[0] };
}

export type TutorCtx = ReturnType<typeof useTutorContext>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A course's sales for the last full month (September) from the foundation's sales ledger,
 * so cards and tables agree with Analytics and the payouts. Courses that aren't live (or
 * that were created in the demo) have no sales: revenue 0.
 */
export function courseMonthSales(c: { id: string; status: string }) {
  const live = c.status === "published" || c.status === "archived";
  const s = getCourseSales(c.id, "month");
  return { revenue: live ? s.revenue : 0, enrollments: live ? s.enrollments : 0, month: monthLabelOf(s.period) };
}

const monthLabelOf = (period: string | null) => (period ? MONTHS[Number(period.slice(5, 7)) - 1] : "last month");

/** Short name of the last full month the ledger reports on ("Sep"). */
export function salesMonthLabel() {
  return monthLabelOf(getCourseSales("", "month").period);
}

/** "₹1.9L in Sep" or "No sales yet" for a live course. */
export function courseRevenueLabel(c: { id: string; status: string }) {
  const s = courseMonthSales(c);
  return s.revenue > 0 ? `${formatINR(s.revenue, { compact: true })} in ${s.month}` : "No sales yet";
}

/**
 * The biggest relative drop between two consecutive modules (share of learners who reach
 * module i-1 but not module i). Used by the overview nudge and the analytics insight +
 * highlighted bar so both name the same module.
 */
export function biggestModuleDrop(mods: { learners: number }[]) {
  let best: { index: number; pct: number; lost: number } | null = null;
  for (let i = 1; i < mods.length; i++) {
    const prev = mods[i - 1].learners;
    const pct = prev ? 1 - mods[i].learners / prev : 0;
    if (pct > 0 && (!best || pct > best.pct)) best = { index: i, pct, lost: prev - mods[i].learners };
  }
  return best;
}

/**
 * Daily series end with today, which only has data up to 10:30. Split it off so charts
 * don't show a fake "crash" at the right edge; callers mention it as "today so far".
 */
export function splitPartialDay<T extends { label: string; value: number }>(series: T[]) {
  if (series.length < 2) return { full: series, today: null as T | null };
  return { full: series.slice(0, -1), today: series[series.length - 1] };
}

/** All of a tutor's courses (every status), newest edit first. */
export function tutorCourses(db: Db, userId: string) {
  return db.courses.filter((c) => c.tutorId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Rounded course thumbnail on its card tone. */
export function CourseThumb({ src, tone = "sun", className, ratio = 3 / 4, sizes = "120px", alt = "", eager }: { src: string; tone?: Tone; className?: string; ratio?: number; sizes?: string; alt?: string; eager?: boolean }) {
  return (
    <span className={clsx("relative block shrink-0 overflow-hidden rounded-[14px]", toneBg[tone], className)}>
      <Image src={cropSrc(src, ratio)} alt={alt} fill sizes={sizes} loading={eager ? "eager" : undefined} className="object-cover" />
    </span>
  );
}

/** Small round icon chip used for item types and list markers. */
export function IconChip({ name, tone = "cream", className, size = "md" }: { name: IconName; tone?: "cream" | "blue" | "sun" | "mint" | "blush" | "lilac" | "ink" | "white" | "flame"; className?: string; size?: "sm" | "md" }) {
  const cls = {
    cream: "bg-cream text-ink",
    blue: "bg-[#dfe8ff] text-blue",
    sun: "bg-butter text-[#6b5400]",
    mint: "bg-mint text-forest",
    blush: "bg-blush text-[#8a0d55]",
    lilac: "bg-[#e7e0fb] text-indigo",
    ink: "bg-ink text-cream",
    white: "bg-white text-ink",
    flame: "bg-[#ffe1d4] text-[#b02f00]",
  }[tone];
  return (
    <span className={clsx("grid shrink-0 place-items-center rounded-full", size === "sm" ? "size-8" : "size-10", cls, className)} aria-hidden>
      <Icon name={name} className={size === "sm" ? "size-4" : "size-[18px]"} strokeWidth={2.2} />
    </span>
  );
}

/** Copy text to the clipboard (silently ignores failures). */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** "Good morning" etc. based on the mock clock (10:30 IST) so server and client agree. */
export function greeting(hourIST = 10) {
  return hourIST < 12 ? "Good morning" : hourIST < 17 ? "Good afternoon" : "Good evening";
}

/**
 * After a failed submit, move focus to the first invalid control (once React has rendered
 * the error), so keyboard and screen-reader users land on what needs fixing.
 */
export function focusFirstInvalid(scope?: HTMLElement | null) {
  requestAnimationFrame(() => {
    const root: ParentNode = scope ?? document;
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
  });
}
