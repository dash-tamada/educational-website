import Link from "next/link";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { toneBg, toneText, type Tone } from "@/lib/landing-data";

/* Small presentational pieces shared by the student pages (server-safe). */

/** Flame glyph for streaks (the shared icon set has none). */
export function FlameIcon({
  className,
  lit = true,
}: {
  className?: string;
  lit?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12.4 2.6c.4 3-1.3 4.6-2.8 6.2C8 10.5 6.5 12.2 6.5 15a5.5 5.5 0 0 0 11 0c0-2.6-1.3-4.4-2.4-5.7-.2 1.3-.8 2.3-1.8 2.8.4-3.6-.4-6.9-.9-9.5z"
        fill={lit ? "#fd4401" : "currentColor"}
        opacity={lit ? 1 : 0.18}
      />
      {lit && (
        <path
          d="M12 21a3.2 3.2 0 0 1-3.2-3.2c0-1.7 1.2-2.6 2.1-3.7.3 1 .9 1.6 1.7 1.9.3-.9.2-1.9 0-2.9 1.5 1.1 2.6 2.6 2.6 4.7A3.2 3.2 0 0 1 12 21z"
          fill="#ffcf3f"
        />
      )}
    </svg>
  );
}

/** Section title row used between card groups on the dashboard. */
export function SectionTitle({
  id,
  title,
  description,
  action,
  className,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:mb-5",
        className,
      )}
    >
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

/** "See all →" text link. */
export function SeeAll({
  href,
  children = "See all",
}: {
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group tap -mx-3 inline-flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-bold text-ink/80 coarse:h-11 focus-visible:bg-white hf:bg-white hf:text-ink"
    >
      {children}
      <Icon
        name="arrow-right"
        className="size-4 transition-[translate] duration-200 ease-ui group-hf:translate-x-0.5"
        strokeWidth={2.4}
      />
    </Link>
  );
}

/** Round tinted icon tile. */
export function IconDot({
  icon,
  tone = "butter",
  size = "md",
  className,
}: {
  icon: IconName;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid shrink-0 place-items-center rounded-full",
        toneBg[tone],
        toneText[tone],
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
    >
      <Icon
        name={icon}
        className={size === "sm" ? "size-4" : "size-[18px]"}
        strokeWidth={2.3}
      />
    </span>
  );
}

/** Two-week activity strip (oldest first): fixed-size dots, so it never balloons on wide cards. */
/** `tone` is the card behind it (the ring around today is offset in that colour; "alt" = mint, blush from xl). */
export function StreakStrip({
  days,
  className,
  labels = true,
  tone = "sun",
}: {
  days: boolean[];
  className?: string;
  labels?: boolean;
  tone?: "sun" | "alt";
}) {
  const active = days.filter(Boolean).length;
  return (
    <div className={clsx("w-full max-w-[300px]", className)}>
      <div
        role="img"
        className="grid grid-cols-[repeat(7,auto)] justify-between gap-y-1.5"
        aria-label={`Active on ${active} of the last ${days.length} days`}
      >
        {days.map((on, i) => {
          const ago = days.length - 1 - i;
          const when =
            ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`;
          return (
            <span
              key={i}
              className={clsx(
                "grid size-7 place-items-center rounded-full sm:size-8",
                on ? "bg-ink text-sun" : "bg-white/60 text-ink/30",
                ago === 0 &&
                  clsx(
                    "ring-2 ring-ink ring-offset-2",
                    tone === "alt"
                      ? "ring-offset-mint xl:ring-offset-blush"
                      : "ring-offset-sun",
                  ),
              )}
              title={`${when}: ${on ? "learned" : "no learning"}`}
            >
              {on ? (
                <Icon name="check" className="size-3.5" strokeWidth={3.4} />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
          );
        })}
      </div>
      {labels && (
        <div
          aria-hidden
          className="mt-1.5 flex justify-between text-[12px] font-bold text-ink/75"
        >
          <span>2 weeks ago</span>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}

/** Small badges never go under 12px on phones (MOBILE_SPEC §1.2: 12px is the floor for text). */
export const BADGE_SM = "max-sm:text-[12px]";

/**
 * Extra classes for StatTile on phones: a little less padding and no decorative icon below
 * 400px, so labels like "Certificates" or "Courses completed" never break mid-word in the
 * two-column grid.
 */
export const TILE_TIGHT = "max-sm:p-4 max-[400px]:[&_span[aria-hidden]]:hidden";

/** Tabs className: on phones the four filter tabs sit in a 2x2 grid instead of scrolling out of view. */
export const TABS_GRID_SM =
  "max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:rounded-[22px] max-sm:[&>*]:justify-center max-sm:[&>*:last-child:nth-child(odd)]:col-span-2";

/**
 * Course-card grids run 1 column on phones, 2 from sm and 3 from xl. Hide the overflow
 * card(s) per breakpoint so no row is left half-empty: phones show up to 3, two columns
 * show an even count, three columns a multiple of three.
 */
export function fillGridHide(
  i: number,
  n: number,
  { filler = false }: { filler?: boolean } = {},
) {
  // with a filler tile completing the two-column row, every card stays
  const two = filler ? n : n >= 2 ? n - (n % 2) : n;
  const three = n >= 3 ? n - (n % 3) : n;
  return (
    clsx(
      i >= 3 && "max-sm:hidden",
      i >= two && "sm:max-xl:hidden",
      i >= three && "xl:hidden",
    ) || undefined
  );
}

/**
 * Fills the empty slot of a two-column course grid with an odd number of cards (visible
 * from sm to xl only), so the last row never sits half-empty.
 */
export function BrowseTile({ show, count }: { show: boolean; count?: number }) {
  if (!show) return null;
  return (
    <Link
      href="/courses"
      className="group hover-lift hidden min-h-[240px] flex-col items-start justify-between gap-6 rounded-card bg-butter p-6 shadow-soft sm:max-xl:flex"
    >
      <Mascot
        title=""
        className="w-24"
        style={{ transform: "rotate(-8deg)" }}
      />
      <span className="block">
        <span className="block t-app-h2">Still browsing?</span>
        <span className="mt-1.5 block t-small text-ink/75">
          {count ? `${count} courses` : "The whole library"}, every one with a
          free first lesson.
        </span>
        <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-bold text-cream">
          Browse all courses
          <Icon
            name="arrow-right"
            className="size-4 transition-[translate] duration-200 ease-ui group-hf:translate-x-0.5"
            strokeWidth={2.4}
          />
        </span>
      </span>
    </Link>
  );
}

/**
 * Completes a course grid (1 column on phones, 2 from sm, 3 from xl) that shows only `n` = 1 or 2
 * cards, so the row never sits half empty: with 1 card it takes the free slot from sm and the two
 * free slots from xl; with 2 cards it takes the third slot from xl. Hidden on phones.
 */
export function GridFiller({
  n,
  href,
  title,
  body,
  cta,
  eyebrow,
  icon = "arrow-right",
  tone = "butter",
  listItem = false,
}: {
  n: number;
  href: string;
  title: string;
  body: string;
  cta: string;
  eyebrow?: string;
  icon?: "arrow-right" | "play";
  tone?: Tone;
  /** render inside an <li> (for grids that are lists); the li carries the responsive visibility */
  listItem?: boolean;
}) {
  if (n !== 1 && n !== 2) return null;
  const slot = n === 1 ? "sm:block xl:col-span-2" : "xl:block";
  const link = (
    <Link
      href={href}
      className={clsx(
        "group hover-lift @container min-h-[240px] rounded-card p-6 shadow-soft",
        toneBg[tone],
        toneText[tone],
        listItem ? "block h-full" : clsx("hidden", slot),
      )}
    >
      <span className="flex h-full flex-col items-start justify-between gap-6 @[460px]:flex-row @[460px]:items-center @[460px]:justify-start @[460px]:gap-8">
        {icon === "play" ? (
          <span
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-full bg-white/70 @[460px]:size-24"
          >
            <Icon
              name="play"
              className="size-8 translate-x-0.5"
              strokeWidth={2.2}
            />
          </span>
        ) : (
          <Mascot
            title=""
            className="w-24 shrink-0 @[460px]:w-28"
            style={{ transform: "rotate(-8deg)" }}
          />
        )}
        <span className="block max-w-[34ch]">
          {eyebrow && (
            <span className="mb-1.5 block text-[12px] font-bold tracking-[0.06em] text-ink/75 uppercase">
              {eyebrow}
            </span>
          )}
          <span className="block t-app-h2 text-balance">{title}</span>
          <span className="mt-1.5 block t-small text-ink/75">{body}</span>
          <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-bold text-cream">
            {cta}
            <Icon
              name="arrow-right"
              className="size-4 transition-[translate] duration-200 ease-ui group-hf:translate-x-0.5"
              strokeWidth={2.4}
            />
          </span>
        </span>
      </span>
    </Link>
  );
  return listItem ? <li className={clsx("hidden", slot)}>{link}</li> : link;
}
