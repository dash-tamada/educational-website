import Link from "next/link";
import clsx from "clsx";
import { toneBg, toneText, type Tone } from "@/lib/landing-data";
import { Parallax } from "@/components/motion/Parallax";

/* =============================================================================
   Shared decor + UI bits (spec V2). Everything is FLAT: no ink borders, no hard
   shadows. Resting tilts are inline styles (props), never Tailwind rotate classes.
   ============================================================================= */

/* ----------------------------------------------------------------------------- HighlightBox */
/**
 * Flat rotated highlight box inside a display heading (spec V2 §4).
 * tone = contrasting field colour: "blue" on sun/cream, "sun" on blue/flame,
 * "lime" on purple/green/magenta. Max one per heading, ~3 per page.
 * It carries a built-in margin-top of 0.18em so a box on its own line never
 * overlaps the line above in tight display headings (lh 0.86-0.88); do not add
 * your own mt-[0.2em]. Pass flush to drop it (box sharing the first line).
 */
export function HighlightBox({
  children,
  tone = "blue",
  rotate = -3,
  flush,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  rotate?: number;
  /** no built-in top margin (use when the box sits on the heading's first line) */
  flush?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-block rounded-[0.18em] px-[0.2em] pt-[0.06em] pb-[0.02em] align-baseline leading-[0.92]",
        !flush && "mt-[0.18em]",
        toneBg[tone],
        toneText[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** @deprecated alias of <HighlightBox tone="lime">. Prefer HighlightBox with a field-appropriate tone. */
export function LimeBox(props: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  tone?: Tone;
}) {
  return <HighlightBox tone="lime" {...props} />;
}

/* ----------------------------------------------------------------------------- Script */
/** Script accent word (Yellowtail). Max 2 on the page: hero + final CTA. */
export function Script({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-block px-[0.06em] font-script font-normal tracking-normal normal-case",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------- HandNote */
/**
 * Handwritten side note (Aardvark). Caveat 600, indigo by default (pass text-white
 * on dark fields), tilted -6..-10deg, writes on when scrolled into view.
 * Max one per section.
 */
export function HandNote({
  children,
  className,
  rotate = -8,
  write = true,
  large,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  /** write-on reveal (R7); set false when a parent already animates it */
  write?: boolean;
  /** 30px "Step #n" size */
  large?: boolean;
}) {
  return (
    <p
      data-reveal={write ? "write" : undefined}
      className={clsx(large ? "t-hand-lg" : "t-hand", "text-indigo", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------------------- Eyebrow */
/**
 * Capsule label above a heading (Maxima "OUR STORY"): 13px caps, flat, no tilt.
 * tone = contrasting colour on its field: blue on cream/sun, sun on blue,
 * white on green/flame/purple. Followed by the heading at mt-eyebrow.
 */
export function Eyebrow({
  children,
  tone = "blue",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "t-eyebrow inline-flex items-center gap-1.5 rounded-full px-3 py-[7px]",
        toneBg[tone],
        toneText[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------- Tag */
/** Small tag pill for cards (12.5px, radius 999). */
export function Tag({
  children,
  tone = "white",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "t-tag inline-flex items-center gap-1 rounded-full px-2 py-[5px] whitespace-nowrap",
        toneBg[tone],
        toneText[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------- Sticker */
const stickerSize = {
  sm: "text-[clamp(1.125rem,0.95rem+0.8vw,1.5rem)] px-[0.5em] pt-[0.3em] pb-[0.26em]",
  md: "text-[clamp(1.375rem,1rem+1.6vw,2.5rem)] px-[0.42em] pt-[0.26em] pb-[0.22em]",
  lg: "t-sticker px-[0.4em] pt-[0.24em] pb-[0.2em]",
} as const;

/** Split a label at the space closest to its middle (for 2-line stickers). */
function splitHalf(text: string): [string, string] | null {
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++)
    if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? null : [text.slice(0, best), text.slice(best + 1)];
}

/**
 * Flat Aardvark pill sticker (no border, no shadow). `rotate` is the resting
 * tilt (inline). Add className="hover-wiggle" for the H9 hover.
 * lines={2}: a centred two-line sticker; a string label is split at the space
 * nearest its middle (no <br> needed), other children wrap normally.
 */
export function Sticker({
  children,
  tone,
  rotate = 0,
  size = "md",
  lines = 1,
  className,
}: {
  children: React.ReactNode;
  tone: Tone;
  rotate?: number;
  size?: keyof typeof stickerSize;
  lines?: 1 | 2;
  className?: string;
}) {
  const two = lines === 2;
  const halves = two && typeof children === "string" ? splitHalf(children) : null;
  return (
    <span
      className={clsx(
        "inline-block font-heading leading-[0.88] font-extrabold tracking-[-0.03em] [font-variation-settings:'opsz'_96]",
        two ? "rounded-[0.62em] text-center" : "rounded-full whitespace-nowrap",
        stickerSize[size],
        two && "pt-[0.34em] pb-[0.3em]",
        toneBg[tone],
        toneText[tone],
        className,
      )}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {halves ? (
        <>
          <span className="block whitespace-nowrap">{halves[0]}</span>
          <span className="block whitespace-nowrap">{halves[1]}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

/* ----------------------------------------------------------------------------- ArrowButton */
export type BtnVariant =
  | "pink"
  | "flame"
  | "blue"
  | "ink"
  | "paper"
  | "forest"
  | "sun"
  /** @deprecated lime is no longer a button colour; renders as pink */
  | "lime";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M8 5.5v13l10.5-6.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The one button: flat split pill (label pill + round arrow chip), spec V2 §5.
 * Internal hrefs render a next/link, which the global route-transition
 * interceptor turns into a curtain transition (same-page #hash => Lenis scroll).
 * Without href it renders a <button>.
 *
 *   <ArrowButton href="/courses">Browse courses</ArrowButton>
 *   <ArrowButton href="/signup" variant="flame" size="sm" />
 *   <ArrowButton href="/courses" variant="paper" bubble>Watch it free</ArrowButton>  (H1b: hero + final CTA only)
 *   <ArrowButton href={p.href} variant="ink" fullWidth>Browse courses</ArrowButton>  (pricing)
 *
 * Variants: pink (default, Aardvark CTA) | flame | blue | ink | paper (on colour
 * fields) | forest (on green) | sun. Hover H1: squash + label roll + arrow swap.
 *   <ArrowButton href="/signup" variant="flame" compact>Start free</ArrowButton>  (48px pill, no chip)
 */
export function ArrowButton({
  href,
  children,
  variant = "pink",
  size = "md",
  fullWidth,
  bubble,
  compact,
  icon = "arrow",
  className,
  onClick,
  type = "button",
  "aria-label": ariaLabel,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** Maxima bubble hover (H1b) for the hero and final CTA buttons */
  bubble?: boolean;
  /** label pill only, no arrow chip, 48px tall at every width (mobile header CTA) */
  compact?: boolean;
  icon?: "arrow" | "play";
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  type?: "button" | "submit";
  "aria-label"?: string;
}) {
  const v = variant === "lime" ? "pink" : variant;
  const Icon = icon === "play" ? PlayIcon : ArrowIcon;
  const inner = (
    <>
      <span className="btn-label">
        <span className="btn-roll">
          <span className="btn-roll-track">
            <span>{children}</span>
            <span aria-hidden>{children}</span>
          </span>
        </span>
      </span>
      {!compact && (
        <span className="btn-chip" aria-hidden>
          <Icon />
          <Icon />
        </span>
      )}
    </>
  );
  const attrs = {
    className: clsx("btn", className),
    "data-variant": v,
    "data-size": size === "md" ? undefined : size,
    "data-full": fullWidth ? "" : undefined,
    "data-bubble": bubble ? "" : undefined,
    "data-compact": compact ? "" : undefined,
    "aria-label": ariaLabel,
    onClick,
  };
  if (!href) {
    return (
      <button type={type} {...attrs}>
        {inner}
      </button>
    );
  }
  if (/^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href)) {
    return (
      <a href={href} {...attrs} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} {...attrs}>
      {inner}
    </Link>
  );
}

/** Round arrow chip on its own (e.g. "see all" links, card corners). */
export function ArrowDot({
  className,
  tone = "hotpink",
}: {
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={clsx(
        "grid size-9 shrink-0 place-items-center rounded-full",
        toneBg[tone],
        toneText[tone],
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[45%]" fill="none">
        <path
          d="M4.5 12h14M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ----------------------------------------------------------------------------- SectionHead */
/**
 * Eyebrow -> heading -> body block with the shared rhythm (16/12, 20/16).
 * kind="display" = Maxima caps (.t-display-l), kind="chunky" = Aardvark (.t-chunky-xl).
 * The heading reveals with line masks (R1), the body rises after it.
 * Follow it with content at mt-head and a CTA row at mt-cta.
 */
export function SectionHead({
  eyebrow,
  eyebrowTone = "blue",
  title,
  body,
  kind = "display",
  align = "center",
  as: H = "h2",
  id,
  className,
  titleClassName,
  bodyClassName,
  reveal = true,
}: {
  eyebrow?: React.ReactNode;
  eyebrowTone?: Tone;
  title: React.ReactNode;
  body?: React.ReactNode;
  kind?: "display" | "chunky";
  align?: "center" | "left";
  as?: "h1" | "h2" | "h3";
  /** id for the heading element (use with aria-labelledby on the section) */
  id?: string;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  reveal?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}
      <H
        id={id}
        data-reveal={reveal ? "lines" : undefined}
        className={clsx(
          kind === "display" ? "t-display-l" : "t-chunky-xl",
          eyebrow && "mt-eyebrow",
          "max-w-[18ch]",
          titleClassName,
        )}
      >
        {title}
      </H>
      {body && (
        <p
          data-reveal={reveal ? "rise" : undefined}
          data-reveal-delay={reveal ? "0.15" : undefined}
          className={clsx("t-body-l mt-sub max-w-[36rem] opacity-80", bodyClassName)}
        >
          {body}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- Blobs */
/** Legacy single-tone wave blob. Prefer <BlobSet tone=...>. */
export function Blob({
  className,
  fill,
  variant = 0,
}: {
  className?: string;
  fill: string;
  variant?: 0 | 1 | 2;
}) {
  const paths = [
    "M0 210 C120 120 210 260 330 190 S520 40 640 120 S860 260 1000 150 V600 H0Z",
    "M0 330 C160 250 250 120 420 190 S640 360 780 250 S930 90 1000 140 V600 H0Z",
    "M0 120 C180 40 300 210 470 150 S720 20 840 110 S960 210 1000 180 V600 H0Z",
  ];
  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      className={clsx("pointer-events-none absolute", className)}
      aria-hidden
    >
      <path d={paths[variant]} fill={fill} />
    </svg>
  );
}

export type BlobTone =
  | "sun"
  | "butter"
  | "blush"
  | "cyan"
  | "magenta"
  | "mint"
  | "green"
  | "blue"
  | "flame"
  | "purple";

/** [big bottom wave, top-right lobe, accent blobs] per panel colour (2-3 tones of it). */
const BLOB_TONES: Record<BlobTone, [string, string, string]> = {
  sun: ["#ffe07a", "#fff2b7", "#f9a220"],
  butter: ["#ffe9a0", "#fffae0", "#ffd86b"],
  blush: ["#ffc2fa", "#ffeefe", "#ffa6f4"],
  cyan: ["#7feff0", "#d6fbfb", "#4fe0e4"],
  magenta: ["#ff7af6", "#ffa3f9", "#e62bd8"],
  mint: ["#c6f4bb", "#e4fadf", "#86db75"],
  green: ["#1fc165", "#45d07f", "#009646"],
  blue: ["#4a82ff", "#6e9bff", "#1c55e0"],
  flame: ["#ff6a2e", "#ff8a55", "#e23a00"],
  purple: ["#4a3fa6", "#5a4db8", "#2e2577"],
};

const BLOB_PATHS = {
  wave: "M0 640 C120 560 230 690 380 640 C520 594 600 470 760 520 C880 558 940 640 1000 610 V1000 H0 Z",
  lobe: "M600 0 H1000 V330 C940 400 850 380 800 310 C750 240 680 250 630 180 C590 120 560 50 600 0 Z",
  left: "M0 300 C70 260 150 290 170 360 C192 440 120 500 50 500 C30 500 12 495 0 490 Z",
  corner: "M760 1000 C770 905 860 845 940 862 C968 868 988 878 1000 888 V1000 Z",
};

/**
 * Aardvark multi-tone wavy blobs for an inset panel / field. Put it as the first
 * child of a `.panel` / `.field` (they isolate, so -z-10 sits above the panel fill
 * and below content). The layer is 14% taller than the panel and drifts slower
 * than the page (yPercent -6 -> 6), so no edge ever shows.
 */
export function BlobSet({
  tone,
  className,
  parallax = true,
  flip,
}: {
  tone: BlobTone;
  className?: string;
  parallax?: boolean;
  /** mirror horizontally to vary neighbouring panels */
  flip?: boolean;
}) {
  const [a, b, c] = BLOB_TONES[tone];
  const svg = (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path d={BLOB_PATHS.lobe} fill={b} />
      <path d={BLOB_PATHS.wave} fill={a} />
      <path d={BLOB_PATHS.left} fill={c} />
      <path d={BLOB_PATHS.corner} fill={c} />
    </svg>
  );
  const box = clsx(
    "pointer-events-none absolute inset-x-0 -top-[7%] -bottom-[7%] -z-10",
    className,
  );
  return parallax ? (
    <Parallax className={box} yPercent={[-6, 6]} mobile={0.6}>
      {svg}
    </Parallax>
  ) : (
    <div className={box} aria-hidden>
      {svg}
    </div>
  );
}

/* ----------------------------------------------------------------------------- Sparkle */
/** Four-point sparkle doodle (flat by default). */
export function Sparkle({
  className,
  fill = "#c8ff2e",
  stroke,
  style,
}: {
  className?: string;
  fill?: string;
  /** optional outline colour (legacy look) */
  stroke?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      <path
        d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 2.5 : undefined}
        strokeLinejoin="round"
      />
    </svg>
  );
}
