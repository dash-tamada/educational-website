import type { SeriesPoint } from "../types";
import { COURSES_BASE } from "./catalog";
import { rng } from "./util";

/* =============================================================================
   SALES LEDGER: the single source of truth for every money and enrollment number.

   Each course's lifetime enrollments (course.learners) are spread over the months
   it has been on sale (launch bump, gentle growth, seasonality), and the two most
   recent months are spread over days. Everything else is derived from it:
     - payouts (activity.ts): a tutor's month = sum of their courses' sales
     - tutor analytics (getTutorAnalytics) and per-course revenue (getCourseSales)
     - platform revenue / enrollment series (analytics.ts, admin)
     - the demo tutor's order rows since LEDGER_FROM (activity.ts)
   so a learner count, a payout, a chart and a sales list always agree.

   Money: prices include 18% GST and the average sale carries an ~8% coupon.
     platform revenue (what buyers paid)  = units x price x COUPON_FACTOR
     tutor gross (payout basis, ex-GST)   = platform revenue / (1 + GST)
   The current month (October) is month-to-date: 1 Oct to MOCK_NOW (5 Oct, 10:30).
   ============================================================================= */

export const GST_RATE = 0.18;
export const COUPON_FACTOR = 0.92;
/** The open month and how far into it MOCK_NOW is. */
export const CURRENT_MONTH = "2026-10";
export const MONTH_DAYS_SO_FAR = 5;
/** Order rows for the demo tutor's courses are complete from this IST date on. */
export const LEDGER_FROM = "2026-09-26";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Mon, or Mon 'YY when the year matters. */
export const monthLabelOf = (key: string, withYear = false) => {
  const m = MONTHS[Number(key.slice(5, 7)) - 1] ?? key;
  return withYear ? `${m} ’${key.slice(2, 4)}` : m;
};
export const dayLabelOf = (key: string) => `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;

const daysIn = (key: string) => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).getUTCDate();
const nextMonth = (key: string) => {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
/** Month keys from `from` to `to`, inclusive. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = nextMonth(k)) out.push(k);
  return out;
}
const hash = (s: string) => s.split("").reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

/** Largest-remainder rounding: integers that sum exactly to round(total). */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!sum || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = Math.round(total) - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let j = 0; left > 0 && j < order.length; j++, left--) out[order[j][1]]++;
  return out;
}

/* Seasonality: New-Year resolutions, exam crunch in Feb-Mar, a quiet monsoon, festive Oct-Nov. */
const SEASON = [1.12, 1.06, 1.04, 0.98, 0.94, 0.92, 0.95, 0.98, 1.0, 1.06, 1.08, 1.02];

export interface CourseSalesRow {
  courseId: string;
  tutorId: string;
  price: number;
  /** first IST date on sale / last IST date on sale */
  from: string;
  to: string;
  /** month key -> enrollments that month (current month = month to date) */
  months: Record<string, number>;
  /** IST date key -> enrollments that day (previous + current month only) */
  days: Record<string, number>;
}

const NOW_DATE = "2026-10-05";
const DAILY_MONTHS = ["2026-09", CURRENT_MONTH];

function buildCourse(c: (typeof COURSES_BASE)[number]): CourseSalesRow | null {
  if (!c.publishedAt || c.learners <= 0 || (c.status !== "published" && c.status !== "archived")) return null;
  const from = c.publishedAt.slice(0, 10);
  const to = c.status === "archived" ? c.updatedAt.slice(0, 10) : NOW_DATE;
  const r = rng(hash(c.id) ^ 0x5a1e7);
  const keys = monthRange(from.slice(0, 7), to.slice(0, 7));
  // share of each month the course was actually on sale
  const frac = keys.map((k) => {
    const dim = daysIn(k);
    const start = k === from.slice(0, 7) ? Number(from.slice(8, 10)) : 1;
    let end = k === to.slice(0, 7) ? Number(to.slice(8, 10)) : dim;
    let partial = 1;
    if (k === CURRENT_MONTH && to === NOW_DATE) partial = 10.5 / 24; // MOCK_NOW is 10:30 on the 5th
    if (end < start) end = start;
    return (end - start + partial) / dim;
  });
  const weights = keys.map((k, a) => {
    const launch = a === 0 ? 1.9 : a === 1 ? 1.4 : a === 2 ? 1.15 : 1;
    const growth = Math.pow(1.025, a);
    return launch * growth * SEASON[Number(k.slice(5, 7)) - 1] * (0.9 + r.next() * 0.2) * frac[a];
  });
  const units = apportion(c.learners, weights);
  const months: Record<string, number> = {};
  keys.forEach((k, i) => (months[k] = units[i]));

  // days for the last two months: weekend lift, a launch-week spike, noise
  const days: Record<string, number> = {};
  for (const k of DAILY_MONTHS) {
    if (!months[k]) continue;
    const dim = daysIn(k);
    const dayKeys: string[] = [];
    const w: number[] = [];
    for (let d = 1; d <= dim; d++) {
      const key = `${k}-${String(d).padStart(2, "0")}`;
      if (key < from || key > to) continue;
      const dow = new Date(`${key}T12:00:00Z`).getUTCDay();
      const sinceLaunch = (new Date(`${key}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000;
      const spike = 1 + 1.6 * Math.exp(-sinceLaunch / 4);
      const partial = key === NOW_DATE ? 10.5 / 24 : 1;
      dayKeys.push(key);
      w.push((dow === 0 || dow === 6 ? 1.18 : 1) * spike * (0.75 + r.next() * 0.5) * partial);
    }
    apportion(months[k], w).forEach((v, i) => (days[dayKeys[i]] = v));
  }
  return { courseId: c.id, tutorId: c.tutorId, price: c.price, from, to, months, days };
}

export const COURSE_SALES: Record<string, CourseSalesRow> = Object.fromEntries(
  COURSES_BASE.map(buildCourse)
    .filter((x): x is CourseSalesRow => !!x)
    .map((x) => [x.courseId, x]),
);

/* Realism pass: apportioned units can land on the exact same total for one tutor in
   two different months (e.g. 338 sales in March and September), which then shows up
   as two identical payout rows that look like a copy-paste bug. Nudge a few units
   between adjacent CLOSED, non-daily months of the same course until every month of
   a tutor is distinct. Each course's lifetime total (course.learners) is unchanged,
   and the daily months (Sep, Oct) are never touched, so day series still sum up. */
{
  const byTutor = new Map<string, CourseSalesRow[]>();
  for (const row of Object.values(COURSE_SALES)) byTutor.set(row.tutorId, [...(byTutor.get(row.tutorId) ?? []), row]);
  const adjustable = (k: string) => !DAILY_MONTHS.includes(k);
  for (const [tutorId, mine] of byTutor) {
    for (let iter = 0; iter < 400; iter++) {
      const totals = new Map<string, number>();
      for (const row of mine) for (const [k, v] of Object.entries(row.months)) if (k !== CURRENT_MONTH) totals.set(k, (totals.get(k) ?? 0) + v);
      const keys = [...totals.keys()].sort();
      const firstSeen = new Map<number, string>();
      let clash: [string, string] | null = null;
      for (const k of keys) {
        const v = totals.get(k)!;
        if (!v) continue;
        const prev = firstSeen.get(v);
        if (prev) { clash = [prev, k]; break; }
        firstSeen.set(v, k);
      }
      if (!clash) break;
      const target = adjustable(clash[1]) ? clash[1] : adjustable(clash[0]) ? clash[0] : null;
      if (!target) break;
      const shift = 1 + ((hash(tutorId + target) + iter) % 4);
      const all = monthRange(keys[0], CURRENT_MONTH);
      const at = all.indexOf(target);
      const neighbours = [all[at - 1], all[at + 1]].filter((k): k is string => !!k && adjustable(k) && k !== CURRENT_MONTH);
      // the course that sold most that month and has a neighbouring month on sale
      const pick = [...mine]
        .sort((a, b) => (b.months[target] ?? 0) - (a.months[target] ?? 0))
        .map((row) => ({ row, to: neighbours.find((k) => row.months[k] !== undefined) }))
        .find((x) => x.to && (x.row.months[target] ?? 0) > shift);
      if (!pick?.to) break;
      // alternate the direction so neither month drifts far from the curve
      const dir = iter % 2 === 0 ? -1 : 1;
      if (dir > 0 && (pick.row.months[pick.to] ?? 0) <= shift) continue;
      pick.row.months[target] += dir * shift;
      pick.row.months[pick.to] -= dir * shift;
    }
  }
}

/** Earliest month anything sold. */
export const FIRST_SALES_MONTH = Object.values(COURSE_SALES).reduce((m, x) => (x.from.slice(0, 7) < m ? x.from.slice(0, 7) : m), CURRENT_MONTH);

/** What buyers paid (incl. GST, after coupons) for `units` of a course. */
export const revenueOf = (price: number, units: number) => units * price * COUPON_FACTOR;
/** Tutor gross (the payout basis): buyer revenue minus GST. */
export const grossOf = (price: number, units: number) => revenueOf(price, units) / (1 + GST_RATE);

/** The last `n` IST date keys ending at MOCK_NOW's date. */
export function lastDays(n: number): string[] {
  const end = Date.UTC(2026, 9, 5);
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

/** Platform-wide monthly buyer revenue / enrollments for the given month keys. */
export function platformMonthly(keys: string[]): { revenue: SeriesPoint[]; enrollments: SeriesPoint[] } {
  const rows = Object.values(COURSE_SALES);
  return {
    revenue: keys.map((key) => ({ key, label: monthLabelOf(key), value: Math.round(rows.reduce((s, x) => s + revenueOf(x.price, x.months[key] ?? 0), 0)) })),
    enrollments: keys.map((key) => ({ key, label: monthLabelOf(key), value: rows.reduce((s, x) => s + (x.months[key] ?? 0), 0) })),
  };
}

/** Platform-wide daily buyer revenue / enrollments for the last `n` days (n <= ~35). */
export function platformDaily(n: number): { revenue: SeriesPoint[]; enrollments: SeriesPoint[] } {
  const rows = Object.values(COURSE_SALES);
  const keys = lastDays(n);
  return {
    revenue: keys.map((key) => ({ key, label: dayLabelOf(key), value: Math.round(rows.reduce((s, x) => s + revenueOf(x.price, x.days[key] ?? 0), 0)) })),
    enrollments: keys.map((key) => ({ key, label: dayLabelOf(key), value: rows.reduce((s, x) => s + (x.days[key] ?? 0), 0) })),
  };
}
