"use client";

import Image from "next/image";
import { useEffect } from "react";
import clsx from "clsx";
import { Badge, Button, Card, Icon, Skeleton, toast } from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { cropSrc } from "@/lib/img";
import {
  formatINR,
  getFirstFreeItem,
  getCourseStats,
  itemTitle,
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

/* One item of the course: the stage (video / test / resource / lock screen), the
   lesson header with actions and "Up next", then the Overview / Q&A / Notes /
   Resources tabs. */

const kindLabel = (item: ModuleItem) =>
  item.type === "video"
    ? "Lesson"
    : item.type === "quiz"
      ? "Tiny test"
      : "Resource";

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
      <Card className="mx-auto max-w-[720px]">
        <LearnEmpty
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
                  iconRight="arrow-right"
                >
                  Pick up where you left off
                </Button>
              )}
              {first && first.id !== resume?.item.id && (
                <Button
                  variant={resume ? "secondary" : "primary"}
                  href={learnHref(L.course.slug, first.id)}
                  iconRight={resume ? undefined : "arrow-right"}
                >
                  Start of the course
                </Button>
              )}
              <Button
                variant="secondary"
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
      </Card>
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
          Short landscape: the frame fills the screen (no height-based cap). */}
      <div
        className={clsx(
          fs
            ? "size-full"
            : playable &&
                "mx-auto max-w-[calc((100dvh-150px)*16/9)] min-w-0 max-sm:contents land:max-w-none",
        )}
      >
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

        <div className="mt-8 md:mt-10">
          <LessonTabs ctx={ctx} access={access} />
        </div>
      </div>
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
          : `Unlock the course · ${formatINR(course.price)}`,
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
    <Card padding="none" className="overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 md:p-8">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "grid size-14 shrink-0 place-items-center rounded-[18px]",
                meta.tone,
              )}
            >
              <Icon name={meta.icon} className="size-7" />
            </span>
            <div className="min-w-0">
              <p className="t-eyebrow text-blue">Download</p>
              <p className="mt-1 text-[13px] font-bold text-ink/65">
                {[meta.label, formatSize(r.sizeKb)].filter(Boolean).join(" · ")}
                {done && " · Downloaded"}
              </p>
            </div>
          </div>
          <h1 className="mt-5 t-app-h2">{r.title}</h1>
          <p className="mt-2 max-w-[54ch] t-body text-ink/70">
            {r.description}
          </p>
          <ul className="mt-5 space-y-2">
            {outline.map((l) => (
              <li
                key={l}
                className="flex items-start gap-2 text-[14.5px] font-semibold"
              >
                <Icon
                  name="check-circle"
                  className="mt-0.5 size-4 shrink-0 text-green"
                />
                {l}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              variant={done ? "secondary" : "primary"}
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
            <p className="t-small text-ink/65">
              Demo file: a sample generated in your browser.
            </p>
          </div>
        </div>
        <div
          className="relative hidden items-center justify-center overflow-hidden bg-cyan p-8 md:flex"
          aria-hidden
        >
          <span className="absolute -right-12 -bottom-12 size-44 rounded-full bg-aqua/60" />
          <div className="relative w-44 rotate-[-4deg] rounded-[14px] bg-white p-4 shadow-photo">
            <div className="h-2.5 w-20 rounded-full bg-ink/80" />
            <div className="mt-2 h-2 w-28 rounded-full bg-ink/25" />
            <div className="mt-4 space-y-1.5">
              {[92, 80, 86, 60, 74, 88, 52].map((w, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full bg-ink/10"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div
              className={clsx(
                "mt-4 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                meta.tone,
              )}
            >
              {meta.label}
            </div>
          </div>
        </div>
      </div>
    </Card>
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
  return (
    <>
      {/* Phones: the lesson's poster with a lock on it (edge to edge, like the
        player), then one compact card with the price and a single CTA column. */}
      <div className="sm:hidden">
        <div className="relative isolate -mx-3 -mt-2 grid aspect-video place-items-center overflow-hidden bg-ink">
          <Image
            src={cropSrc(posterFor(course, ctx.item), 9 / 16)}
            alt=""
            fill
            loading="eager"
            sizes="100vw"
            className="-z-10 object-cover opacity-55 blur-[3px]"
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/20 to-ink/70"
          />
          <span className="absolute top-3 left-3 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-white uppercase">
            {ctx.label}
          </span>
          <span
            aria-hidden
            className="relative grid size-[72px] place-items-center rounded-full bg-butter shadow-lift"
          >
            <Mascot
              title=""
              className="w-10"
              style={{ transform: "rotate(-8deg)" }}
            />
            <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-ink text-cream ring-4 ring-butter">
              <Icon name="lock" className="size-3.5" strokeWidth={2.4} />
            </span>
          </span>
        </div>
        <div className="app-enter relative z-[1] -mt-5 rounded-card bg-white p-5 shadow-soft">
          <h2 className="t-app-h2">{title}</h2>
          <p className="mt-1.5 t-small text-ink/70">
            {reason === "gated" && access.blockedBy ? (
              <>
                This course uses tiny tests as checkpoints. Pass{" "}
                <strong className="text-ink">
                  {itemTitle(access.blockedBy)}
                </strong>{" "}
                to keep going.
              </>
            ) : (
              body
            )}
          </p>
          {sells && !asTutor && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display text-[30px] leading-none">
                {formatINR(course.price)}
              </span>
              {course.compareAtPrice && (
                <span className="text-[14px] font-semibold text-ink/65 line-through">
                  {formatINR(course.compareAtPrice)}
                </span>
              )}
              <span className="text-[13px] font-semibold text-ink/65">
                one-time · {plural(stats.videos, "lesson")}
              </span>
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {sells &&
              (asTutor ? (
                <BuyButton
                  variant="accent"
                  fullWidth
                  className="col-span-2 h-12"
                />
              ) : (
                <Button
                  variant="accent"
                  href={`/checkout/${course.slug}`}
                  iconRight="arrow-right"
                  fullWidth
                  className="col-span-2 h-12"
                >
                  Unlock the course
                </Button>
              ))}
            {reason === "login" && (
              <>
                <Button
                  variant="secondary"
                  href={`/login?next=${encodeURIComponent(here)}`}
                  fullWidth
                >
                  Log in
                </Button>
                <Button
                  variant="secondary"
                  icon="user"
                  onClick={() => loginAs("student")}
                  fullWidth
                >
                  Student demo
                </Button>
              </>
            )}
            {reason === "gated" && access.blockedBy && (
              <Button
                variant="accent"
                href={learnHref(course.slug, access.blockedBy.id)}
                icon="quiz"
                fullWidth
                className="col-span-2 h-12"
              >
                Take the test
              </Button>
            )}
            {reason === "unavailable" && (
              <Button
                href="/courses"
                iconRight="arrow-right"
                fullWidth
                className="col-span-2 h-12"
              >
                Browse courses
              </Button>
            )}
            {sells && free && free.id !== ctx.item.id && (
              <Button
                variant="ghost"
                icon="play"
                href={learnHref(course.slug, free.id)}
                fullWidth
                className="col-span-2"
              >
                Watch the free preview
              </Button>
            )}
          </div>
          {reason === "login" && (
            <p className="mt-2 text-[12.5px] font-semibold text-ink/65">
              The demo logs you in as Priya, a sample student enrolled in some
              courses.
            </p>
          )}
        </div>
      </div>
      {/* No overflow clip on the 16:9 box: with visible overflow an aspect-ratio box
        grows to fit its content, so the card is never cut off on tablets. */}
      <div className="relative isolate grid min-h-[420px] place-items-center rounded-card-lg p-4 shadow-photo max-sm:hidden sm:aspect-video sm:min-h-auto sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 overflow-hidden rounded-card-lg bg-ink"
        >
          <Image
            src={cropSrc(posterFor(course, ctx.item), 9 / 16)}
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1024px) 1100px, 100vw"
            className="scale-110 object-cover opacity-50 blur-md"
          />
          <span className="absolute inset-0 bg-gradient-to-b from-ink/30 to-ink/70" />
        </div>
        <div className="app-enter w-full max-w-[460px] rounded-card bg-white p-6 text-center shadow-lift md:p-7">
          <div
            className="relative mx-auto grid size-20 place-items-center rounded-full bg-butter"
            aria-hidden
          >
            <Mascot
              title=""
              className="w-11"
              style={{ transform: "rotate(-8deg)" }}
            />
            <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-ink text-cream ring-4 ring-white">
              <Icon name="lock" className="size-4" strokeWidth={2.4} />
            </span>
          </div>
          <h2 className="mt-4 t-app-h2">{title}</h2>
          <p className="mx-auto mt-2 max-w-[40ch] t-small text-ink/70">
            {reason === "gated" && access.blockedBy ? (
              <>
                This course uses tiny tests as checkpoints. Pass{" "}
                <strong className="text-ink">
                  {itemTitle(access.blockedBy)}
                </strong>{" "}
                to keep going.
              </>
            ) : (
              body
            )}
          </p>

          {(reason === "paywall" || reason === "login") && !asTutor && (
            <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
              <span className="font-display text-[34px] leading-none">
                {formatINR(course.price)}
              </span>
              {course.compareAtPrice && (
                <span className="text-[15px] font-semibold text-ink/65 line-through">
                  {formatINR(course.compareAtPrice)}
                </span>
              )}
              <span className="text-[13px] font-semibold text-ink/65">
                one-time · {plural(stats.videos, "lesson")}
              </span>
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(reason === "paywall" || reason === "login") &&
              (asTutor ? (
                <BuyButton variant="accent" />
              ) : (
                <Button
                  variant="accent"
                  href={`/checkout/${course.slug}`}
                  iconRight="arrow-right"
                >
                  Unlock the course
                </Button>
              ))}
            {reason === "login" && (
              <>
                <Button
                  variant="secondary"
                  href={`/login?next=${encodeURIComponent(here)}`}
                >
                  Log in
                </Button>
                <Button
                  variant="secondary"
                  icon="user"
                  onClick={() => loginAs("student")}
                >
                  Try the student demo
                </Button>
              </>
            )}
            {reason === "gated" && access.blockedBy && (
              <Button
                variant="accent"
                href={learnHref(course.slug, access.blockedBy.id)}
                icon="quiz"
              >
                Take the test
              </Button>
            )}
            {reason === "unavailable" && (
              <Button href="/courses" iconRight="arrow-right">
                Browse courses
              </Button>
            )}
            {(reason === "paywall" || reason === "login") &&
              free &&
              free.id !== ctx.item.id && (
                <Button
                  variant="ghost"
                  icon="play"
                  href={learnHref(course.slug, free.id)}
                >
                  Watch the free preview
                </Button>
              )}
          </div>
          {reason === "login" && (
            <p className="mt-3 text-[12.5px] font-semibold text-ink/65">
              The demo logs you in as Priya, a sample student enrolled in some
              courses.
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
    <>
      {/* phones: one compact line under the video + the unlock button */}
      <div
        className="mt-3 flex items-center gap-3 rounded-card bg-blue py-2.5 pr-2.5 pl-4 text-white sm:hidden"
        data-field="dark"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tight font-bold">Free preview</p>
          <p className="mt-0.5 text-[13px] leading-snug font-semibold text-white/85">
            {tutorBrowsing
              ? "Tutors can't buy courses."
              : `${plural(stats.videos, "lesson")} in the full course`}
          </p>
        </div>
        <BuyButton
          variant="sun"
          arrow={false}
          label={`Unlock ${formatINR(course.price)}`}
          switchLabel="Student demo"
          className="shrink-0"
        />
      </div>
      <div
        className="mt-4 hidden flex-col gap-4 rounded-card bg-blue p-5 text-white sm:flex sm:flex-row sm:items-center md:p-6"
        data-field="dark"
      >
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow text-white">Free preview</p>
          <p className="mt-1.5 t-app-h2">
            The first video is free. See if the vibe fits before you pay.
          </p>
          <p className="mt-1.5 t-small text-white">
            {tutorBrowsing ? (
              TUTOR_BROWSING_LINE
            ) : (
              <>
                Unlock all {plural(stats.videos, "lesson")},{" "}
                {plural(stats.quizzes, "test")} and the certificate for{" "}
                {formatINR(course.price)}
                {course.compareAtPrice
                  ? ` (was ${formatINR(course.compareAtPrice)})`
                  : ""}
                . Lifetime access.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <BuyButton variant="sun" />
          {!session && (
            <Button variant="secondary" onClick={() => loginAs("student")}>
              Student demo
            </Button>
          )}
        </div>
      </div>
    </>
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
        "mt-5 grid gap-5 md:mt-6",
        // tests and downloads carry their title on the stage: a slim row (and
        // a wider, one-line Up next strip), so no dead band opens above the tabs
        showTitle
          ? "@[860px]:grid-cols-[minmax(0,1fr)_300px] @[860px]:items-start"
          : "gap-4 @[860px]:grid-cols-[minmax(0,1fr)_440px] @[860px]:items-center",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="t-eyebrow text-blue">{ctx.label}</span>
          <span aria-hidden className="text-ink/30">
            ·
          </span>
          <span className="text-[13.5px] font-semibold text-ink/65">
            {ctx.module.title}
          </span>
          {done && (
            <Badge tone="mint" dot size="sm">
              Completed
            </Badge>
          )}
          {!access.allowed && (
            <Badge tone="neutral" size="sm">
              <Icon name="lock" className="size-3" /> {lockReason(access)}
            </Badge>
          )}
        </div>
        {showTitle && (
          <>
            <h1
              className="mt-eyebrow t-display-m"
              style={{ fontSize: "clamp(1.875rem, 1.2rem + 1.6vw, 2.75rem)" }}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-sub max-w-[62ch] t-body text-ink/70">
                {description}
              </p>
            )}
          </>
        )}
        {/* phones: the primary action gets the full row, the rest share one */}
        <div
          className={clsx(
            "flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-2 max-sm:[&>*:first-child:nth-last-child(odd)]:col-span-2",
            showTitle ? "mt-5" : "mt-3",
          )}
        >
          {canMark && (
            <Button
              variant={done ? "success" : "primary"}
              icon={done ? "check-circle" : "check"}
              onClick={toggleDone}
              aria-pressed={done}
            >
              {done ? "Completed" : "Mark complete"}
            </Button>
          )}
          {canTalk && tracking && item.type === "video" && (
            <Button
              variant="secondary"
              icon="note"
              onClick={() => requestFocus("notes")}
            >
              Add a note
            </Button>
          )}
          {canTalk && !courseAccess.admin && (
            <Button
              variant="secondary"
              icon="chat"
              onClick={() => requestFocus("qa")}
            >
              {courseAccess.owner ? "Answer questions" : "Ask the tutor"}
            </Button>
          )}
          <span className="hidden flex-1 @[860px]:block" />
          <span className="hidden gap-2 @[860px]:flex">
            <Button
              variant="secondary"
              iconOnly
              icon="chevron-left"
              aria-label="Previous item"
              href={ctx.prev ? learnHref(course.slug, ctx.prev.id) : undefined}
              disabled={!ctx.prev}
            />
            <Button
              variant="secondary"
              iconOnly
              icon="chevron-right"
              aria-label="Next item"
              href={ctx.next ? learnHref(course.slug, ctx.next.id) : undefined}
              disabled={!ctx.next}
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
        variant="primary"
        icon="award"
        className={slim ? "shrink-0" : "mt-3"}
        onClick={showCompletion}
      >
        {certificate ? "View certificate" : "Celebrate"}
      </Button>
    );
    if (slim)
      return (
        <Card
          tone="butter"
          padding="sm"
          className="flex flex-wrap items-center gap-3 p-4"
        >
          <div className="min-w-0 flex-1 basis-40">
            <p className="t-micro text-[#6b5400] uppercase">The end</p>
            <p className="mt-0.5 text-[14.5px] leading-snug font-bold">
              That&apos;s the last item.
            </p>
            <p className="mt-0.5 text-[12.5px] font-semibold text-ink/65">
              {sub}
            </p>
          </div>
          {cta}
        </Card>
      );
    return (
      <Card tone="butter" padding="sm" className="p-5">
        <p className="t-micro text-[#6b5400] uppercase">The end</p>
        <p className="mt-1.5 t-app-h3">
          That&apos;s the last item in this course.
        </p>
        <p className="mt-1 t-small text-ink/65">{sub}</p>
        {cta}
      </Card>
    );
  }
  const a = accessMap[next.id];
  // before the store overlay, a lock may still lift: show neither state
  const unsure = !a?.allowed && !settled;
  const locked = !a?.allowed && settled;
  const href = learnHref(course.slug, next.id);
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
    : { size: "sm" as const, fullWidth: true, className: "mt-3" };
  const action = unsure ? (
    // the lock may lift once the store overlay is in (a purchase, a pass)
    <Skeleton
      className={clsx(
        "h-9 rounded-full",
        slim ? "w-28 shrink-0" : "mt-3 w-full",
      )}
    />
  ) : locked ? (
    blockedHere ? (
      <Button {...btn} variant="secondary" icon="arrow-up" onClick={toTest}>
        Back to the test
      </Button>
    ) : a?.reason === "paywall" ? (
      <BuyButton {...btn} />
    ) : (
      <Button
        {...btn}
        variant="accent"
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
            : "Unlock the course"}
      </Button>
    )
  ) : (
    <Button
      {...btn}
      className={slim ? "shrink-0" : "mt-4"}
      href={href}
      iconRight="arrow-right"
    >
      Continue
    </Button>
  );
  const icon = (
    <span
      className={clsx(
        "grid size-10 shrink-0 place-items-center rounded-[14px]",
        locked
          ? "bg-ink/[0.06] text-ink/65"
          : next.type === "quiz"
            ? "bg-butter"
            : next.type === "resource"
              ? "bg-cyan"
              : "bg-[#dfe8ff] text-blue",
      )}
    >
      <Icon
        name={
          locked
            ? "lock"
            : next.type === "video"
              ? "play"
              : next.type === "quiz"
                ? "quiz"
                : "file"
        }
        className="size-5"
      />
    </span>
  );
  if (slim)
    return (
      <Card padding="sm" className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <p className="t-micro text-ink/65 uppercase">Up next</p>
            <p className="mt-0.5 line-clamp-1 text-[14.5px] leading-snug font-bold">
              {itemTitle(next)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-semibold text-ink/65">
              {locked && <Icon name="lock" className="size-3 shrink-0" />}
              <span className="truncate">
                {locked
                  ? lockLine
                  : `${kindLabel(next)} · ${itemMeta(next, true)}`}
              </span>
            </p>
          </div>
        </div>
        {action}
      </Card>
    );
  return (
    <Card padding="sm" className="p-5">
      <p className="t-micro text-ink/65 uppercase">Up next</p>
      <div className="mt-2.5 flex gap-3">
        {icon}
        <div className="min-w-0">
          <p className="line-clamp-2 text-[15px] leading-snug font-bold">
            {itemTitle(next)}
          </p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-ink/65">
            {kindLabel(next)} · {itemMeta(next, true)}
          </p>
        </div>
      </div>
      {unsure ? (
        <div aria-hidden>
          <Skeleton className="mt-3 h-4 w-40 rounded-full" />
          {action}
        </div>
      ) : locked ? (
        <>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-ink/65">
            <Icon name="lock" className="size-3.5" />
            {lockLine}
          </p>
          {action}
        </>
      ) : (
        action
      )}
    </Card>
  );
}
