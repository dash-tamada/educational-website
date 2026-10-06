"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEMO_STUDENT_ID, getUser } from "@/lib/mock";
import type { Tone } from "@/lib/landing-data";
import { useDb } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";

/* =============================================================================
   Student hooks.
   - useStudentId(): the signed-in demo learner (the area layout guarantees the
     role; falls back to Priya so a page never crashes).
   - useStudentPrefs(): per-browser settings for this demo learner
     (notification switches, learning goal, reminder, language). They live in
     localStorage under our own key and render the defaults on the server.
   - useStudentProfile(): the learner's profile straight from the demo store
     (demo.updateProfile writes it), so the shell, certificates, Q&A and
     reviews all show the same name and photo.
   ============================================================================= */

export function useStudentId(): string {
  const s = useDemoSession();
  return s?.role === "student" ? s.userId : DEMO_STUDENT_ID;
}

export type NotifKey = "newLessons" | "qaReplies" | "quizReminders" | "weeklyDigest" | "offers" | "whatsapp";

export interface StudentPrefs {
  notifications: Record<NotifKey, boolean>;
  /** minutes per learning day */
  dailyGoal: number;
  /** learning days per week the goal counts */
  goalDays: number;
  reminderTime: string;
  language: string;
}

export const DEFAULT_PREFS: StudentPrefs = {
  notifications: { newLessons: true, qaReplies: true, quizReminders: true, weeklyDigest: true, offers: false, whatsapp: false },
  dailyGoal: 15,
  goalDays: 5,
  reminderTime: "20:30",
  language: "English",
};

const KEY = (uid: string) => `tm-student-prefs:${uid}`;
const subs = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: StudentPrefs }>();

function read(uid: string): StudentPrefs {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY(uid));
  } catch {
    raw = null;
  }
  const hit = cache.get(uid);
  if (hit && hit.raw === raw) return hit.value;
  let value = DEFAULT_PREFS;
  if (raw) {
    try {
      // older builds kept profile edits here too; those now live in the demo store
      const { profile: _legacy, ...p } = JSON.parse(raw) as Partial<StudentPrefs> & { profile?: unknown };
      void _legacy;
      value = {
        ...DEFAULT_PREFS,
        ...p,
        notifications: { ...DEFAULT_PREFS.notifications, ...(p.notifications ?? {}) },
      };
    } catch {
      value = DEFAULT_PREFS;
    }
  }
  cache.set(uid, { raw, value });
  return value;
}

function subscribe(cb: () => void) {
  subs.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("tm-student-prefs:")) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStudentPrefs(uid: string) {
  const prefs = useSyncExternalStore(
    subscribe,
    () => read(uid),
    () => DEFAULT_PREFS,
  );
  const save = useCallback(
    (next: Partial<StudentPrefs>) => {
      const cur = read(uid);
      const merged: StudentPrefs = { ...cur, ...next, notifications: { ...cur.notifications, ...(next.notifications ?? {}) } };
      try {
        window.localStorage.setItem(KEY(uid), JSON.stringify(merged));
      } catch {
        /* private mode: keep the in-memory copy */
        cache.set(uid, { raw: JSON.stringify(merged), value: merged });
      }
      subs.forEach((s) => s());
    },
    [uid],
  );
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY(uid));
    } catch {}
    cache.delete(uid);
    subs.forEach((s) => s());
  }, [uid]);
  return { prefs, save, reset };
}

/** The learner's profile from the live db (seed + demo.updateProfile edits). */
export function useStudentProfile() {
  const uid = useStudentId();
  const db = useDb();
  return useMemo(() => {
    const base = getUser(uid, db);
    return {
      uid,
      base,
      name: base?.name || "Learner",
      email: base?.email ?? "",
      city: base?.city ?? "",
      phone: base?.phone ?? "",
      headline: base?.headline ?? "",
      tone: (base?.tone || "hotpink") as Tone,
      photo: base?.avatar ?? "",
      joinedAt: base?.joinedAt,
    };
  }, [uid, db]);
}

/* ----------------------------------------------------------------------------- tiny per-browser UI prefs */
const uiSubs = new Set<() => void>();
/** A remembered UI choice (layout toggle etc.). Server + first paint use the fallback. */
export function useLocalPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      uiSubs.add(cb);
      return () => uiSubs.delete(cb);
    },
    () => {
      try {
        const v = window.localStorage.getItem(key) as T | null;
        return v && allowed.includes(v) ? v : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (v: T) => {
      try {
        window.localStorage.setItem(key, v);
      } catch {}
      uiSubs.forEach((s) => s());
    },
    [key],
  );
  return [value, set];
}
