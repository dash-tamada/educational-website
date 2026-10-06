"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { toneBg, type Tone } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import type { CourseCardData, CourseProgress } from "@/lib/mock";
import { formatDuration, formatINR, formatNumber } from "@/lib/mock/format";
import { Tag } from "@/components/decor/Bits";
import { Avatar, ProgressBar, Rating } from "./Display";
import { Icon } from "./icons";

/* =============================================================================
   CourseCard: the Aardvark colour card from the landing carousel, as a static
   grid card (no parallax/GSAP). Shared by the catalog, dashboard and wishlist.

     const data = getCourseCard("web-dev-from-zero", db)!;
     <CourseCard data={data} />                                     catalog card -> /courses/[slug]
     <CourseCard data={data} wishlisted={w} onToggleWishlist={() => demo.toggleWishlist(uid, data.course.id)} />
     <CourseCard data={data} variant="progress" progress={getCourseProgress(uid, id, db)} />   -> continue in /learn
                                                                     (pill: Start / Continue / Rewatch; ctaLabel overrides; statusLabel overrides the tag)
     <CourseCard data={data} variant="compact" />                    phone row card (lists, sidebars): 112x70 16:10 thumb,
                                                                     2-line title, tutor · rating · price, Free preview tag,
                                                                     heart (44px target) when onToggleWishlist is set;
                                                                     progress -> 6px bar + "14/25"; owned -> "In your library"
     <CourseCard data={data} owned />                                catalog card for a course already in the
                                                                     viewer's library: "In your library" tag,
                                                                     no heart / price / free-preview tag, opens /learn

   hideWishlist hides the heart even when onToggleWishlist is passed (owned implies it).

   The whole card is clickable (stretched link on the title); the heart button
   sits above it. Dark frames (blue, purple, …) switch to white text.
   ============================================================================= */

/* Frames dark enough for white text (incl. 12.5px meta). Mid tones (hotpink,
   flame, green, lilac) carry ink text: white fails AA on them. */
const DARK = new Set<Tone>(["blue", "purple", "indigo", "forest", "olive"]);
/* Opacity for secondary text that still clears 4.5:1 on each frame (ink or white). */
const MUTED: Partial<Record<Tone, number>> = {
  blue: 1,
  olive: 1,
  purple: 0.9,
  indigo: 0.9,
  hotpink: 1,
  flame: 1,
  tomato: 1,
  lilac: 0.9,
  green: 0.9,
  magenta: 0.9,
};
/* Warm frames where tangerine stars vanish (tangerine on tangerine, faint on sun): ink stars. */
const INK_STARS = new Set<Tone>([
  "sun",
  "yellow",
  "butter",
  "tangerine",
  "orange",
  "flame",
  "tomato",
  "hotpink",
  "magenta",
  "lime",
  "bubblegum",
  "blush",
  "lilac",
]);
const BADGE_TONE: Record<string, Tone> = {
  BESTSELLER: "hotpink",
  NEW: "green",
  "JUST DROPPED": "blue",
};

export function CourseCard({
  data,
  variant = "catalog",
  progress,
  wishlisted,
  onToggleWishlist,
  href,
  priority,
  className,
  headingLevel = "h3",
  owned = false,
  hideWishlist = false,
  ctaLabel,
  statusLabel,
}: {
  data: CourseCardData;
  variant?: "catalog" | "progress" | "compact";
  progress?: CourseProgress;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
  /** override the destination (default: /courses/[slug], progress: /learn/[slug]/[resume]) */
  href?: string;
  /** next/image preload for above-the-fold cards */
  priority?: boolean;
  className?: string;
  headingLevel?: "h2" | "h3";
  /** catalog/compact: the viewer already has this course (enrolled, owner). Shows "In your library",
   *  swaps the price for an Open pill, hides the heart and the free-preview tag, links to /learn/[slug]. */
  owned?: boolean;
  /** hide the wishlist heart even when onToggleWishlist is set */
  hideWishlist?: boolean;
  /** progress variant: override the pill label (default "Start" / "Continue" / "Rewatch" at 100%) */
  ctaLabel?: string;
  /** progress variant: override the corner tag (default "N% done" / "Just started" / "Not started" / "Done").
      Honoured on finished cards too (still the green tag), e.g. "Certificate ready". */
  statusLabel?: string;
}) {
  const { course, tutor, category, stats } = data;
  const H = headingLevel;
  const dark = DARK.has(course.tone);
  const isOwned = owned && variant !== "progress";
  const showHeart = !!onToggleWishlist && !hideWishlist && !isOwned;
  const dest =
    href ??
    (variant === "progress"
      ? `/learn/${course.slug}${progress?.resumeItemId ? `/${progress.resumeItemId}` : ""}`
      : isOwned
        ? `/learn/${course.slug}`
        : `/courses/${course.slug}`);
  const done = progress?.percent === 100;
  // 0% but they've pressed play (or tried a quiz): that's "Just started" / Continue, not "Not started"
  const started = !!progress && (progress.percent > 0 || !!progress.lastActivityAt || progress.resumePositionSec > 0);

  if (variant === "compact") {
    return (
      <article className={clsx("group hover-lift tap relative flex items-center gap-3 rounded-card bg-white p-2.5 shadow-soft", showHeart ? "pr-1.5" : "pr-3.5", className)}>
        <div className={clsx("relative aspect-[16/10] w-[112px] shrink-0 overflow-hidden rounded-[12px]", toneBg[course.tone])}>
          <Image src={cropSrc(course.thumbnail, 10 / 16)} alt="" fill sizes="112px" preload={priority} className="object-cover" />
          {!progress && !isOwned && course.status === "published" && (
            <span className="absolute bottom-1 left-1 inline-flex h-5 items-center gap-0.5 rounded-full bg-sun px-1.5 text-[12px] leading-none font-bold tracking-[0.02em] text-ink uppercase">
              <Icon name="play" className="size-2.5" />
              Free
              <span className="sr-only"> preview</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <H className="line-clamp-2 text-[16px] leading-[1.15] font-bold tracking-[-0.015em]">
            <Link
              href={dest}
              className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-blue"
            >
              {course.title}
            </Link>
          </H>
          {progress ? (
            <>
              <p className="mt-1 truncate text-[13px] font-semibold text-ink/65">
                {tutor?.name} · {progress.completed}/{progress.total}
              </p>
              <ProgressBar value={progress.percent} size="sm" className="mt-1.5" label={`${course.title} progress`} />
            </>
          ) : (
            <p className="mt-1 flex min-w-0 items-center gap-1 text-[13px] font-semibold text-ink/65">
              <span className="truncate">{tutor?.name}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Icon name="star" className="size-3.5 text-tangerine" />
                <span className="sr-only">Rated </span>
                {course.rating.toFixed(1)}
              </span>
              <span aria-hidden>·</span>
              {isOwned ? (
                <span className="inline-flex shrink-0 items-center gap-1 font-bold text-forest">
                  <Icon name="check-circle" className="size-3.5" />
                  Owned
                </span>
              ) : (
                <span className="shrink-0 font-bold text-ink">{formatINR(course.price)}</span>
              )}
            </p>
          )}
        </div>
        {showHeart && (
          <button
            type="button"
            onClick={onToggleWishlist}
            aria-pressed={!!wishlisted}
            aria-label={wishlisted ? `Remove ${course.title} from wishlist` : `Save ${course.title} to wishlist`}
            className="tap relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-ink active:bg-ink/[0.06]"
          >
            <svg viewBox="0 0 24 24" className={clsx("size-5", wishlisted ? "text-hotpink" : "text-ink")} aria-hidden>
              <path
                d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7z"
                fill={wishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </article>
    );
  }

  return (
    <article
      className={clsx(
        "group hover-lift hover-zoom-parent relative flex h-full flex-col rounded-card p-3 pb-[18px]",
        toneBg[course.tone],
        dark ? "text-white" : "text-ink",
        className,
      )}
      style={{ "--muted": MUTED[course.tone] ?? 0.8 } as React.CSSProperties}
    >
      <div className="relative overflow-hidden rounded-img bg-ink">
        <div className="relative aspect-[4/3]">
          <Image
            src={cropSrc(course.thumbnail, 3 / 4)}
            alt=""
            fill
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
            preload={priority}
            className="hover-zoom object-cover"
          />
        </div>
        {/* Top row: status / badge. Bounded on the right so it wraps instead of sliding under the heart. */}
        <div
          className={clsx(
            "absolute top-3 left-3 flex flex-wrap gap-1.5",
            showHeart ? "right-14" : "right-3",
          )}
        >
          {variant === "progress" ? (
            done ? (
              <Tag tone="green" className="tracking-[0.04em] uppercase">
                {statusLabel ?? "Done"}
              </Tag>
            ) : (
              <Tag tone="white" className="tracking-[0.04em] uppercase">
                {statusLabel ??
                  (progress?.percent
                    ? `${progress.percent}% done`
                    : started
                      ? "Just started"
                      : "Not started")}
              </Tag>
            )
          ) : (
            <>
              {isOwned && (
                <Tag tone="green" className="tracking-[0.04em] uppercase">
                  <Icon name="check" className="size-2.5" strokeWidth={3} />
                  In your library
                </Tag>
              )}
              {!isOwned && course.badge && (
                <Tag
                  tone={BADGE_TONE[course.badge] ?? "white"}
                  className="tracking-[0.04em] uppercase"
                >
                  {course.badge}
                </Tag>
              )}
            </>
          )}
        </div>
        {/* The free first video sits on its own corner, like a play overlay, so it never competes with the badge. */}
        {variant !== "progress" &&
          !isOwned &&
          course.status === "published" && (
            <div className="absolute bottom-3 left-3">
              <Tag tone="sun" className="tracking-[0.04em] uppercase">
                <Icon name="play" className="size-2.5" />
                Free preview
              </Tag>
            </div>
          )}
        {showHeart && (
          <button
            type="button"
            onClick={onToggleWishlist}
            aria-pressed={!!wishlisted}
            aria-label={
              wishlisted
                ? `Remove ${course.title} from wishlist`
                : `Save ${course.title} to wishlist`
            }
            className="tap hover-icon hit absolute top-2.5 right-2.5 z-10 grid size-10 place-items-center rounded-full bg-white text-ink shadow-soft"
          >
            <svg
              viewBox="0 0 24 24"
              className={clsx(
                "size-5",
                wishlisted ? "text-hotpink" : "text-ink",
              )}
              aria-hidden
            >
              <path
                d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7z"
                fill={wishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1.5 pt-3.5">
        <div className="flex flex-wrap gap-1.5">
          {category && <Tag tone={dark ? "white" : "ink"}>{category.name}</Tag>}
          <Tag tone={dark ? "ink" : "white"}>{course.level}</Tag>
        </div>
        <H className="mt-3 font-heading text-[clamp(1.375rem,1.2rem+0.4vw,1.625rem)] leading-[0.95] font-extrabold tracking-[-0.025em] [font-variation-settings:'opsz'_96]">
          <Link
            href={dest}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-4 focus-visible:after:outline-blue"
          >
            {course.title}
          </Link>
        </H>
        {variant === "catalog" && (
          <p className="mt-2 line-clamp-2 text-[14.5px] leading-[1.35] font-medium opacity-(--muted)">
            {course.promise}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
          {tutor && (
            <Avatar
              name={tutor.name}
              src={tutor.avatar}
              tone={tutor.tone}
              size="xs"
              decorative
            />
          )}
          <span className="truncate">{tutor?.name}</span>
        </div>
        <p className="mt-1 text-[12.5px] font-semibold opacity-(--muted)">
          {stats.modules} modules · {stats.videos} lessons ·{" "}
          {formatDuration(stats.totalSec)}
        </p>

        <div className="mt-auto pt-4">
          {variant === "progress" && progress ? (
            <div>
              <ProgressBar
                value={progress.percent}
                tone={dark ? "white" : "ink"}
                track="dark"
                label={`${course.title} progress`}
              />
              <div className="mt-3 flex items-center justify-between gap-2 text-[13px] font-bold">
                <span className="opacity-(--muted)">
                  {progress.completed}/{progress.total} items
                </span>
                <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-ink">
                  {ctaLabel ?? (done ? "Rewatch" : progress.percent || started ? "Continue" : "Start")}
                  <Icon
                    name="arrow-right"
                    className="size-4"
                    strokeWidth={2.4}
                  />
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 text-[13px] font-semibold">
                <Rating
                  value={course.rating}
                  count={course.reviewCount}
                  size="sm"
                  tone={INK_STARS.has(course.tone) ? "ink" : "tangerine"}
                  countClassName="opacity-(--muted)"
                  className="whitespace-nowrap"
                />
                <div className="mt-1 opacity-(--muted)">
                  {formatNumber(course.learners)} learners
                </div>
              </div>
              {isOwned ? (
                <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold text-ink">
                  Open
                  <Icon
                    name="arrow-right"
                    className="size-4"
                    strokeWidth={2.4}
                  />
                </span>
              ) : (
                /* compare-at price stacks above the pill so the rating keeps its line on narrow cards */
                <span className="flex shrink-0 flex-col items-end">
                  {course.compareAtPrice && (
                    <span className="mb-1 text-[13px] leading-none font-semibold line-through opacity-(--muted)">
                      <span className="sr-only">Was </span>
                      {formatINR(course.compareAtPrice)}
                    </span>
                  )}
                  <span className="inline-block rounded-full bg-white px-3 pt-[7px] pb-[6px] font-heading text-[17px] leading-none font-extrabold tracking-[-0.02em] text-ink">
                    {course.compareAtPrice && (
                      <span className="sr-only">Now </span>
                    )}
                    {formatINR(course.price)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
