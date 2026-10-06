"use client";

import { useMemo, useSyncExternalStore } from "react";
import type {
  ApplicationStatus,
  Category,
  Certificate,
  Coupon,
  Course,
  CourseStatus,
  Db,
  Enrollment,
  EnrollmentSource,
  LessonComment,
  LessonProgress,
  Module,
  Note,
  Notification,
  Order,
  Payout,
  Profile,
  QuizAnswers,
  QuizAttempt,
  Report,
  Review,
  Role,
  TutorApplication,
  TutorProfile,
  WishlistItem,
} from "@/lib/mock/types";
import {
  SEED_DB,
  computeAggregates,
  DEMO_ADMIN_ID,
  formatINR,
  getCourseById,
  getCourseProgress,
  getCourseStats,
  getItem,
  getRefundEligibility,
  getUser,
  gradeQuiz,
  validateCoupon,
  MOCK_NOW,
  MOCK_NOW_ISO,
} from "@/lib/mock";
import { slugify, toIST } from "@/lib/mock/seed/util";

/* =============================================================================
   DEMO STORE: mutable demo state layered over the immutable seed.

   - State = per-table patches { add, upd, del } + curriculum overrides, persisted
     to localStorage ("tm-demo-store", versioned). The seed is never mutated, so a
     seed change (or another agent's extra mock data) still shows up.
   - SSR-safe: the server snapshot is the empty patch set, so the server and the
     hydration pass render the seed; the stored overlay applies right after.
   - useDb() returns the merged, aggregate-recomputed Db for every selector in
     "@/lib/mock" (pass it as their last argument).
   - demo.* are the typed actions. They return the row they created/changed.
   ============================================================================= */

export const STORE_KEY = "tm-demo-store";
export const STORE_VERSION = 1;
/** window event fired by demo.reset() (e.g. the shell's "Reset demo data"). */
export const DEMO_RESET_EVENT = "tm-demo-reset";

/**
 * localStorage keys (exact key or prefix) that hold per-browser DEMO DATA kept by
 * areas outside the store: settings saved "in this browser", the tutor profile,
 * admin suspension notes, viewer likes/reports. demo.reset() removes them
 * and fires a same-tab `storage` event for each, so any useSyncExternalStore that
 * already listens for cross-tab `storage` changes re-reads at once.
 * Pure UI conveniences (sidebar collapsed, grid/list view, player volume/speed,
 * unsent form drafts) are deliberately NOT listed: a reset keeps them.
 */
export const DEMO_RESET_STORAGE_KEYS: readonly string[] = [
  "tm-student-prefs:",
  "tm-tutor-profile:",
  "tm-admin-settings",
  "tm-admin-suspensions",
  "tm-learn-likes-",
  "tm-learn-reports-",
];

/** Run `cb` whenever demo.reset() runs in this tab. Returns an unsubscribe. */
export function onDemoReset(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DEMO_RESET_EVENT, cb);
  return () => window.removeEventListener(DEMO_RESET_EVENT, cb);
}

function clearDemoExtras() {
  let keys: string[] = [];
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && DEMO_RESET_STORAGE_KEYS.some((p) => k === p || (/[:-]$/.test(p) && k.startsWith(p)))) keys.push(k);
    }
    keys.forEach((k) => ls.removeItem(k));
  } catch {
    keys = [];
  }
  for (const key of keys) {
    try {
      window.dispatchEvent(new StorageEvent("storage", { key, oldValue: null, newValue: null }));
    } catch {}
  }
}

type TableName = Exclude<keyof Db, "curricula">;
type Row<K extends TableName> = Db[K][number];
interface TablePatch<T> {
  add: T[];
  upd: Record<string, Partial<T>>;
  del: string[];
}
type Patches = { [K in TableName]?: TablePatch<Row<K>> };

export interface DemoState {
  v: number;
  patches: Patches;
  /** courseId -> full module list (tutor builder saves / new courses) */
  curricula: Record<string, Module[]>;
  /** monotonically increasing counter for ids + timestamps */
  seq: number;
}

const EMPTY: DemoState = Object.freeze({ v: STORE_VERSION, patches: {}, curricula: {}, seq: 0 }) as DemoState;

/* ----------------------------------------------------------------------------- store core */
let state: DemoState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as DemoState;
    if (parsed?.v === STORE_VERSION && parsed.patches) {
      const { state: clean, changed } = sanitize({ ...EMPTY, ...parsed });
      state = clean;
      // one-time cleanup of sentinels older builds wrote into nested data (curricula, row objects)
      if (changed) persist();
    }
  } catch {
    /* private mode / corrupt json: start from the seed */
  }
}
function persist() {
  try {
    if (state === EMPTY) window.localStorage.removeItem(STORE_KEY);
    else window.localStorage.setItem(STORE_KEY, serialize(state));
  } catch {
    /* quota / private mode: keep it in memory */
  }
}
function set(next: DemoState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORE_KEY) return;
    loaded = false;
    state = EMPTY;
    load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function getSnapshot() {
  load();
  return state;
}
const getServerSnapshot = () => EMPTY;

/* ----------------------------------------------------------------------------- merge */
const UNDEF = "__tm_undef__";
/** Shallow: sentinel -> undefined (fields cleared by an action, after a reload). */
function fix<T>(obj: T): T {
  let out: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === UNDEF) {
      out ??= { ...(obj as Record<string, unknown>) };
      out[k] = undefined;
    }
  }
  return (out ?? obj) as T;
}
/* Persistence format. A top-level row field set to undefined in a patch must keep clearing the seed
   value after a reload, so ONLY those fields are written as the UNDEF sentinel. Everything nested
   (curricula, lessons, quizzes, questions, resources, objects inside rows) uses plain JSON, which
   simply drops undefined keys, so a sentinel can never leak into what learners see. */
type AnyRow = Record<string, unknown>;
const markTop = (row: unknown): AnyRow => {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row as AnyRow)) out[k] = v === undefined ? UNDEF : v;
  return out;
};
function serialize(s: DemoState): string {
  const patches: Record<string, unknown> = {};
  for (const [t, p] of Object.entries(s.patches) as unknown as [string, TablePatch<AnyRow> | undefined][]) {
    if (!p) continue;
    const upd: Record<string, AnyRow> = {};
    for (const [k, row] of Object.entries(p.upd)) upd[k] = markTop(row);
    patches[t] = { add: p.add.map(markTop), upd, del: p.del };
  }
  return JSON.stringify({ ...s, patches });
}
/** Deep: drop sentinel keys (and turn sentinel array slots into undefined). Returns the same object when clean. */
function scrub<T>(v: T, hit: { n: number }): T {
  if (v === (UNDEF as unknown)) {
    hit.n++;
    return undefined as T;
  }
  if (Array.isArray(v)) {
    let out: unknown[] | null = null;
    v.forEach((x, i) => {
      const y = scrub(x, hit);
      if (y !== x) (out ??= [...v])[i] = y;
    });
    return (out ?? v) as T;
  }
  if (v && typeof v === "object") {
    let out: AnyRow | null = null;
    for (const [k, x] of Object.entries(v as AnyRow)) {
      if (x === UNDEF) {
        hit.n++;
        out ??= { ...(v as AnyRow) };
        delete out[k];
        continue;
      }
      const y = scrub(x, hit);
      if (y !== x) (out ??= { ...(v as AnyRow) })[k] = y;
    }
    return (out ?? v) as T;
  }
  return v;
}
/** Row: keep top-level sentinels (fix() turns them into undefined), scrub everything below. */
function scrubRow<T>(row: T, hit: { n: number }): T {
  let out: AnyRow | null = null;
  for (const [k, x] of Object.entries(row as AnyRow)) {
    if (x === UNDEF) continue;
    const y = scrub(x, hit);
    if (y !== x) (out ??= { ...(row as AnyRow) })[k] = y;
  }
  return (out ?? row) as T;
}
function sanitize(s: DemoState): { state: DemoState; changed: boolean } {
  const hit = { n: 0 };
  const patches: Patches = {};
  for (const [t, p] of Object.entries(s.patches) as unknown as [TableName, TablePatch<AnyRow> | undefined][]) {
    if (!p) continue;
    const upd: Record<string, AnyRow> = {};
    for (const [k, row] of Object.entries(p.upd ?? {})) upd[k] = scrubRow(row, hit);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (patches as any)[t] = { add: (p.add ?? []).map((r) => scrubRow(r, hit)), upd, del: p.del ?? [] };
  }
  const curricula = scrub(s.curricula ?? {}, hit);
  return { state: { ...s, patches, curricula }, changed: hit.n > 0 };
}

const keyOf = (table: TableName, row: Record<string, unknown>) =>
  String(table === "tutorProfiles" ? row.userId : row.id);

function mergeTable<K extends TableName>(table: K, seed: Row<K>[], patch?: TablePatch<Row<K>>): Row<K>[] {
  if (!patch) return seed;
  const del = new Set(patch.del);
  const out: Row<K>[] = [];
  for (const row of seed) {
    const k = keyOf(table, row as unknown as Record<string, unknown>);
    if (del.has(k)) continue;
    const u = patch.upd[k];
    out.push(u ? fix({ ...row, ...u } as Row<K>) : row);
  }
  return [...out, ...patch.add.map(fix)];
}

const dbCache = new WeakMap<DemoState, Db>();
/** Merged db for a state (memoised per state object). */
export function mergeDb(s: DemoState): Db {
  if (s === EMPTY) return SEED_DB;
  const hit = dbCache.get(s);
  if (hit) return hit;
  const base = SEED_DB;
  const merged = { ...base } as Db;
  for (const t of Object.keys(s.patches) as TableName[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (merged as any)[t] = mergeTable(t, base[t] as any, s.patches[t] as any);
  }
  merged.curricula = Object.keys(s.curricula).length ? { ...base.curricula, ...s.curricula } : base.curricula;
  const db = computeAggregates(merged);
  dbCache.set(s, db);
  return db;
}

/* ----------------------------------------------------------------------------- hooks */
/** The raw demo state (patches). Rarely needed: prefer useDb(). */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
/** Seed + demo overlay. Pass it to any selector: getCourseBySlug(slug, db). */
export function useDb(): Db {
  const s = useDemoState();
  return useMemo(() => mergeDb(s), [s]);
}
/** Derive something from the live db: const n = useDemo((db) => getWishlist(uid, db).length) */
export function useDemo<T>(selector: (db: Db) => T): T {
  const db = useDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(db), [db]);
}
/** True once the client overlay is applied (use to avoid flashing seed-only UI for store-driven badges). */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
/** Current live db outside React (event handlers). */
export const getLiveDb = () => mergeDb(getSnapshot());

/* ----------------------------------------------------------------------------- patch helpers */
function tableOf<K extends TableName>(s: DemoState, t: K): TablePatch<Row<K>> {
  return (s.patches[t] as TablePatch<Row<K>> | undefined) ?? { add: [], upd: {}, del: [] };
}
function withTable<K extends TableName>(s: DemoState, t: K, p: TablePatch<Row<K>>): DemoState {
  return { ...s, patches: { ...s.patches, [t]: p } };
}
const inSeed = (t: TableName, key: string) =>
  (SEED_DB[t] as unknown as Record<string, unknown>[]).some((r) => keyOf(t, r) === key);

/** Insert or replace a row. */
function upsert<K extends TableName>(t: K, row: Row<K>) {
  const s = getSnapshot();
  const p = tableOf(s, t);
  const key = keyOf(t, row as unknown as Record<string, unknown>);
  let next: TablePatch<Row<K>>;
  if (inSeed(t, key)) {
    next = { ...p, upd: { ...p.upd, [key]: row as Partial<Row<K>> }, del: p.del.filter((d) => d !== key) };
  } else {
    const i = p.add.findIndex((r) => keyOf(t, r as unknown as Record<string, unknown>) === key);
    const add = i >= 0 ? p.add.map((r, j) => (j === i ? row : r)) : [...p.add, row];
    next = { ...p, add };
  }
  set(withTable({ ...s, seq: s.seq + 1 }, t, next));
  return row;
}
/** Merge fields into an existing row. */
function patch<K extends TableName>(t: K, key: string, fields: Partial<Row<K>>) {
  const s = getSnapshot();
  const p = tableOf(s, t);
  const i = p.add.findIndex((r) => keyOf(t, r as unknown as Record<string, unknown>) === key);
  const next: TablePatch<Row<K>> =
    i >= 0
      ? { ...p, add: p.add.map((r, j) => (j === i ? ({ ...r, ...fields } as Row<K>) : r)) }
      : { ...p, upd: { ...p.upd, [key]: { ...(p.upd[key] ?? {}), ...fields } } };
  set(withTable({ ...s, seq: s.seq + 1 }, t, next));
}
function remove<K extends TableName>(t: K, key: string) {
  const s = getSnapshot();
  const p = tableOf(s, t);
  const isAdded = p.add.some((r) => keyOf(t, r as unknown as Record<string, unknown>) === key);
  const next: TablePatch<Row<K>> = isAdded
    ? { ...p, add: p.add.filter((r) => keyOf(t, r as unknown as Record<string, unknown>) !== key) }
    : { ...p, del: [...new Set([...p.del, key])] };
  set(withTable({ ...s, seq: s.seq + 1 }, t, next));
}
function find<K extends TableName>(t: K, key: string): Row<K> | undefined {
  return (getLiveDb()[t] as Row<K>[]).find((r) => keyOf(t, r as unknown as Record<string, unknown>) === key);
}

/** Deterministic-ish ids + timestamps for demo-created rows: just after MOCK_NOW, ordered. */
function nextId(prefix: string) {
  const s = getSnapshot();
  return `${prefix}_d${s.seq + 1}${Math.floor(Math.random() * 1296).toString(36)}`;
}
function demoNow() {
  return toIST(new Date(MOCK_NOW.getTime() + (getSnapshot().seq + 1) * 1000));
}
/** Course outline from an array or free text ("one per line" or "1. … 2. …") -> clean steps, max 20. */
function normalizeOutline(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw)
    ? raw
    : raw.includes("\n")
      ? raw.split(/\r?\n+/)
      : raw.split(/\s+(?=\d+[.)]\s)/);
  return parts
    .map((s) => s.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").replace(/\s+/g, " ").trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 20);
}
/** Older wizard builds (and drafts saved by them) packed the plan as "Title: 1. step 2. step" in
 *  plannedCourse. When no separate outline arrives, split that legacy form back into a bare title
 *  plus steps. Only a tail that starts a numbered/bulleted list or spans lines counts, so a real
 *  title with a colon ("Kathak Foundations: Tatkar to Your First Piece") is left alone. */
function splitLegacyPlan<T extends { plannedCourse?: string; courseOutline?: string[] | string }>(f: T): T {
  const hasOutline = Array.isArray(f.courseOutline) ? f.courseOutline.length > 0 : !!f.courseOutline?.trim();
  if (hasOutline || !f.plannedCourse) return f;
  const m = f.plannedCourse.match(/^([^\n]+?):\s+((?:\d+[.)]|[-*•])\s[\s\S]*|[^\n]*\n[\s\S]*)$/);
  if (!m) return f;
  const steps = normalizeOutline(m[2]);
  return steps.length ? { ...f, plannedCourse: m[1].trim(), courseOutline: steps } : f;
}

/** Drop a notification into someone's bell (used by actions that would email/push in production). */
function notify(userId: string, kind: Notification["kind"], title: string, body: string, href?: string) {
  if (!userId) return;
  upsert("notifications", { id: nextId("ntf"), userId, kind, title, body, href, createdAt: demoNow(), read: false });
}

/** Ping every admin account (falls back to the demo admin). */
function notifyAdmins(kind: Notification["kind"], title: string, body: string, href?: string) {
  const admins = getLiveDb().users.filter((u) => u.role === "admin" && u.status !== "suspended").map((u) => u.id);
  for (const id of admins.length ? admins : [DEMO_ADMIN_ID]) notify(id, kind, title, body, href);
}
/** What the tutor wizard sends (submit and resubmit). courseOutline may be an array or free text. */
export type TutorApplicationInput = Omit<
  TutorApplication,
  "id" | "userId" | "status" | "submittedAt" | "decidedAt" | "decidedBy" | "decisionNote" | "history" | "courseOutline"
> & { courseOutline?: string[] | string };
/** Trim strings, drop empty optional answers (so they never render as blank rows). */
function cleanApplicationFields<T extends Partial<TutorApplicationInput> & { userId?: string }>(f: T): Partial<TutorApplication> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined) continue;
    if (typeof v === "string") out[k] = v.trim();
    else out[k] = v;
  }
  if ("website" in f) out.website = f.website?.trim() || undefined;
  if ("languages" in f) {
    const langs = Array.from(new Set((f.languages ?? []).map((x) => x.trim()).filter(Boolean)));
    out.languages = langs.length ? langs : undefined;
  }
  if ("years" in f) out.years = f.years?.trim() || undefined;
  if ("payout" in f) {
    const p = f.payout;
    out.payout =
      p && p.country?.trim() && p.method?.trim()
        ? { country: p.country.trim(), method: p.method.trim(), ...(p.gst ? { gst: p.gst } : {}), ...(p.gstin?.trim() ? { gstin: p.gstin.trim().toUpperCase() } : {}) }
        : undefined;
  }
  return out as Partial<TutorApplication>;
}

/** Application experience band ("lt1" | "1-3" | "3-7" | "7+", or a label like "3 to 7 years") -> years shown on the profile. */
function yearsFromBand(band?: string): number {
  const n = Number(band?.match(/\d+/)?.[0]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
/** Website from an application -> a labelled social link for the public profile. */
function socialFromUrl(url?: string): { label: string; href: string }[] {
  const href = url?.trim();
  if (!href || !TUTOR_URL_RE.test(href)) return [];
  const host = href.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  const label = /instagram\./.test(host)
    ? "Instagram"
    : /youtube\.|youtu\.be/.test(host)
      ? "YouTube"
      : /linkedin\./.test(host)
        ? "LinkedIn"
        : /(^|\.)x\.com$|twitter\./.test(host)
          ? "X"
          : "Website";
  return [{ label, href }];
}
/** Public tutor profile for someone who just became a tutor (application approved or role changed).
 *  An approved application passes its languages, experience band and website through. */
function ensureTutorProfile(
  user: Profile,
  from: { headline?: string; bio?: string; expertise?: string[]; languages?: string[]; yearsTeaching?: number; socials?: { label: string; href: string }[] },
) {
  if (find("tutorProfiles", user.id)) return;
  const taken = new Set(getLiveDb().tutorProfiles.map((t) => t.slug));
  const base = slugify(user.name) || "tutor";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const headline = from.headline ?? user.headline ?? "New tutor on Tamada";
  const tp: TutorProfile = {
    userId: user.id,
    slug,
    headline,
    bio: from.bio ?? `${user.name.split(" ")[0]} teaches on Tamada Media from ${user.city}. First course coming soon.`,
    expertise: from.expertise ?? (from.headline ? [from.headline] : []),
    languages: from.languages?.length ? from.languages : ["English"],
    rating: 0,
    reviewCount: 0,
    learners: 0,
    yearsTeaching: from.yearsTeaching ?? 1,
    socials: from.socials ?? [],
    revenueShare: 0.7,
  };
  upsert("tutorProfiles", tp);
}

/** Fields a person can edit about themselves (Settings pages). */
export type ProfileUpdate = Partial<Pick<Profile, "name" | "email" | "city" | "phone" | "headline" | "tone" | "avatar">>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Largest avatar we keep in the store (a ~256px JPEG data URL is ~25-40 KB). */
const MAX_AVATAR_CHARS = 400_000;

/** Public tutor-profile fields a tutor edits in Settings (shown on /tutors/[slug]). */
export interface TutorProfileUpdate {
  bio?: string;
  /** a list, or one comma-separated string ("React, CSS, Interviews") */
  expertise?: string[] | string;
  languages?: string[];
  /** links shown on the public profile; rows with an empty href are dropped */
  socials?: { label: string; href: string }[];
  headline?: string;
  yearsTeaching?: number;
}
const TUTOR_URL_RE = /^https?:\/\/[^\s/.]+\.[^\s]+$/i;
const MAX_TUTOR_BIO = 1500;

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const certCode = () =>
  `TM-${Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("")}-${Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("")}`;

/* ============================================================================= actions */
export const demo = {
  /**
   * Back to the seed. Also clears the per-browser demo extras listed in
   * DEMO_RESET_STORAGE_KEYS, then fires DEMO_RESET_EVENT on window (see onDemoReset)
   * so pages can drop any in-memory state of their own.
   */
  reset() {
    set(EMPTY);
    if (typeof window !== "undefined") {
      clearDemoExtras();
      try {
        window.dispatchEvent(new Event(DEMO_RESET_EVENT));
      } catch {}
    }
  },

  /* --------------------------------------------------------------------------- learning */
  /** Enrol a user (idempotent: returns the existing active enrollment). */
  enroll(userId: string, courseId: string, source: EnrollmentSource = "purchase", orderId?: string): Enrollment {
    const db = getLiveDb();
    const existing = db.enrollments.find((e) => e.userId === userId && e.courseId === courseId && !e.revokedAt);
    // owning a course takes it off the wishlist (checkout and grantCourse come through here too)
    const saved = db.wishlist.find((w) => w.userId === userId && w.courseId === courseId);
    if (saved) remove("wishlist", saved.id);
    if (existing) return existing;
    return upsert("enrollments", { id: nextId("enr"), userId, courseId, source, orderId, createdAt: demoNow() });
  },

  /** Mock checkout: creates a paid order (+ GST split) and the enrollment.
   *  The coupon is re-validated for this buyer (validateCoupon(code, courseId, { userId }, db)); if it no
   *  longer applies (first-purchase-only code for a returning buyer, switched off in another tab...) this
   *  throws Error(<the coupon message>) rather than silently charging a price the buyer never saw. */
  checkout(input: { userId: string; courseId: string; couponCode?: string; method?: Order["method"] }): { order: Order; enrollment: Enrollment } {
    const db = getLiveDb();
    const course = getCourseById(input.courseId, db);
    if (!course) throw new Error("Course not found");
    const cp = input.couponCode ? validateCoupon(input.couponCode, course.id, { userId: input.userId }, db) : null;
    if (cp && !cp.valid) throw new Error(cp.message);
    const discount = cp?.valid ? cp.discount : 0;
    const amount = course.price - discount;
    const method = input.method ?? "UPI";
    const provider = method === "UPI" ? "upi" : "razorpay";
    const maxNum = Math.max(...db.orders.map((o) => Number(o.number.replace(/\D/g, "")) || 0));
    const order: Order = {
      id: nextId("ord"),
      number: `TM-${maxNum + 7}`,
      userId: input.userId,
      courseId: course.id,
      subtotal: course.price,
      discount,
      amount,
      tax: Math.round(amount - amount / 1.18),
      currency: "INR",
      provider,
      providerRef: `${provider === "upi" ? "upi_" : "pay_"}demo${getSnapshot().seq + 1}${Math.floor(Math.random() * 1e6)}`,
      method,
      status: "paid",
      couponCode: cp?.valid ? cp.coupon!.code : undefined,
      createdAt: demoNow(),
    };
    upsert("orders", order);
    if (cp?.valid && cp.coupon) patch("coupons", cp.coupon.id, { redemptions: cp.coupon.redemptions + 1 });
    const enrollment = demo.enroll(input.userId, course.id, "purchase", order.id);
    // the tutor hears about the sale (same share maths as the Earnings page: amount - GST, times their cut)
    if (course.tutorId !== input.userId && amount > 0) {
      const share = getLiveDb().tutorProfiles.find((t) => t.userId === course.tutorId)?.revenueShare ?? 0.7;
      notify(
        course.tutorId,
        "order",
        `New sale: ${course.title}`,
        `${getUser(input.userId, db)?.name ?? "A learner"} just bought it. Your share is ${formatINR(Math.round((amount - order.tax) * share))}.`,
        "/tutor/earnings",
      );
    }
    return { order, enrollment };
  },

  /** Save the playhead. Marks the video complete at >= 90% watched. */
  saveProgress(userId: string, courseId: string, itemId: string, positionSec: number, durationSec: number): LessonProgress {
    const id = `lp_${itemId}_${userId}`;
    const prev = find("lessonProgress", id);
    const reached = durationSec > 0 && positionSec / durationSec >= 0.9;
    const completed = prev?.completed || reached;
    const now = demoNow();
    return upsert("lessonProgress", {
      id,
      userId,
      courseId,
      itemId,
      lastPositionSec: Math.max(0, Math.round(positionSec)),
      completed: !!completed,
      completedAt: prev?.completedAt ?? (reached ? now : undefined),
      updatedAt: now,
    });
  },

  /** Mark a video / resource done (or not done). */
  setItemComplete(userId: string, courseId: string, itemId: string, completed = true): LessonProgress {
    const id = `lp_${itemId}_${userId}`;
    const prev = find("lessonProgress", id);
    const now = demoNow();
    return upsert("lessonProgress", {
      id,
      userId,
      courseId,
      itemId,
      lastPositionSec: prev?.lastPositionSec ?? 0,
      completed,
      completedAt: completed ? (prev?.completedAt ?? now) : undefined,
      updatedAt: now,
    });
  },

  /** Grade + store a quiz attempt. Throws when out of attempts. */
  submitQuiz(userId: string, courseId: string, itemId: string, answers: QuizAnswers): QuizAttempt {
    const db = getLiveDb();
    const ctx = getItem(courseId, itemId, db);
    if (!ctx || ctx.item.type !== "quiz") throw new Error("Quiz not found");
    const quiz = ctx.item.quiz;
    const used = db.quizAttempts.filter((a) => a.userId === userId && a.itemId === itemId).length;
    if (quiz.maxAttempts > 0 && used >= quiz.maxAttempts) throw new Error("No attempts left");
    const g = gradeQuiz(quiz, answers);
    return upsert("quizAttempts", {
      id: nextId("qa"),
      userId,
      courseId,
      quizId: quiz.id,
      itemId,
      score: g.score,
      passed: g.passed,
      answers,
      results: g.results,
      createdAt: demoNow(),
    });
  },

  addNote(userId: string, courseId: string, itemId: string, atSec: number, text: string): Note {
    return upsert("notes", { id: nextId("note"), userId, courseId, itemId, atSec: Math.round(atSec), text: text.trim(), createdAt: demoNow() });
  },
  updateNote(id: string, text: string) {
    patch("notes", id, { text: text.trim() });
  },
  deleteNote(id: string) {
    remove("notes", id);
  },

  /**
   * Returns true when the course is now on the wishlist. When adding, pass `restore` ({id, createdAt} of a
   * row you removed earlier) to bring that exact row back, e.g. for an Undo toast; see also restoreWishlist.
   */
  toggleWishlist(userId: string, courseId: string, restore?: { id?: string; createdAt?: string }): boolean {
    const hit = getLiveDb().wishlist.find((w) => w.userId === userId && w.courseId === courseId);
    if (hit) {
      remove("wishlist", hit.id);
      return false;
    }
    const row: WishlistItem = { id: restore?.id || nextId("wl"), userId, courseId, createdAt: restore?.createdAt || demoNow() };
    upsert("wishlist", row);
    return true;
  },
  /**
   * Put a removed wishlist row back exactly as it was (same id and saved date). No-op returning the
   * existing row if the user already has that course saved again.
   */
  restoreWishlist(row: WishlistItem): WishlistItem {
    const existing = getLiveDb().wishlist.find((w) => w.userId === row.userId && w.courseId === row.courseId);
    if (existing) return existing;
    return upsert("wishlist", { id: row.id, userId: row.userId, courseId: row.courseId, createdAt: row.createdAt });
  },

  /** Q&A under a lesson. Pass parentId to reply (a reply by the course tutor marks the thread resolved). */
  addComment(userId: string, courseId: string, itemId: string, body: string, parentId?: string): LessonComment {
    const row = upsert("comments", { id: nextId("cmt"), courseId, itemId, userId, body: body.trim(), createdAt: demoNow(), parentId: parentId ?? null, likes: 0 });
    if (parentId && getCourseById(courseId, getLiveDb())?.tutorId === userId) patch("comments", parentId, { resolved: true });
    return row;
  },
  setCommentResolved(id: string, resolved: boolean) {
    patch("comments", id, { resolved });
  },
  /**
   * +1 like. Pass userId to record who liked it (comment.likedBy, see hasLikedComment); a repeat like by
   * the same user is ignored. Without userId it is an anonymous +1 (old behaviour).
   */
  likeComment(id: string, userId?: string): LessonComment | undefined {
    const c = find("comments", id);
    if (!c) return undefined;
    const by = c.likedBy ?? [];
    if (userId && by.includes(userId)) return c;
    patch("comments", id, { likes: c.likes + 1, ...(userId ? { likedBy: [...by, userId] } : {}) });
    return find("comments", id);
  },
  /**
   * Undo a like (never below 0). With userId it only acts if that user's like is recorded; without it,
   * an anonymous -1.
   */
  unlikeComment(id: string, userId?: string): LessonComment | undefined {
    const c = find("comments", id);
    if (!c) return undefined;
    const by = c.likedBy ?? [];
    if (userId && !by.includes(userId)) return c;
    if (c.likes <= 0 && !userId) return c;
    patch("comments", id, { likes: Math.max(0, c.likes - 1), ...(userId ? { likedBy: by.filter((u) => u !== userId) } : {}) });
    return find("comments", id);
  },
  deleteComment(id: string) {
    remove("comments", id);
  },

  /**
   * File a moderation report (lands as an OPEN row in /admin/reports). One open report per reporter
   * per target: a repeat returns the existing open row unchanged (reason not overwritten).
   * For kind 'comment' / 'review' pass the comment/review id as targetId; for 'course' the course id.
   */
  addReport(input: Pick<Report, "kind" | "targetId" | "courseId" | "reporterId" | "reason">): Report {
    const existing = getLiveDb().reports.find(
      (r) => r.status === "open" && r.reporterId === input.reporterId && r.kind === input.kind && r.targetId === input.targetId,
    );
    if (existing) return existing;
    return upsert("reports", {
      id: nextId("rpt"),
      kind: input.kind,
      targetId: input.targetId,
      courseId: input.courseId,
      reporterId: input.reporterId,
      reason: input.reason.trim() || "Reported by a learner",
      status: "open",
      createdAt: demoNow(),
    });
  },
  /** Undo a report the viewer just filed (removes the row). Returns false if it was not found. */
  withdrawReport(id: string): boolean {
    if (!find("reports", id)) return false;
    remove("reports", id);
    return true;
  },

  /** Issues (or returns) the certificate when every item is complete. Returns null if not complete. */
  issueCertificate(userId: string, courseId: string): Certificate | null {
    const db = getLiveDb();
    const existing = db.certificates.find((c) => c.userId === userId && c.courseId === courseId);
    if (existing) return existing;
    if (getCourseProgress(userId, courseId, db).percent < 100) return null;
    const enr = db.enrollments.find((e) => e.userId === userId && e.courseId === courseId && !e.revokedAt);
    const now = demoNow();
    if (enr && !enr.completedAt) patch("enrollments", enr.id, { completedAt: now });
    return upsert("certificates", {
      id: nextId("cert"),
      code: certCode(),
      userId,
      courseId,
      issuedAt: now,
      hours: Math.max(1, Math.round(getCourseStats(courseId, db).totalSec / 3600)),
    });
  },

  /**
   * One review per user per course (re-submitting edits it). An edit only changes rating, title and
   * comment: everything else on the row (createdAt, helpful, the tutor reply and, importantly, the
   * moderators' `hidden` flag) survives, so an author can't undo moderation by editing. When a hidden
   * review's text changes, its resolved report is reopened so moderators see the new wording.
   */
  addReview(userId: string, courseId: string, rating: number, comment: string, title?: string): Review {
    const db = getLiveDb();
    const prev = db.reviews.find((r) => r.userId === userId && r.courseId === courseId);
    const fields = {
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      title: title?.trim() || undefined,
      comment: comment.trim(),
    };
    if (prev) {
      const changed = prev.rating !== fields.rating || (prev.title ?? undefined) !== fields.title || prev.comment !== fields.comment;
      patch("reviews", prev.id, fields);
      if (prev.hidden && changed) {
        const reports = db.reports
          .filter((r) => r.kind === "review" && r.targetId === prev.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const resolved = reports.find((r) => r.status === "resolved");
        if (resolved && !reports.some((r) => r.status === "open")) patch("reports", resolved.id, { status: "open" });
        const course = getCourseById(courseId, db);
        notifyAdmins(
          "review",
          "A hidden review was edited",
          `${getUser(userId, db)?.name ?? "A learner"} changed their hidden review${course ? ` on ${course.title}` : ""}. It stays hidden until you check it.`,
          "/admin/reports",
        );
      }
      return find("reviews", prev.id) ?? { ...prev, ...fields };
    }
    return upsert("reviews", {
      id: nextId("rev"),
      userId,
      courseId,
      ...fields,
      createdAt: demoNow(),
      helpful: 0,
    });
  },
  replyToReview(reviewId: string, body: string) {
    patch("reviews", reviewId, { reply: { body: body.trim(), createdAt: demoNow() } });
  },
  setReviewHidden(reviewId: string, hidden: boolean) {
    patch("reviews", reviewId, { hidden });
  },

  /**
   * Edit your own profile (student / tutor / admin Settings). Only the keys you pass change.
   * Strings are trimmed; "" clears an optional field (phone, headline, avatar). `avatar` may be an
   * Unsplash URL or a small image data URL. The shell avatar, account menu, header, Q&A, reviews,
   * tutor pages and certificates all read the profile from useDb(), so the change shows everywhere.
   * Throws a readable Error for an empty name, an invalid or taken email, or an oversized photo.
   */
  updateProfile(userId: string, fields: ProfileUpdate): Profile {
    const user = find("users", userId);
    if (!user) throw new Error("We couldn't find that account.");
    const next: Partial<Profile> = {};
    const has = (k: keyof ProfileUpdate) => Object.prototype.hasOwnProperty.call(fields, k);
    if (has("name")) {
      const name = (fields.name ?? "").replace(/\s+/g, " ").trim();
      if (name.length < 2) throw new Error("Your name needs at least 2 characters.");
      if (name.length > 60) throw new Error("Keep your name under 60 characters.");
      next.name = name;
    }
    if (has("email")) {
      const email = (fields.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new Error("That email doesn't look right. Check for typos?");
      if (getLiveDb().users.some((u) => u.id !== userId && u.email.toLowerCase() === email)) throw new Error("Another account already uses that email.");
      next.email = email;
    }
    if (has("city")) next.city = (fields.city ?? "").trim();
    if (has("phone")) next.phone = (fields.phone ?? "").replace(/[^\d+ -]/g, "").replace(/\s+/g, " ").trim() || undefined;
    if (has("headline")) next.headline = (fields.headline ?? "").trim().slice(0, 120) || undefined;
    if (has("tone") && fields.tone) next.tone = fields.tone;
    if (has("avatar")) {
      const avatar = (fields.avatar ?? "").trim();
      if (avatar.length > MAX_AVATAR_CHARS) throw new Error("That photo is too large. Try a smaller image.");
      next.avatar = avatar || undefined;
    }
    if (Object.keys(next).length) {
      patch("users", userId, next);
      // a tutor's public headline lives on the tutor profile (getTutor() prefers it)
      if (next.headline && find("tutorProfiles", userId)) patch("tutorProfiles", userId, { headline: next.headline });
    }
    return getUser(userId, getLiveDb())!;
  },

  /**
   * Edit your public tutor profile (Tutor Settings): bio, expertise, languages, links and optionally
   * headline / years teaching. Only the keys you pass change. Expertise and languages are trimmed and
   * de-duplicated (case-insensitive); links need a full http(s) URL. Anything reading getTutor(id, db)
   * from useDb() (tutor shell, course pages, the public tutor page's client islands) updates at once.
   * Throws a readable Error when the account has no tutor profile or a field doesn't validate.
   */
  updateTutorProfile(userId: string, fields: TutorProfileUpdate): TutorProfile {
    if (!find("tutorProfiles", userId)) throw new Error("This account doesn't have a tutor profile yet.");
    const has = (k: keyof TutorProfileUpdate) => Object.prototype.hasOwnProperty.call(fields, k);
    const list = (v: string[] | string | undefined, max: number, maxLen: number) => {
      const raw = Array.isArray(v) ? v : (v ?? "").split(",");
      const seen = new Set<string>();
      const out: string[] = [];
      for (const x of raw) {
        const t = String(x ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          out.push(t);
        }
      }
      return out.slice(0, max);
    };
    const next: Partial<TutorProfile> = {};
    if (has("bio")) {
      const bio = (fields.bio ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (bio.length > MAX_TUTOR_BIO) throw new Error(`Keep your bio under ${MAX_TUTOR_BIO} characters.`);
      next.bio = bio;
    }
    if (has("expertise")) next.expertise = list(fields.expertise, 12, 40);
    if (has("languages")) {
      const langs = list(fields.languages, 8, 30);
      if (!langs.length) throw new Error("Pick at least one language you teach in.");
      next.languages = langs;
    }
    if (has("socials")) {
      const socials: { label: string; href: string }[] = [];
      for (const s of fields.socials ?? []) {
        const href = (s?.href ?? "").trim();
        if (!href) continue;
        const label = (s.label ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || "Link";
        if (!TUTOR_URL_RE.test(href)) throw new Error(`Your ${label} link should be a full web address starting with https://`);
        if (!socials.some((x) => x.href === href)) socials.push({ label, href });
      }
      next.socials = socials.slice(0, 8);
    }
    if (has("headline")) {
      const headline = (fields.headline ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
      if (headline.length < 3) throw new Error("Your headline needs a few words.");
      next.headline = headline;
    }
    if (has("yearsTeaching")) {
      const y = Math.round(Number(fields.yearsTeaching));
      if (!Number.isFinite(y) || y < 0 || y > 60) throw new Error("Years teaching should be between 0 and 60.");
      next.yearsTeaching = y;
    }
    if (Object.keys(next).length) {
      patch("tutorProfiles", userId, next);
      if (next.headline) patch("users", userId, { headline: next.headline });
    }
    return find("tutorProfiles", userId)!;
  },

  markNotificationsRead(userId: string, ids?: string[]) {
    for (const n of getLiveDb().notifications) if (n.userId === userId && !n.read && (!ids || ids.includes(n.id))) patch("notifications", n.id, { read: true });
  },

  /**
   * Learner asks for a refund: sets order.refundRequest, which feeds the admin "Refunds to check" queue
   * (and the admin's bell). Requests outside the policy (see getRefundEligibility) are still sent but
   * carry refundRequest.outsidePolicy so the admin sees why. Throws a readable Error for unpaid /
   * granted / already refunded / already requested orders, or a reason under 5 characters.
   */
  requestRefund(orderId: string, reason: string): Order {
    const db = getLiveDb();
    const order = db.orders.find((o) => o.id === orderId || o.number === orderId);
    if (!order) throw new Error("We couldn't find that order.");
    const check = getRefundEligibility(order, db);
    if (!check.canRequest) throw new Error(check.message);
    const text = reason.replace(/\s+/g, " ").trim();
    if (text.length < 5) throw new Error("Tell us a little about why (a few words is fine).");
    const refundRequest: NonNullable<Order["refundRequest"]> = { reason: text.slice(0, 500), requestedAt: demoNow() };
    if (!check.eligible) refundRequest.outsidePolicy = check.message;
    patch("orders", order.id, { refundRequest, refundDeclinedAt: undefined, refundDeclineNote: undefined });
    const course = getCourseById(order.courseId, db);
    const who = getUser(order.userId, db)?.name ?? "A learner";
    notify(DEMO_ADMIN_ID, "order", "Refund requested", `${who} asked for a refund on ${order.number}${course ? ` (${course.title})` : ""}.`, "/admin/orders");
    return find("orders", order.id)!;
  },
  /** Learner takes their refund request back. */
  withdrawRefundRequest(orderId: string) {
    patch("orders", orderId, { refundRequest: undefined });
  },

  /* --------------------------------------------------------------------------- tutor */
  /** New draft course with one empty module. Returns the course (use course.id for the builder URL). */
  createCourse(tutorId: string, input: Partial<Omit<Course, "id" | "tutorId">> & { title: string }): Course {
    const db = getLiveDb();
    let slug = slugify(input.title) || "untitled-course";
    if (db.courses.some((c) => c.slug === slug)) slug = `${slug}-${getSnapshot().seq + 1}`;
    const now = demoNow();
    const course: Course = {
      id: nextId("crs"),
      slug,
      tutorId,
      categoryId: input.categoryId ?? db.categories[0].id,
      title: input.title.trim(),
      promise: input.promise ?? "",
      description: input.description ?? "",
      thumbnail: input.thumbnail ?? "https://images.unsplash.com/photo-1517842645767-c639042777db",
      tone: input.tone ?? "sun",
      level: input.level ?? "Beginner",
      language: input.language ?? "English",
      price: input.price ?? 999,
      currency: "INR",
      status: "draft",
      tags: input.tags ?? [],
      outcomes: input.outcomes ?? [],
      requirements: input.requirements ?? [],
      rating: 0,
      reviewCount: 0,
      learners: 0,
      createdAt: now,
      updatedAt: now,
      hasCertificate: true,
    };
    upsert("courses", course);
    demo.saveCurriculum(course.id, [{ id: `mod_${course.id}_1`, courseId: course.id, title: "Module 1", position: 1, items: [] }]);
    return course;
  },
  updateCourse(courseId: string, fields: Partial<Course>) {
    patch("courses", courseId, { ...fields, updatedAt: demoNow() });
  },
  /** Replace the whole module list (positions are re-numbered; first video becomes the free preview if none is set).
   *  Any nested "__tm_undef__" placeholder a writer copied from older stored data is dropped, so it can never reach learners. */
  saveCurriculum(courseId: string, modules: Module[]) {
    modules = scrub(modules, { n: 0 });
    let sawFree = modules.some((m) => m.items.some((i) => i.type === "video" && i.lesson.isFreePreview));
    const clean = modules.map((m, mi) => ({
      ...m,
      courseId,
      position: mi + 1,
      items: m.items.map((it, ii) => {
        const base = { ...it, moduleId: m.id, position: ii + 1 };
        if (!sawFree && base.type === "video") {
          sawFree = true;
          return { ...base, lesson: { ...base.lesson, isFreePreview: true } };
        }
        return base;
      }),
    })) as Module[];
    const s = getSnapshot();
    set({ ...s, seq: s.seq + 1, curricula: { ...s.curricula, [courseId]: clean } });
    if (find("courses", courseId)) patch("courses", courseId, { updatedAt: demoNow() });
  },
  submitForReview(courseId: string) {
    patch("courses", courseId, { status: "in_review", submittedAt: demoNow(), reviewNote: undefined, updatedAt: demoNow() });
  },
  duplicateCourse(courseId: string): Course | null {
    const db = getLiveDb();
    const c = getCourseById(courseId, db);
    if (!c) return null;
    const copy = demo.createCourse(c.tutorId, { ...c, title: `${c.title} (copy)` });
    const mods = db.curricula[courseId] ?? [];
    demo.saveCurriculum(
      copy.id,
      mods.map((m, mi) => ({ ...m, id: `mod_${copy.id}_${mi + 1}`, courseId: copy.id, items: m.items.map((it) => ({ ...it, id: `${it.id}-c${getSnapshot().seq}` })) })),
    );
    return copy;
  },

  /** New pending application. plannedCourse is the working title; courseOutline takes the steps as
   *  an array or as free text (one step per line or "1. … 2. …"); numbering is stripped.
   *  Optional wizard answers: website, languages, years ("lt1" | "1-3" | "3-7" | "7+"), payout
   *  {country, method, gst?, gstin?}. Admins get a bell notification.
   *  If the user already has an OPEN application (pending or changes_requested) this updates and
   *  resubmits that row instead of adding a duplicate (same as resubmitTutorApplication). */
  submitTutorApplication(input: TutorApplicationInput & Pick<TutorApplication, "userId">): TutorApplication {
    const open = getLiveDb()
      .tutorApplications.filter((a) => a.userId === input.userId && (a.status === "pending" || a.status === "changes_requested"))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    if (open) {
      const { userId: _userId, ...fields } = input;
      void _userId;
      return demo.resubmitTutorApplication(open.id, fields) ?? open;
    }
    const { courseOutline: rawOutline, ...rest } = splitLegacyPlan(input);
    const courseOutline = normalizeOutline(rawOutline);
    const row = upsert("tutorApplications", {
      ...cleanApplicationFields(rest),
      ...(courseOutline.length ? { courseOutline } : {}),
      id: nextId("app"),
      status: "pending",
      submittedAt: demoNow(),
    } as TutorApplication);
    if (find("users", input.userId)) patch("users", input.userId, { tutorStatus: "pending" });
    notifyAdmins("application", "New tutor application", `${row.name} wants to teach ${row.subject}.`, "/admin/tutors");
    return row;
  },
  /** The applicant answers "changes requested" (or edits a pending / rejected application): patches
   *  the same row with the new answers, sets status 'pending' and a fresh submittedAt, and moves the
   *  previous decision (note, by, at) into app.history so the admin queue shows one clean pending row.
   *  Sets the user's tutorStatus to 'pending' and notifies admins. Returns null for unknown ids and
   *  approved applications. */
  resubmitTutorApplication(id: string, fields: Partial<TutorApplicationInput> = {}): TutorApplication | null {
    const app = find("tutorApplications", id);
    if (!app || app.status === "approved") return null;
    const { courseOutline: rawOutline, ...rest } = splitLegacyPlan(fields);
    const outline = rawOutline === undefined ? undefined : normalizeOutline(rawOutline);
    const history = [...(app.history ?? [])];
    if (app.status !== "pending")
      history.push({
        submittedAt: app.submittedAt,
        status: app.status,
        ...(app.decisionNote ? { decisionNote: app.decisionNote } : {}),
        ...(app.decidedAt ? { decidedAt: app.decidedAt } : {}),
        ...(app.decidedBy ? { decidedBy: app.decidedBy } : {}),
      });
    const wasDecided = app.status !== "pending";
    patch("tutorApplications", id, {
      ...cleanApplicationFields(rest),
      ...(outline === undefined ? {} : { courseOutline: outline.length ? outline : undefined }),
      status: "pending",
      submittedAt: demoNow(),
      decisionNote: undefined,
      decidedAt: undefined,
      decidedBy: undefined,
      ...(history.length ? { history } : {}),
    });
    const row = find("tutorApplications", id)!;
    if (find("users", row.userId)) patch("users", row.userId, { tutorStatus: "pending" });
    notifyAdmins(
      "application",
      wasDecided ? "Tutor application resubmitted" : "Tutor application updated",
      wasDecided
        ? `${row.name} sent their ${row.subject} application back${app.status === "changes_requested" ? " with your changes" : ""}.`
        : `${row.name} edited their ${row.subject} application.`,
      "/admin/tutors",
    );
    return row;
  },

  /* --------------------------------------------------------------------------- admin */
  /** Approve / reject / request changes. Approving makes the applicant a tutor with a public profile.
   *  The applicant gets a notification either way. */
  decideTutorApplication(id: string, status: Exclude<ApplicationStatus, "pending">, note: string, adminId: string) {
    const app = find("tutorApplications", id);
    if (!app) return;
    patch("tutorApplications", id, { status, decisionNote: note.trim() || undefined, decidedAt: demoNow(), decidedBy: adminId });
    const user = find("users", app.userId);
    if (!user) return;
    if (status === "approved") {
      patch("users", user.id, { role: "tutor", tutorStatus: "approved" });
      ensureTutorProfile(user, {
        headline: app.subject,
        bio: app.experience,
        expertise: [app.subject],
        languages: app.languages,
        yearsTeaching: yearsFromBand(app.years),
        socials: socialFromUrl(app.website),
      });
      notify(user.id, "application", "You're a Tamada tutor now", note.trim() || `Your application to teach ${app.subject} was approved. Your studio is ready when you are.`, "/tutor");
    } else {
      patch("users", user.id, { tutorStatus: status === "rejected" ? "rejected" : "pending" });
      notify(
        user.id,
        "application",
        status === "rejected" ? "About your tutor application" : "Your tutor application needs a tweak",
        note.trim() || (status === "rejected" ? `We can't take ${app.subject} on right now. Thanks for applying.` : `Have a look at our note on ${app.subject} and send it back.`),
        "/become-tutor",
      );
    }
  },
  /** Moderation decision on a course. Publishing, sending back and archiving notify the tutor. */
  setCourseStatus(courseId: string, status: CourseStatus, note?: string) {
    const now = demoNow();
    const before = find("courses", courseId);
    patch("courses", courseId, {
      status,
      reviewNote: note?.trim() || undefined,
      updatedAt: now,
      ...(status === "published" ? { publishedAt: before?.publishedAt ?? now } : {}),
    });
    if (!before || before.status === status) return;
    const t = before.title;
    if (status === "published")
      notify(before.tutorId, "course", `${t} is live`, before.status === "archived" ? "It's back in the catalogue." : "It's in the catalogue now. Learners can preview the first video and buy it.", "/tutor/courses");
    else if (status === "rejected")
      notify(before.tutorId, "course", `${t} came back with a note`, note?.trim() || "Have a look at the review note, fix it up and send it back.", "/tutor/courses");
    else if (status === "archived")
      notify(before.tutorId, "course", `${t} was archived`, note?.trim() || "It's out of the catalogue. Learners who bought it keep their access.", "/tutor/courses");
  },
  setCourseFeatured(courseId: string, featured: boolean) {
    patch("courses", courseId, { featured });
  },
  /** Change someone's role. Promoting to tutor also creates their public tutor profile (if missing);
   *  demoting a tutor resets tutorStatus (the profile row stays so their courses keep an author). */
  setUserRole(userId: string, role: Role) {
    const user = find("users", userId);
    if (!user) return;
    if (role === "tutor") {
      patch("users", userId, { role, tutorStatus: "approved" });
      // if they applied at some point, their answers still describe them best
      const app = getLiveDb()
        .tutorApplications.filter((a) => a.userId === userId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
      ensureTutorProfile(
        user,
        app
          ? { headline: app.subject, bio: app.experience, expertise: [app.subject], languages: app.languages, yearsTeaching: yearsFromBand(app.years), socials: socialFromUrl(app.website) }
          : {},
      );
    } else {
      patch("users", userId, { role, ...(user.role === "tutor" ? { tutorStatus: "none" as const } : {}) });
    }
  },
  /** Suspend or reactivate an account. Suspending stores Profile.suspension {note, at, by}
   *  (note may be empty; adminId defaults to the demo admin); reactivating clears it.
   *  Re-suspending an already suspended account updates the note. */
  setUserStatus(userId: string, status: "active" | "suspended", note?: string, adminId?: string): Profile | null {
    if (!find("users", userId)) return null;
    if (status === "suspended") {
      const text = (note ?? "").replace(/[ \t]+/g, " ").trim().slice(0, 1000);
      patch("users", userId, { status, suspension: { note: text, at: demoNow(), by: adminId ?? DEMO_ADMIN_ID } });
    } else {
      patch("users", userId, { status, suspension: undefined });
    }
    return find("users", userId) ?? null;
  },
  /** Admin grant: a ₹0 "Grant" order + an admin_grant enrollment. */
  grantCourse(userId: string, courseId: string, adminId: string): Enrollment {
    void adminId;
    const db = getLiveDb();
    const maxNum = Math.max(...db.orders.map((o) => Number(o.number.replace(/\D/g, "")) || 0));
    const order: Order = {
      id: nextId("ord"),
      number: `TM-${maxNum + 7}`,
      userId,
      courseId,
      subtotal: 0,
      discount: 0,
      amount: 0,
      tax: 0,
      currency: "INR",
      provider: "admin",
      providerRef: `GRANT-${getSnapshot().seq + 1000}`,
      method: "Grant",
      status: "paid",
      createdAt: demoNow(),
    };
    upsert("orders", order);
    return demo.enroll(userId, courseId, "admin_grant", order.id);
  },
  /** Refund: order -> refunded, its enrollment is revoked, the learner is notified. */
  refundOrder(orderId: string, reason: string) {
    const order = find("orders", orderId);
    const now = demoNow();
    patch("orders", orderId, { status: "refunded", refundedAt: now, refundReason: reason.trim() || "Refunded by admin", refundRequest: undefined });
    const enr = getLiveDb().enrollments.find((e) => e.orderId === orderId);
    if (enr) patch("enrollments", enr.id, { revokedAt: now });
    if (order && order.amount > 0) {
      const course = getCourseById(order.courseId, getLiveDb());
      notify(
        order.userId,
        "order",
        "Refund on its way",
        `${order.number}${course ? ` for ${course.title}` : ""}: the money is headed back to your ${order.method}, usually within 5 to 7 working days.`,
        "/dashboard/orders",
      );
    }
  },
  /** Admin says no to a refund request (the order stays paid). The optional note is shown to the learner. */
  declineRefund(orderId: string, note?: string) {
    const order = find("orders", orderId);
    patch("orders", orderId, { refundRequest: undefined, refundDeclinedAt: demoNow(), refundDeclineNote: note?.trim() || undefined });
    if (order?.refundRequest)
      notify(
        order.userId,
        "order",
        "About your refund request",
        note?.trim() || `We couldn't approve the refund for ${order.number}. Reply from the contact page if you'd like us to take another look.`,
        "/dashboard/orders",
      );
  },
  upsertCategory(cat: Omit<Category, "id"> & { id?: string }): Category {
    const row: Category = { ...cat, id: cat.id ?? nextId("cat") } as Category;
    return upsert("categories", row);
  },
  deleteCategory(id: string) {
    remove("categories", id);
  },
  /** Set display order from an ordered list of ids. */
  reorderCategories(ids: string[]) {
    ids.forEach((id, i) => patch("categories", id, { position: i + 1 }));
  },
  upsertCoupon(c: Omit<Coupon, "id"> & { id?: string }): Coupon {
    // editing keeps fields the form doesn't know about (e.g. firstPurchaseOnly, minAmount) unless it sets them
    const prev = c.id ? getLiveDb().coupons.find((x) => x.id === c.id) : undefined;
    return upsert("coupons", { ...prev, ...c, id: c.id ?? nextId("cpn"), code: c.code.trim().toUpperCase() } as Coupon);
  },
  setCouponActive(id: string, active: boolean) {
    patch("coupons", id, { active });
  },
  deleteCoupon(id: string) {
    remove("coupons", id);
  },
  setReportStatus(id: string, status: Report["status"]) {
    patch("reports", id, { status });
  },
  setPayoutStatus(id: string, status: Payout["status"]) {
    patch("payouts", id, { status, ...(status === "paid" ? { paidAt: demoNow(), reference: `UTR${Math.floor(1e8 + Math.random() * 9e8)}` } : {}) });
  },
};

export type DemoActions = typeof demo;
/** Same object as `demo`, for components that prefer a hook. */
export const useDemoActions = (): DemoActions => demo;
/** Mock "now" used for every timestamp (ISO, IST). */
export { MOCK_NOW_ISO };
