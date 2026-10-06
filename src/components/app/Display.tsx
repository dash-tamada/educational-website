import Image from "next/image";
import clsx from "clsx";
import { toneBg, toneText, type Tone } from "@/lib/landing-data";
import { initials } from "@/lib/mock/format";
import { cropSrc } from "@/lib/img";
import { Mascot } from "@/components/decor/Mascot";
import { BlockBuddy } from "@/components/decor/BlockBuddy";

/* =============================================================================
   Display primitives: Avatar, AvatarGroup, Rating, ProgressBar, ProgressRing,
   Skeleton, EmptyState. Server-safe (no hooks).
   ============================================================================= */

/* ----------------------------------------------------------------------------- Avatar */
const AV = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88 } as const;
export type AvatarSize = keyof typeof AV;
/* Initials are small bold text: these mid-luminance fills fail AA with white
   (hotpink 3.7:1, flame 3.5:1, lilac 3.4:1, green 2.8:1) but pass with ink (4.9-6.5:1). */
const SMALL_TEXT_INK: Partial<Record<Tone, true>> = { hotpink: true, flame: true, tomato: true, lilac: true, green: true };
/** Text colour for SMALL text on a tone fill (avatars, stat tiles): toneText, but ink where white fails AA. */
export function smallToneText(tone: Tone): string {
  return SMALL_TEXT_INK[tone] ? "text-ink" : toneText[tone];
}

/**
 * Photo (tutors) or initials on the person's tone (students/admins).
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
  /** white ring (for stacked groups / on colour) */
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
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold select-none",
        !src && [toneBg[tone], smallToneText(tone)],
        ring && "ring-2 ring-white",
        className,
      )}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(px * 0.38)), letterSpacing: px <= 24 ? "-0.04em" : undefined, lineHeight: 1 }}
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
  // overlap scales with the avatar: an 8px tuck on a 24px circle hid half the initials
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
          className={clsx(tuck, "inline-grid shrink-0 place-items-center rounded-full bg-ink font-bold text-cream ring-2 ring-white")}
          style={{ width: px, height: px, fontSize: Math.max(10, Math.round(px * 0.34)) }}
        >
          <span aria-hidden>+{rest}</span>
          {!quiet && <span className="sr-only">and {rest} more</span>}
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------------------- Rating */
/** Star colours: tangerine (default) on white/cream/cool fills, ink on warm fills
 *  (sun, butter, tangerine, flame, pink) where tangerine disappears, white on dark fills. */
const STAR_TONE = {
  tangerine: { on: "text-tangerine", off: "text-ink/15" },
  ink: { on: "text-ink", off: "text-ink/20" },
  white: { on: "text-white", off: "text-white/30" },
} as const;
/* Review-count colour per star tone: a solid colour, so it never stacks on a parent's
   muted text colour (e.g. inside a text-ink/70 meta row). ink/70 on white/cream ≈ 6:1. */
const COUNT_TONE = {
  tangerine: "text-ink/70",
  ink: "text-ink",
  white: "text-white",
} as const;
/* "New" tag (no ratings yet) per star tone */
const NEW_TONE = {
  tangerine: "bg-ink text-cream",
  ink: "bg-ink text-cream",
  white: "bg-white text-ink",
} as const;
/** Read-only stars (fractional). <Rating value={4.7} count={212} />  <Rating value={4.7} tone="ink" /> on warm fills.
 *  The "(212)" count gets a solid colour from the star tone; override it with countClassName (e.g. "text-inherit"). */
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
  tone?: keyof typeof STAR_TONE;
  className?: string;
  /** colour/opacity of the "(count)" text; defaults to a solid colour matched to `tone` */
  countClassName?: string;
}) {
  const s = size === "sm" ? 14 : size === "lg" ? 22 : 17;
  // No reviews yet: a "New" tag, never an empty star row or "Rated 0.0" / "(0)"
  if (!value || count === 0)
    return (
      <span className={clsx("inline-flex items-center", className)}>
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full font-bold uppercase leading-none tracking-[0.04em]",
            size === "sm" ? "px-2 py-[3px] text-[11px]" : size === "lg" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-1 text-[12px]",
            NEW_TONE[tone],
          )}
        >
          <svg viewBox="0 0 24 24" width={s - 4} height={s - 4} aria-hidden className="shrink-0">
            <path d="M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14l-6.6-2 6.6-2z" fill="currentColor" />
          </svg>
          <span aria-hidden>New</span>
        </span>
        <span className="sr-only">No ratings yet</span>
      </span>
    );
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex" role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        <Stars s={s} className={STAR_TONE[tone].off} />
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}>
          <Stars s={s} className={STAR_TONE[tone].on} />
        </span>
      </span>
      {showValue && (
        <span className={clsx("font-bold", size === "sm" ? "text-[13px]" : "text-[14px]")}>
          {value.toFixed(1)}
          {count !== undefined && <span className={clsx("font-medium", countClassName ?? COUNT_TONE[tone])}> ({count})</span>}
        </span>
      )}
    </span>
  );
}
function Stars({ s, className }: { s: number; className?: string }) {
  return (
    <span className={clsx("inline-flex shrink-0", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={s} height={s} className="shrink-0">
          <path d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

/* ----------------------------------------------------------------------------- Progress */
/** <ProgressBar value={56} label="Course progress" showValue /> */
export function ProgressBar({
  value,
  tone = "green",
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
  /** track colour: light (on white/cream) or dark (on colour cards) */
  track?: "light" | "dark";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={clsx("w-full", className)}>
      {showValue && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-bold">
          <span className="opacity-80">{label}</span>
          <span>{v}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx(
          "overflow-hidden rounded-full",
          track === "light" ? "bg-ink/[0.08]" : "bg-black/15",
          size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5",
        )}
      >
        <div className={clsx("h-full rounded-full transition-[width] duration-700 ease-expo", toneBg[tone])} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** <ProgressRing value={72} size={64} label="Completion" /> */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  tone = "green",
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
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const hex: Partial<Record<Tone, string>> = { green: "#00b351", hotpink: "#ff008c", blue: "#2668fd", sun: "#ffcf3f", flame: "#fd4401", purple: "#3b308f", tangerine: "#f9a220", turquoise: "#2cd1d0", lilac: "#9b82e0", ink: "#161616" };
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex[tone] ?? "#00b351"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-expo"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-bold">{children ?? `${Math.round(v)}%`}</span>
    </span>
  );
}

/* ----------------------------------------------------------------------------- Skeleton */
/** Shimmer placeholder. <Skeleton className="h-5 w-40" /> ; <Skeleton variant="card" /> */
export function Skeleton({ className, variant = "block", lines = 3 }: { className?: string; variant?: "block" | "text" | "card" | "row" | "circle"; lines?: number }) {
  if (variant === "text")
    return (
      <div className={clsx("space-y-2", className)} aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="skeleton h-3.5 rounded-full" style={{ width: `${i === lines - 1 ? 60 : 100 - i * 6}%` }} />
        ))}
      </div>
    );
  if (variant === "card")
    return (
      <div className={clsx("rounded-card bg-white p-3 shadow-soft", className)} aria-hidden>
        <div className="skeleton aspect-[5/4] rounded-img" />
        <div className="space-y-2 p-2 pt-4">
          <div className="skeleton h-4 w-3/4 rounded-full" />
          <div className="skeleton h-3.5 w-full rounded-full" />
          <div className="skeleton h-3.5 w-1/2 rounded-full" />
        </div>
      </div>
    );
  if (variant === "row")
    return (
      <div className={clsx("flex items-center gap-3", className)} aria-hidden>
        <div className="skeleton size-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-1/3 rounded-full" />
          <div className="skeleton h-3 w-1/2 rounded-full" />
        </div>
      </div>
    );
  if (variant === "circle") return <div className={clsx("skeleton rounded-full", className ?? "size-10")} aria-hidden />;
  return <div className={clsx("skeleton rounded-tag", className)} aria-hidden />;
}

/* ----------------------------------------------------------------------------- EmptyState */
/**
 * Friendly empty state with Tami or a BlockBuddy.
 *   <EmptyState title="Nothing saved yet." body="Go window-shop the library." action={<Button href="/courses">Browse courses</Button>} />
 *   <EmptyState art="buddy" tone="mint" compact … />
 *   <EmptyState headingRef={h} … />   then h.current?.focus() after an action empties the list
 * Passing headingId or headingRef makes the title programmatically focusable (tabIndex -1).
 */
export function EmptyState({
  title,
  body,
  action,
  art = "tami",
  tone = "butter",
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
  tone?: Tone;
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
  const focusable = headingId !== undefined || headingRef !== undefined;
  return (
    <div ref={ref} id={id} className={clsx("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-12 md:py-16", className)}>
      {art !== "none" && (
        <div className={clsx("relative grid place-items-center rounded-full", toneBg[tone], compact ? "size-24" : "size-32 md:size-36")} aria-hidden>
          {art === "tami" && <Mascot title="" className={compact ? "w-14" : "w-[4.5rem] md:w-20"} style={{ transform: "rotate(-6deg)" }} />}
          {art === "buddy" && <BlockBuddy body="#2668fd" head="#ffcf3f" wave className={compact ? "w-10" : "w-12 md:w-14"} />}
          {art === "buddies" && (
            <span className="flex items-end gap-1">
              <BlockBuddy body="#ff008c" head="#ffcf3f" hat="#2668fd" className={compact ? "w-8" : "w-10"} />
              <BlockBuddy body="#00b351" head="#f780d4" wave className={compact ? "w-9" : "w-11"} />
            </span>
          )}
        </div>
      )}
      <Heading
        ref={headingRef}
        id={headingId}
        tabIndex={focusable ? -1 : undefined}
        className={clsx("t-app-h2 max-w-[22ch]", art !== "none" && "mt-5", focusable && "rounded-tag outline-none focus-visible:ring-2 focus-visible:ring-ink/40")}
      >
        {title}
      </Heading>
      {body && <p className="t-small mt-2 max-w-[38ch] text-ink/65">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
