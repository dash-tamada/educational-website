"use client";

import { createContext, useContext } from "react";
import type {
  Certificate,
  Course,
  Db,
  ItemContext,
  Module,
  Profile,
  Tutor,
} from "@/lib/mock/types";
import type { CourseProgress } from "@/lib/mock";
import type { AccessResult, getCourseAccess } from "@/lib/access";
import type { DemoSession } from "@/lib/demo/session";

/** What the stage needs from the player (notes, chapters, shortcuts). */
export interface PlayerHandle {
  getTime(): number;
  getDuration(): number;
  seek(sec: number): void;
  play(): void;
  pause(): void;
  /** scroll the player into view (below the sticky bar) and focus it */
  reveal(): void;
}

export type LearnTab = "overview" | "qa" | "notes" | "resources";

export interface LearnContextValue {
  course: Course;
  tutor: Tutor | null;
  db: Db;
  modules: Module[];
  flat: ItemContext[];
  session: DemoSession | null;
  profile: Profile | null;
  courseAccess: ReturnType<typeof getCourseAccess>;
  accessMap: Record<string, AccessResult>;
  progress: CourseProgress;
  completed: Set<string>;
  /** an enrolled learner: progress, attempts and notes are saved */
  tracking: boolean;
  /** the client demo-store overlay has been applied */
  hydrated: boolean;
  /**
   * Access and progress are final: the store overlay is in, or nobody is logged
   * in (logged-out access never depends on the store). Before that, store-only
   * state (a purchase, a passed test) may still flip locks, so views show a
   * skeleton instead of a lock card that disappears a moment later.
   */
  settled: boolean;
  certificate: Certificate | null;
  /** the player of the current item registers itself here */
  player: React.RefObject<PlayerHandle | null>;
  tab: LearnTab;
  setTab: (t: LearnTab) => void;
  /** ask a tab to focus its main field (Ask the tutor / Add a note) */
  focusRequest: { tab: LearnTab; n: number } | null;
  requestFocus: (t: LearnTab) => void;
  /**
   * A panel calls this from its effect: true exactly once for the pending request
   * of that tab on that item. Later items (and remounts) never replay it.
   */
  takeFocus: (t: LearnTab, itemId: string) => boolean;
  openPath: () => void;
  /** the desktop "Your path" aside is showing (lg and up, not collapsed) */
  asideOpen: boolean;
  /** the player stage host is fullscreen (persists across lesson hops) */
  fullscreen: boolean;
  /** enter / leave fullscreen on the stage host; `video` is the iOS fallback */
  toggleFullscreen: (video?: HTMLVideoElement | null) => void;
  /** show the completion modal again (top bar "Certificate" button) */
  showCompletion: () => void;
  /**
   * Call after any action that can complete an item: issues the certificate and
   * celebrates at 100%. Returns true when it opened the completion modal, so the
   * caller can skip its own "complete" toast (the modal already celebrates).
   */
  afterProgress: () => boolean;
  /**
   * A tutor looking at someone else's course: checkout only sells to learner
   * accounts, so every "Unlock the course" becomes "Switch to the student demo".
   */
  tutorBrowsing: boolean;
  /** log into the student demo and stay on this item */
  switchToStudent: () => void;
  /**
   * Focus mode (a test attempt in progress): the floating "Your path" bar steps
   * aside on phones so the test's own sticky action bar owns the bottom.
   */
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
}

export const LearnContext = createContext<LearnContextValue | null>(null);

export function useLearn(): LearnContextValue {
  const v = useContext(LearnContext);
  if (!v) throw new Error("useLearn() must be used inside <LearnShell>");
  return v;
}

export const learnHref = (slug: string, itemId: string) =>
  `/learn/${slug}/${itemId}`;

/**
 * Where "Back" / "Course page" go: the public page for published courses, the
 * studio for the owner, the review screen for admins on unreleased courses.
 * `null` href: no sensible page (an enrolled learner on an archived course).
 */
export function courseTarget(
  course: { id: string; slug: string; status: string },
  access: { owner: boolean; admin: boolean },
): { href: string; label: string; short: string } | null {
  if (access.owner)
    return {
      href: `/tutor/courses/${course.id}/builder`,
      label: "Back to studio",
      short: "Course studio",
    };
  if (course.status === "published")
    return {
      href: `/courses/${course.slug}`,
      label: "Back to course",
      short: "Course page",
    };
  if (access.admin)
    return {
      href: `/admin/courses/${course.id}`,
      label: "Back to review",
      short: "Course review",
    };
  return null;
}
