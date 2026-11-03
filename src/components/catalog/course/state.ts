"use client";

import { useEffect, useState } from "react";
import { getCourseAccess } from "@/lib/access";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { FLAGSHIP } from "@/lib/content/site";
import { formatDuration, getCourseById, getCourseProgress, getCourseStats, getCurriculum, getFirstFreeItem, type Course, type Db, type Module } from "@/lib/mock";

/* =============================================================================
   Shared state for the course page (hero CTAs, purchase rail, phone bar, final
   CTA all agree on who is looking): reads the LIVE demo store (seed during SSR
   and hydration, the browser's overlay right after).

   mode: "buy"      on sale, this viewer doesn't own it (visitor, student, other tutor)
         "enrolled" this learner owns it (Continue / Resume)
         "staff"    the course's tutor or an admin (studio / admin links)
         "closed"   not for sale (archived, or not published)
   pending: a student before the store overlay lands (their demo purchases live
   there): hold the space instead of flashing a price for a course they own.
   ============================================================================= */

export type CourseMode = "buy" | "enrolled" | "staff" | "closed";

export function useCourseState(courseId: string) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const course = getCourseById(courseId, db);
  const access = course ? getCourseAccess(session, course, db) : null;
  const mode: CourseMode = !access
    ? "closed"
    : access.enrolled
      ? "enrolled"
      : access.owner || access.admin
        ? "staff"
        : access.purchasable
          ? "buy"
          : "closed";
  const pending = !hydrated && session?.role === "student" && mode === "buy";
  const slug = course?.slug ?? "";
  const free = course && access?.visible ? getFirstFreeItem(course.id, db) : null;
  const freeHref = `/learn/${slug}${free ? `/${free.id}` : ""}`;
  const progress = mode === "enrolled" && session && course ? getCourseProgress(session.userId, course.id, db) : null;
  const learnHref = `/learn/${slug}${progress?.resumeItemId ? `/${progress.resumeItemId}` : ""}`;
  const learnLabel = !progress ? "Start learning" : progress.percent >= 100 ? "Rewatch the course" : progress.percent > 0 ? "Continue learning" : "Start learning";
  return {
    db,
    session,
    hydrated,
    course,
    access,
    mode,
    pending,
    free,
    freeHref,
    checkoutHref: `/checkout/${slug}`,
    progress,
    learnHref,
    learnLabel,
  };
}

/** The flagship gets the editorial extras (copy in src/lib/content/course.ts). */
export const isFlagship = (c: Pick<Course, "id">) => c.id === FLAGSHIP.id;

/** A trailing "Capstone…" module counts apart from the numbered modules. */
export const isCapstone = (m: Pick<Module, "title">) => /^capstone\b/i.test(m.title.trim());

/** Facts for the meta rows: "10 modules + capstone", lesson count, runtime. */
export function courseFacts(course: Course, db: Db) {
  const stats = getCourseStats(course.id, db);
  const modules = getCurriculum(course.id, db);
  const capstone = modules.length > 0 && isCapstone(modules[modules.length - 1]);
  const numbered = modules.length - (capstone ? 1 : 0);
  return {
    stats,
    modules: numbered,
    capstone,
    lessons: stats.items,
    runtime: runtimeLabel(stats.totalSec),
    runtimeLong: formatDuration(stats.totalSec, "long"),
  };
}

/** "7H 01M" (mono caps runtime, timecode style). */
export function runtimeLabel(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}H ${String(m).padStart(2, "0")}M` : `${Math.max(1, m)}M`;
}

/** Title lockup: "AI Filmmaking: Prompt to Premiere" -> top "AI Filmmaking", main "Prompt to Premiere". */
export function splitTitle(title: string): { top: string | null; main: string } {
  const i = title.indexOf(":");
  if (i < 1) return { top: null, main: title };
  return { top: title.slice(0, i).trim(), main: title.slice(i + 1).trim() };
}

/** true while `ref` is scrolled out of the viewport ABOVE (it has been passed). */
export function usePassed(ref: React.RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setPassed(false);
      return;
    }
    let raf = 0;
    const check = () => {
      raf = 0;
      setPassed(el.getBoundingClientRect().bottom <= 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
  return passed;
}
