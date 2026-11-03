"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  MOCK_NOW,
  getItem,
  getTutorQuestions,
  itemTitle,
  timeAgo,
} from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { REPLY_TEMPLATES } from "@/lib/mock/extra/tutor";
import {
  Avatar,
  BottomSheet,
  Button,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  Pagination,
  SearchInput,
  Section,
  Select,
  Skeleton,
  StatGrid,
  StatTile,
  Tabs,
  Textarea,
  toast,
} from "@/components/app";
import { WideSection } from "@/components/admin/ledgerKit";
import { MonoMeta, RuleNote, RuledList, RuledRow } from "./editorial";
import { useTutorContext } from "./shared";

/* =============================================================================
   Tutor Q&A inbox, design system v2: indexed rhythm numbers, then a ruled inbox
   (waiting threads first) where each thread is a hairline row with a mono status
   column. One thread at a time carries the reply composer (the first waiting one,
   or the one you pick), so the page has a single red "Post answer". Phones answer
   in a bottom sheet.
   ============================================================================= */

type Filter = "unanswered" | "answered" | "all";
type ThreadData = ReturnType<typeof getTutorQuestions>[number];
/** A thread is handled once the tutor answered it, or someone marked it resolved. */
const isHandled = (t: ThreadData) => t.answered || !!t.question.resolved;
const firstName = (n?: string) => n?.split(" ")[0] ?? "the learner";
const PAGE = 8;

export function TutorQuestions({
  initialFilter,
  initialCourse,
  initialQuery,
  focusId,
}: {
  initialFilter?: string;
  initialCourse?: string;
  initialQuery?: string;
  focusId?: string;
}) {
  const { userId, db, tutor, profile, hydrated } = useTutorContext();
  const [filter, setFilter] = useState<Filter>(
    initialFilter === "answered" || initialFilter === "all"
      ? initialFilter
      : "unanswered",
  );
  const [course, setCourse] = useState(initialCourse || "all");
  const [q, setQ] = useState(initialQuery ?? "");
  // Filters live in the URL (like Courses and Analytics), so reload and back keep them.
  const urlTimer = useRef<number | null>(null);
  const syncUrl = (
    next: { filter?: Filter; course?: string; q?: string },
    delay = 0,
  ) => {
    const p = new URLSearchParams();
    const nf = next.filter ?? filter;
    const nc = next.course ?? course;
    const nq = (next.q ?? q).trim();
    if (nf !== "unanswered") p.set("filter", nf);
    if (nc !== "all") p.set("course", nc);
    if (nq) p.set("q", nq);
    if (urlTimer.current) window.clearTimeout(urlTimer.current);
    // native replaceState: Next keeps useSearchParams in sync without a server round trip,
    // so typing never waits on (or remounts with) a refetch of the page
    const go = () =>
      window.history.replaceState(
        null,
        "",
        `/tutor/questions${p.size ? `?${p}` : ""}`,
      );
    if (delay) urlTimer.current = window.setTimeout(go, delay);
    else go();
  };
  useEffect(
    () => () => {
      if (urlTimer.current) window.clearTimeout(urlTimer.current);
    },
    [],
  );
  const [page, setPage] = useState(1);
  /** answered or resolved during this visit: they stay where they were (and under "Unanswered") until the filter changes */
  const [touched, setTouched] = useState<string[]>([]);
  /** the thread holding the desktop composer (null = the first waiting thread on the page) */
  const [activeId, setActiveId] = useState<string | null>(focusId ?? null);

  const threads = useMemo(
    () => getTutorQuestions(userId, {}, db),
    [userId, db],
  );
  const courses = useMemo(
    () => [...new Map(threads.map((t) => [t.course.id, t.course])).values()],
    [threads],
  );
  const counts = useMemo(
    () => ({
      unanswered: threads.filter((t) => !isHandled(t)).length,
      answered: threads.filter(isHandled).length,
      all: threads.length,
    }),
    [threads],
  );
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const waiting = (t: ThreadData) =>
      !isHandled(t) || touched.includes(t.question.id);
    return threads
      .filter(
        (t) =>
          (filter === "all" ||
            (filter === "unanswered" ? waiting(t) : isHandled(t))) &&
          (course === "all" || t.course.id === course) &&
          words.every((w) =>
            `${t.question.body} ${t.question.user?.name} ${t.course.title} ${t.item ? itemTitle(t.item) : ""}`
              .toLowerCase()
              .includes(w),
          ),
      )
      .sort(
        (a, b) =>
          Number(!waiting(a)) - Number(!waiting(b)) ||
          b.question.createdAt.localeCompare(a.question.createdAt),
      );
  }, [threads, filter, course, q, touched]);
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pageCount);
  const shown = list.slice((cur - 1) * PAGE, cur * PAGE);
  const active =
    (activeId && shown.some((t) => t.question.id === activeId)
      ? activeId
      : null) ??
    shown.find((t) => !isHandled(t))?.question.id ??
    null;

  // reply rhythm (from the live threads)
  const rhythm = useMemo(() => {
    const firstReplyHours: number[] = [];
    for (const t of threads) {
      const mine = t.replies.find((r) => r.userId === userId);
      if (mine)
        firstReplyHours.push(
          (new Date(mine.createdAt).getTime() -
            new Date(t.question.createdAt).getTime()) /
            3_600_000,
        );
    }
    const avg = firstReplyHours.length
      ? firstReplyHours.reduce((a, b) => a + b, 0) / firstReplyHours.length
      : null;
    const waiting = threads
      .filter((t) => !isHandled(t))
      .sort((a, b) => a.question.createdAt.localeCompare(b.question.createdAt));
    const monthAgo = MOCK_NOW.getTime() - 30 * 86_400_000;
    const answeredMonth = threads.filter((t) =>
      t.replies.some(
        (r) =>
          r.userId === userId && new Date(r.createdAt).getTime() >= monthAgo,
      ),
    ).length;
    const byLesson = new Map<
      string,
      { label: string; course: string; href?: string; count: number }
    >();
    for (const t of threads) {
      const key = `${t.course.id}:${t.question.itemId}`;
      const cur = byLesson.get(key) ?? {
        label: t.item ? itemTitle(t.item) : "Course discussion",
        course: t.course.title,
        href: t.item ? `/learn/${t.course.slug}/${t.item.id}` : undefined,
        count: 0,
      };
      cur.count += 1 + t.question.likes;
      byLesson.set(key, cur);
    }
    return {
      avg:
        avg === null
          ? "–"
          : avg < 1
            ? "< 1h"
            : avg < 24
              ? `${Math.round(avg)}h`
              : `${Math.round(avg / 24)}d`,
      oldest: waiting[0] ? timeAgo(waiting[0].question.createdAt) : null,
      answeredMonth,
      hot: [...byLesson.values()].sort((a, b) => b.count - a.count).slice(0, 4),
    };
  }, [threads, userId]);

  const changeFilter = (
    f: Filter,
    extra: { course?: string; q?: string } = {},
  ) => {
    setFilter(f);
    setPage(1);
    setTouched([]);
    syncUrl({ filter: f, ...extra });
  };
  const touch = (id: string) =>
    setTouched((x) => (x.includes(id) ? x : [...x, id]));

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Tutor studio"
        title={
          <>
            Learner <em>questions</em>.
          </>
        }
        description="Answer once, help everyone who had the same doubt. Replies show up under the lesson for every learner."
        breadcrumbs={[
          { label: "Studio", href: "/tutor" },
          { label: "Questions" },
        ]}
      />

      <h2 className="sr-only">Your reply rhythm</h2>
      <StatGrid>
        <StatTile
          index="01"
          variant={counts.unanswered ? "ink" : "paper"}
          label="Waiting"
          value={counts.unanswered}
          hint={rhythm.oldest ? `oldest asked ${rhythm.oldest}` : "inbox zero"}
        />
        <StatTile
          index="02"
          label="Avg first reply"
          value={rhythm.avg}
          hint="across your answered threads"
        />
        <StatTile
          index="03"
          label="Answered · 30 days"
          value={rhythm.answeredMonth}
          hint="threads you replied to"
        />
        <StatTile
          index="04"
          label="All threads"
          value={counts.all}
          hint={`${counts.answered} answered or resolved`}
        />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <WideSection
          id="inbox"
          index="01"
          label="Inbox"
          note="Waiting threads first, newest first. Mark a thread resolved when it needs no answer."
          title={
            counts.unanswered
              ? `${counts.unanswered} waiting for you`
              : "Every question has an answer"
          }
          bodyClassName="!mt-6 md:!mt-8"
        >
          {/* ruled toolbar: status tabs on the left, course + search on the right */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-6">
            <Tabs
              label="Filter questions"
              value={filter}
              onChange={(id) => changeFilter(id as Filter)}
              className="min-w-0 xl:flex-1"
              items={[
                {
                  id: "unanswered",
                  label: "Unanswered",
                  count: counts.unanswered,
                },
                { id: "answered", label: "Answered", count: counts.answered },
                { id: "all", label: "All", count: counts.all },
              ]}
            />
            <div className="flex flex-col gap-2 pb-px sm:flex-row xl:shrink-0">
              <div className="sm:w-[240px]">
                <Select
                  aria-label="Course"
                  selectSize="md"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    setPage(1);
                    syncUrl({ course: e.target.value });
                  }}
                  options={[
                    { value: "all", label: "All courses" },
                    ...courses.map((c) => ({ value: c.id, label: c.title })),
                  ]}
                />
              </div>
              <div className="sm:w-[260px]">
                <SearchInput
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                    syncUrl({ q: e.target.value }, 350);
                  }}
                  onClear={() => {
                    setQ("");
                    syncUrl({ q: "" });
                  }}
                  placeholder="Search questions"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8">
            {!hydrated && threads.length === 0 ? (
              <ul
                className="divide-y divide-line border-y border-line border-t-fg"
                aria-hidden
              >
                {[0, 1, 2].map((i) => (
                  <li key={i} className="py-6">
                    <Skeleton variant="row" />
                    <Skeleton variant="text" className="mt-4" lines={2} />
                  </li>
                ))}
              </ul>
            ) : shown.length === 0 ? (
              <div className="border-t border-fg">
                {counts.all === 0 ? (
                  <EmptyState
                    art="none"
                    align="start"
                    eyebrow="Inbox"
                    title="No questions yet."
                    body="When learners ask something under one of your lessons, it lands here. Answer once and everyone with the same doubt sees it."
                    action={
                      <Button variant="outline" href="/tutor/courses">
                        Open your courses
                      </Button>
                    }
                  />
                ) : filter === "unanswered" && !q && course === "all" ? (
                  <EmptyState
                    art="none"
                    align="start"
                    eyebrow="Inbox zero"
                    title="Every question has an answer."
                    body="New ones from your lessons land here. Go record something."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => changeFilter("answered")}
                      >
                        See answered questions
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    art="none"
                    align="start"
                    eyebrow="No matches"
                    title="Nothing matches."
                    body="Try another word, another course or the All tab."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQ("");
                          setCourse("all");
                          changeFilter("all", { course: "all", q: "" });
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                )}
              </div>
            ) : (
              <ul
                className="divide-y divide-line border-y border-line border-t-fg"
                aria-label="Questions"
              >
                {shown.map((t) => (
                  <Thread
                    key={t.question.id}
                    thread={t}
                    tutorId={userId}
                    tutorName={tutor?.name ?? profile?.name ?? "You"}
                    tutorAvatar={tutor?.avatar}
                    focus={t.question.id === focusId}
                    active={t.question.id === active}
                    onActivate={() => setActiveId(t.question.id)}
                    onTouched={() => touch(t.question.id)}
                    lessonHref={
                      t.item
                        ? `/learn/${t.course.slug}/${t.item.id}`
                        : undefined
                    }
                    lessonPos={
                      t.item
                        ? getItem(t.course.id, t.item.id, db)?.label
                        : undefined
                    }
                    lessonLabel={
                      t.item ? itemTitle(t.item) : "Course discussion"
                    }
                    onAnswered={() => {
                      touch(t.question.id);
                      // hand the composer on to the next waiting thread
                      setActiveId(null);
                    }}
                  />
                ))}
              </ul>
            )}
            {list.length > 0 && (
              <Pagination
                className="mt-6"
                page={cur}
                pageCount={pageCount}
                onChange={setPage}
                total={list.length}
                pageSize={PAGE}
              />
            )}
          </div>
        </WideSection>

        {rhythm.hot.length > 0 && (
          <Section
            index="02"
            label="Hot spots"
            note="Lessons with the most asks: questions plus +1s from other learners."
            title="Where doubts cluster"
          >
            <RuledList as="ol" label="Lessons with the most questions">
              {rhythm.hot.map((h, i) => (
                <RuledRow
                  key={h.label + h.course}
                  index={i + 1}
                  title={h.label}
                  href={h.href}
                  meta={h.course}
                  trailing={
                    <MonoMeta as="span" className="!text-fg">
                      <span title="Questions plus +1s from other learners">
                        {h.count} {h.count === 1 ? "ask" : "asks"}
                      </span>
                    </MonoMeta>
                  }
                />
              ))}
            </RuledList>
            <RuleNote className="mt-6" label="Studio tip" icon="sparkles">
              A short re-record or a one-page cheat sheet under the lesson
              usually fixes a cluster. Answers within a day tend to turn into
              5-star reviews.
            </RuleNote>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- thread */

function StatusMark({ thread: t }: { thread: ThreadData }) {
  const waiting = !isHandled(t);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.08em] uppercase",
        waiting ? "text-red-deep" : t.answered ? "text-fg" : "text-muted",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "size-[7px] shrink-0",
          waiting
            ? "bg-red"
            : t.answered
              ? "bg-fg"
              : "ring-1 ring-current ring-inset",
        )}
      />
      {waiting ? "Unanswered" : t.answered ? "Answered" : "Resolved"}
    </span>
  );
}

function Thread({
  thread: t,
  tutorId,
  tutorName,
  tutorAvatar,
  focus,
  active,
  onActivate,
  lessonHref,
  lessonPos,
  lessonLabel,
  onAnswered,
  onTouched,
}: {
  thread: ThreadData;
  tutorId: string;
  tutorName: string;
  tutorAvatar?: string;
  focus?: boolean;
  /** this thread holds the desktop composer */
  active: boolean;
  onActivate: () => void;
  lessonHref?: string;
  /** "MODULE 05 / LESSON 03" */
  lessonPos?: string;
  lessonLabel: string;
  onAnswered: () => void;
  onTouched: () => void;
}) {
  const [open, setOpen] = useState(!t.answered || !!focus);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** phones: the reply composer opens in a bottom sheet instead of an inline textarea */
  const [sheet, setSheet] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sheetTextRef = useRef<HTMLTextAreaElement>(null);
  /** focus the composer once this thread becomes active from its own "Answer" button */
  const wantFocus = useRef(false);
  const who = t.question.user?.name?.split(" ")[0] ?? "the learner";
  const waiting = !isHandled(t);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: "center" });
  }, [focus]);
  useEffect(() => {
    if (active && wantFocus.current) {
      wantFocus.current = false;
      requestAnimationFrame(() => textRef.current?.focus());
    }
  }, [active]);

  const post = () => {
    if (body.trim().length < 2) {
      setError("Write an answer first.");
      (sheet ? sheetTextRef : textRef).current?.focus();
      return;
    }
    demo.addComment(
      tutorId,
      t.course.id,
      t.question.itemId,
      body.trim(),
      t.question.id,
    );
    setBody("");
    setError(null);
    setSheet(false);
    setOpen(true);
    onAnswered();
    toast.success("Answer posted. Nice one.", {
      description: `${t.question.user?.name?.split(" ")[0] ?? "The learner"} gets a notification.`,
    });
  };
  const addTemplate = (text: string) => {
    setBody((b) => (b ? `${b.trimEnd()} ${text}` : text));
    if (error) setError(null);
  };

  const menu = (
    <DropdownMenu
      label={`Actions for ${firstName(t.question.user?.name)}'s question`}
      trigger={<Icon name="more" className="size-5" strokeWidth={1.8} />}
      triggerClassName="grid size-9 place-items-center text-muted transition-colors hf:text-fg focus-visible:outline-2 focus-visible:outline-red coarse:size-11"
      items={[
        ...(lessonHref
          ? [
              {
                label: "Open the lesson",
                icon: "play-circle" as const,
                href: lessonHref,
              },
            ]
          : []),
        {
          label: t.question.resolved ? "Mark as open" : "Mark as resolved",
          icon: "check-circle",
          onSelect: () => {
            demo.setCommentResolved(t.question.id, !t.question.resolved);
            onTouched();
            toast(
              t.question.resolved
                ? "Marked as open"
                : t.answered
                  ? "Marked as resolved"
                  : "Marked as resolved. It no longer counts as waiting.",
            );
          },
        },
      ]}
    />
  );

  return (
    <li
      ref={ref}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "relative scroll-mt-24 py-6 transition-colors md:py-7",
        active &&
          "sm:bg-paper sm:px-5 sm:shadow-[inset_2px_0_0_var(--color-red)] md:px-6",
      )}
    >
      <div className="md:grid md:grid-cols-[140px_minmax(0,1fr)] md:gap-x-8">
        {/* status column (md+); phones: one row above the asker */}
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:justify-start md:gap-2">
          <StatusMark thread={t} />
          <MonoMeta as="span" className="max-md:ml-auto">
            {timeAgo(t.question.createdAt)}
          </MonoMeta>
          <span className="md:hidden">{menu}</span>
        </div>

        <div className="min-w-0 max-md:mt-3">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
              <Avatar
                name={t.question.user?.name ?? "Learner"}
                src={t.question.user?.avatar}
                tone={t.question.user?.tone}
                size="xs"
                decorative
              />
              <span className="text-[14.5px] font-semibold tracking-[-0.01em]">
                {t.question.user?.name ?? "Learner"}
              </span>
              {t.question.user?.city && (
                <span className="text-[13px] text-muted">
                  {t.question.user.city}
                </span>
              )}
            </div>
            <span className="-mt-1.5 shrink-0 max-md:hidden">{menu}</span>
          </div>

          <p className="mt-3 max-w-[64ch] font-heading text-[17px] leading-[1.4] font-medium tracking-[-0.018em] [overflow-wrap:anywhere] md:text-[18px]">
            {t.question.body}
          </p>

          <p className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-muted">
            {lessonPos && (
              <span className="font-mono text-[11px] tracking-[0.06em] whitespace-nowrap uppercase">
                {lessonPos}
              </span>
            )}
            {lessonHref ? (
              <Link
                href={lessonHref}
                className="min-w-0 font-medium [overflow-wrap:anywhere] text-fg underline decoration-line-strong underline-offset-[3px] hf:decoration-fg"
              >
                {lessonLabel}
              </Link>
            ) : (
              <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-fg">
                {lessonLabel}
              </span>
            )}
            <span className="min-w-0 [overflow-wrap:anywhere] max-sm:basis-full">
              <span aria-hidden className="max-sm:hidden">
                ·{" "}
              </span>
              {t.course.title}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
              <Icon name="heart" strokeWidth={1.6} className="size-3.5" />
              {t.question.likes}{" "}
              {t.question.likes === 1 ? "learner has" : "learners have"} this
              question too
            </span>
            {t.replies.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.08em] text-fg uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red hf:text-red-deep coarse:-my-3 coarse:min-h-11"
              >
                {t.replies.length}{" "}
                {t.replies.length === 1 ? "reply" : "replies"}
                <Icon
                  name={open ? "chevron-up" : "chevron-down"}
                  className="size-3.5"
                  strokeWidth={1.8}
                />
              </button>
            )}
            {!active && (
              <Button
                size="sm"
                variant={waiting ? "outline" : "ghost"}
                icon="chat"
                className="max-sm:hidden sm:ml-auto"
                onClick={() => {
                  wantFocus.current = true;
                  setOpen(true);
                  onActivate();
                }}
              >
                {waiting ? `Answer ${who}` : "Reply"}
              </Button>
            )}
          </div>

          {open && t.replies.length > 0 && (
            <ul className="app-fade mt-5 space-y-4" aria-label="Replies">
              {t.replies.map((r) => {
                const mine = r.userId === tutorId;
                return (
                  <li
                    key={r.id}
                    className={clsx(
                      "pl-4",
                      mine
                        ? "border-l-2 border-fg"
                        : "border-l border-line-strong",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <Avatar
                        name={mine ? tutorName : (r.user?.name ?? "Learner")}
                        src={mine ? tutorAvatar : r.user?.avatar}
                        tone={r.user?.tone}
                        size="xs"
                        decorative
                      />
                      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                        {mine ? "You · Tutor" : (r.user?.name ?? "Learner")}
                      </span>
                      <MonoMeta as="span">{timeAgo(r.createdAt)}</MonoMeta>
                    </div>
                    <p className="mt-2 max-w-[66ch] text-[14.5px] leading-relaxed [overflow-wrap:anywhere]">
                      {r.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {/* phones: one tap opens the composer sheet (keeps the list short) */}
          <div className="mt-4 flex items-center gap-3 sm:hidden">
            <Button
              variant={active ? "red" : "outline"}
              icon="chat"
              onClick={() => setSheet(true)}
              className="h-11"
            >
              {t.answered ? "Add a reply" : `Answer ${who}`}
            </Button>
            {body.trim() && <MonoMeta as="span">Draft saved</MonoMeta>}
          </div>
          <BottomSheet
            open={sheet}
            onClose={() => setSheet(false)}
            title={t.answered ? `Reply to ${who}` : `Answer ${who}`}
            description={
              <span className="line-clamp-3">{t.question.body}</span>
            }
            footerLayout="fill"
            footer={
              <>
                <Button variant="outline" onClick={() => setSheet(false)}>
                  Later
                </Button>
                <Button variant="red" icon="chat" onClick={post}>
                  {t.answered ? "Post reply" : "Post answer"}
                </Button>
              </>
            }
          >
            <label htmlFor={`reply-m-${t.question.id}`} className="sr-only">
              Your answer to {t.question.user?.name}
            </label>
            <Textarea
              ref={sheetTextRef}
              id={`reply-m-${t.question.id}`}
              rows={4}
              value={body}
              maxLength={1200}
              data-autofocus=""
              aria-invalid={!!error}
              aria-describedby={
                error ? `reply-m-err-${t.question.id}` : undefined
              }
              onChange={(e) => {
                setBody(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.answered ? "Add a follow-up…" : `Answer ${who}…`}
            />
            {error && (
              <ErrorLine id={`reply-m-err-${t.question.id}`}>{error}</ErrorLine>
            )}
            <p className="mt-5 mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Saved replies
            </p>
            <div className="flex flex-wrap gap-2">
              {REPLY_TEMPLATES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => addTemplate(r.body)}
                  className="tap inline-flex min-h-11 items-center gap-1.5 px-4 text-left text-[14px] font-medium ring-1 ring-line-strong ring-inset active:bg-cream-2"
                >
                  <Icon
                    name="plus"
                    className="size-3.5 shrink-0"
                    strokeWidth={2}
                  />
                  {r.label}
                </button>
              ))}
            </div>
          </BottomSheet>

          {active && (
            <form
              className="app-fade mt-6 border-t border-fg pt-4 max-sm:hidden"
              onSubmit={(e) => {
                e.preventDefault();
                post();
              }}
            >
              <label
                htmlFor={`reply-${t.question.id}`}
                className="mb-2.5 block text-[11px] font-semibold tracking-[0.14em] uppercase"
              >
                {t.answered ? `Follow up with ${who}` : `Your answer to ${who}`}
              </label>
              <Textarea
                ref={textRef}
                id={`reply-${t.question.id}`}
                rows={t.answered ? 2 : 3}
                value={body}
                maxLength={1200}
                aria-invalid={!!error}
                aria-describedby={
                  error ? `reply-err-${t.question.id}` : undefined
                }
                onChange={(e) => {
                  setBody(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    post();
                  }
                }}
                placeholder={t.answered ? "Add a follow-up…" : `Answer ${who}…`}
              />
              {error && (
                <ErrorLine id={`reply-err-${t.question.id}`}>{error}</ErrorLine>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <DropdownMenu
                  label="Saved replies"
                  align="start"
                  width={260}
                  triggerClassName="tap inline-flex h-9 items-center gap-2 px-3.5 text-[11px] font-semibold tracking-[0.13em] uppercase ring-1 ring-line-strong ring-inset transition-colors hf:bg-fg hf:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                  trigger={
                    <>
                      <Icon name="note" className="size-4" strokeWidth={1.6} />{" "}
                      Saved replies
                    </>
                  }
                  items={REPLY_TEMPLATES.map((r) => ({
                    label: r.label,
                    onSelect: () => {
                      addTemplate(r.body);
                      requestAnimationFrame(() => textRef.current?.focus());
                    },
                  }))}
                />
                <div className="flex items-center gap-4">
                  <MonoMeta as="span" className="max-md:hidden">
                    Ctrl + Enter to post
                  </MonoMeta>
                  <Button type="submit" size="sm" variant="red" icon="chat">
                    {t.answered ? "Post reply" : "Post answer"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

function ErrorLine({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep"
    >
      <span aria-hidden className="mt-[5px] size-[6px] shrink-0 bg-current" />
      {children}
    </p>
  );
}
