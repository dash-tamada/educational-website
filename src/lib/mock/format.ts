/* Deterministic formatters (identical output on server and client, so no
   hydration mismatches). All dates render in IST. */

import { MOCK_NOW } from "./seed/util";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Indian digit grouping: 1234567 -> "12,34,567" */
export function formatNumber(n: number, decimals = 0): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split(".");
  let head = int;
  let out = "";
  if (head.length > 3) {
    out = "," + head.slice(-3);
    head = head.slice(0, -3);
    while (head.length > 2) {
      out = "," + head.slice(-2) + out;
      head = head.slice(0, -2);
    }
    out = head + out;
  } else out = head;
  return (neg ? "-" : "") + out + (frac ? "." + frac : "");
}

/** "₹1,499"; compact: "₹3.2L", "₹1.1Cr", "₹18.4k" */
export function formatINR(n: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (opts.compact) {
    const a = Math.abs(n);
    if (a >= 1e7) return `₹${trim((n / 1e7).toFixed(2))}Cr`;
    if (a >= 1e5) return `₹${trim((n / 1e5).toFixed(1))}L`;
    if (a >= 1e3) return `₹${trim((n / 1e3).toFixed(1))}k`;
  }
  return `₹${formatNumber(n, opts.decimals ?? 0)}`;
}

/** 1234 -> "1.2k", 28412 -> "28.4k", 1200000 -> "12L" */
export function formatCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `${trim((n / 1e7).toFixed(1))}Cr`;
  if (a >= 1e5) return `${trim((n / 1e5).toFixed(1))}L`;
  if (a >= 1e3) return `${trim((n / 1e3).toFixed(1))}k`;
  return String(Math.round(n));
}
const trim = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");

export function formatPercent(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}%`;
}

/**
 * Durations from seconds.
 *   clock: "9:24" / "1:02:05"   short: "2h 20m" / "14m"   long: "2 hr 20 min" / "14 min"
 */
export function formatDuration(sec: number, style: "clock" | "short" | "long" = "short"): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (style === "clock") {
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
  }
  // 0 stays 0 (empty course); anything else under a minute rounds up to 1.
  const mins = h ? m : s === 0 ? 0 : Math.max(1, Math.round(s / 60));
  if (style === "long") return h ? `${h} hr${m ? ` ${m} min` : ""}` : `${mins} min`;
  return h ? `${h}h${m ? ` ${String(m).padStart(2, "0")}m` : ""}` : `${mins}m`;
}

/** "7h 01m": the runtime as the course page and home print it (minutes rounded, two digits). */
export function runtimeShort(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${Math.max(1, m)}m`;
}

function ist(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() + 330 * 60_000);
}

/**
 * Dates in IST.
 *   short: "5 Oct"   medium: "5 Oct 2026" (default)   long: "5 October 2026"
 *   datetime: "5 Oct 2026, 7:05 pm"   time: "7:05 pm"   numeric: "05/10/2026"
 */
export function formatDate(
  iso: string,
  style: "short" | "medium" | "long" | "datetime" | "time" | "numeric" = "medium",
): string {
  const d = ist(iso);
  const day = d.getUTCDate();
  const mon = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const hh = d.getUTCHours();
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const time = `${hh % 12 || 12}:${mm} ${hh < 12 ? "am" : "pm"}`;
  switch (style) {
    case "short":
      return `${day} ${MONTHS[mon]}`;
    case "long":
      return `${day} ${MONTHS_LONG[mon]} ${year}`;
    case "datetime":
      return `${day} ${MONTHS[mon]} ${year}, ${time}`;
    case "time":
      return time;
    case "numeric":
      return `${String(day).padStart(2, "0")}/${String(mon + 1).padStart(2, "0")}/${year}`;
    default:
      return `${day} ${MONTHS[mon]} ${year}`;
  }
}

/** Whole days since the epoch on the IST calendar. */
const istDayNumber = (ms: number) => Math.floor((ms + 330 * 60_000) / 86_400_000);

/** "just now", "12 min ago", "3 hours ago", "yesterday", "5 days ago", "2 months ago" (relative to MOCK_NOW). */
export function timeAgo(iso: string, now: Date = MOCK_NOW): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 0) {
    const ahead = -diff;
    // Demo-store rows are stamped a few seconds after MOCK_NOW: they just happened.
    if (ahead < 86_400) return "just now";
    const d = Math.round(ahead / 86_400);
    return d === 1 ? "tomorrow" : `in ${d} days`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  // Day words follow IST calendar days, so "yesterday" always means the date before today.
  const days = istDayNumber(now.getTime()) - istDayNumber(new Date(iso).getTime());
  if (days <= 0 || diff < 6 * 3600) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** "Priya Nair" -> "PN" */
export function initials(name: string): string {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "1 lesson" / "3 lessons" */
export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${formatNumber(n)} ${n === 1 ? word : pluralWord}`;
}

/** Two-digit label: 1 -> "01" */
export const pad2 = (n: number) => String(n).padStart(2, "0");
