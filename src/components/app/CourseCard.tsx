"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { cropSrc } from "@/lib/img";
import type { CourseCardData, CourseProgress } from "@/lib/mock";
import { formatDuration, formatINR, formatNumber } from "@/lib/mock/format";
import { Avatar, ProgressBar, Rating } from "./Display";
import { Icon } from "./icons";

/* =============================================================================
   CourseCard, design system v2: an editorial POSTER card. A square-cornered still,
   tiny-caps meta, the title in Anton condensed caps, mono numbers, a hairline-ruled
   footer. No colour frames (course.tone is ignored). Shared by the catalog,
   dashboard and wishlist.

     const data = getCourseCard("ai-filmmaking", db)!;
     <CourseCard data={data} />                                     catalog card -> /courses/[slug]
     <CourseCard data={data} wishlisted={w} onToggleWishlist={() => demo.toggleWishlist(uid, data.course.id)} />
     <CourseCard data={data} variant="progress" progress={getCourseProgress(uid, id, db)} />   -> continue in /learn
                                                                     (Start / Continue / Rewatch; ctaLabel overrides; statusLabel overrides the slate)
     <CourseCard data={data} variant="compact" />                    phone row card (lists, sidebars): 112x70 still,
                                                                     2-line title, tutor · rating · price, Free preview slate,
                                                                     heart (44px target) when onToggleWishlist is set;
                                                                     progress -> thin red line + "14/25"; owned -> "Owned"
     <CourseCard data={data} owned />                                catalog card for a course already in the
                                                                     viewer's library: "In your library" slate,
                                                                     no heart / price / free-preview slate, opens /learn
     <CourseCard data={data} aspect="4/5" />                         poster crop (default 4/3)

   hideWishlist hides the heart even when onToggleWishlist is passed (owned implies it).
   The whole card is clickable (stretched link on the title); the heart sits above it.
   ============================================================================= */

const slate = "inline-flex h-[22px] items-center gap-1.5 rounded-[2px] px-2 font-mono text-[10.5px] font-medium tracking-[0.08em] uppercase";
const BADGE: Record<string, string> = {
  BESTSELLER: "bg-red text-white",
  NEW: "bg-ink text-cream",
  "JUST DROPPED": "bg-cream text-ink",
};

function Heart({ on, title, onClick, className }: { on: boolean; title: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      className={clsx("tap hit z-10 grid place-items-center transition-colors duration-200", className)}
    >
      <svg viewBox="0 0 24 24" className={clsx("size-[18px]", on ? "text-red" : "")} aria-hidden>
        <path
          d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

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
  aspect = "4/3",
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
   *  swaps the price for Open, hides the heart and the free-preview slate, links to /learn/[slug]. */
  owned?: boolean;
  /** hide the wishlist heart even when onToggleWishlist is set */
  hideWishlist?: boolean;
  /** progress variant: override the CTA label (default "Start" / "Continue" / "Rewatch" at 100%) */
  ctaLabel?: string;
  /** progress variant: override the corner slate (default "N% done" / "Just started" / "Not started" / "Done") */
  statusLabel?: string;
  /** still crop: 4/3 (default), 4/5 poster, 16/10 wide */
  aspect?: "4/3" | "4/5" | "16/10";
}) {
  const { course, tutor, category, stats } = data;
  const H = headingLevel;
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
  const stretched =
    "after:absolute after:inset-0 after:z-[1] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-red";

  if (variant === "compact") {
    return (
      <article className={clsx("group hover-zoom-parent tap relative flex items-center gap-3.5 border-b border-line py-3", showHeart ? "pr-0" : "pr-1", className)}>
        <div className="media-frame relative aspect-[16/10] w-[112px] shrink-0">
          <Image src={cropSrc(course.thumbnail, 10 / 16)} alt="" fill sizes="112px" preload={priority} className="hover-zoom object-cover" />
          {!progress && !isOwned && course.status === "published" && (
            <span className="absolute bottom-1 left-1 inline-flex h-[18px] items-center gap-1 bg-cream px-1.5 font-mono text-[9.5px] font-medium tracking-[0.06em] text-ink uppercase">
              <Icon name="play" className="size-2" />
              Free
              <span className="sr-only"> preview</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <H className="line-clamp-2 font-heading text-[15.5px] leading-[1.15] font-semibold tracking-[-0.02em]">
            <Link href={dest} className={stretched}>
              {course.title}
            </Link>
          </H>
          {progress ? (
            <>
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
                <span className="truncate">{tutor?.name}</span>
                <span aria-hidden>·</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums">
                  {progress.completed}/{progress.total}
                </span>
              </p>
              <ProgressBar value={progress.percent} size="sm" className="mt-2" label={`${course.title} progress`} />
            </>
          ) : (
            <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
              <span className="truncate">{tutor?.name}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[11.5px] tabular-nums">
                <Icon name="star" className="size-3 text-fg" />
                <span className="sr-only">Rated </span>
                {course.rating.toFixed(1)}
              </span>
              <span aria-hidden>·</span>
              {isOwned ? (
                <span className="shrink-0 font-mono text-[10.5px] tracking-[0.08em] text-fg uppercase">Owned</span>
              ) : (
                <span className="shrink-0 font-mono text-[12px] font-medium text-fg tabular-nums">{formatINR(course.price)}</span>
              )}
            </p>
          )}
        </div>
        {showHeart && <Heart on={!!wishlisted} title={course.title} onClick={onToggleWishlist!} className="relative size-11 shrink-0 text-fg hf:text-red" />}
      </article>
    );
  }

  const ratio = aspect === "4/5" ? 5 / 4 : aspect === "16/10" ? 10 / 16 : 3 / 4;
  return (
    <article className={clsx("group hover-zoom-parent relative flex h-full flex-col text-fg", className)}>
      <div className={clsx("media-frame relative", aspect === "4/5" ? "aspect-[4/5]" : aspect === "16/10" ? "aspect-[16/10]" : "aspect-[4/3]")}>
        <Image
          src={cropSrc(course.thumbnail, ratio)}
          alt=""
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
          preload={priority}
          className="hover-zoom object-cover"
        />
        <div aria-hidden className="scrim-b pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-60" />
        {/* top row: status / badge, bounded on the right so it wraps instead of sliding under the heart */}
        <div className={clsx("pointer-events-none absolute top-3 left-3 z-[2] flex flex-wrap gap-1.5", showHeart ? "right-14" : "right-3")}>
          {variant === "progress" ? (
            <span className={clsx(slate, done ? "bg-red text-white" : "bg-cream text-ink")}>
              {statusLabel ?? (done ? "Done" : progress?.percent ? `${progress.percent}% done` : started ? "Just started" : "Not started")}
            </span>
          ) : (
            <>
              {isOwned && (
                <span className={clsx(slate, "bg-cream text-ink")}>
                  <span aria-hidden className="size-[6px] bg-red" />
                  In your library
                </span>
              )}
              {!isOwned && course.badge && <span className={clsx(slate, BADGE[course.badge] ?? "bg-cream text-ink")}>{course.badge}</span>}
            </>
          )}
        </div>
        {variant !== "progress" && !isOwned && course.status === "published" && (
          <span className={clsx(slate, "pointer-events-none absolute bottom-3 left-3 z-[2] bg-transparent text-cream ring-1 ring-cream/60 ring-inset")}>
            <Icon name="play" className="size-2.5" />
            Free preview
          </span>
        )}
        {variant === "progress" && progress && (
          <div className="absolute inset-x-0 bottom-0 z-[2] h-[3px] bg-cream/25" aria-hidden>
            <div className="h-full bg-red" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
          </div>
        )}
        {showHeart && (
          <Heart
            on={!!wishlisted}
            title={course.title}
            onClick={onToggleWishlist!}
            className="absolute top-2.5 right-2.5 size-10 bg-cream text-ink hf:bg-ink hf:text-cream"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-semibold tracking-[0.15em] text-muted uppercase">
          {category && <span className="truncate">{category.name}</span>}
          {category && <span aria-hidden className="h-px w-3 bg-current opacity-50" />}
          <span>{course.level}</span>
        </p>
        <H className="mt-2.5 font-display text-[clamp(1.625rem,1.35rem+0.7vw,2.125rem)] leading-[0.94] tracking-[0.004em] uppercase">
          <Link href={dest} className={clsx(stretched, "transition-colors duration-200 group-hf:text-red")}>
            {course.title}
          </Link>
        </H>
        {variant === "catalog" && <p className="mt-3 line-clamp-2 text-[14px] leading-[1.45] text-muted">{course.promise}</p>}

        <div className="mt-4 flex items-center gap-2 text-[13px]">
          {tutor && <Avatar name={tutor.name} src={tutor.avatar} tone={tutor.tone} size="xs" decorative />}
          <span className="truncate font-medium">{tutor?.name}</span>
        </div>
        <p className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-muted uppercase tabular-nums">
          {stats.modules} modules · {stats.videos} videos · {formatDuration(stats.totalSec)}
        </p>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-line pt-3.5">
            {variant === "progress" && progress ? (
              <>
                <span className="font-mono text-[11.5px] tracking-[0.04em] text-muted uppercase tabular-nums">
                  {progress.completed}/{progress.total} items
                </span>
                <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                  {ctaLabel ?? (done ? "Rewatch" : progress.percent || started ? "Continue" : "Start")}
                  <Icon name="arrow-right" className="size-4 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" strokeWidth={1.7} />
                </span>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <Rating value={course.rating} count={course.reviewCount} size="sm" className="whitespace-nowrap" />
                  <div className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-muted uppercase tabular-nums">{formatNumber(course.learners)} learners</div>
                </div>
                {isOwned ? (
                  <span className="inline-flex shrink-0 items-center gap-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                    Open
                    <Icon name="arrow-right" className="size-4 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" strokeWidth={1.7} />
                  </span>
                ) : (
                  /* compare-at price stacks above the price so the rating keeps its line on narrow cards */
                  <span className="flex shrink-0 flex-col items-end">
                    {course.compareAtPrice && (
                      <span className="mb-1 font-mono text-[11.5px] leading-none text-muted line-through tabular-nums">
                        <span className="sr-only">Was </span>
                        {formatINR(course.compareAtPrice)}
                      </span>
                    )}
                    <span className="font-heading text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                      {course.compareAtPrice && <span className="sr-only">Now </span>}
                      {formatINR(course.price)}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
