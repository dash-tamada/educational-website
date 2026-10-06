"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import {
  Avatar,
  Icon,
  ICON_NAMES,
  Tabs,
  type Column,
  type IconName,
  type SortState,
} from "@/components/app";
import { useDemoSession } from "@/lib/demo/session-client";
import { cropSrc } from "@/lib/img";
import { toneBg, toneText } from "@/lib/landing-data";
import {
  DEMO_ADMIN_ID,
  REFUND_MAX_PROGRESS,
  REFUND_WINDOW_DAYS,
  daysSince,
  getCourseProgress,
  type Coupon,
  type Course,
  type Db,
  type Order,
  type Profile,
  type TutorApplication,
  MOCK_NOW_ISO,
  formatDate,
} from "@/lib/mock";

/* =============================================================================
   Admin-only building blocks shared by the control-room pages.
   ============================================================================= */

/** The signed-in admin's id (falls back to the default demo admin). */
export function useAdminId() {
  return useDemoSession()?.userId ?? DEMO_ADMIN_ID;
}

/**
 * Touch screens: stretch a row's main link over the whole row (the row needs
 * `relative`), so a 20px text link becomes a 48px+ tap target. Other controls in
 * the row sit above it with `relative z-[1]`. `::after` is reserved for this
 * (the `hit` utility uses `::before`).
 */
export const STRETCH = "coarse:after:absolute coarse:after:inset-0 coarse:after:content-['']";

/** Avatar + name + email, used in every people column. */
export function PersonCell({
  user,
  href,
  sub,
  size = "sm",
  stretch,
}: {
  user: Profile | null | undefined;
  href?: string;
  sub?: React.ReactNode;
  size?: "xs" | "sm" | "md";
  /** touch: the name link covers the nearest `relative` row (see STRETCH) */
  stretch?: boolean;
}) {
  if (!user) return <span className="text-ink/45">Deleted account</span>;
  const name = href ? (
    <Link
      href={href}
      className={clsx("truncate font-bold underline-offset-2 hf:underline", stretch && STRETCH)}
    >
      {user.name}
    </Link>
  ) : (
    <span className="truncate font-bold">{user.name}</span>
  );
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={user.name} src={user.avatar} tone={user.tone} size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        {name}
        <span className="truncate text-[13px] font-medium text-ink/55">
          {sub ?? user.email}
        </span>
      </span>
    </span>
  );
}

/** Thumbnail + title + small line (tutor / category). */
export function CourseCell({
  course,
  sub,
  href,
  wide,
}: {
  course: Course | null | undefined;
  sub?: React.ReactNode;
  href?: string;
  wide?: boolean;
}) {
  if (!course) return <span className="text-ink/45">Removed course</span>;
  const title = href ? (
    <Link
      href={href}
      className="line-clamp-2 font-bold underline-offset-2 hf:underline"
    >
      {course.title}
    </Link>
  ) : (
    <span className="line-clamp-2 font-bold">{course.title}</span>
  );
  return (
    <span
      className={clsx(
        "flex min-w-0 items-center gap-3",
        wide ? "min-w-[240px]" : "min-w-[200px]",
      )}
    >
      <span
        className={clsx(
          "relative h-10 w-[54px] shrink-0 overflow-hidden rounded-[10px]",
          toneBg[course.tone],
        )}
      >
        <Image
          src={cropSrc(course.thumbnail, 40 / 54)}
          alt=""
          fill
          sizes="54px"
          className="object-cover"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        {title}
        {sub && (
          <span className="mt-0.5 truncate text-[13px] font-medium text-ink/55">
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

/** Payments overview / Orders / Coupons / Payouts share one "money" sub navigation. */
export function MoneyTabs({
  current,
}: {
  current: "overview" | "orders" | "coupons" | "payouts";
}) {
  return (
    <Tabs
      label="Money"
      value={current}
      className="mb-6"
      items={[
        { id: "overview", label: "Overview", href: "/admin/payments" },
        { id: "orders", label: "Orders", href: "/admin/orders" },
        { id: "coupons", label: "Coupons", href: "/admin/coupons" },
        { id: "payouts", label: "Tutor payouts", href: "/admin/payouts" },
      ]}
    />
  );
}

/** Colourful "attention" tile: big count, label, link. */
export function QueueTile({
  label,
  count,
  href,
  tone,
  icon,
  cta,
}: {
  label: string;
  count: number;
  href: string;
  tone: "sun" | "blush" | "cyan" | "mint" | "lilac" | "butter";
  icon: IconName;
  cta: string;
}) {
  const clear = count === 0;
  return (
    <Link
      href={href}
      className={clsx(
        "hover-lift tap group flex min-w-0 flex-col rounded-card p-4 md:p-5",
        clear ? "bg-white shadow-soft" : [toneBg[tone], toneText[tone]],
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span
          className={clsx(
            "grid size-9 place-items-center rounded-full",
            clear ? "bg-cream" : "bg-white/60",
          )}
          aria-hidden
        >
          <Icon
            name={clear ? "check" : icon}
            className="size-[18px]"
            strokeWidth={2.3}
          />
        </span>
        <span className="t-stat">{count}</span>
      </span>
      <span className="mt-3 text-[15px] leading-snug font-bold">{label}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold opacity-70 group-hf:opacity-100">
        {clear ? "All clear" : cta}
        <Icon name="arrow-right" className="size-3.5" strokeWidth={2.6} />
      </span>
    </Link>
  );
}

/** A labelled section inside a page (outside cards). */
export function SectionTitle({
  title,
  description,
  action,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="t-app-h2">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 t-small text-ink/65">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

/** Coupon state at MOCK_NOW. */
export type CouponState = "live" | "scheduled" | "expired" | "off" | "used_up";
export function couponState(c: Coupon): CouponState {
  if (!c.active) return "off";
  if (MOCK_NOW_ISO < c.startsAt) return "scheduled";
  if (MOCK_NOW_ISO > c.endsAt) return "expired";
  if (c.redemptions >= c.maxRedemptions) return "used_up";
  return "live";
}
export const COUPON_STATE_META: Record<
  CouponState,
  { label: string; tone: "mint" | "blue" | "neutral" | "flame" | "lilac" }
> = {
  live: { label: "Live", tone: "mint" },
  scheduled: { label: "Scheduled", tone: "blue" },
  expired: { label: "Expired", tone: "neutral" },
  off: { label: "Switched off", tone: "flame" },
  used_up: { label: "Used up", tone: "lilac" },
};

/** Download rows as CSV (client only). */
export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "2026-09" -> "September 2026" */
/** The payout month still running ("2026-10"): its figures are projections. */
export const CURRENT_PERIOD = MOCK_NOW_ISO.slice(0, 7);

export function periodLabel(period: string, short = false) {
  const [y, m] = period.split("-").map(Number);
  const names = short
    ? [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
  return `${names[(m || 1) - 1]} ${y}`;
}

/** Small key/value pill row used in drawers. */
export function MetaRow({
  items,
}: {
  items: { icon: IconName; label: React.ReactNode }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-ink/65">
      {items.map((it, i) => (
        <li key={i} className="inline-flex items-center gap-1.5">
          <Icon name={it.icon} className="size-4 text-ink/45" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Category.icon (free string) -> a known icon name. */
export function catIcon(icon: string | undefined): IconName {
  return icon && (ICON_NAMES as readonly string[]).includes(icon)
    ? (icon as IconName)
    : "tag";
}

/* ----------------------------------------------------------------------------- responsive tables */

/**
 * Width of the box a table lives in (not the viewport: the sidebar can be
 * collapsed or open). `null` until measured, which callers treat as "wide" so
 * the server render matches a desktop first paint.
 */
export function useBoxWidth<E extends HTMLElement = HTMLDivElement>() {
  const [width, setWidth] = useState<number | null>(null);
  const [node, setNode] = useState<E | null>(null);
  useLayoutEffectSafe(() => {
    if (!node) return;
    const measure = () => setWidth(Math.round(node.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, width] as const;
}
const useLayoutEffectSafe =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A DataTable column that only shows once its table box is at least `minBox` px wide. */
export type FitColumn<T> = Column<T> & { minBox?: number };

/** Drop the columns that don't fit the measured box (all columns before measuring). */
export function fitColumns<T>(cols: FitColumn<T>[], width: number | null): Column<T>[] {
  return cols
    .filter((c) => !c.minBox || width == null || width >= c.minBox)
    .map(({ minBox, ...c }) => {
      void minBox;
      return c;
    });
}

/** Under this box width a table switches to its "stacked" first column (key facts inline). */
export const COMPACT_BOX = 600;

/** Small inline facts row for the stacked (phone) first column of a table. */
export function CompactFacts({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold text-ink/60">
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------- phone rows */

/**
 * One row of a DataTable's phone list (MOBILE_SPEC §1.9), passed as `mobileRow`:
 * [leading 40px] [title 15px bold + meta lines 13px] [trailing value + badge].
 * The DataTable wraps it in the tappable row shell and adds the 44px "…" button.
 * Each `lines` entry is one line; an array entry is joined with " · " and wraps
 * as whole facts (never starting a line with a dot).
 */
export function PhoneRow({
  leading,
  title,
  lines = [],
  trailing,
  badge,
  clampTitle,
  leadingHideTiny,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  lines?: (React.ReactNode | React.ReactNode[] | null | false | undefined)[];
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
  /** let the title use two lines (course titles) instead of truncating */
  clampTitle?: boolean;
  /** drop the leading thumb below 360px, where the text needs the room */
  leadingHideTiny?: boolean;
}) {
  const shown = lines.filter(
    (l) => l != null && l !== false && !(Array.isArray(l) && !l.some(Boolean)),
  );
  return (
    <span className="flex min-w-0 items-center gap-3">
      {leading && (
        <span className={clsx("flex shrink-0 items-center", leadingHideTiny && "phone-s:hidden")}>{leading}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={clsx(
            "min-w-0 text-[15px] leading-snug font-bold",
            clampTitle ? "line-clamp-2 [overflow-wrap:anywhere]" : "truncate",
          )}
        >
          {title}
        </span>
        {shown.map((l, i) =>
          Array.isArray(l) ? (
            <span
              key={i}
              className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden text-[13px] leading-snug font-medium text-ink/60"
            >
              {l.filter(Boolean).map((part, j, arr) => (
                <span
                  key={j}
                  className={clsx(
                    "relative inline-flex items-center gap-1 whitespace-nowrap",
                    // a dot only between two text facts; pills and icons carry their own edges
                    j > 0 &&
                      isText(part) &&
                      isText(arr[j - 1]) &&
                      "before:absolute before:-left-2 before:text-ink/35 before:content-['·']",
                  )}
                >
                  {part}
                </span>
              ))}
            </span>
          ) : (
            <span
              key={i}
              className="mt-0.5 min-w-0 truncate text-[13px] leading-snug font-medium text-ink/60"
            >
              {l}
            </span>
          ),
        )}
      </span>
      {(trailing != null || badge != null) && (
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          {trailing != null && (
            <span className="text-[15px] leading-tight font-bold whitespace-nowrap tabular-nums">
              {trailing}
            </span>
          )}
          {badge}
        </span>
      )}
    </span>
  );
}

/**
 * True while none of the given elements is on screen (false before measuring).
 * Drives a phone StickyActionBar that mirrors inline action rows: the bar steps
 * aside whenever one of those rows is visible, so the actions never show twice.
 */
export function useNoneInView(...refs: React.RefObject<HTMLElement | null>[]) {
  const [none, setNone] = useState(false);
  useEffect(() => {
    const els = refs.map((r) => r.current).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setNone(![...seen.values()].some(Boolean));
    });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // refs are stable objects; re-run only when their targets mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs.map((r) => r.current));
  return none;
}

const isText = (n: React.ReactNode) => typeof n === "string" || typeof n === "number";

/** 64x40 course thumbnail (16:10) for phone list rows. */
export function PhoneThumb({ src, tone }: { src: string; tone?: Course["tone"] }) {
  return (
    <span className={clsx("relative block h-10 w-16 overflow-hidden rounded-[10px]", tone ? toneBg[tone] : "bg-cream")}>
      <Image src={cropSrc(src, 10 / 16)} alt="" fill sizes="64px" className="object-cover" />
    </span>
  );
}

/* ----------------------------------------------------------------------------- refunds */

/** What an admin needs next to a refund request: age, progress and policy flags. */
export function refundContext(o: Order, db: Db) {
  const boughtDaysAgo = daysSince(o.createdAt);
  const askedAfter = o.refundRequest
    ? Math.max(
        0,
        Math.floor(
          (Date.parse(o.refundRequest.requestedAt) - Date.parse(o.createdAt)) /
            86_400_000,
        ),
      )
    : boughtDaysAgo;
  const progress = getCourseProgress(o.userId, o.courseId, db).percent;
  const certificate = db.certificates.some(
    (c) => c.userId === o.userId && c.courseId === o.courseId,
  );
  const outsideWindow = askedAfter > REFUND_WINDOW_DAYS;
  const flags: string[] = [];
  if (outsideWindow) flags.push(`Outside ${REFUND_WINDOW_DAYS}-day window`);
  if (progress >= REFUND_MAX_PROGRESS) flags.push(`${progress}% done`);
  if (certificate) flags.push("Certificate earned");
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  const policyParts: string[] = [];
  if (outsideWindow)
    policyParts.push(
      `asked ${days(askedAfter)} after buying (the window is ${days(REFUND_WINDOW_DAYS)})`,
    );
  if (progress >= REFUND_MAX_PROGRESS)
    policyParts.push(
      `${progress}% of the course done (refunds stop at ${REFUND_MAX_PROGRESS}%)`,
    );
  if (certificate) policyParts.push("the certificate is already earned");
  const reason = o.refundRequest?.reason ?? "";
  const t = Date.parse(o.createdAt);
  const duplicateOf = db.orders.find(
    (x) =>
      x.id !== o.id &&
      x.userId === o.userId &&
      x.courseId === o.courseId &&
      x.status === "paid" &&
      x.provider !== "admin" &&
      Math.abs(Date.parse(x.createdAt) - t) <= 48 * 3_600_000,
  );
  return {
    boughtDaysAgo,
    askedAfter,
    progress,
    certificate,
    outsideWindow,
    /** a policy line built from the facts ("asked 29 days after buying (the window is
     *  7 days)"), falling back to the data layer's sentence */
    policyNote: policyParts.length
      ? `Outside policy: ${policyParts.join("; ")}. You can still approve it.`
      : (o.refundRequest?.outsidePolicy ?? null),
    flags,
    insidePolicy: !flags.length && !o.refundRequest?.outsidePolicy,
    /** the learner's text says they paid twice */
    claimsDuplicate: /twice|double|duplicate|two times|charged 2/i.test(reason),
    /** another paid order for the same learner + course within ~48 hours (the evidence) */
    duplicateOf,
    duplicate: !!duplicateOf,
  };
}

/* ----------------------------------------------------------------------------- forms */

/**
 * After a failed submit: scroll the first invalid control (aria-invalid, or a
 * group marked data-invalid) into view and focus it, so the admin lands on the
 * problem instead of hunting for it.
 */
export function focusFirstInvalid(root: ParentNode | null | undefined) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid="true"]',
    );
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const target = el.matches('[data-invalid="true"]')
      ? (el.querySelector<HTMLElement>("input, select, textarea, button") ?? el)
      : el;
    target.focus({ preventScroll: true });
  });
}

/* ----------------------------------------------------------------------------- tutor applications */

const STEP_START = /^(\d+[.)]\s|(module|week|day|lesson|part|step|chapter|unit)\s*\d+\b)/i;

/**
 * Title and outline of a tutor's planned course.
 *
 * Newer applications carry `courseOutline` (one step per entry). Older ones, and the
 * /become-tutor wizard today, pack both into plannedCourse as "Title: outline". Titles
 * can contain ": " themselves ("Kathak Foundations: Tatkar to Your First Piece"), so we
 * cut at the colon right before a numbered step, else (multi-line) the last colon on
 * the first line, else the last colon whose remainder is long enough to be an outline.
 */
export function splitPlan(
  app: Pick<TutorApplication, "plannedCourse" | "courseOutline">,
): { title: string; outline: string[] } {
  const planned = app.plannedCourse.trim();
  const parsed = parsePlan(planned);
  if (app.courseOutline?.length)
    return {
      title: parsed.outline.length ? parsed.title : planned,
      outline: app.courseOutline,
    };
  return parsed;
}

function parsePlan(planned: string): { title: string; outline: string[] } {
  const nl = planned.indexOf("\n");
  const head = nl >= 0 ? planned.slice(0, nl) : planned;
  const cuts: number[] = [];
  for (let i = head.indexOf(": "); i > 0; i = head.indexOf(": ", i + 2)) cuts.push(i);
  if (!cuts.length) return { title: planned, outline: [] };
  const rest = (c: number) => planned.slice(c + 2).trim();
  let cut = cuts.find((c) => STEP_START.test(rest(c)));
  if (cut == null && nl >= 0) cut = cuts[cuts.length - 1];
  if (cut == null) cut = [...cuts].reverse().find((c) => rest(c).length >= 30);
  if (cut == null) return { title: planned, outline: [] };
  const body = rest(cut);
  const lines = body.includes("\n")
    ? body.split(/\n+/)
    : body.split(/\s+(?=\d+[.)]\s)/);
  return {
    title: planned.slice(0, cut).trim(),
    outline: lines
      .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
      .filter(Boolean),
  };
}

/* ----------------------------------------------------------------------------- dates + sorting */

const THIS_YEAR = formatDate(MOCK_NOW_ISO, "medium").slice(-4);

/** "5 Oct" for dates in the current year, "8 Dec 2025" otherwise. */
export function smartDate(iso: string) {
  const withYear = formatDate(iso, "medium");
  return withYear.slice(-4) === THIS_YEAR ? formatDate(iso, "short") : withYear;
}

/**
 * The first preferred sort whose column is actually on screen (fitColumns can drop
 * the desktop default), plus a key for the DataTable: its sort state is set once on
 * mount, so remount it when the chosen sort changes.
 */
export function pickSort<T>(cols: Column<T>[], ...prefs: SortState[]) {
  const initialSort = prefs.find((p) =>
    cols.some((c) => c.key === p.key && c.sortValue),
  );
  return {
    initialSort,
    sortKey: initialSort ? `${initialSort.key}-${initialSort.dir}` : "none",
  };
}

/** DataTable className for the stacked phone layout: a fixed table so the first
 *  column takes the remaining width and long lines truncate instead of pushing. */
export const COMPACT_TABLE = "[&_table]:table-fixed";
