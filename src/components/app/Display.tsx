import Image from "next/image";
import clsx from "clsx";
import type { Tone } from "@/lib/tone";
import { initials } from "@/lib/mock/format";
import { cropSrc } from "@/lib/img";
import { Mascot } from "@/components/decor/Mascot";

/* =============================================================================
   Display primitives, design system v2: Avatar, AvatarGroup, Rating, ProgressBar,
   ProgressRing, Skeleton, EmptyState. Server-safe (no hooks).
   - Avatars stay round (photos / initials on sand, charcoal or ink: no bright fills).
   - Progress is THIN and RED (the accent), on a hairline track.
   - EmptyState is editorial: tiny-caps eyebrow, Inter Tight headline, short copy.
   ============================================================================= */

/* ----------------------------------------------------------------------------- tone helpers */
const DARK_TONES = new Set<Tone>(["blue", "green", "forest", "purple", "indigo", "olive", "ink"]);
const RED_TONES = new Set<Tone>(["hotpink", "flame", "tomato", "magenta"]);

/** Initials-avatar fill per legacy tone: sand (light), charcoal (dark), ink (red family). */
function avatarFill(tone: Tone) {
  if (RED_TONES.has(tone)) return "bg-ink text-cream";
  if (DARK_TONES.has(tone)) return "bg-charcoal text-cream";
  return "bg-sand text-ink";
}

/* ----------------------------------------------------------------------------- Avatar */
const AV = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88 } as const;
export type AvatarSize = keyof typeof AV;

/**
 * Photo (tutors) or initials (students/admins).
 *   <Avatar name={u.name} src={u.avatar} tone={u.tone} size="md" />            // alone: announces the name
 *   <Avatar name={u.name} src={u.avatar} tone={u.tone} size="sm" decorative /> // beside the visible name
 * Pass `decorative` whenever the person's name is printed right next to the avatar (cards, review
 * rows, comment threads, tables, a button whose aria-label already names them); otherwise screen
 * readers announce the name twice ("Priya Nair Priya Nair").
 */
export function Avatar({
  name,
  src,
  tone = "sun",
  size = "md",
  className,
  ring,
  decorative,
  eager,
}: {
  name: string;
  src?: string;
  tone?: Tone;
  size?: AvatarSize;
  className?: string;
  /** canvas-coloured ring (stacked groups / on images) */
  ring?: boolean;
  /** next to a visible name: hidden from screen readers (alt="") so the name isn't read twice */
  decorative?: boolean;
  /** load the photo eagerly with high fetch priority (above-the-fold avatars, e.g. the shell's account button) */
  eager?: boolean;
}) {
  const px = AV[size];
  return (
    <span
      aria-hidden={decorative || undefined}
      className={clsx(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold select-none",
        !src && avatarFill(tone),
        src && "bg-charcoal",
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(px * 0.36)), letterSpacing: px <= 24 ? "-0.03em" : "0.01em", lineHeight: 1 }}
      title={decorative ? undefined : name}
    >
      {src ? (
        <Image
          src={cropSrc(src, 1)}
          alt={decorative ? "" : name}
          fill
          sizes={`${px}px`}
          className="object-cover"
          {...(eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {!src && !decorative && <span className="sr-only">{name}</span>}
    </span>
  );
}

/**
 * Overlapping avatars.
 *   <AvatarGroup people={...} />                         // each name is announced ("Priya Nair, Rohan Das, and 3 more")
 *   <AvatarGroup people={...} label="5 learners asked" /> // announced once as the label (role="img")
 *   <AvatarGroup people={...} decorative />               // hidden from screen readers (the count sits beside it)
 */
export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
  className,
  decorative,
  label,
}: {
  people: { name: string; src?: string; tone?: Tone }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  /** hide the whole group from screen readers (a visible count or names sit beside it) */
  decorative?: boolean;
  /** announce the group once with this text instead of every name */
  label?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const px = AV[size];
  const tuck = size === "xs" ? "-ml-1" : size === "sm" ? "-ml-1.5" : "-ml-2";
  const quiet = decorative || !!label;
  return (
    <span
      className={clsx("inline-flex items-center", className)}
      aria-hidden={decorative || undefined}
      {...(label && !decorative ? { role: "img", "aria-label": label } : {})}
    >
      {shown.map((p, i) => (
        <Avatar key={i} {...p} size={size} ring decorative={quiet} className={i ? tuck : undefined} />
      ))}
      {rest > 0 && (
        <span
          className={clsx(tuck, "inline-grid shrink-0 place-items-center rounded-full bg-ink font-mono font-medium text-cream ring-2 ring-surface")}
          style={{ width: px, height: px, fontSize: Math.max(9.5, Math.round(px * 0.3)) }}
        >
          <span aria-hidden>+{rest}</span>
          {!quiet && <span className="sr-only">and {rest} more</span>}
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------------------- Rating */
/** Star colours: ink on cream/paper (default: the current ground's text colour, so cream on
 *  dark grounds), red for the one accent use. Legacy tone names map in. */
const STAR_TONE = {
  tangerine: { on: "text-fg", off: "text-fg/20" },
  ink: { on: "text-ink", off: "text-ink/20" },
  white: { on: "text-cream", off: "text-cream/30" },
  red: { on: "text-red", off: "text-fg/20" },
} as const;
/** Read-only stars (fractional). <Rating value={4.7} count={212} />  <Rating value={4.7} tone="white" /> on ink.
 *  The "(212)" count is muted; override it with countClassName (e.g. "text-inherit"). */
export function Rating({
  value,
  count,
  size = "md",
  showValue = true,
  tone = "tangerine",
  className,
  countClassName,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  /** tangerine (default) = current text colour; ink; white (on dark); red */
  tone?: keyof typeof STAR_TONE;
  className?: string;
  /** colour/opacity of the "(count)" text */
  countClassName?: string;
}) {
  const s = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const v = Math.max(0, Math.min(5, value));
  // No reviews yet: a "New" slate, never an empty star row or "Rated 0.0" / "(0)"
  if (!value || count === 0)
    return (
      <span className={clsx("inline-flex items-center", className)}>
        <span
          className={clsx(
            "inline-flex items-center rounded-[2px] font-mono font-medium tracking-[0.08em] uppercase ring-1 ring-current ring-inset",
            size === "sm" ? "h-[19px] px-1.5 text-[10px]" : size === "lg" ? "h-[26px] px-2.5 text-[12px]" : "h-[22px] px-2 text-[10.5px]",
          )}
          aria-hidden
        >
          New
        </span>
        <span className="sr-only">No ratings yet</span>
      </span>
    );
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <Stars s={s} value={v} on={STAR_TONE[tone].on} off={STAR_TONE[tone].off} label={`Rated ${value.toFixed(1)} out of 5`} />
      {showValue && (
        <span className={clsx("font-mono font-medium tabular-nums", size === "sm" ? "text-[12px]" : size === "lg" ? "text-[14px]" : "text-[13px]")}>
          {value.toFixed(1)}
          {count !== undefined && <span className={clsx(countClassName ?? "text-muted")}> ({count})</span>}
        </span>
      )}
    </span>
  );
}
/** A crisp, sharp five-point star on a 20-unit box (outer radius 10, inner 4). */
const STAR = "M10 .95 12.35 7.71 19.51 7.86 13.8 12.19 15.88 19.04 10 14.95 4.12 19.04 6.2 12.19 .49 7.86 7.65 7.71Z";
/** One SVG for the whole row. Each star is split at its own fill line into an "on" part and
 *  an "off" part (nested viewports clip them), so no two layers ever stack: no grey fringe
 *  around the filled stars at 12px, and partial stars cut cleanly. */
function Stars({ s, value, on, off, label }: { s: number; value: number; on: string; off: string; label: string }) {
  const gap = Math.max(2, Math.round(s * 0.18));
  const w = s * 5 + gap * 4;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${s}`} width={w} height={s} className="shrink-0" shapeRendering="geometricPrecision">
      {Array.from({ length: 5 }, (_, i) => {
        const f = Math.max(0, Math.min(1, value - i));
        const x = i * (s + gap);
        return (
          <g key={i}>
            {f > 0 && (
              <svg x={x} y={0} width={s * f} height={s} viewBox={`0 0 ${20 * f} 20`} preserveAspectRatio="xMinYMin meet" className={on}>
                <path d={STAR} fill="currentColor" />
              </svg>
            )}
            {f < 1 && (
              <svg x={x + s * f} y={0} width={s * (1 - f)} height={s} viewBox={`${20 * f} 0 ${20 * (1 - f)} 20`} preserveAspectRatio="xMinYMin meet" className={off}>
                <path d={STAR} fill="currentColor" />
              </svg>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ----------------------------------------------------------------------------- Progress */
/** Progress fill per legacy tone: red (the default), ink for dark tones, cream for white. */
function progressFill(tone?: Tone): { cls: string; hex: string } {
  if (tone === "white") return { cls: "bg-cream", hex: "var(--color-cream)" };
  if (tone && DARK_TONES.has(tone)) return { cls: "bg-fg", hex: "var(--fg)" };
  return { cls: "bg-red", hex: "var(--color-red)" };
}

/** Thin progress line. <ProgressBar value={56} label="Course progress" showValue />
 *  Sizes: sm 2px, md 3px, lg 5px. Red fill on a hairline track (tone="ink" / "white" for ink / cream). */
export function ProgressBar({
  value,
  tone,
  size = "md",
  label,
  showValue,
  className,
  track = "light",
}: {
  value: number;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  /** accessible label (visually hidden unless showValue) */
  label?: string;
  showValue?: boolean;
  className?: string;
  /** track: "light" follows the ground (ink hairline on cream, cream hairline on the theatre);
   *  "dark" is the stronger track for tinted panels */
  track?: "light" | "dark";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={clsx("w-full", className)}>
      {showValue && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</span>
          <span className="font-mono text-[12px] font-medium tabular-nums">{v}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx("overflow-hidden", track === "light" ? "bg-fg/12 on-dark:bg-fg/25" : "bg-fg/25", size === "sm" ? "h-[2px]" : size === "lg" ? "h-[5px]" : "h-[3px]")}
      >
        <div className={clsx("h-full transition-[width] duration-700 ease-expo", progressFill(tone).cls)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** Thin ring. <ProgressRing value={72} size={64} label="Completion" />
 *  The stroke is capped thin (about size/18) whatever `stroke` asks for. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 3,
  tone,
  label,
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  /** centre content (defaults to the % value) */
  children?: React.ReactNode;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const sw = Math.max(1.5, Math.min(stroke, Math.max(2, Math.round(size / 18))));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressFill(tone).hex}
          strokeWidth={sw}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-expo"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[12px] font-medium tabular-nums">{children ?? `${Math.round(v)}%`}</span>
    </span>
  );
}

/* ----------------------------------------------------------------------------- Skeleton */
/** Shimmer placeholder (square). <Skeleton className="h-5 w-40" /> ; <Skeleton variant="card" /> */
export function Skeleton({ className, variant = "block", lines = 3 }: { className?: string; variant?: "block" | "text" | "card" | "row" | "circle"; lines?: number }) {
  if (variant === "text")
    return (
      <div className={clsx("space-y-2.5", className)} aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="skeleton h-3" style={{ width: `${i === lines - 1 ? 60 : 100 - i * 6}%` }} />
        ))}
      </div>
    );
  if (variant === "card")
    return (
      <div className={clsx("", className)} aria-hidden>
        <div className="skeleton aspect-[4/3]" />
        <div className="space-y-2.5 pt-4">
          <div className="skeleton h-2.5 w-1/3" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
    );
  if (variant === "row")
    return (
      <div className={clsx("flex items-center gap-3", className)} aria-hidden>
        <div className="skeleton size-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-2.5 w-1/2" />
        </div>
      </div>
    );
  if (variant === "circle") return <div className={clsx("skeleton rounded-full", className ?? "size-10")} aria-hidden />;
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

/* ----------------------------------------------------------------------------- EmptyState */
/**
 * Editorial empty state: a tiny-caps eyebrow, an Inter Tight headline, one short line,
 * actions. No illustrations: art="tami" shows a TINY Tami, the other legacy arts
 * ("buddy", "buddies") show a mono timecode slate ("00:00:00:00", nothing recorded yet).
 *   <EmptyState title="Nothing saved yet." body="Go window-shop the library." action={<Button href="/courses">Browse courses</Button>} />
 *   <EmptyState eyebrow="Wishlist" align="start" compact … />
 *   <EmptyState headingRef={h} … />   then h.current?.focus() after an action empties the list
 * Passing headingId or headingRef makes the title programmatically focusable (tabIndex -1).
 */
export function EmptyState({
  title,
  body,
  action,
  art = "tami",
  tone: _tone,
  eyebrow,
  align = "center",
  compact,
  className,
  as: Heading = "h3",
  headingId,
  headingRef,
  ref,
  id,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  art?: "tami" | "buddy" | "buddies" | "none";
  /** legacy (ignored: empty states are colourless now) */
  tone?: Tone;
  /** tiny caps line above the title (defaults to a timecode slate for non-Tami arts) */
  eyebrow?: React.ReactNode;
  align?: "center" | "start";
  compact?: boolean;
  className?: string;
  /** heading level of the title (default h3); use "h1" when the empty state IS the page (gates, 404-ish screens) */
  as?: "h1" | "h2" | "h3" | "h4";
  /** id on the title heading (aria-labelledby target / focus target) */
  headingId?: string;
  /** ref to the title heading; the heading gets tabIndex -1 so it can take focus */
  headingRef?: React.Ref<HTMLHeadingElement>;
  /** ref to the root element */
  ref?: React.Ref<HTMLDivElement>;
  /** id on the root element */
  id?: string;
}) {
  void _tone;
  const focusable = headingId !== undefined || headingRef !== undefined;
  const center = align === "center";
  return (
    <div
      ref={ref}
      id={id}
      className={clsx("flex flex-col", center ? "items-center text-center" : "items-start text-left", compact ? "px-4 py-10" : "px-6 py-14 md:py-20", className)}
    >
      {art === "tami" && <Mascot title="" className="mb-4 w-7 opacity-90" style={{ transform: "rotate(-6deg)" }} />}
      {(eyebrow || (art !== "tami" && art !== "none")) && (
        <p className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.1em] text-muted uppercase" aria-hidden={!eyebrow || undefined}>
          <span className="size-[6px] rounded-full bg-red" aria-hidden />
          {eyebrow ?? "00:00:00:00"}
        </p>
      )}
      <Heading
        ref={headingRef}
        id={headingId}
        tabIndex={focusable ? -1 : undefined}
        className={clsx(
          "max-w-[20ch] font-heading font-semibold tracking-[-0.035em]",
          compact ? "text-[clamp(1.25rem,1.1rem+0.5vw,1.5rem)] leading-[1.1]" : "text-[clamp(1.5rem,1.2rem+1.1vw,2.25rem)] leading-[1.04]",
          focusable && "outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red",
        )}
      >
        {title}
      </Heading>
      {body && <p className={clsx("t-small mt-3 max-w-[42ch] text-muted", compact ? "" : "md:text-[15px]")}>{body}</p>}
      {action && <div className={clsx("mt-6 flex flex-wrap gap-2", center && "justify-center")}>{action}</div>}
    </div>
  );
}
