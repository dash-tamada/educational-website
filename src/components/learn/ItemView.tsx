"use client";

import Image from "next/image";
import { useEffect } from "react";
import clsx from "clsx";
import { Badge, Button, Eyebrow, Icon, Skeleton, toast } from "@/components/app";
import { cropSrc } from "@/lib/img";
import {
  formatINR,
  getFirstFreeItem,
  getCourseStats,
  itemTitle,
  pad2,
  plural,
  type ItemContext,
  type ModuleItem,
  type QuizItem,
  type ResourceItem,
  type VideoItem,
} from "@/lib/mock";
import { accessCopy, type AccessResult } from "@/lib/access";
import { demo } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import {
  posterFor,
  sampleSourcesFor,
  sampleVideoFor,
  resourceBullets,
} from "@/lib/mock/extra/learn";
import { learnHref, useLearn } from "./context";
import { StageSkeleton } from "./LearnShell";
import { LearnEmpty } from "./LearnEmpty";
import { VideoPlayer, type NextUp } from "./VideoPlayer";
import { QuizRunner } from "./QuizRunner";
import { LessonTabs } from "./LessonTabs";
import { itemMeta, lockReason } from "./PathPanel";
import { BuyButton, TUTOR_BROWSING_LINE } from "./BuyButton";
import {
  FILE_META,
  downloadDemoResource,
  formatSize,
  posterUrl,
} from "./media";

/* One item of the course, on the theatre: the stage (video in a letterboxed
   frame / exam sheet / download / lock screen), the lesson header (mono slate,
   Anton title, actions, Up next), then the Overview / Q&A / Notes / Resources
   tabs. */

const kindLabel = (item: ModuleItem) =>
  item.type === "video"
    ? "Lesson"
    : item.type === "quiz"
      ? "Test"
      : "Resource";

/** "MODULE 05 / LESSON 02" -> "Module 05 · Lesson 02" */
const slate = (label: string) => label.replace(" / ", " · ");

/** 1000s -> "00:16:40:00" (an SMPTE-style slate timecode, frames always 00). */
export function smpte(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s % 60)}:00`;
}

/** "05.02": the mono index of an item in its module (the path panel's numbering). */
export function itemIndex(flat: ItemContext[], id: string): string | null {
  const x = flat.find((f) => f.item.id === id);
  if (!x) return null;
  const i = x.module.items.findIndex((it) => it.id === id);
  return `${pad2(x.module.position)}.${pad2(i + 1)}`;
}

export function ItemView({ itemId }: { itemId: string }) {
  const L = useLearn();
  const ctx = L.flat.find((x) => x.item.id === itemId);
  const access: AccessResult | null = ctx
    ? (L.accessMap[ctx.item.id] ?? { allowed: false, reason: "unavailable" })
    : null;
  const isVideo = ctx?.item.type === "video";
  const playable = !!access?.allowed && isVideo;

  // fullscreen carries over to the next VIDEO; anything else leaves it
  const { fullscreen } = L;
  useEffect(() => {
    if (fullscreen && !playable && document.fullscreenElement)
      document.exitFullscreen().catch(() => {});
  }, [fullscreen, playable]);

  if (!ctx || !access) {
    if (!L.hydrated) return <StageSkeleton />;
    const first = L.flat[0]?.item;
    const resume =
      L.tracking && L.progress.resumeItemId
        ? L.flat.find((x) => x.item.id === L.progress.resumeItemId)
        : undefined;
    return (
      <div className="mx-auto max-w-[1120px] border-t border-line">
        <LearnEmpty
          eyebrow="404 · Missing frame"
          title="That lesson wandered off."
          body={
            resume
              ? `It may have moved inside the course. Your spot is safe: you were on “${itemTitle(resume.item)}”.`
              : "It may have moved inside the course. Pick up from the start or open your path."
          }
          action={
            <>
              {resume && (
                <Button
                  href={learnHref(L.course.slug, resume.item.id)}
                  variant="red"
                  iconRight="arrow-right"
                >
                  Pick up where you left off
                </Button>
              )}
              {first && first.id !== resume?.item.id && (
                <Button
                  variant={resume ? "outline" : "red"}
                  href={learnHref(L.course.slug, first.id)}
                  iconRight={resume ? undefined : "arrow-right"}
                >
                  Start of the course
                </Button>
              )}
              <Button
                variant="outline"
                icon="layers"
                onClick={L.openPath}
                // the aside is already on screen from lg up
                className={clsx(L.asideOpen && "lg:hidden")}
              >
                Your path
              </Button>
            </>
          }
        />
      </div>
    );
  }

  // Logged in, but the store overlay (purchases, passed tests) isn't applied yet:
  // a lock now may be gone a moment later, so don't flash a paywall card.
  if (!L.settled && !access.allowed) return <StageSkeleton />;

  // Fullscreen keeps this exact tree (so the player never remounts) and only
  // hides what sits below the stage.
  const fs = fullscreen && playable;
  return (
    <div
      key={ctx.item.id}
      className={clsx(
        fs ? "size-full" : "app-fade mx-auto w-full max-w-[1120px]",
      )}
    >
      {/* stage */}
      {/* Phones: the stage box dissolves (display: contents), so the player's
          sticky frame is held by the whole item, not just this wrapper, and can
          stay pinned under the top bar while the learner reads the tabs.
          Short landscape: the frame fills the screen (no height-based cap).
          From sm the video sits in a letterbox: a black slate row over the frame. */}
      <div
        className={clsx(
          fs
            ? "size-full"
            : playable &&
                "mx-auto max-w-[calc((100dvh-196px)*16/9)] min-w-0 max-sm:contents land:max-w-none",
        )}
      >
        {playable && !fs && (
          <StageSlate
            left={slate(ctx.label)}
            right={
              ctx.item.type === "video"
                ? `RT ${smpte(ctx.item.lesson.durationSec)}`
                : undefined
            }
            note={
              ctx.item.type === "video" && ctx.item.lesson.isFreePreview
                ? "Free preview"
                : "Sample footage"
            }
          />
        )}
        {!access.allowed ? (
          <LockedStage ctx={ctx} access={access} />
        ) : ctx.item.type === "video" ? (
          <VideoStage ctx={ctx as ItemContext & { item: VideoItem }} />
        ) : ctx.item.type === "quiz" ? (
          <QuizRunner
            key={ctx.item.id}
            ctx={ctx as ItemContext & { item: QuizItem }}
          />
        ) : (
          <ResourceStage ctx={ctx as ItemContext & { item: ResourceItem }} />
        )}
      </div>

      {/* a size container: the header and tab splits follow the room left
          beside "Your path", not the viewport (1024 with the aside open is narrow) */}
      <div className={clsx("@container", fs && "hidden")}>
        {/* Before the overlay a demo purchase may still lift the "free" state:
            keep the banner's room (invisible) so nothing below it jumps. */}
        {access.reason === "free" && (
          <div
            className={clsx(!L.settled && "invisible")}
            aria-hidden={!L.settled || undefined}
          >
            <PreviewBanner />
          </div>
        )}

        <LessonHeader ctx={ctx} access={access} />

        <div className="mt-12 md:mt-14">
          <LessonTabs ctx={ctx} access={access} />
        </div>
      </div>
    </div>
  );
}

/** The letterbox slate over the frame (from sm): rec dot + label, a note, the runtime. */
function StageSlate({
  left,
  note,
  right,
  className,
}: {
  left: string;
  note?: string;
  right?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={clsx(
        "flex h-9 items-center gap-4 border border-b-0 border-line bg-black px-3.5 font-mono text-[10.5px] tracking-[0.1em] text-ash uppercase tabular-nums max-sm:hidden land:hidden",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5 text-cream">
        <span className="size-[6px] shrink-0 rounded-full bg-red" />
        <span className="truncate">{left}</span>
      </span>
      <span className="flex-1" />
      {note && <span className="truncate max-md:hidden">{note}</span>}
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

/* ----------------------------------------------------------------------------- video */
function VideoStage({ ctx }: { ctx: ItemContext & { item: VideoItem } }) {
  const {
    course,
    db,
    session,
    profile,
    tracking,
    completed,
    accessMap,
    player,
    afterProgress,
    fullscreen,
    toggleFullscreen,
    tutorBrowsing,
    switchToStudent,
  } = useLearn();
  const { loginAs } = useDemoAuth();
  const item = ctx.item;
  const lesson = item.lesson;
  const sample = sampleVideoFor(item);
  const lp =
    tracking && session
      ? db.lessonProgress.find(
          (p) => p.userId === session.userId && p.itemId === item.id,
        )
      : undefined;
  const done = completed.has(item.id);
  const next = ctx.next;
  const na = next ? accessMap[next.id] : undefined;
  const gated = na?.reason === "gated";
  const nextUp: NextUp | null = next
    ? {
        title: itemTitle(next),
        href: learnHref(course.slug, next.id),
        kindLabel: kindLabel(next),
        isVideo: next.type === "video",
        kind: next.type,
        locked: !na?.allowed,
        lockTitle: gated ? "Checkpoint ahead" : "That was the free preview",
        lockBody: gated
          ? "Pass the checkpoint test to unlock the next lesson."
          : tutorBrowsing
            ? TUTOR_BROWSING_LINE
            : undefined,
        // a tutor can't buy: offer the student demo instead of checkout
        lockHref:
          gated && na?.blockedBy
            ? learnHref(course.slug, na.blockedBy.id)
            : tutorBrowsing
              ? undefined
              : `/checkout/${course.slug}`,
        lockAction:
          tutorBrowsing && !gated
            ? {
                label: "Switch to the student demo",
                icon: "switch",
                onClick: switchToStudent,
              }
            : undefined,
        lockCta: gated
          ? "Take the test"
          : `Unlock the full course · ${formatINR(course.price)}`,
        // the moment of highest intent: price first, logging in second
        lockExtra:
          na?.reason === "login"
            ? [
                {
                  label: "Log in",
                  href: `/login?next=${encodeURIComponent(learnHref(course.slug, item.id))}`,
                },
                {
                  label: "Student demo",
                  icon: "user",
                  onClick: () => loginAs("student"),
                },
              ]
            : undefined,
      }
    : null;
  const captionLines = [
    lesson.description,
    ...(lesson.chapters ?? []).map((c) => c.title),
    course.promise,
  ].filter(Boolean);

  return (
    <VideoPlayer
      key={item.id}
      sources={sampleSourcesFor(item)}
      poster={posterUrl(posterFor(course, item))}
      title={lesson.title}
      label={ctx.label}
      chapters={lesson.chapters}
      nominalSec={lesson.durationSec}
      expectedSec={sample.durationSec}
      captionsAvailable={lesson.hasCaptions}
      captionLines={captionLines}
      watermark={profile?.email ?? "Tamada Media · preview"}
      badge={lesson.isFreePreview ? "Free preview" : null}
      credit={`Stand-in clip: ${sample.credit}`}
      resumeAt={lp && !lp.completed ? lp.lastPositionSec : 0}
      completed={done}
      handleRef={player}
      next={nextUp}
      fullscreen={fullscreen}
      onToggleFullscreen={toggleFullscreen}
      onSave={
        tracking && session
          ? (pos, dur) => {
              demo.saveProgress(session.userId, course.id, item.id, pos, dur);
            }
          : undefined
      }
      onReach90={
        tracking && session
          ? (pos, dur) => {
              demo.saveProgress(session.userId, course.id, item.id, pos, dur);
              // the completion modal (last item) already celebrates
              if (!afterProgress())
                toast.success("Lesson complete", {
                  description: next
                    ? `Up next: ${itemTitle(next)}`
                    : "That was the last one.",
                });
            }
          : undefined
      }
    />
  );
}

/* ----------------------------------------------------------------------------- resource */
function ResourceStage({ ctx }: { ctx: ItemContext & { item: ResourceItem } }) {
  const { course, session, tracking, completed, afterProgress } = useLearn();
  const r = ctx.item.resource;
  const meta = FILE_META[r.fileType];
  const done = completed.has(ctx.item.id);
  const outline = resourceBullets(r);
  const download = () => {
    downloadDemoResource(r, course.title);
    let celebrating = false;
    if (tracking && session && !done) {
      demo.setItemComplete(session.userId, course.id, ctx.item.id, true);
      celebrating = afterProgress();
    }
    if (r.fileType !== "link" && !celebrating)
      toast.success("Download started", {
        description: "Demo file generated in your browser.",
      });
  };
  return (
    <section
      aria-label="Download"
      className="grid border border-line bg-night md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]"
    >
      <div className="min-w-0 p-5 sm:p-7 md:p-9">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
          <span className="flex items-center gap-2 text-fg">
            <span aria-hidden className="size-[6px] rounded-full bg-red" />
            {slate(ctx.label)}
          </span>
          <span>
            {[meta.label, formatSize(r.sizeKb)].filter(Boolean).join(" · ")}
            {done && " · Downloaded"}
          </span>
        </p>
        <h1 className="mt-5 max-w-[22ch] font-heading text-[clamp(1.75rem,1.25rem+1.6vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
          {r.title}
        </h1>
        <p className="mt-4 max-w-[54ch] t-body text-muted">{r.description}</p>
        <ol className="mt-7 max-w-[56ch] border-t border-line">
          {outline.map((l, i) => (
            <li
              key={l}
              className="flex items-baseline gap-4 border-b border-line py-3 text-[14.5px] leading-snug"
            >
              <span className="w-6 shrink-0 font-mono text-[11px] text-muted tabular-nums">
                {pad2(i + 1)}
              </span>
              {l}
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button
            size="lg"
            variant={done ? "outline" : "red"}
            icon={r.fileType === "link" ? "external" : "download"}
            onClick={download}
            className="max-sm:h-12 max-sm:w-full"
            aria-label={
              r.fileType === "link"
                ? `Open “${r.title}”`
                : done
                  ? `Download “${r.title}” again`
                  : `Download “${r.title}”`
            }
          >
            {r.fileType === "link"
              ? "Open link"
              : done
                ? "Download again"
                : `Download ${meta.label}`}
          </Button>
          <p className="t-small text-muted">
            Demo file: a sample generated in your browser.
          </p>
        </div>
      </div>
      {/* the file itself: a cream sheet under a work light */}
      <div
        className="relative hidden items-center justify-center overflow-hidden border-l border-line bg-black p-8 md:flex"
        aria-hidden
      >
        <span className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_at_top,rgb(253_248_238/0.09),transparent_70%)]" />
        <div className="relative w-44 bg-cream p-4 text-ink ring-1 ring-black/40 lg:w-48">
          <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.1em] uppercase">
            <span>Tamada Media</span>
            <span>{meta.label}</span>
          </div>
          <div className="mt-4 h-2 w-24 bg-ink/85" />
          <div className="mt-1.5 h-1.5 w-32 bg-ink/25" />
          <div className="mt-4 space-y-1.5 border-t border-ink/15 pt-3">
            {[92, 80, 86, 60, 74, 88, 52, 70].map((w, i) => (
              <div
                key={i}
                className="h-1 bg-ink/12"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="mt-4 h-[3px] w-10 bg-red" />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- lock screen */
const LOCK_TITLE: Record<
  "paywall" | "login",
  Record<ModuleItem["type"], string>
> = {
  login: {
    video: "Log in to keep watching.",
    quiz: "Log in to take this test.",
    resource: "Log in to get this download.",
  },
  paywall: {
    video: "This lesson comes with the full course.",
    quiz: "This test comes with the full course.",
    resource: "This download comes with the full course.",
  },
};

/** ₹2,999 in Anton with the old price struck through in mono. */
function Price({
  price,
  compareAt,
  lessons,
  size = "lg",
}: {
  price: number;
  compareAt?: number | null;
  lessons: number;
  size?: "md" | "lg";
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={clsx(
          "font-display leading-none tracking-[0.005em] text-fg",
          size === "lg" ? "text-[44px] md:text-[52px]" : "text-[36px]",
        )}
      >
        {formatINR(price)}
      </span>
      {compareAt ? (
        <span className="font-mono text-[13px] text-muted line-through decoration-red decoration-[1.5px]">
          <span className="sr-only">was </span>
          {formatINR(compareAt)}
        </span>
      ) : null}
      <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
        One-time · {plural(lessons, "lesson")} · lifetime
      </span>
    </p>
  );
}

function LockedStage({
  ctx,
  access,
}: {
  ctx: ItemContext;
  access: AccessResult;
}) {
  const { course, db, tutorBrowsing } = useLearn();
  const { loginAs } = useDemoAuth();
  const reason = access.reason as keyof typeof accessCopy;
  // a tutor on someone else's course: no price, a switch to the student demo
  const asTutor = tutorBrowsing && reason === "paywall";
  const copy = accessCopy[reason] ?? accessCopy.unavailable;
  const free = getFirstFreeItem(course.id, db);
  const stats = getCourseStats(course.id, db);
  const here = learnHref(course.slug, ctx.item.id);
  const type = ctx.item.type;
  const title = asTutor
    ? "You're previewing as a tutor."
    : reason === "gated"
      ? type === "quiz"
        ? "Pass the earlier test to unlock this one."
        : type === "resource"
          ? "Pass the test above to unlock this download."
          : "Pass the test above to unlock this."
      : reason === "login" || reason === "paywall"
        ? LOCK_TITLE[reason][type]
        : copy.title;
  const body = asTutor
    ? "Tutor accounts can't buy courses, so only the free first video is open. Switch to the student demo to buy this one and learn it like a student would."
    : reason === "login"
      ? "The first video is free for everyone. Log in (or try the student demo), then unlock the course to keep going."
      : copy.body;
  const sells = reason === "paywall" || reason === "login";
  const runtime =
    ctx.item.type === "video" ? smpte(ctx.item.lesson.durationSec) : null;
  const poster = cropSrc(posterFor(course, ctx.item), 9 / 16);

  const bodyText =
    reason === "gated" && access.blockedBy ? (
      <>
        This course uses short tests as checkpoints. Pass{" "}
        <strong className="font-semibold text-fg">
          {itemTitle(access.blockedBy)}
        </strong>{" "}
        to keep going.
      </>
    ) : (
      body
    );

  const actions = (phone: boolean) => (
    <>
      {sells &&
        (asTutor ? (
          <BuyButton
            variant="red"
            fullWidth={phone}
            className={phone ? "h-12" : undefined}
          />
        ) : (
          <Button
            variant="red"
            href={`/checkout/${course.slug}`}
            iconRight="arrow-right"
            fullWidth={phone}
            className={phone ? "h-12" : undefined}
          >
            Unlock the full course
          </Button>
        ))}
      {reason === "login" && (
        <>
          <Button
            variant="outline"
            href={`/login?next=${encodeURIComponent(here)}`}
            fullWidth={phone}
          >
            Log in
          </Button>
          <Button
            variant="outline"
            icon="user"
            onClick={() => loginAs("student")}
            fullWidth={phone}
          >
            {phone ? "Student demo" : "Try the student demo"}
          </Button>
        </>
      )}
      {reason === "gated" && access.blockedBy && (
        <Button
          variant="red"
          href={learnHref(course.slug, access.blockedBy.id)}
          icon="quiz"
          fullWidth={phone}
          className={phone ? "h-12" : undefined}
        >
          Take the test
        </Button>
      )}
      {reason === "unavailable" && (
        <Button
          href="/courses"
          variant="red"
          iconRight="arrow-right"
          fullWidth={phone}
          className={phone ? "h-12" : undefined}
        >
          Browse courses
        </Button>
      )}
    </>
  );

  const freeLink = sells && free && free.id !== ctx.item.id && (
    <Button
      variant="arrow"
      href={learnHref(course.slug, free.id)}
      className="text-fg"
    >
      Watch free lesson
    </Button>
  );

  const lockLine = (
    <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-red-lite uppercase">
      <Icon name="lock" className="size-3.5" strokeWidth={1.8} />
      {reason === "gated"
        ? "Checkpoint ahead"
        : reason === "unavailable"
          ? "Unavailable"
          : "Locked"}
    </p>
  );

  return (
    <>
      {/* Phones: the lesson's poster, edge to edge like the player, with the
          slate on it; the pitch follows straight on the theatre. */}
      <div className="sm:hidden">
        <div className="relative isolate -mx-3 -mt-2 aspect-video overflow-hidden bg-black">
          <Image
            src={poster}
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 640px) 1px, 100vw"
            className="-z-10 object-cover opacity-45 grayscale-[35%]"
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-black/10"
          />
          <span className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] text-cream uppercase">
            <span aria-hidden className="size-[6px] rounded-full bg-red" />
            {slate(ctx.label)}
          </span>
          <span
            aria-hidden
            className="absolute right-3 bottom-3 grid size-11 place-items-center bg-black/70 text-cream ring-1 ring-white/20"
          >
            <Icon name="lock" className="size-4" strokeWidth={1.8} />
          </span>
        </div>
        <div className="app-enter pt-6">
          {lockLine}
          <h2 className="mt-3 font-display text-[34px] leading-[0.95] uppercase">
            {title}
          </h2>
          <p className="mt-3 t-small text-muted">{bodyText}</p>
          {sells && !asTutor && (
            <div className="mt-5 border-t border-line pt-4">
              <Price
                price={course.price}
                compareAt={course.compareAtPrice}
                lessons={stats.videos}
                size="md"
              />
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 [&>*:first-child]:col-span-2">
            {actions(true)}
          </div>
          {freeLink && <div className="mt-3">{freeLink}</div>}
          {reason === "login" && (
            <p className="mt-3 text-[12.5px] text-muted">
              The demo logs you in as Priya, a sample student enrolled in the
              course.
            </p>
          )}
        </div>
      </div>

      {/* sm+: a 16:9 theatre frame. No overflow clip on the box itself: with
          visible overflow an aspect-ratio box grows to fit its content, so the
          pitch is never cut off on tablets. */}
      <div className="relative isolate flex flex-col ring-1 ring-line max-sm:hidden sm:aspect-video">
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-black">
          <Image
            src={poster}
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1024px) 1100px, 100vw"
            className="object-cover object-right opacity-40 grayscale-[35%]"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/25" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <StageSlate
          left={slate(ctx.label)}
          note={kindLabel(ctx.item)}
          right={runtime ? `RT ${runtime}` : undefined}
          className="border-0 border-b bg-black/60"
        />
        <div className="app-enter flex flex-1 flex-col justify-end p-6 md:p-9 lg:p-10">
          {lockLine}
          <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(2.25rem,1.4rem+2.6vw,4rem)] leading-[0.92] uppercase">
            {title}
          </h2>
          <p className="mt-4 max-w-[48ch] t-small text-muted md:text-[15px]">
            {bodyText}
          </p>
          {sells && !asTutor && (
            <div className="mt-6">
              <Price
                price={course.price}
                compareAt={course.compareAtPrice}
                lessons={stats.videos}
              />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {actions(false)}
            {freeLink && <span className="ml-3">{freeLink}</span>}
          </div>
          {reason === "login" && (
            <p className="mt-4 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
              The demo logs you in as Priya, a sample student in the course.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------------------- free preview banner */
function PreviewBanner() {
  const { course, session, db, tutorBrowsing } = useLearn();
  const { loginAs } = useDemoAuth();
  const stats = getCourseStats(course.id, db);
  return (
    <section
      aria-label="Free preview"
      className="mt-6 grid gap-x-10 gap-y-5 border-y border-line py-6 sm:mt-8 @[720px]:grid-cols-[minmax(0,1fr)_auto] @[720px]:items-end"
    >
      <div className="min-w-0">
        <Eyebrow>Free preview</Eyebrow>
        <p className="mt-3 max-w-[30ch] font-heading text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.15] font-semibold tracking-[-0.025em]">
          The first lesson is free. Watch it, then decide.
        </p>
        <p className="mt-2 max-w-[54ch] t-small text-muted">
          {tutorBrowsing
            ? TUTOR_BROWSING_LINE
            : `Unlock all ${plural(stats.videos, "lesson")}, ${plural(stats.quizzes, "test")} and the certificate. Lifetime access.`}
        </p>
      </div>
      <div className="flex flex-col items-start gap-4 @[720px]:items-end">
        {!tutorBrowsing && (
          <p className="flex items-baseline gap-3">
            <span className="font-display text-[40px] leading-none">
              {formatINR(course.price)}
            </span>
            {course.compareAtPrice ? (
              <span className="font-mono text-[13px] text-muted line-through decoration-red decoration-[1.5px]">
                <span className="sr-only">was </span>
                {formatINR(course.compareAtPrice)}
              </span>
            ) : null}
          </p>
        )}
        <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
          <BuyButton variant="red" label="Unlock the full course" />
          {!session && (
            <Button variant="outline" onClick={() => loginAs("student")}>
              Student demo
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- header + up next */
function LessonHeader({
  ctx,
  access,
}: {
  ctx: ItemContext;
  access: AccessResult;
}) {
  const {
    course,
    session,
    tracking,
    completed,
    requestFocus,
    courseAccess,
    afterProgress,
  } = useLearn();
  const item = ctx.item;
  const done = completed.has(item.id);
  const title = itemTitle(item);
  const description =
    item.type === "video"
      ? item.lesson.description
      : item.type === "resource"
        ? item.resource.description
        : item.quiz.description;
  const showTitle =
    !(item.type === "quiz" && access.allowed) &&
    !(item.type === "resource" && access.allowed);
  const canMark = tracking && access.allowed && item.type !== "quiz";
  const canTalk =
    !!session &&
    access.allowed &&
    (tracking || courseAccess.owner || courseAccess.admin);
  const toggleDone = () => {
    if (!session) return;
    demo.setItemComplete(session.userId, course.id, item.id, !done);
    if (!done) {
      // the completion modal (last open item) already celebrates
      if (!afterProgress())
        toast.success("Marked complete", {
          description: ctx.next
            ? `Up next: ${itemTitle(ctx.next)}`
            : "That was the last item.",
        });
    } else toast("Marked as not done");
  };

  return (
    <section
      aria-label="About this item"
      className={clsx(
        "grid gap-8",
        showTitle ? "mt-7 md:mt-9" : "mt-6",
        // phones: a locked item's pitch sits right above, so rule the lesson off from it
        !access.allowed && "max-sm:mt-9 max-sm:border-t max-sm:border-line max-sm:pt-6",
        // tests and downloads carry their title on the stage: a slim row (and
        // a wider, one-line Up next strip), so no dead band opens above the tabs
        showTitle
          ? "@[860px]:grid-cols-[minmax(0,1fr)_280px] @[860px]:gap-12"
          : "gap-5 @[860px]:grid-cols-[minmax(0,1fr)_460px] @[860px]:items-center",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-[0.08em] uppercase">
          <span className="text-red-lite">{slate(ctx.label)}</span>
          <span aria-hidden className="text-muted">
            /
          </span>
          <span className="text-muted normal-case tracking-[0.02em]">
            {ctx.module.title}
          </span>
          {done && (
            <Badge dot size="sm" tone="mint">
              Completed
            </Badge>
          )}
          {!access.allowed && (
            <Badge size="sm" tone="neutral">
              <Icon name="lock" className="size-3" /> {lockReason(access)}
            </Badge>
          )}
        </div>
        {showTitle && (
          <>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(2.125rem,1.3rem+2.5vw,3.75rem)] leading-[0.92] tracking-[0.004em] uppercase">
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-[60ch] t-body-l text-muted">
                {description}
              </p>
            )}
          </>
        )}
        {/* phones: the primary action gets the full row, the rest share one */}
        <div
          className={clsx(
            "flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-2 max-sm:[&>*:first-child:nth-last-child(odd)]:col-span-2",
            showTitle ? "mt-7" : "mt-4",
          )}
        >
          {canMark && (
            <Button
              variant={done ? "outline" : "primary"}
              icon={done ? "check-circle" : "check"}
              onClick={toggleDone}
              aria-pressed={done}
            >
              {done ? "Completed" : "Mark complete"}
            </Button>
          )}
          {canTalk && tracking && item.type === "video" && (
            <Button
              variant="outline"
              icon="note"
              onClick={() => requestFocus("notes")}
            >
              Add a note
            </Button>
          )}
          {canTalk && !courseAccess.admin && (
            <Button
              variant="outline"
              icon="chat"
              onClick={() => requestFocus("qa")}
            >
              {courseAccess.owner ? "Answer questions" : "Ask the tutor"}
            </Button>
          )}
          <span className="hidden flex-1 @[860px]:block" />
          <span className="hidden @[860px]:flex">
            <Button
              variant="outline"
              iconOnly
              icon="arrow-left"
              aria-label="Previous item"
              href={ctx.prev ? learnHref(course.slug, ctx.prev.id) : undefined}
              disabled={!ctx.prev}
            />
            <Button
              variant="outline"
              iconOnly
              icon="arrow-right"
              aria-label="Next item"
              href={ctx.next ? learnHref(course.slug, ctx.next.id) : undefined}
              disabled={!ctx.next}
              className="-ml-px"
            />
          </span>
        </div>
      </div>
      <UpNextCard ctx={ctx} slim={!showTitle} />
    </section>
  );
}

function UpNextCard({ ctx, slim }: { ctx: ItemContext; slim?: boolean }) {
  const {
    course,
    flat,
    accessMap,
    tracking,
    progress,
    certificate,
    showCompletion,
    settled,
  } = useLearn();
  const next = ctx.next;
  if (!next) {
    const sub = tracking
      ? progress.percent === 100
        ? "Every item done. Go make something with it."
        : `${plural(progress.total - progress.completed, "item")} still open in your path.`
      : "Thanks for watching.";
    const cta = tracking && progress.percent === 100 && (
      <Button
        size="sm"
        variant="red"
        icon="award"
        className={slim ? "shrink-0" : "mt-5"}
        onClick={showCompletion}
      >
        {certificate ? "View certificate" : "Celebrate"}
      </Button>
    );
    return (
      <aside
        aria-label="The end"
        className={clsx(
          "border-t border-fg pt-4",
          slim && "flex flex-wrap items-center gap-4",
        )}
      >
        <div className="min-w-0 flex-1 basis-40">
          <p className="flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
            The end
            <span className="font-mono text-[10.5px] font-normal tracking-[0.06em] text-muted">
              FIN
            </span>
          </p>
          <p
            className={clsx(
              "font-heading font-semibold tracking-[-0.02em]",
              slim ? "mt-1.5 text-[16px]" : "mt-3 text-[19px] leading-tight",
            )}
          >
            That&apos;s the last item in this course.
          </p>
          <p className="mt-1 t-small text-muted">{sub}</p>
        </div>
        {cta}
      </aside>
    );
  }
  const a = accessMap[next.id];
  // before the store overlay, a lock may still lift: show neither state
  const unsure = !a?.allowed && !settled;
  const locked = !a?.allowed && settled;
  const href = learnHref(course.slug, next.id);
  const index = itemIndex(flat, next.id);
  // the blocking test is the page the learner is already on
  const blockedHere = a?.reason === "gated" && a.blockedBy?.id === ctx.item.id;
  const toTest = () => {
    const el =
      document.getElementById("quiz-start") ??
      document.getElementById("quiz-top");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };
  const lockLine = blockedHere ? "Pass this test to unlock it" : lockReason(a);
  const btn = slim
    ? { size: "sm" as const, className: "shrink-0" }
    : { size: "sm" as const, fullWidth: true, className: "mt-5" };
  const action = unsure ? (
    // the lock may lift once the store overlay is in (a purchase, a pass)
    <Skeleton className={clsx("h-9", slim ? "w-28 shrink-0" : "mt-5 w-full")} />
  ) : locked ? (
    blockedHere ? (
      <Button {...btn} variant="outline" icon="arrow-up" onClick={toTest}>
        Back to the test
      </Button>
    ) : a?.reason === "paywall" ? (
      <BuyButton {...btn} variant="red" label="Unlock the full course" />
    ) : (
      <Button
        {...btn}
        variant="red"
        href={
          a?.reason === "gated" && a.blockedBy
            ? learnHref(course.slug, a.blockedBy.id)
            : a?.reason === "unavailable"
              ? "/courses"
              : `/checkout/${course.slug}`
        }
        iconRight="arrow-right"
      >
        {a?.reason === "gated"
          ? "Go to the test"
          : a?.reason === "unavailable"
            ? "Browse courses"
            : "Unlock the full course"}
      </Button>
    )
  ) : (
    <Button {...btn} href={href} iconRight="arrow-right">
      Continue
    </Button>
  );
  const kindLine = (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
      {locked && <Icon name="lock" className="size-3 shrink-0" strokeWidth={1.8} />}
      <span className="truncate">
        {locked && lockLine
          ? lockLine
          : `${kindLabel(next)} · ${itemMeta(next, true)}`}
      </span>
    </span>
  );
  return (
    <aside
      aria-label="Up next"
      className={clsx(
        "border-t border-fg pt-4",
        slim && "flex flex-wrap items-center gap-x-5 gap-y-3",
      )}
    >
      <div className="min-w-0 flex-1 basis-48">
        <p
          className={clsx(
            "flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase",
            !slim && "justify-between",
          )}
        >
          Up next
          {index && (
            <span className="font-mono text-[10.5px] font-normal tracking-[0.04em] text-muted tabular-nums">
              {index}
            </span>
          )}
        </p>
        <p
          className={clsx(
            "font-heading font-semibold tracking-[-0.02em]",
            slim
              ? "mt-1.5 line-clamp-1 text-[16px]"
              : "mt-3 line-clamp-3 text-[19px] leading-[1.15]",
          )}
        >
          {itemTitle(next)}
        </p>
        <div className="mt-2">
          {unsure ? <Skeleton className="h-3 w-40" /> : kindLine}
        </div>
      </div>
      {action}
    </aside>
  );
}
