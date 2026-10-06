"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { MOCK_NOW, getItem, getTutorQuestions, itemTitle, timeAgo } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { REPLY_TEMPLATES } from "@/lib/mock/extra/tutor";
import { Avatar, Badge, BottomSheet, Button, Card, DropdownMenu, EmptyState, Icon, PageHeader, Pagination, SearchInput, Select, Skeleton, Tabs, Textarea, toast } from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { IconChip, useTutorContext } from "./shared";

type Filter = "unanswered" | "answered" | "all";
type ThreadData = ReturnType<typeof getTutorQuestions>[number];
/** A thread is handled once the tutor answered it, or someone marked it resolved. */
const isHandled = (t: ThreadData) => t.answered || !!t.question.resolved;
const firstName = (n?: string) => n?.split(" ")[0] ?? "the learner";
const PAGE = 8;

export function TutorQuestions({ initialFilter, initialCourse, initialQuery, focusId }: { initialFilter?: string; initialCourse?: string; initialQuery?: string; focusId?: string }) {
  const { userId, db, tutor, profile, hydrated } = useTutorContext();
  const [filter, setFilter] = useState<Filter>(initialFilter === "answered" || initialFilter === "all" ? initialFilter : "unanswered");
  const [course, setCourse] = useState(initialCourse || "all");
  const [q, setQ] = useState(initialQuery ?? "");
  // Filters live in the URL (like Courses and Analytics), so reload and back keep them.
  const urlTimer = useRef<number | null>(null);
  const syncUrl = (next: { filter?: Filter; course?: string; q?: string }, delay = 0) => {
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
    const go = () => window.history.replaceState(null, "", `/tutor/questions${p.size ? `?${p}` : ""}`);
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

  const threads = useMemo(() => getTutorQuestions(userId, {}, db), [userId, db]);
  const courses = useMemo(() => [...new Map(threads.map((t) => [t.course.id, t.course])).values()], [threads]);
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
    const waiting = (t: ThreadData) => !isHandled(t) || touched.includes(t.question.id);
    return threads
      .filter(
        (t) =>
          (filter === "all" || (filter === "unanswered" ? waiting(t) : isHandled(t))) &&
          (course === "all" || t.course.id === course) &&
          words.every((w) => `${t.question.body} ${t.question.user?.name} ${t.course.title} ${t.item ? itemTitle(t.item) : ""}`.toLowerCase().includes(w)),
      )
      .sort((a, b) => Number(!waiting(a)) - Number(!waiting(b)) || b.question.createdAt.localeCompare(a.question.createdAt));
  }, [threads, filter, course, q, touched]);
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pageCount);
  const shown = list.slice((cur - 1) * PAGE, cur * PAGE);

  // reply rhythm (from the live threads)
  const rhythm = useMemo(() => {
    const firstReplyHours: number[] = [];
    for (const t of threads) {
      const mine = t.replies.find((r) => r.userId === userId);
      if (mine) firstReplyHours.push((new Date(mine.createdAt).getTime() - new Date(t.question.createdAt).getTime()) / 3_600_000);
    }
    const avg = firstReplyHours.length ? firstReplyHours.reduce((a, b) => a + b, 0) / firstReplyHours.length : null;
    const waiting = threads.filter((t) => !isHandled(t)).sort((a, b) => a.question.createdAt.localeCompare(b.question.createdAt));
    const monthAgo = MOCK_NOW.getTime() - 30 * 86_400_000;
    const answeredMonth = threads.filter((t) => t.replies.some((r) => r.userId === userId && new Date(r.createdAt).getTime() >= monthAgo)).length;
    const byLesson = new Map<string, { label: string; course: string; href?: string; count: number }>();
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
      avg: avg === null ? "–" : avg < 1 ? "< 1h" : avg < 24 ? `${Math.round(avg)}h` : `${Math.round(avg / 24)}d`,
      oldest: waiting[0] ? timeAgo(waiting[0].question.createdAt) : null,
      answeredMonth,
      hot: [...byLesson.values()].sort((a, b) => b.count - a.count).slice(0, 4),
    };
  }, [threads, userId]);

  const changeFilter = (f: Filter, extra: { course?: string; q?: string } = {}) => {
    setFilter(f);
    setPage(1);
    setTouched([]);
    syncUrl({ filter: f, ...extra });
  };
  const touch = (id: string) => setTouched((x) => (x.includes(id) ? x : [...x, id]));

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Learner questions"
        eyebrowTone="green"
        title="Questions from your learners."
        description="Answer once, help everyone who had the same doubt. Replies show up under the lesson for every learner."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Questions" }]}
      />

      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Tabs
          label="Filter questions"
          value={filter}
          onChange={(id) => changeFilter(id as Filter)}
          items={[
            { id: "unanswered", label: "Unanswered", count: counts.unanswered },
            { id: "answered", label: "Answered", count: counts.answered },
            { id: "all", label: "All", count: counts.all },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row xl:ml-auto">
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
              options={[{ value: "all", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {!hydrated && threads.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Card key={i}>
                  <Skeleton variant="row" />
                  <Skeleton variant="text" className="mt-4" lines={2} />
                </Card>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <Card padding="lg">
              {counts.all === 0 ? (
                <EmptyState
                  art="tami"
                  tone="lilac"
                  title="No questions yet."
                  body="When learners ask something under one of your lessons, it lands here. Answer once and everyone with the same doubt sees it."
                  action={
                    <Button variant="secondary" href="/tutor/courses">
                      Open your courses
                    </Button>
                  }
                />
              ) : filter === "unanswered" && !q && course === "all" ? (
                <EmptyState
                  art="tami"
                  tone="mint"
                  title="Inbox zero. Go record something."
                  body="Every question has an answer. New ones from your lessons land here."
                  action={
                    <Button variant="secondary" onClick={() => changeFilter("answered")}>
                      See answered questions
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  art="buddy"
                  title="Nothing matches."
                  body="Try another word, another course or the All tab."
                  action={
                    <Button
                      variant="secondary"
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
            </Card>
          ) : (
            <ul className="flex flex-col gap-3 md:gap-4">
              {shown.map((t) => (
                <Thread
                  key={t.question.id}
                  thread={t}
                  tutorId={userId}
                  tutorName={tutor?.name ?? profile?.name ?? "You"}
                  tutorAvatar={tutor?.avatar}
                  focus={t.question.id === focusId}
                  onTouched={() => touch(t.question.id)}
                  lessonHref={t.item ? `/learn/${t.course.slug}/${t.item.id}` : undefined}
                  lessonPos={t.item ? getItem(t.course.id, t.item.id, db)?.label : undefined}
                  lessonLabel={t.item ? itemTitle(t.item) : "Course discussion"}
                  onAnswered={() => touch(t.question.id)}
                />
              ))}
            </ul>
          )}
          {list.length > 0 && <Pagination className="mt-5" page={cur} pageCount={pageCount} onChange={setPage} total={list.length} pageSize={PAGE} />}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 md:gap-5 xl:sticky xl:top-[88px] xl:self-start" aria-label="Q&A summary">
          <Card>
            <p className="t-app-h3">Your reply rhythm</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1 xl:gap-0 xl:divide-y xl:divide-ink/[0.07]">
              {[
                {
                  label: "Avg first reply",
                  value: rhythm.avg,
                  icon: "clock" as const,
                  tone: "blue" as const,
                },
                {
                  label: "Answered in 30 days",
                  value: String(rhythm.answeredMonth),
                  icon: "check-circle" as const,
                  tone: "mint" as const,
                },
                {
                  label: "Oldest waiting",
                  value: rhythm.oldest ?? "None",
                  icon: "inbox" as const,
                  tone: "sun" as const,
                },
              ].map((x) => (
                <div key={x.label} className="flex flex-col gap-2 rounded-[16px] bg-cream/70 p-3 xl:flex-row xl:items-center xl:gap-3 xl:rounded-none xl:bg-transparent xl:px-0 xl:py-3">
                  <IconChip name={x.icon} tone={x.tone} size="sm" className="max-xl:hidden" />
                  <dt className="order-2 text-[12.5px] font-semibold text-ink/55 xl:order-none xl:flex-1 xl:text-[13.5px]">{x.label}</dt>
                  <dd className="font-heading text-[18px] leading-none font-extrabold tracking-[-0.02em]">{x.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {rhythm.hot.length > 0 && (
            <Card>
              <p className="t-app-h3">Where doubts cluster</p>
              <p className="mt-1 t-small text-ink/55">Lessons with the most asks (questions plus +1s). A short re-record or a cheat sheet usually fixes it.</p>
              <ol className="mt-3 flex flex-col gap-2">
                {rhythm.hot.map((h, i) => (
                  <li key={h.label + h.course} className="flex items-center gap-3 rounded-[16px] bg-cream/70 p-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-cream">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      {h.href ? (
                        <Link href={h.href} title={h.label} className="line-clamp-2 text-[13.5px] leading-snug font-bold break-words hf:underline">
                          {h.label}
                        </Link>
                      ) : (
                        <span className="line-clamp-2 text-[13.5px] leading-snug font-bold break-words" title={h.label}>
                          {h.label}
                        </span>
                      )}
                      <span className="block truncate text-[12px] font-semibold text-ink/50">{h.course}</span>
                    </span>
                    <span className="shrink-0 text-[12.5px] font-bold whitespace-nowrap text-ink/60" title="Questions plus +1s from other learners">
                      {h.count} {h.count === 1 ? "ask" : "asks"}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <Card tone="butter" className="max-xl:hidden">
            <div className="flex items-start gap-3">
              <Mascot title="" className="w-11 shrink-0" style={{ transform: "rotate(-8deg)" }} />
              <p className="text-[14px] leading-snug font-bold">Answers within a day tend to turn into 5-star reviews. Tami has checked. Sort of.</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}


function Thread({
  thread: t,
  tutorId,
  tutorName,
  tutorAvatar,
  focus,
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
  lessonHref?: string;
  /** "MODULE 05 / LESSON 03" (own line on phones) */
  lessonPos?: string;
  lessonLabel: string;
  onAnswered: () => void;
  onTouched: () => void;
}) {
  const [open, setOpen] = useState(!t.answered || !!focus);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** phones: the reply composer opens in a bottom sheet instead of an always-open textarea */
  const [sheet, setSheet] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sheetTextRef = useRef<HTMLTextAreaElement>(null);
  const who = t.question.user?.name?.split(" ")[0] ?? "the learner";
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: "center" });
  }, [focus]);

  const post = () => {
    if (body.trim().length < 2) {
      setError("Write an answer first.");
      (sheet ? sheetTextRef : textRef).current?.focus();
      return;
    }
    demo.addComment(tutorId, t.course.id, t.question.itemId, body.trim(), t.question.id);
    setBody("");
    setError(null);
    setSheet(false);
    onAnswered();
    toast.success("Answer posted. Nice one.", {
      description: `${t.question.user?.name?.split(" ")[0] ?? "The learner"} gets a notification.`,
    });
  };

  return (
    <li ref={ref} className={clsx("rounded-card bg-white p-4 shadow-soft md:p-5", focus && "ring-2 ring-blue")}>
      <div className="flex items-start gap-3">
        <Avatar name={t.question.user?.name ?? "Learner"} tone={t.question.user?.tone} size="md" decorative />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
              <span className="text-[15px] font-bold">{t.question.user?.name ?? "Learner"}</span>
              <span className="text-[13px] font-semibold whitespace-nowrap text-ink/50 max-sm:hidden">
                {t.question.user?.city} · {timeAgo(t.question.createdAt)}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              {t.answered ? (
                <Badge tone="mint" dot size="sm">
                  Answered
                </Badge>
              ) : t.question.resolved ? (
                <Badge tone="lilac" dot size="sm">
                  Resolved
                </Badge>
              ) : (
                <Badge tone="butter" dot size="sm">
                  Waiting
                </Badge>
              )}
              <DropdownMenu
                label={`Actions for ${firstName(t.question.user?.name)}'s question`}
                trigger={<Icon name="more" className="size-5" />}
                triggerClassName="grid size-9 place-items-center rounded-full text-ink/70 hf:bg-ink/[0.06] hf:text-ink coarse:-my-1 coarse:size-11"
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
            </span>
          </div>
          <p className="text-[13px] font-semibold text-ink/50 sm:hidden">
            {t.question.user?.city} · {timeAgo(t.question.createdAt)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-ink/55">
            <Icon name="book" className="size-3.5" />
            <span className="truncate">{t.course.title}</span>
            {/* phones: the lesson link gets its own line (no dangling separator); wider: separator travels with the link */}
            <span className="inline-flex max-w-full min-w-0 items-start gap-1.5 max-sm:basis-full max-sm:pl-5">
              <span aria-hidden className="max-sm:hidden">
                ·
              </span>
              {(() => {
                const full = lessonPos ? `${lessonPos} · ${lessonLabel}` : lessonLabel;
                const inner = (
                  <>
                    {lessonPos && (
                      <span className="max-sm:block max-sm:text-[12px] max-sm:tracking-[0.04em]">
                        {lessonPos}
                        <span className="max-sm:hidden"> · </span>
                      </span>
                    )}
                    <span className="max-sm:line-clamp-2">{lessonLabel}</span>
                  </>
                );
                return lessonHref ? (
                  <Link href={lessonHref} title={full} className="min-w-0 break-words text-blue sm:line-clamp-2 hf:underline">
                    {inner}
                  </Link>
                ) : (
                  <span title={full} className="min-w-0 break-words sm:line-clamp-2">
                    {inner}
                  </span>
                );
              })()}
            </span>
          </p>
        </div>
      </div>
      <div className="sm:pl-[52px]">
        <p className="mt-3 text-[15.5px] leading-relaxed font-medium">{t.question.body}</p>
        <div className="mt-2 flex items-center gap-3 text-[12.5px] font-semibold text-ink/50">
          <span className="inline-flex items-center gap-1">
            <Icon name="heart" className="size-3.5" /> {t.question.likes} {t.question.likes === 1 ? "learner has" : "learners have"} this question too
          </span>
          {t.replies.length > 0 && (
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 font-bold text-ink/70 hf:text-ink coarse:-my-3 coarse:min-h-11">
              {t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}
              <Icon name={open ? "chevron-up" : "chevron-down"} className="size-3.5" />
            </button>
          )}
        </div>

        {open && t.replies.length > 0 && (
          <ul className="app-fade mt-4 flex flex-col gap-2.5 border-l-2 border-ink/[0.08] pl-3 md:pl-4">
            {t.replies.map((r) => {
              const mine = r.userId === tutorId;
              return (
                <li key={r.id} className={clsx("rounded-[18px] p-3", mine ? "bg-mint/50" : "bg-cream/70")}>
                  <div className="flex items-center gap-2">
                    <Avatar name={mine ? tutorName : (r.user?.name ?? "Learner")} src={mine ? tutorAvatar : r.user?.avatar} tone={r.user?.tone} size="xs" decorative />
                    <span className="text-[13.5px] font-bold">{mine ? "You" : r.user?.name}</span>
                    {mine && (
                      <Badge tone="green" size="sm">
                        Tutor
                      </Badge>
                    )}
                    <span className="ml-auto text-[12px] font-semibold text-ink/50">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed font-medium">{r.body}</p>
                </li>
              );
            })}
          </ul>
        )}

        {/* phones: one tap opens the composer sheet (keeps the list short) */}
        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <Button variant={t.answered ? "secondary" : "primary"} icon="chat" onClick={() => setSheet(true)} className="h-11">
            {t.answered ? "Add a reply" : `Answer ${who}`}
          </Button>
          {body.trim() && <span className="text-[13px] font-semibold text-ink/55">Draft saved</span>}
        </div>
        <BottomSheet
          open={sheet}
          onClose={() => setSheet(false)}
          title={t.answered ? `Reply to ${who}` : `Answer ${who}`}
          description={<span className="line-clamp-3">{t.question.body}</span>}
          footerLayout="fill"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSheet(false)}>
                Later
              </Button>
              <Button icon="chat" onClick={post}>
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
            aria-describedby={error ? `reply-m-err-${t.question.id}` : undefined}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t.answered ? "Add a follow-up…" : `Answer ${who}…`}
          />
          {error && (
            <p id={`reply-m-err-${t.question.id}`} role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-[#c13500]">
              <Icon name="alert" className="size-3.5" strokeWidth={2.4} /> {error}
            </p>
          )}
          <p className="mt-4 mb-2 text-[13px] font-bold text-ink/60">Saved replies</p>
          <div className="flex flex-wrap gap-2">
            {REPLY_TEMPLATES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setBody((b) => (b ? `${b.trimEnd()} ${r.body}` : r.body));
                  if (error) setError(null);
                }}
                className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full bg-cream px-4 text-left text-[14px] font-bold active:bg-butter"
              >
                <Icon name="plus" className="size-3.5 shrink-0" strokeWidth={2.6} />
                {r.label}
              </button>
            ))}
          </div>
        </BottomSheet>

        {(open || !t.answered) && (
          <form
            className="mt-4 max-sm:hidden"
            onSubmit={(e) => {
              e.preventDefault();
              post();
            }}
          >
            <label htmlFor={`reply-${t.question.id}`} className="sr-only">
              Your answer to {t.question.user?.name}
            </label>
            <Textarea
              ref={textRef}
              id={`reply-${t.question.id}`}
              rows={t.answered ? 2 : 3}
              value={body}
              maxLength={1200}
              aria-invalid={!!error}
              aria-describedby={error ? `reply-err-${t.question.id}` : undefined}
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
              placeholder={t.answered ? "Add a follow-up…" : `Answer ${t.question.user?.name?.split(" ")[0] ?? "the learner"}…`}
            />
            {error && (
              <p id={`reply-err-${t.question.id}`} role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-[#c13500]">
                <Icon name="alert" className="size-3.5" strokeWidth={2.4} /> {error}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <DropdownMenu
                label="Saved replies"
                align="start"
                width={260}
                triggerClassName="tap inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-bold text-ink/70 hf:bg-ink/[0.06] hf:text-ink"
                trigger={
                  <>
                    <Icon name="note" className="size-4" /> Saved replies
                  </>
                }
                items={REPLY_TEMPLATES.map((r) => ({
                  label: r.label,
                  onSelect: () => {
                    setBody((b) => (b ? `${b.trimEnd()} ${r.body}` : r.body));
                    requestAnimationFrame(() => textRef.current?.focus());
                  },
                }))}
              />
              <div className="flex items-center gap-2">
                <span className="hidden text-[12px] font-semibold text-ink/45 sm:inline">Ctrl + Enter to post</span>
                <Button type="submit" size="sm" icon="chat">
                  {t.answered ? "Reply" : "Post answer"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </li>
  );
}
