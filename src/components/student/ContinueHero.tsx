"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Button, Icon, ProgressBar } from "@/components/app";
import { Tag } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { cropSrc } from "@/lib/img";
import { toneBg, type Tone } from "@/lib/landing-data";
import {
  formatDuration,
  getItem,
  itemTitle,
  type Db,
  type EnrolledCourse,
} from "@/lib/mock";
import { courseState, itemMeta } from "./data";

const DARK = new Set<Tone>([
  "blue",
  "green",
  "purple",
  "indigo",
  "flame",
  "hotpink",
  "forest",
  "olive",
]);

/** "Continue where you left off": the most recently active unfinished course. */
export function ContinueHero({
  entry,
  db,
  className,
}: {
  entry: EnrolledCourse;
  db: Db;
  className?: string;
}) {
  const { course, progress } = entry;
  const ctx = progress.resumeItemId
    ? getItem(course.id, progress.resumeItemId, db)
    : null;
  const dark = DARK.has(course.tone);
  const state = courseState(progress);
  const href = `/learn/${course.slug}${ctx ? `/${ctx.item.id}` : ""}`;
  const video = ctx?.item.type === "video" ? ctx.item.lesson : null;
  const pos = video
    ? Math.min(progress.resumePositionSec, video.durationSec)
    : 0;
  const meta = ctx ? itemMeta(ctx.item) : null;
  const kind = ctx?.item.type ?? "video";
  const quiz = ctx?.item.type === "quiz" ? ctx.item.quiz : null;
  const cta =
    state === "not_started"
      ? "Start course"
      : kind === "quiz"
        ? quiz?.isGating
          ? "Take the checkpoint"
          : "Start quiz"
        : kind === "resource"
          ? "Open resource"
          : pos > 0
            ? "Continue"
            : "Next lesson";
  const glyph =
    kind === "quiz" ? "quiz" : kind === "resource" ? "file" : "play";

  return (
    <section
      aria-labelledby="continue-title"
      className={clsx(
        "relative grid min-w-0 items-center gap-5 overflow-hidden rounded-card-lg p-4 pb-5 sm:p-5 md:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] md:gap-7 md:p-7 xl:gap-6",
        toneBg[course.tone],
        dark ? "text-white" : "text-ink",
        className,
      )}
    >
      <div className="order-2 min-w-0 px-1 md:order-1 md:px-0">
        <p className="flex items-center gap-2 t-label opacity-85">
          <Icon name="play-circle" className="size-[18px]" strokeWidth={2.3} />
          {state === "not_started"
            ? "Ready when you are"
            : "Continue where you left off"}
        </p>
        <h2 id="continue-title" className="mt-3 t-chunky-card break-words">
          {course.title}
        </h2>
        {ctx && (
          <div className="mt-4 max-sm:mt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone={dark ? "white" : "ink"}>{ctx.label}</Tag>
              {meta && <Tag tone={dark ? "ink" : "white"}>{meta.kind}</Tag>}
            </div>
            <p className="mt-2.5 text-[17px] leading-snug font-bold md:text-[18px]">
              {itemTitle(ctx.item)}
            </p>
          </div>
        )}
        <div className="mt-5 max-w-sm max-sm:mt-4">
          <ProgressBar
            value={progress.percent}
            tone={dark ? "white" : "ink"}
            track="dark"
            label={`${course.title} progress`}
          />
          <p className="mt-2 text-[13px] font-bold opacity-80">
            {progress.percent}% done · {progress.completed} of {progress.total}{" "}
            items
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-1 max-sm:mt-5 sm:gap-2">
          <Button
            href={href}
            variant={dark ? "secondary" : "primary"}
            iconRight="arrow-right"
            size="lg"
          >
            {cta}
          </Button>
          <Link
            href={`/courses/${course.slug}`}
            className={clsx(
              "inline-flex h-12 items-center rounded-full px-3 text-[15px] font-bold whitespace-nowrap underline decoration-current/30 underline-offset-4 transition-colors",
              dark ? "hf:bg-white/15" : "hf:bg-white/45",
            )}
          >
            Course page
          </Link>
        </div>
      </div>

      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="group relative order-1 block overflow-hidden rounded-img bg-ink shadow-photo md:order-2"
      >
        <div className="relative aspect-video max-sm:aspect-[2/1]">
          <Image
            src={cropSrc(course.thumbnail, 9 / 16)}
            alt=""
            fill
            preload
            sizes="(min-width: 1280px) 420px, (min-width: 768px) 45vw, 92vw"
            className="object-cover transition-[scale] duration-500 ease-expo group-hf:scale-[1.04]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-ink/0" />
          <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lift transition-[scale] duration-300 ease-spring group-hf:scale-110">
            <Icon
              name={glyph}
              className={clsx("size-6", glyph === "play" && "ml-1")}
            />
          </span>
          {!video && meta && (
            <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-[12.5px] font-bold text-white">
              <span className="rounded-full bg-ink/60 px-2.5 py-1">
                {meta.kind}
              </span>
              <span className="truncate">{meta.detail}</span>
            </span>
          )}
          {video && (
            <span className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 text-[12.5px] font-bold text-white">
              <span className="shrink-0 tabular-nums">
                {formatDuration(pos, "clock")}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-hotpink"
                  style={{
                    width: `${(pos / Math.max(1, video.durationSec)) * 100}%`,
                  }}
                />
              </span>
              <span className="shrink-0 tabular-nums opacity-80">
                {formatDuration(video.durationSec, "clock")}
              </span>
            </span>
          )}
        </div>
      </Link>

      <Mascot
        title=""
        className="pointer-events-none absolute -right-3 -bottom-5 hidden w-20 md:block"
        style={{ transform: "rotate(-14deg)" }}
      />
    </section>
  );
}
