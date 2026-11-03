"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button, DemoPill, Icon, ProgressBar } from "@/components/app";
import {
  formatDuration,
  getCourseStats,
  pad2,
  plural,
  runtimeShort,
  type ModuleItem,
} from "@/lib/mock";
import type { AccessResult } from "@/lib/access";
import { learnHref, useLearn } from "./context";
import { FILE_META, formatSize } from "./media";

/* "Your path": the curriculum as a numbered, ruled list (desktop aside on the
   right + the drawer / sheet body). Mono indexes ("05.02"), a red marker on the
   item you're on, lock icons, tests marked TEST. Everything reads the context
   tokens, so it works on the theatre (aside) and on the cream drawer alike. */

/** "9:24" / "Test · 5 questions" / "PDF · 1.2 MB". `short` drops the "Test ·" kind prefix. */
export function itemMeta(item: ModuleItem, short = false): string {
  if (item.type === "video")
    return formatDuration(item.lesson.durationSec, "clock");
  if (item.type === "quiz")
    return `${short ? "" : "Test · "}${plural(item.quiz.questions.length, "question")}`;
  const size = formatSize(item.resource.sizeKb);
  return [FILE_META[item.resource.fileType].label, size]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Short lock line. `currentItemId` is the item the learner is on: when that item
 * is itself the blocking test, "above" would be wrong.
 */
export function lockReason(
  a: AccessResult | undefined,
  currentItemId?: string,
): string | null {
  if (!a || a.allowed) return null;
  if (a.reason === "gated")
    return a.blockedBy && a.blockedBy.id === currentItemId
      ? "Pass the test you're on to unlock"
      : "Pass the test above to unlock";
  if (a.reason === "unavailable") return "Not available right now";
  if (a.reason === "login") return "Log in and unlock the course";
  return "Comes with the full course";
}

/** A navigation is in flight for this link: a small square spinner on the row. */
function Pending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={clsx(
        "size-3.5 shrink-0 border-[1.5px] border-line-strong border-t-red transition-opacity",
        pending ? "animate-spin opacity-100" : "opacity-0",
      )}
    />
  );
}

export function PathPanel({
  currentItemId,
  onNavigate,
  onCollapse,
  inDrawer,
}: {
  currentItemId?: string;
  onNavigate?: () => void;
  onCollapse?: () => void;
  inDrawer?: boolean;
}) {
  const {
    course,
    modules,
    accessMap,
    completed,
    progress,
    tracking,
    courseAccess,
    db,
    settled,
    tutorBrowsing,
  } = useLearn();
  const stats = getCourseStats(course.id, db);
  const currentModuleId = modules.find((m) =>
    m.items.some((i) => i.id === currentItemId),
  )?.id;
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) =>
    overrides[id] ?? (id === currentModuleId || modules.length <= 2);
  const navRef = useRef<HTMLElement>(null);

  // keep the current item in view inside the scrolling list (never scrolls the page)
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !el) return;
    // position of the item inside the scrolling list, independent of offsetParent
    const top =
      el.getBoundingClientRect().top -
      nav.getBoundingClientRect().top +
      nav.scrollTop;
    const bottom = top + el.offsetHeight;
    if (
      top < nav.scrollTop + 24 ||
      bottom > nav.scrollTop + nav.clientHeight - 24
    )
      nav.scrollTo({ top: Math.max(0, top - nav.clientHeight / 3) });
    // Re-run once the store overlay lands: locked rows gain a lock line then and
    // push the current item down (on a direct load it could end up cut off).
  }, [currentItemId, settled]);

  // same facts, same words as the course page curriculum header ("10 modules + capstone ·
  // 34 videos · 9 tests · 7h 01m"): a trailing "Capstone…" module counts apart
  const capstone = modules.length > 0 && /^capstone/i.test(modules[modules.length - 1].title.trim());
  const summary = [
    plural(stats.modules - (capstone ? 1 : 0), "module") + (capstone ? " + capstone" : ""),
    plural(stats.videos, "video"),
    plural(stats.quizzes, "test"),
    stats.totalSec > 0 ? runtimeShort(stats.totalSec) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={clsx(
          "shrink-0 border-b border-line",
          inDrawer ? "pb-5" : "px-6 pt-5 pb-5",
        )}
      >
        {!inDrawer && (
          <div className="flex min-h-9 items-center gap-2">
            <h2 className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.16em] text-fg uppercase md:text-[11.5px]">
              <span aria-hidden className="h-px w-5 shrink-0 bg-red" />
              Your path
            </h2>
            <span className="flex-1" />
            {/* from xl the top bar already shows the pill */}
            <span className="xl:hidden">
              <DemoPill tone="dark" />
            </span>
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                id="learn-path-hide"
                icon="chevron-right"
                aria-label="Hide your path"
                aria-expanded
                onClick={onCollapse}
                className="-mr-2.5"
              />
            )}
          </div>
        )}
        <div
          className={clsx(
            "flex flex-wrap items-center justify-between gap-2",
            !inDrawer && "mt-3",
          )}
        >
          <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase tabular-nums">
            {summary}
          </p>
          {inDrawer && <DemoPill tone="dark" />}
        </div>
        {/* Before the store overlay lands, draw what the seed says: a learner's
            bar at once (only its number may change), anything that a demo
            purchase could still flip kept invisible but in place. */}
        {tracking ? (
          <ProgressBar
            value={progress.percent}
            size="sm"
            className="mt-4"
            showValue
            label={`${progress.completed} of ${progress.total} done`}
          />
        ) : courseAccess.purchasable ? (
          <p
            className={clsx(
              "mt-4 flex items-start gap-2.5 border-l-2 border-red pl-3 text-[13px] leading-snug text-muted",
              !settled && "invisible",
            )}
            aria-hidden={!settled || undefined}
          >
            <span>
              {tutorBrowsing
                ? "You're browsing as a tutor, so only the free first video is open. Switch to the student demo to buy and learn."
                : "The first lesson is free. Unlock the rest when you are ready."}
            </span>
          </p>
        ) : courseAccess.owner || courseAccess.admin ? (
          <p className="mt-4 flex items-start gap-2.5 border-l-2 border-line-strong pl-3 text-[13px] leading-snug text-muted">
            <span>
              {courseAccess.owner
                ? "Tutor preview: every item is open and nothing is tracked."
                : "Admin view: every item is open and nothing is tracked."}
            </span>
          </p>
        ) : null}
      </div>

      <nav
        ref={navRef}
        aria-label="Course curriculum"
        className={clsx(
          "app-scroll relative min-h-0 flex-1 overflow-y-auto",
          inDrawer ? "-mx-5 sm:-mx-6" : "",
        )}
        data-lenis-prevent=""
      >
        <ol className="divide-y divide-line">
          {modules.map((m) => {
            const open = isOpen(m.id);
            const done = m.items.filter((i) => completed.has(i.id)).length;
            const allDone =
              tracking && done === m.items.length && m.items.length > 0;
            const here = m.id === currentModuleId;
            const secs = m.items.reduce(
              (s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0),
              0,
            );
            const panelId = `path-${inDrawer ? "d" : "s"}-${m.id}`;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOverrides((o) => ({ ...o, [m.id]: !open }))}
                  className={clsx(
                    "tap group flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hf:bg-fg/[0.03]",
                    inDrawer && "max-sm:px-5",
                    // the sheet: module headers stay on top while their items scroll
                    inDrawer &&
                      "max-sm:sticky max-sm:top-0 max-sm:z-[1] max-sm:min-h-14 max-sm:bg-surface",
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx(
                      "w-6 shrink-0 pt-[3px] font-mono text-[11.5px] tabular-nums",
                      here ? "text-red-deep on-dark:text-red-lite" : "text-muted",
                    )}
                  >
                    {pad2(m.position)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={clsx(
                        "block font-heading text-[15.5px] leading-[1.2] font-semibold tracking-[-0.02em]",
                        allDone && !here && "text-muted",
                      )}
                    >
                      {m.title}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase tabular-nums">
                      {tracking
                        ? `${done}/${m.items.length} done`
                        : plural(m.items.length, "item")}
                      {secs > 0 && ` · ${formatDuration(secs, "short")}`}
                      {allDone && (
                        <Icon
                          name="check"
                          className="size-3.5 text-fg"
                          strokeWidth={2}
                        />
                      )}
                    </span>
                  </span>
                  <Icon
                    name="chevron-down"
                    className={clsx(
                      "mt-0.5 size-4 shrink-0 text-muted transition-transform duration-200 group-hf:text-fg",
                      open && "rotate-180",
                    )}
                    strokeWidth={1.6}
                  />
                </button>
                {open && (
                  <ol id={panelId} className="app-fade pb-3">
                    {m.items.map((item, i) => (
                      <PathItem
                        key={item.id}
                        item={item}
                        index={`${pad2(m.position)}.${pad2(i + 1)}`}
                        href={learnHref(course.slug, item.id)}
                        current={item.id === currentItemId}
                        done={completed.has(item.id)}
                        access={accessMap[item.id]}
                        // before the overlay a lock may still lift: its line
                        // keeps its room but stays invisible (no shift either way)
                        tentative={!settled}
                        currentItemId={currentItemId}
                        onNavigate={onNavigate}
                        roomy={inDrawer}
                      />
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function PathItem({
  item,
  index,
  href,
  current,
  done,
  access,
  currentItemId,
  onNavigate,
  tentative,
  roomy,
}: {
  roomy?: boolean;
  item: ModuleItem;
  /** "05.02" */
  index: string;
  href: string;
  current: boolean;
  done: boolean;
  access?: AccessResult;
  currentItemId?: string;
  onNavigate?: () => void;
  tentative?: boolean;
}) {
  const locked = !tentative && !!access && !access.allowed;
  const reason = lockReason(access, currentItemId);
  const title =
    item.type === "video"
      ? item.lesson.title
      : item.type === "quiz"
        ? item.quiz.title
        : item.resource.title;
  const free = item.type === "video" && item.lesson.isFreePreview;
  const quiz = item.type === "quiz";
  const gating = quiz && item.quiz.isGating;
  const kind =
    item.type === "video" ? "Lesson" : quiz ? "Test" : "Download";
  // the visible text is the accessible name; these fill in what icons convey
  const status = done
    ? "completed"
    : locked
      ? "locked"
      : current
        ? "you're here"
        : undefined;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className={clsx(
          "tap group relative flex gap-4 py-2.5 pr-5 pl-6 transition-colors duration-150",
          roomy && "max-sm:min-h-14 max-sm:items-center max-sm:pr-5 max-sm:pl-5",
          current ? "bg-fg/[0.06]" : "hf:bg-fg/[0.03]",
        )}
      >
        {/* the red marker on the item you're on */}
        {current && (
          <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-red" />
        )}
        <span
          aria-hidden
          className={clsx(
            "w-9 shrink-0 pt-[2px] font-mono text-[10.5px] tracking-[0.02em] tabular-nums",
            current ? "text-red-deep on-dark:text-red-lite" : "text-muted",
          )}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              "line-clamp-2 block text-[13.5px] leading-snug",
              current ? "font-semibold text-fg" : "font-medium",
              (locked || done) && !current && "text-muted",
            )}
          >
            <span className="sr-only">{kind}: </span>
            {title}
            {status && <span className="sr-only">, {status}.</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] tracking-[0.05em] text-muted uppercase tabular-nums">
            <span>
              {item.type === "video"
                ? itemMeta(item)
                : quiz
                  ? plural(item.quiz.questions.length, "question")
                  : itemMeta(item)}
            </span>
            {free && (
              <span className="text-fg">
                · Free<span className="sr-only"> preview</span>
              </span>
            )}
            {gating && <span>· Checkpoint</span>}
          </span>
          {reason && (
            <span
              className={clsx(
                "mt-1 block text-[11.5px] leading-snug text-muted",
                tentative && "invisible",
              )}
              aria-hidden={tentative || undefined}
            >
              {reason}
            </span>
          )}
        </span>
        {/* state column: TEST slate, lock, tick */}
        <span className="flex shrink-0 items-start gap-2 pt-[1px]">
          <Pending />
          {quiz && (
            <span
              aria-hidden
              className={clsx(
                "inline-flex h-[18px] items-center px-1.5 font-mono text-[9.5px] font-medium tracking-[0.1em] uppercase ring-1 ring-inset",
                current
                  ? "text-red-deep ring-red/50 on-dark:text-red-lite on-dark:ring-red-lite/50"
                  : "text-muted ring-line-strong",
              )}
            >
              Test
            </span>
          )}
          {done ? (
            <Icon
              name="check"
              className="size-4 text-fg"
              strokeWidth={2}
              aria-hidden
            />
          ) : locked ? (
            <Icon
              name="lock"
              className="size-3.5 text-muted"
              strokeWidth={1.7}
              aria-hidden
            />
          ) : current ? (
            <Icon
              name={item.type === "video" ? "play" : quiz ? "quiz" : "file"}
              className="size-3.5 text-red-deep on-dark:text-red-lite"
              strokeWidth={1.8}
              aria-hidden
            />
          ) : (
            <span aria-hidden className="block size-4" />
          )}
        </span>
      </Link>
    </li>
  );
}
