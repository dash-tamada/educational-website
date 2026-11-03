"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/app";
import { cropSrc } from "@/lib/img";
import { lessonPoster } from "@/lib/media";
import { FLAGSHIP } from "@/lib/content/site";
import { getCourse, getItem, itemTitle, plural, type Db, type EnrolledCourse } from "@/lib/mock";
import { courseState, itemMeta } from "./data";
import { idx, timecode } from "./bits";

/* =============================================================================
   ContinueHero: the dashboard's "now showing" poster. An ink theatre panel with
   the lesson's still (media.ts lessonPoster), the module/lesson slate in mono,
   the lesson title in Anton, a timecode with a thin red playhead line and THE
   red CTA. Three modes:
     resume   (an enrolled, unfinished course)       Resume lesson / Start course / Take the test
     finished (every enrolled course is complete)    certificate CTA
     new      (no enrolment yet)                     the flagship's free first lesson
   ============================================================================= */

type Mode =
  | { kind: "resume"; entry: EnrolledCourse }
  | { kind: "finished"; entry?: EnrolledCourse }
  | { kind: "new" };

export function ContinueHero({ mode, db, className }: { mode: Mode; db: Db; className?: string }) {
  const entry = mode.kind === "new" ? null : (mode.entry ?? null);
  const course = entry?.course ?? getCourse(FLAGSHIP.id, db);
  const progress = entry?.progress ?? null;
  const itemId = mode.kind === "new" ? FLAGSHIP.freeLessonId : mode.kind === "resume" ? progress?.resumeItemId : null;
  const ctx = course && itemId ? getItem(course.id, itemId, db) : null;
  const moduleNo = ctx?.module.position ?? (mode.kind === "finished" ? 11 : 1);
  const poster = lessonPoster(moduleNo);
  const slug = course?.slug ?? FLAGSHIP.slug;
  const href = ctx ? `/learn/${slug}/${ctx.item.id}` : mode.kind === "finished" ? "/dashboard/certificates" : `/learn/${slug}`;

  const video = ctx?.item.type === "video" ? ctx.item.lesson : null;
  const quiz = ctx?.item.type === "quiz" ? ctx.item.quiz : null;
  const pos = mode.kind === "resume" && video && progress ? Math.min(progress.resumePositionSec, video.durationSec) : 0;
  const playhead = video ? (pos / Math.max(1, video.durationSec)) * 100 : 0;
  const state = progress ? courseState(progress) : "not_started";
  const lessonNo = ctx ? ctx.module.items.findIndex((i) => i.id === ctx.item.id) + 1 : 0;
  const meta = ctx ? itemMeta(ctx.item) : null;
  const certified = !!entry && !!course && db.certificates.some((c) => c.userId === entry.enrollment.userId && c.courseId === course.id);

  const eyebrow =
    mode.kind === "new"
      ? "Your first lesson is free"
      : mode.kind === "finished"
        ? "That's a wrap"
        : state === "not_started"
          ? "Ready when you are"
          : "Continue where you left off";
  const title = mode.kind === "finished" ? "Every lesson watched." : ctx ? itemTitle(ctx.item) : (course?.title ?? FLAGSHIP.title);
  const cta =
    mode.kind === "new"
      ? "Watch free lesson"
      : mode.kind === "finished"
        ? "See your certificate"
        : state === "not_started"
          ? "Start the course"
          : quiz
            ? quiz.isGating
              ? "Take the test"
              : "Start the quiz"
            : ctx?.item.type === "resource"
              ? "Open the resource"
              : pos > 0
                ? "Resume lesson"
                : "Play next lesson";
  const left = video && pos > 0 ? Math.max(60, video.durationSec - pos) : 0;

  return (
    <section
      aria-labelledby="continue-title"
      data-field="dark"
      className={clsx("theatre relative isolate min-w-0 overflow-hidden", className)}
    >
      {/* the still: full bleed on desktop (type sits on the dark left), a 16:10 frame on phones */}
      <Link href={href} tabIndex={-1} aria-hidden className="group absolute inset-0 block max-md:relative max-md:aspect-[16/9]">
        <Image
          src={cropSrc(poster.src, 9 / 16)}
          alt=""
          fill
          preload
          sizes="(min-width: 1280px) 1100px, (min-width: 1024px) 75vw, 100vw"
          className="object-cover opacity-80 transition-[scale,opacity] duration-[1.2s] ease-expo group-hf:scale-[1.02] group-hf:opacity-90"
          style={{ objectPosition: poster.pos }}
        />
        {/* letterbox + vignette: dark left for type, dark foot for the timecode */}
        <span className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-ink)_0%,rgb(11_11_11/0.92)_32%,rgb(11_11_11/0.35)_62%,rgb(11_11_11/0.15)_100%)] max-md:bg-[linear-gradient(180deg,rgb(11_11_11/0.25)_0%,rgb(11_11_11/0)_45%,var(--color-ink)_100%)]" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/80 to-transparent max-md:hidden" />
      </Link>
      {/* Marlowe hairline columns */}
      <span aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px)] bg-[length:25%_100%] [mask-image:linear-gradient(90deg,#000_0%,#000_40%,transparent_75%)] md:block" />

      <div className="relative flex min-h-[420px] flex-col p-5 max-md:-mt-16 max-md:min-h-0 sm:p-7 md:min-h-[460px] md:p-8 lg:min-h-[500px] lg:p-10">
        {/* slate row */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.08em] uppercase">
          <p className="flex items-center gap-2.5">
            <span aria-hidden className="size-[7px] rounded-full bg-red motion-ok:animate-pulse" />
            {ctx ? (
              <span>
                Module {idx(ctx.module.position)} <span className="text-ash">/</span> {quiz ? "Test" : `Lesson ${idx(lessonNo)}`}
              </span>
            ) : (
              <span>{FLAGSHIP.certificateTitle}</span>
            )}
          </p>
          <p className="text-ash max-md:hidden">{course?.title ?? FLAGSHIP.title}</p>
        </div>

        <div className="mt-auto max-w-[620px] pt-10 max-md:pt-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/80 uppercase md:text-[11.5px]">{eyebrow}</p>
          <h2 id="continue-title" className="mt-4 t-display-m text-balance text-cream max-md:text-[2.25rem] lg:text-[clamp(2.5rem,1.2rem+2.6vw,4.25rem)]">
            {title}
          </h2>
          {ctx && (
            <p className="mt-4 t-small text-ash">
              {ctx.module.title}
              {meta && <span> · {meta.kind === "Video" ? `${meta.detail} lesson` : meta.detail}</span>}
            </p>
          )}
          {mode.kind === "finished" && (
            <p className="mt-4 max-w-[46ch] t-small text-ash">
              {course ? `${course.title}: every lesson and test is done. ` : ""}
              {certified ? "Your certificate is issued and verifiable." : "Your certificate is waiting to be claimed."}
            </p>
          )}

          {/* timecode + playhead */}
          {video && (
            <div className="mt-7 max-w-[460px]">
              <div className="flex items-baseline justify-between gap-4 font-mono text-[12px] tracking-[0.06em] tabular-nums">
                <span>
                  <span className="text-cream">{timecode(pos)}</span>
                  <span className="text-ash"> / {timecode(video.durationSec)}</span>
                </span>
                {left > 0 && <span className="text-ash uppercase">{Math.round(left / 60)} min left</span>}
              </div>
              <div
                role="progressbar"
                aria-label="Lesson position"
                aria-valuenow={Math.round(playhead)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative mt-2.5 h-px bg-cream/25"
              >
                <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${playhead}%` }} />
                {pos > 0 && <span aria-hidden className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-red" style={{ left: `calc(${playhead}% - 1px)` }} />}
              </div>
            </div>
          )}
          {quiz && (
            <p className="mt-7 font-mono text-[12px] tracking-[0.06em] text-ash uppercase">
              {plural(quiz.questions.length, "question")} · pass {quiz.passPercentage}%{quiz.isGating ? " · unlocks the next module" : ""}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-[1_1_auto]">
            <Button href={href} variant="red" size="lg" icon={mode.kind === "finished" ? "award" : "play"}>
              {cta}
            </Button>
            {course && (
              <Button href={`/courses/${course.slug}`} variant="outline" size="lg" className="max-sm:hidden">
                Course page
              </Button>
            )}
          </div>
        </div>

        {/* course strip: overall progress, right-aligned on desktop */}
        {progress && (
          <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-line pt-4 font-mono text-[11px] tracking-[0.08em] uppercase md:ml-auto md:w-[min(100%,420px)]">
            <span className="text-ash">Course</span>
            <span className="relative h-px bg-cream/25">
              <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${progress.percent}%` }} />
            </span>
            <span className="tabular-nums">
              {progress.percent}% <span className="text-ash">· {progress.completed}/{progress.total}</span>
            </span>
          </div>
        )}
        {mode.kind === "new" && (
          <p className="mt-8 border-t border-line pt-4 font-mono text-[11px] tracking-[0.08em] text-ash uppercase md:ml-auto md:w-[min(100%,420px)]">
            {FLAGSHIP.lessons} lessons · {FLAGSHIP.hours} · no card needed
          </p>
        )}
      </div>
    </section>
  );
}
