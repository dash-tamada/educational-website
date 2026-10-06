/* Deterministic helpers for the seed (no Math.random, no Date.now). */

/** The mock "today". Every relative date in the seed is computed from it, so
 *  server and client render identical strings (no hydration drift). */
export const MOCK_NOW_ISO = "2026-10-05T10:30:00+05:30";
export const MOCK_NOW = new Date(MOCK_NOW_ISO);

const DAY = 86_400_000;

/** mulberry32: tiny seeded PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    /** weighted pick: weights aligned with items */
    weighted: <T>(items: readonly T[], weights: readonly number[]): T => {
      const total = weights.reduce((s, w) => s + w, 0);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle: <T>(arr: readonly T[]): T[] => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** Format a Date as an ISO string in IST (+05:30), e.g. 2026-09-28T19:05:00+05:30 */
export function toIST(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${ist.getUTCFullYear()}-${p(ist.getUTCMonth() + 1)}-${p(ist.getUTCDate())}` +
    `T${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())}+05:30`
  );
}

/** ISO (IST) for `days` days (and optional hours/minutes) before MOCK_NOW. */
export function daysAgo(days: number, hour?: number, minute = 0): string {
  const d = new Date(MOCK_NOW.getTime() - days * DAY);
  if (hour !== undefined) {
    // set the IST wall-clock hour
    const ist = new Date(d.getTime() + 330 * 60_000);
    ist.setUTCHours(hour, minute, 0, 0);
    let t = ist.getTime() - 330 * 60_000;
    // never in the future: clamp to a deterministic moment earlier today
    if (t > MOCK_NOW.getTime()) t = MOCK_NOW.getTime() - (((hour * 37 + minute) % 540) + 7) * 60_000;
    return toIST(new Date(t));
  }
  return toIST(d);
}

/** "YYYY-MM" for `n` months before the mock month (0 = Oct 2026). */
export function monthKey(n: number): string {
  const y = 2026;
  const m = 10 - n; // 1-based month
  const date = new Date(Date.UTC(y, m - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthLabel(key: string): string {
  const m = Number(key.slice(5, 7));
  return MONTHS[m - 1] ?? key;
}

/** mm:ss -> seconds */
export function mmss(s: string): number {
  const [m, sec] = s.split(":").map(Number);
  return m * 60 + (sec || 0);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const u = (id: string) => `https://images.unsplash.com/${id}`;
