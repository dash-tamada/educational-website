import type { PlatformSeries, SeriesPoint } from "../types";
import { monthKey, monthLabel, rng } from "./util";
import { platformMonthly } from "./sales";

/* Platform-scale aggregate analytics (12 months, Nov 2025 -> Oct 2026, Oct is
   month-to-date). Revenue and enrollments are the sum of every course's sales in
   the sales ledger (sales.ts), so they match payouts and tutor analytics exactly.
   Signups / active learners are modelled here. The orders table is a browsable
   sample (complete only for the demo tutor's courses since LEDGER_FROM). */

const r = rng(1205);
const months = Array.from({ length: 12 }, (_, i) => monthKey(11 - i));

function series(base: number, growth: number, noise: number, partialLast = true): SeriesPoint[] {
  return months.map((key, i) => {
    const seasonal = 1 + 0.08 * Math.sin((i / 12) * Math.PI * 2 + 1.2);
    let value = base * Math.pow(1 + growth, i) * seasonal * (1 - noise / 2 + r.next() * noise);
    if (partialLast && i === months.length - 1) value *= 5 / 31; // 5 days into October
    return { key, label: monthLabel(key), value: Math.round(value) };
  });
}

// the modelled revenue/enrollment curves still draw from the rng so signups and
// active learners keep their exact values; the ledger replaces them below
const modelled = {
  revenue: series(318_000, 0.105, 0.12),
  signups: series(1_150, 0.09, 0.18),
  enrollments: series(410, 0.1, 0.14),
  activeLearners: series(5_200, 0.08, 0.08, false),
};
const ledger = platformMonthly(months);

export const PLATFORM_SERIES: PlatformSeries = {
  revenue: ledger.revenue,
  signups: modelled.signups,
  enrollments: ledger.enrollments,
  activeLearners: modelled.activeLearners,
};

/** Daily points for the last 30 days (admin "Last 30 days" range). */
export function dailySeries(seed: number, base: number, growth = 0.004): SeriesPoint[] {
  const rr = rng(seed);
  const out: SeriesPoint[] = [];
  const end = Date.UTC(2026, 9, 5);
  for (let d = 29; d >= 0; d--) {
    const date = new Date(end - d * 86_400_000);
    const dow = date.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 1.18 : 1;
    const value = Math.round(base * Math.pow(1 + growth, 29 - d) * weekend * (0.8 + rr.next() * 0.4));
    const key = date.toISOString().slice(0, 10);
    const label = `${date.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()]}`;
    out.push({ key, label, value });
  }
  return out;
}
