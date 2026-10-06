"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Badge, Button, DemoPill, Icon, ProgressBar } from "@/components/app";
import {
  formatDuration,
  getCourseStats,
  pad2,
  plural,
  type ModuleItem,
} from "@/lib/mock";
import type { AccessResult } from "@/lib/access";
import { learnHref, useLearn } from "./context";
import { FILE_META, formatSize } from "./media";

/* "Your path": the curriculum sidebar (desktop aside + mobile drawer body). */

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

const typeIcon = (item: ModuleItem) =>
  item.type === "video" ? "play" : item.type === "quiz" ? "quiz" : "file";

function Pending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={clsx(
        "ml-auto size-4 shrink-0 self-center rounded-full border-2 border-blue/30 border-t-blue transition-opacity",
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={clsx(
          "shrink-0 border-b border-ink/[0.07]",
          inDrawer ? "pb-4" : "px-5 pt-5 pb-4",
        )}
      >
        {!inDrawer && (
          <div className="flex items-center gap-2">
            <h2 className="t-app-h2">Your path</h2>
            <span className="flex-1" />
            {/* from xl the top bar already shows the pill */}
            <span className="xl:hidden">
              <DemoPill />
            </span>
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                id="learn-path-hide"
                icon="chevrons-left"
                aria-label="Hide your path"
                aria-expanded
                onClick={onCollapse}
                className="-mr-2"
              />
            )}
          </div>
        )}
        <div
          className={clsx(
            "flex flex-wrap items-center justify-between gap-2",
            !inDrawer && "mt-1",
          )}
        >
          <p className="t-small text-ink/65">
            {[
              plural(stats.modules, "module"),
              plural(stats.videos, "lesson"),
              plural(stats.quizzes, "test"),
              stats.totalSec > 0
                ? formatDuration(stats.totalSec, "short")
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {inDrawer && <DemoPill />}
        </div>
        {/* Before the store overlay lands, draw what the seed says: a learner's
            bar at once (only its number may change), anything that a demo
            purchase could still flip kept invisible but in place. */}
        {tracking ? (
          <ProgressBar
            value={progress.percent}
            className="mt-3"
            showValue
            label={`${progress.completed} of ${progress.total} done`}
          />
        ) : courseAccess.purchasable ? (
          <p
            className={clsx(
              "mt-3 flex items-start gap-2 rounded-tag bg-[#dfe8ff] px-3 py-2.5 text-[13px] leading-snug font-semibold text-blue-deep",
              !settled && "invisible",
            )}
            aria-hidden={!settled || undefined}
          >
            <Icon
              name={tutorBrowsing ? "switch" : "unlock"}
              className="mt-px size-4"
            />
            <span>
              {tutorBrowsing
                ? "You're browsing as a tutor, so only the free first video is open. Switch to the student demo to buy and learn."
                : "The first video is free. Unlock the rest whenever the vibe fits."}
            </span>
          </p>
        ) : courseAccess.owner || courseAccess.admin ? (
          <p className="mt-3 flex items-start gap-2 rounded-tag bg-cyan px-3 py-2.5 text-[13px] leading-snug font-semibold text-[#0b5d5e]">
            <Icon name="eye" className="mt-px size-4" />
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
          inDrawer ? "-mx-2 pt-3" : "px-3 py-3",
        )}
        data-lenis-prevent=""
      >
        <ol className="space-y-1.5">
          {modules.map((m) => {
            const open = isOpen(m.id);
            const done = m.items.filter((i) => completed.has(i.id)).length;
            const allDone =
              tracking && done === m.items.length && m.items.length > 0;
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
                    "tap flex w-full items-center gap-3 rounded-[18px] px-2 py-2 text-left transition-colors hf:bg-ink/[0.04]",
                    // the sheet: module headers stay on top while their items scroll
                    inDrawer &&
                      "max-sm:sticky max-sm:top-0 max-sm:z-[1] max-sm:min-h-14 max-sm:bg-white",
                  )}
                >
                  <span
                    className={clsx(
                      "grid size-9 shrink-0 place-items-center rounded-tag font-display text-[17px] leading-none",
                      allDone
                        ? "bg-green text-white"
                        : m.id === currentModuleId
                          ? "bg-blue text-white"
                          : "bg-ink/[0.06] text-ink",
                    )}
                    aria-hidden
                  >
                    {allDone ? (
                      <Icon
                        name="check"
                        className="size-[18px]"
                        strokeWidth={3}
                      />
                    ) : (
                      pad2(m.position)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] leading-tight font-bold">
                      {m.title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] font-semibold text-ink/65">
                      {tracking
                        ? `${done}/${m.items.length} done`
                        : plural(m.items.length, "item")}
                      {secs > 0 && ` · ${formatDuration(secs, "short")}`}
                    </span>
                  </span>
                  <Icon
                    name="chevron-down"
                    className={clsx(
                      "size-[18px] text-ink/65 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open && (
                  <ol id={panelId} className="app-fade mt-1 mb-2 space-y-0.5">
                    {m.items.map((item) => (
                      <PathItem
                        key={item.id}
                        item={item}
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
  const gating = item.type === "quiz" && item.quiz.isGating;
  const kind =
    item.type === "video"
      ? "Lesson"
      : item.type === "quiz"
        ? "Test"
        : "Download";
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
          "tap group flex gap-3 rounded-[16px] py-2.5 pr-3 pl-3.5 transition-colors duration-150",
          roomy && "max-sm:min-h-14 max-sm:items-center",
          current ? "bg-[#dfe8ff]" : "hf:bg-ink/[0.04]",
        )}
      >
        <span
          aria-hidden
          className={clsx(
            "mt-px grid size-7 shrink-0 place-items-center rounded-full",
            done
              ? "bg-green text-white"
              : current
                ? "bg-blue text-white"
                : locked
                  ? "bg-ink/[0.06] text-ink/65"
                  : "bg-white text-ink/70 ring-1 ring-ink/[0.12]",
          )}
        >
          <Icon
            name={done ? "check" : locked ? "lock" : typeIcon(item)}
            className="size-3.5"
            strokeWidth={done ? 3 : 2.4}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              "line-clamp-2 block text-[14px] leading-snug",
              current ? "font-bold text-ink" : "font-semibold",
              locked && !current && "text-ink/65",
            )}
          >
            <span className="sr-only">{kind}: </span>
            {title}
            {status && <span className="sr-only">, {status}.</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold text-ink/65">
            <span className="inline-flex items-center gap-1">
              <Icon
                name={
                  item.type === "video"
                    ? "clock"
                    : item.type === "quiz"
                      ? "quiz"
                      : "file"
                }
                className="size-3.5"
              />
              {itemMeta(item)}
            </span>
            {free && (
              <Badge tone="mint" size="sm">
                Free<span className="sr-only"> preview</span>
              </Badge>
            )}
            {gating && (
              <Badge tone="butter" size="sm">
                Checkpoint
              </Badge>
            )}
          </span>
          {reason && (
            <span
              className={clsx(
                "mt-1 flex items-center gap-1 text-[12px] font-bold text-ink/65",
                tentative && "invisible",
              )}
              aria-hidden={tentative || undefined}
            >
              <Icon name="lock" className="size-3" strokeWidth={2.6} />
              {reason}
            </span>
          )}
        </span>
        <Pending />
      </Link>
    </li>
  );
}
