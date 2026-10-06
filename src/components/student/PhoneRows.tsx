"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import clsx from "clsx";
import { Icon, ProgressBar, useOverflowFade } from "@/components/app";
import { cropSrc } from "@/lib/img";
import { toneBg } from "@/lib/landing-data";
import type { EnrolledCourse } from "@/lib/mock";
import { courseState } from "./data";

/* =============================================================================
   Phone-only pieces for the student pages (MOBILE_SPEC S-01 / S-04 / S-05).
   Rendered next to the desktop markup with `sm:hidden` (the desktop markup carries
   `max-sm:hidden`), so desktop and tablet stay exactly as they were.
   ============================================================================= */

/**
 * Compact "continue" row: 64px thumb, 2-line title, tutor · 14/25, 6px progress bar and a
 * 44px arrow. The whole row is one link (stretched title link) to the resume item.
 */
export function ProgressRow({
  e,
  className,
  headingLevel = "h3",
}: {
  e: EnrolledCourse;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const { course, progress, tutor } = e;
  const state = courseState(progress);
  const done = state === "completed";
  const started =
    progress.percent > 0 ||
    !!progress.lastActivityAt ||
    progress.resumePositionSec > 0;
  const cta = done ? "Rewatch" : started ? "Continue" : "Start";
  const href = `/learn/${course.slug}${progress.resumeItemId ? `/${progress.resumeItemId}` : ""}`;
  return (
    <article
      className={clsx(
        "tap relative flex items-center gap-3 rounded-card bg-white p-2.5 pr-2 shadow-soft active:bg-cream/60",
        className,
      )}
    >
      <div
        className={clsx(
          "relative size-16 shrink-0 overflow-hidden rounded-[14px]",
          toneBg[course.tone],
        )}
      >
        <Image
          src={cropSrc(course.thumbnail, 1)}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
        {done && (
          <span className="absolute inset-x-0 bottom-0 grid h-5 place-items-center bg-green text-[11px] font-extrabold tracking-[0.04em] text-ink uppercase">
            Done
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <H className="line-clamp-2 text-[15.5px] leading-[1.2] font-bold tracking-[-0.01em]">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-blue"
          >
            {course.title}
            <span className="sr-only">
              , {cta}, {progress.percent}% done
            </span>
          </Link>
        </H>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink/65">
          {tutor?.name ?? "Tamada tutor"} · {progress.completed}/
          {progress.total}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar
            value={progress.percent}
            size="sm"
            tone={done ? "green" : "hotpink"}
            className="flex-1"
          />
          <span
            aria-hidden
            className="w-9 shrink-0 text-right text-[12px] font-bold tabular-nums"
          >
            {progress.percent}%
          </span>
        </div>
      </div>
      <span
        aria-hidden
        className={clsx(
          "grid size-11 shrink-0 place-items-center rounded-full",
          done ? "bg-cream text-ink" : "bg-ink text-cream",
        )}
      >
        <Icon
          name={done ? "refresh" : "arrow-right"}
          className="size-[18px]"
          strokeWidth={2.4}
        />
      </span>
    </article>
  );
}

/**
 * Phone snap scroller (one card + the next peeking) with the trailing-edge fade. Bleeds to
 * `bleed` (the padding of whatever it sits in: 16px for the app column, 20px inside a Card).
 */
export function PhoneScroller({
  children,
  label,
  bleed = 16,
  className,
}: {
  children: React.ReactNode;
  label: string;
  bleed?: 16 | 20;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useOverflowFade(ref);
  return (
    <ul
      ref={ref}
      aria-label={label}
      className={clsx(
        "h-scroller pb-1 sm:hidden",
        bleed === 20 ? "[--gutter:20px]" : "[--gutter:16px]",
        className,
      )}
      data-lenis-prevent=""
    >
      {children}
    </ul>
  );
}
