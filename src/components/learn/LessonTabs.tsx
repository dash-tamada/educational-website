"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  ConfirmDialog,
  DemoPill,
  DropdownMenu,
  EmptyState,
  Field,
  Icon,
  Segmented,
  Skeleton,
  TabPanel,
  Tabs,
  Textarea,
  isPhone,
  toast,
  useIsPhone,
} from "@/components/app";
import {
  formatDuration,
  formatNumber,
  getCourseStats,
  getNotes,
  getUser,
  itemTitle,
  pad2,
  plural,
  timeAgo,
  type Db,
  type ItemContext,
  type LessonComment,
  type Profile,
  type ResourceItem,
} from "@/lib/mock";
import type { AccessResult } from "@/lib/access";
import { demo } from "@/lib/demo/store";
import { courseTarget, learnHref, useLearn, type LearnTab } from "./context";
import { FILE_META, downloadDemoResource, formatSize } from "./media";
import { ShortcutList } from "./VideoPlayer";
import { lockReason } from "./PathPanel";
import { useCommentLikes } from "./useLikes";
import { usePref } from "./usePref";
import { BuyButton, TUTOR_BROWSING_LINE } from "./BuyButton";

/* Overview · Q&A · Notes · Resources, under the stage. */

const IDB = "lt";

export function LessonTabs({
  ctx,
  access,
}: {
  ctx: ItemContext;
  access: AccessResult;
}) {
  const { tab, setTab, db, course, session } = useLearn();
  const viewerId = session?.userId ?? null;
  const threads = useMemo(
    () => buildThreads(course.id, ctx.item.id, course.tutorId, db, viewerId),
    [course.id, ctx.item.id, course.tutorId, db, viewerId],
  );
  const notes = session
    ? getNotes(session.userId, course.id, db).filter(
        (n) => n.itemId === ctx.item.id,
      )
    : [];
  const resources = useLearn().flat.filter((x) => x.item.type === "resource");
  // Counts are drawn here (not via Tabs' count) so a zero can drop on phones,
  // where four tabs have to fit in ~350px.
  const count = (id: LearnTab, n: number) => (
    <span
      className={clsx(
        "font-mono text-[11px] font-normal tabular-nums",
        tab === id ? "text-red-deep on-dark:text-red-lite" : "text-muted",
        n === 0 && "max-sm:hidden",
        // under 360px the four labels alone just fit
        "max-[359px]:hidden",
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
  const sectionRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // Phones: the tab row is pinned under the top bar (and under the pinned video).
  // Switching tabs while it's pinned brings the new panel's top into view.
  const changeTab = (id: LearnTab) => {
    setTab(id);
    const sec = sectionRef.current;
    const row = rowRef.current;
    if (!sec || !row || !isPhone()) return;
    if (sec.getBoundingClientRect().top < row.getBoundingClientRect().top - 1)
      requestAnimationFrame(() => reveal(sec, "start"));
  };
  return (
    <section
      ref={sectionRef}
      aria-label="Lesson details"
      id="lesson-details"
      className="scroll-mt-20 max-sm:scroll-mt-[calc(3.5rem+var(--sat)+var(--learn-pin,0px))]"
    >
      <div
        ref={rowRef}
        className="max-sm:sticky max-sm:top-[calc(3.5rem+var(--sat)+var(--learn-pin,0px))] max-sm:z-10 max-sm:-mx-3 max-sm:bg-ink max-sm:px-3"
      >
        <Tabs
          label="Lesson details"
          idBase={IDB}
          value={tab}
          onChange={(id) => changeTab(id as LearnTab)}
          items={[
            { id: "overview", label: "Overview" },
            {
              id: "qa",
              label: <>Q&amp;A{count("qa", threads.length)}</>,
            },
            {
              id: "notes",
              label: <>Notes{count("notes", notes.length)}</>,
            },
            {
              id: "resources",
              label: (
                <>
                  <span className="sm:hidden">Files</span>
                  <span className="max-sm:hidden">Resources</span>
                  {count("resources", resources.length)}
                </>
              ),
            },
          ]}
          className="max-sm:w-full max-sm:justify-between max-sm:gap-0.5 max-[359px]:[&>button]:px-1.5 max-sm:[&>button]:px-2.5"
        />
      </div>
      <div className="mt-8 max-sm:mt-6">
        <TabPanel id="overview" active={tab} idBase={IDB}>
          <OverviewPanel ctx={ctx} access={access} />
        </TabPanel>
        <TabPanel id="qa" active={tab} idBase={IDB}>
          <QAPanel ctx={ctx} access={access} threads={threads} />
        </TabPanel>
        <TabPanel id="notes" active={tab} idBase={IDB}>
          <NotesPanel ctx={ctx} access={access} />
        </TabPanel>
        <TabPanel id="resources" active={tab} idBase={IDB}>
          <ResourcesPanel ctx={ctx} />
        </TabPanel>
      </div>
    </section>
  );
}

/* ============================================================================= overview */
function OverviewPanel({
  ctx,
  access,
}: {
  ctx: ItemContext;
  access: AccessResult;
}) {
  const { course, tutor, db, player, courseAccess } = useLearn();
  const stats = getCourseStats(course.id, db);
  // a client-only draft or an unreleased course has no public page
  const coursePage = courseTarget(course, courseAccess);
  const item = ctx.item;
  const chapters = item.type === "video" ? (item.lesson.chapters ?? []) : [];
  // the same preference the player's Playback settings switch writes
  const [keysOn] = usePref<boolean>("shortcuts", true);
  // a client-only draft from the builder may have no outcomes yet
  const hasOutcomes = course.outcomes.length > 0;
  const seekChapter = (at: number) => {
    if (item.type !== "video" || !player.current) return;
    const d = player.current.getDuration();
    player.current.seek(d ? (at / item.lesson.durationSec) * d : at);
    player.current.play();
    player.current.reveal();
  };
  return (
    <div className="grid gap-x-12 gap-y-12 @[860px]:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-12">
        <section>
          <AboutItem ctx={ctx} />
          {chapters.length > 0 && (
            <div className="mt-9">
              <h3 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                Chapters
              </h3>
              <ol className="mt-3 border-t border-line">
                {chapters.map((c, i) => (
                  <li key={c.atSec} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => seekChapter(c.atSec)}
                      className="tap group flex min-h-12 w-full items-baseline gap-4 py-3 text-left"
                    >
                      <span className="w-6 shrink-0 font-mono text-[11px] text-muted tabular-nums group-hf:text-red-lite">
                        {pad2(i + 1)}
                      </span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium tracking-[-0.01em] group-hf:text-red-lite">
                        {c.title}
                      </span>
                      <span className="font-mono text-[11.5px] text-muted tabular-nums">
                        {formatDuration(c.atSec, "clock")}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
        {/* its own size container: the outcome columns and stat cells follow
            the column's width, not the viewport's */}
        <section className="@container border-t border-fg pt-5">
          {hasOutcomes ? (
            <>
              <h2 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                What you&apos;ll be able to do
              </h2>
              {course.promise && (
                <p className="mt-4 max-w-[36ch] font-heading text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.15] font-semibold tracking-[-0.025em]">
                  {course.promise}
                </p>
              )}
              <ol className="mt-6 grid border-t border-line @[520px]:grid-cols-2 @[520px]:gap-x-8">
                {course.outcomes.map((o, i) => (
                  <li
                    key={o}
                    className="flex items-baseline gap-4 border-b border-line py-3 text-[14.5px] leading-snug"
                  >
                    <span className="w-6 shrink-0 font-mono text-[11px] text-red-lite tabular-nums">
                      {pad2(i + 1)}
                    </span>
                    {o}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h2 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                About the course
              </h2>
              {course.promise ? (
                <p className="mt-3 t-small text-muted">{course.promise}</p>
              ) : courseAccess.owner ? (
                <p className="mt-3 t-small text-muted">
                  No promise or outcomes yet. Learners see them here, so it pays
                  to spell out what they&apos;ll walk away with.{" "}
                  <Link
                    href={`/tutor/courses/${course.id}/builder?tab=details`}
                    className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hf:decoration-red"
                  >
                    Add outcomes in Details
                  </Link>
                </p>
              ) : null}
            </>
          )}
          <dl className="mt-8 grid grid-cols-2 border-t border-l border-line @[440px]:grid-cols-4">
            {[
              ["Modules", String(stats.modules)],
              ["Lessons", String(stats.videos)],
              ["Tests", String(stats.quizzes)],
              ["Runtime", formatDuration(stats.totalSec, "short")],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="min-w-0 border-r border-b border-line px-4 pt-3.5 pb-4"
              >
                <dt className="flex items-center justify-between gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
                  <span className="truncate">{k}</span>
                  <span className="font-mono font-normal tracking-normal opacity-70">
                    {pad2(i + 1)}
                  </span>
                </dt>
                <dd className="mt-4 font-display text-[34px] leading-none whitespace-nowrap">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
            <span>
              {course.level} · {course.language}
              {course.hasCertificate && " · Certificate on completion"}
            </span>
            {coursePage && (
              <Link
                href={coursePage.href}
                className="inline-flex items-center gap-1.5 text-fg hf:text-red-lite"
              >
                {coursePage.short}
                <Icon name="arrow-right" className="size-3.5" strokeWidth={1.8} />
              </Link>
            )}
          </p>
        </section>
      </div>
      {/* stacked under the main column (narrow main): tutor and shortcuts
          side by side instead of one very long column */}
      <div
        className={clsx(
          "grid content-start gap-12",
          tutor &&
            item.type === "video" &&
            access.allowed &&
            "md:@[600px]:@max-[859px]:grid-cols-2 md:@[600px]:@max-[859px]:gap-8",
        )}
      >
        {tutor && (
          <section className="border-t border-fg pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                {courseAccess.owner ? "Your public profile" : "Your tutor"}
              </p>
              {/* from xl the top bar already shows the pill */}
              <span className="xl:hidden">
                <DemoPill tone="dark" />
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3.5">
              <Avatar
                name={tutor.name}
                src={tutor.avatar}
                tone={tutor.tone}
                size="lg"
                decorative
              />
              <div className="min-w-0">
                <p className="font-heading text-[19px] leading-tight font-semibold tracking-[-0.02em]">
                  {tutor.name}
                </p>
                <p className="mt-1 line-clamp-2 t-small text-muted">
                  {tutor.headline}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-4 t-small text-muted">{tutor.bio}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-y border-line py-2.5 font-mono text-[11px] tracking-[0.04em] text-muted uppercase tabular-nums">
              <span>★ {tutor.rating.toFixed(1)} rating</span>
              <span>{formatNumber(tutor.learners)} learners</span>
            </div>
            {courseAccess.owner ? (
              <Button
                variant="arrow"
                size="sm"
                href="/tutor/settings"
                className="mt-4"
              >
                Edit profile
              </Button>
            ) : (
              <Button
                variant="arrow"
                size="sm"
                href={`/tutors/${tutor.slug}`}
                className="mt-4"
              >
                View profile
              </Button>
            )}
          </section>
        )}
        {item.type === "video" && access.allowed && (
          <section className="border-t border-fg pt-5 max-md:hidden">
            <h2 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
              Keyboard shortcuts
            </h2>
            <p className="mt-2 text-[12.5px] text-muted">
              {keysOn
                ? "Click the video, then press ? for the full list."
                : "Letter keys are off. Turn shortcuts on in Playback settings (the gear)."}
            </p>
            <ShortcutList className="mt-4" />
          </section>
        )}
      </div>
    </div>
  );
}

/** "About this lesson / test / download": the item's own description and facts. */
function AboutItem({ ctx }: { ctx: ItemContext }) {
  const { tracking, courseAccess, tutorBrowsing } = useLearn();
  const untracked = untrackedLine({ ...courseAccess, tutorBrowsing });
  const item = ctx.item;
  const facts: string[] = [];
  let heading = "About this lesson";
  // the header above already shows a lesson's own description, so say where it sits instead
  const place = `Step ${ctx.module.items.findIndex((i) => i.id === item.id) + 1} of ${ctx.module.items.length} in “${ctx.module.title}”.`;
  let body = [place, ctx.module.summary].filter(Boolean).join(" ");
  let points: string[] = [];
  if (item.type === "video") {
    const l = item.lesson;
    facts.push(formatDuration(l.durationSec, "long"));
    facts.push(l.hasCaptions ? "Captions" : "Captions soon");
    if (l.chapters?.length) facts.push(plural(l.chapters.length, "chapter"));
    if (l.isFreePreview) facts.push("Free preview");
    points = tracking
      ? [
          "Completes on its own once you've watched 90%.",
          "Your spot is saved, so you can leave and pick up later.",
        ]
      : [untracked];
  } else if (item.type === "quiz") {
    const q = item.quiz;
    heading = "About this test";
    body = [q.description, place].filter(Boolean).join(" ");
    facts.push(plural(q.questions.length, "question"));
    facts.push(`Pass mark ${q.passPercentage}%`);
    facts.push(
      q.maxAttempts ? plural(q.maxAttempts, "attempt") : "Unlimited attempts",
    );
    if (q.timeLimitMin) facts.push(`${q.timeLimitMin} min`);
    points = [
      q.isGating
        ? "Checkpoint: the lessons after this stay locked until you pass."
        : "Practice test: nothing gets locked, but passing counts toward your progress.",
      "Correct answers show once you pass or use your last attempt.",
      "Each question has a short explanation, so a miss still teaches you something.",
      ...(tracking ? [] : [untracked]),
    ];
  } else {
    const r = item.resource;
    heading = "About this download";
    facts.push(FILE_META[r.fileType].label);
    const size = formatSize(r.sizeKb);
    if (size) facts.push(size);
    points = [
      tracking ? "Counts as done once you've downloaded it." : untracked,
      "Every download in the course also lives in the Resources tab.",
    ];
  }
  return (
    <div className="border-t border-fg pt-5">
      <h2 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
        {heading}
      </h2>
      {body && (
        <p className="mt-4 max-w-[58ch] font-heading text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-[1.35] font-medium tracking-[-0.015em] text-fg/90">
          {body}
        </p>
      )}
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
        {facts.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span aria-hidden className="size-[5px] bg-red" />
            {f}
          </li>
        ))}
      </ul>
      <ul className="mt-6 border-t border-line">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-baseline gap-3 border-b border-line py-2.5 text-[14px] leading-snug text-muted"
          >
            <span aria-hidden className="shrink-0 font-mono text-[11px]">
              —
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function untrackedLine(a: {
  owner: boolean;
  admin: boolean;
  tutorBrowsing: boolean;
}) {
  if (a.tutorBrowsing)
    return "Tutor accounts aren't tracked. Switch to the student demo to buy the course and save progress.";
  if (a.owner)
    return "Tutor preview: nothing you watch or answer here is saved.";
  if (a.admin) return "Admin view: nothing you watch or answer here is saved.";
  return "Previews aren't tracked. Unlock the course to save your progress.";
}

/* ============================================================================= Q&A */
type Row = LessonComment & {
  user: Profile | null;
  /**
   * An open report on this post. `mine`: this viewer filed one; `others`:
   * someone else did (seeded/admin).
   * `reportId`: the viewer's own store report, for Undo.
   */
  report: {
    reason: string;
    mine: boolean;
    others: boolean;
    reportId?: string;
  } | null;
};
interface Thread {
  question: Row;
  replies: Row[];
  /** the course tutor replied (or started the thread) */
  answered: boolean;
  /** marked resolved (e.g. in /tutor/questions) without a tutor reply */
  resolved: boolean;
  /** answered or resolved: no longer waiting for the tutor */
  handled: boolean;
  /** a top-level post by the course's tutor: an update, not a question */
  update: boolean;
}

function buildThreads(
  courseId: string,
  itemId: string,
  tutorId: string,
  db: Db,
  viewerId: string | null,
): Thread[] {
  // defensive: one row per id, even if a seed and an overlay ever overlap
  const all = [
    ...new Map(
      db.comments
        .filter((c) => c.courseId === courseId && c.itemId === itemId)
        .map((c) => [c.id, c] as const),
    ).values(),
  ];
  // posts with an open report stay collapsed until the Tamada team decides
  const open = new Map<
    string,
    { reason: string; mine?: string; others: boolean }
  >();
  for (const r of db.reports) {
    if (r.kind !== "comment" || r.status !== "open") continue;
    const e = open.get(r.targetId) ?? { reason: r.reason, others: false };
    if (viewerId && r.reporterId === viewerId) e.mine = r.id;
    else {
      e.others = true;
      e.reason = r.reason;
    }
    open.set(r.targetId, e);
  }
  const withUser = (c: LessonComment): Row => {
    const o = open.get(c.id);
    return {
      ...c,
      user: getUser(c.userId, db),
      report: o
        ? {
            reason: o.others ? o.reason : "Reported by you",
            mine: !!o.mine,
            others: o.others,
            reportId: o.mine,
          }
        : null,
    };
  };
  return all
    .filter((c) => !c.parentId)
    .map((q) => {
      const replies = all
        .filter((r) => r.parentId === q.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(withUser);
      const update = q.userId === tutorId;
      const answered = update || replies.some((r) => r.userId === tutorId);
      const resolved = !answered && !!q.resolved;
      return {
        question: withUser(q),
        replies,
        answered,
        resolved,
        handled: answered || resolved,
        update,
      };
    })
    .sort((a, b) => b.question.createdAt.localeCompare(a.question.createdAt));
}

/** Reasons a learner can pick when reporting a post. */
const REPORT_REASONS = [
  "Spam or self-promotion",
  "Rude or harassing",
  "Off-topic",
  "Shares test answers",
];

function useCanTalk(access: AccessResult) {
  const { session, tracking, courseAccess } = useLearn();
  return (
    !!session &&
    access.allowed &&
    (tracking || courseAccess.owner || courseAccess.admin)
  );
}

/** Scroll an element into view, smoothly unless the viewer prefers less motion. */
function reveal(el: Element | null, block: ScrollLogicalPosition) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block, behavior: reduce ? "auto" : "smooth" });
}

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

function QAPanel({
  ctx,
  access,
  threads,
}: {
  ctx: ItemContext;
  access: AccessResult;
  threads: Thread[];
}) {
  const {
    course,
    tutor,
    session,
    focusRequest,
    takeFocus,
    courseAccess,
    settled,
    tutorBrowsing,
    player,
  } = useLearn();
  const canTalk = useCanTalk(access);
  const canAsk = canTalk && !courseAccess.owner && !courseAccess.admin;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "liked" | "open">("newest");
  /** phones: the composer lives in a bottom sheet (Post sits above the keyboard) */
  const phone = useIsPhone();
  const [composer, setComposer] = useState(false);
  const likes = useCommentLikes(session?.userId ?? null, settled);
  const ref = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const tutorFirst = tutor?.name.split(" ")[0] ?? "the tutor";
  const questions = threads.filter((t) => !t.update);
  const updates = threads.length - questions.length;
  const waiting = questions.filter((t) => !t.handled).length;
  const item = ctx.item;

  // "Ask the tutor" / "Answer questions": consumed once, on this item only.
  // Learners land in the composer; the tutor (no composer) on the first
  // waiting thread's Answer button, or the panel heading.
  useEffect(() => {
    if (!takeFocus("qa", item.id)) return;
    if (isPhone() && canAsk) {
      // phones: "Ask the tutor" opens the composer sheet (after this commit)
      queueMicrotask(() => setComposer(true));
      return;
    }
    const field = ref.current;
    if (field) {
      field.focus({ preventScroll: true });
      reveal(field, "center");
      return;
    }
    const target =
      listRef.current?.querySelector<HTMLElement>("[data-answer-waiting]") ??
      headRef.current;
    reveal(document.getElementById("lesson-details"), "start");
    target?.focus({ preventScroll: true });
  }, [focusRequest, takeFocus, item.id, canAsk]);

  const sorted = useMemo(() => {
    const list = [...threads];
    const score = (t: Thread) => likes.count(t.question);
    if (sort === "liked") list.sort((a, b) => score(b) - score(a));
    // waiting questions first; updates and handled threads after
    if (sort === "open")
      list.sort((a, b) => Number(a.handled) - Number(b.handled));
    return list;
  }, [threads, sort, likes]);

  const post = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const v = body.trim();
    if (v.length < 10)
      return setError(
        "Give it a little more detail (10+ characters) so the tutor can help.",
      );
    demo.addComment(session.userId, course.id, item.id, v);
    setBody("");
    setError(null);
    setSort("newest");
    setComposer(false);
    toast.success("Question posted", {
      description: `${tutorFirst} usually replies within a day.`,
    });
  };
  const like = (c: Row) => {
    const now = likes.toggle(c);
    if (now) toast("Marked as helpful");
  };
  const report = (c: Row, reason: string) => {
    if (!session) return;
    const r = demo.addReport({
      kind: "comment",
      targetId: c.id,
      courseId: course.id,
      reporterId: session.userId,
      reason,
    });
    toast({
      title: "Thanks, we'll take a look",
      description: `Reported as “${reason}”. It's hidden for you and waiting in the admin's Reports queue.`,
      tone: "neutral",
      action: { label: "Undo", onClick: () => demo.withdrawReport(r.id) },
    });
  };
  const unreport = (row: Row) => {
    if (!row.report?.reportId) return;
    demo.withdrawReport(row.report.reportId);
    toast("Report withdrawn");
  };
  const gatedHere = !access.allowed && access.reason === "gated";
  const placeholder =
    item.type === "video"
      ? `e.g. At 2:10 in “${clip(item.lesson.title, 32)}”, could you show that step again?`
      : item.type === "quiz"
        ? "e.g. Why is option B wrong in question 3?"
        : `e.g. How should I use “${clip(item.resource.title, 32)}” alongside the lessons?`;
  const emptyBody = courseAccess.owner
    ? "When learners get stuck on this lesson, their questions land here and in your inbox."
    : canAsk
      ? `Stuck on something? Be the first to ask. ${tutorFirst} reads every one.`
      : courseAccess.admin
        ? "Learner questions on this item will show up here."
        : "Nobody has asked about this one yet. Questions from learners in the course show up here.";

  return (
    <div className="grid gap-x-12 gap-y-10 @[860px]:grid-cols-[minmax(0,1fr)_320px]">
      <div ref={listRef} className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              ref={headRef}
              tabIndex={-1}
              className="font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em] outline-none"
            >
              {plural(questions.length, "question")}
              {updates > 0 && ` · ${plural(updates, "update")}`}
            </h2>
            {/* from xl the top bar already shows the pill */}
            <span className="xl:hidden">
              <DemoPill tone="dark" />
            </span>
          </div>
          {threads.length > 1 && (
            <Segmented
              label="Sort questions"
              size="sm"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "liked", label: "Most liked" },
                { value: "open", label: "Unanswered" },
              ]}
            />
          )}
        </div>
        {sorted.length === 0 ? (
          <div className="mt-5 border-t border-line">
            <EmptyState
              compact
              art="none"
              align="start"
              eyebrow="Q&A · 00 threads"
              className="px-0"
              title="No questions yet."
              body={emptyBody}
            />
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {sorted.map((t) => (
              <ThreadCard
                key={t.question.id}
                thread={t}
                canReply={canTalk && !courseAccess.admin}
                tutorId={course.tutorId}
                tutorFirst={tutorFirst}
                ctx={ctx}
                likes={likes}
                onLike={like}
                onReport={
                  session && !courseAccess.owner && !courseAccess.admin
                    ? report
                    : undefined
                }
                onUnreport={unreport}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="@[860px]:sticky @[860px]:top-[84px] @[860px]:self-start">
        {courseAccess.owner ? (
          <div className="border border-line bg-night p-5 md:p-6">
            <h2 className="t-app-h3">Answer inside the threads</h2>
            <p className="mt-2 t-small text-muted">
              {waiting
                ? `${plural(waiting, "question")} on this ${item.type === "quiz" ? "test" : "lesson"} ${waiting === 1 ? "is" : "are"} waiting for you. Answer on the thread, or mark it resolved if it sorted itself out.`
                : "Nothing waiting on this one. When a learner asks, hit Answer on their thread."}
            </p>
            <Button
              size="sm"
              variant="primary"
              href="/tutor/questions"
              iconRight="arrow-right"
              className="mt-4"
            >
              All your questions
            </Button>
          </div>
        ) : courseAccess.admin ? (
          <div className="border border-line bg-night p-5 md:p-6">
            <h2 className="t-app-h3">Moderation lives in the admin area</h2>
            <p className="mt-2 t-small text-muted">
              Q&amp;A here is between learners and {tutorFirst}. Review reports
              and the course from the admin area.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                href={`/admin/courses/${course.id}`}
                iconRight="arrow-right"
              >
                Course review
              </Button>
              <Button size="sm" variant="outline" href="/admin/reports">
                Reports
              </Button>
            </div>
          </div>
        ) : !settled && !canAsk ? (
          // logged in, store overlay not in yet: the course may already be theirs
          <div className="border border-line bg-night p-5 md:p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton variant="text" lines={2} className="mt-3" />
            <Skeleton className="mt-4 h-9 w-40" />
          </div>
        ) : (
          <div className="border border-line bg-night p-5 md:p-6">
            <p className="flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Ask the tutor
              <span className="font-mono text-[10.5px] font-normal tracking-[0.04em] text-muted">
                Q&amp;A
              </span>
            </p>
            <h2 className="sr-only">Ask the tutor</h2>
            {canAsk && phone ? (
              <div className="mt-2">
                <p className="t-small text-muted">
                  Stuck on something? {tutorFirst} reads every question.
                  {body.trim() && " Your draft is saved."}
                </p>
                <Button
                  icon="chat"
                  fullWidth
                  className="mt-3 h-12"
                  onClick={() => setComposer(true)}
                  aria-haspopup="dialog"
                >
                  {body.trim() ? "Finish your question" : "Ask a question"}
                </Button>
              </div>
            ) : canAsk ? (
              <form onSubmit={post} className="mt-3 space-y-3" noValidate>
                <Field
                  label="Your question"
                  hint={
                    item.type === "video"
                      ? "Mention the timestamp if it's about a specific moment."
                      : undefined
                  }
                  error={error ?? undefined}
                >
                  <Textarea
                    ref={ref}
                    rows={4}
                    maxLength={600}
                    showCount
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    // like the Notes composer: the clip waits while you write
                    onFocus={() => player.current?.pause()}
                    placeholder={placeholder}
                  />
                </Field>
                <Button type="submit" icon="chat" fullWidth>
                  Post question
                </Button>
                <p className="text-[12.5px] font-semibold text-muted">
                  Questions are public to other learners in this course.
                </p>
              </form>
            ) : !session ? (
              <div className="mt-2">
                <p className="t-small text-muted">
                  Log in to ask {tutorFirst} a question. Reading is open to
                  everyone.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  href={`/login?next=${encodeURIComponent(learnHref(course.slug, item.id))}`}
                >
                  Log in
                </Button>
              </div>
            ) : gatedHere ? (
              <div className="mt-2">
                <p className="t-small text-muted">
                  Pass the checkpoint test first, then ask away on this one.
                </p>
                {access.blockedBy && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="quiz"
                    className="mt-3"
                    href={learnHref(course.slug, access.blockedBy.id)}
                  >
                    Take the test
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="t-small text-muted">
                  {tutorBrowsing
                    ? `Q&A is for learners in the course. ${TUTOR_BROWSING_LINE}`
                    : `Q&A is for learners in the course. Unlock it to ask ${tutorFirst} anything.`}
                </p>
                {courseAccess.purchasable && (
                  <BuyButton
                    size="sm"
                    variant="red"
                    label="Unlock the full course"
                    className="mt-4"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {canAsk && phone && (
        <BottomSheet
          open={composer}
          onClose={() => setComposer(false)}
          surface="ink"
          title={`Ask ${tutorFirst}`}
          description="Questions are public to other learners in this course."
          footerLayout="row"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setComposer(false)}
                className="h-12"
              >
                Later
              </Button>
              <Button
                type="submit"
                form="qa-sheet-form"
                icon="chat"
                className="h-12 flex-1"
              >
                Post question
              </Button>
            </>
          }
        >
          <form id="qa-sheet-form" onSubmit={post} noValidate>
            <Field
              label="Your question"
              hint={
                item.type === "video"
                  ? "Mention the timestamp if it's about a specific moment."
                  : undefined
              }
              error={error ?? undefined}
            >
              <Textarea
                data-autofocus=""
                rows={4}
                maxLength={600}
                showCount
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => player.current?.pause()}
                placeholder={placeholder}
              />
            </Field>
          </form>
        </BottomSheet>
      )}
    </div>
  );
}

/** A post collapsed by a report. The course tutor and admins can still open it. */
function HiddenPost({
  row,
  canModerate,
  onShow,
  onUnreport,
  small,
}: {
  row: Row;
  canModerate: boolean;
  onShow: () => void;
  onUnreport: (row: Row) => void;
  small?: boolean;
}) {
  const mineOnly = !!row.report?.mine && !row.report.others;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        aria-hidden
        className={clsx(
          "grid shrink-0 place-items-center text-muted ring-1 ring-line-strong ring-inset",
          small ? "size-8" : "size-10",
        )}
      >
        <Icon name="flag" className="size-4" />
      </span>
      <p className="min-w-0 flex-1 basis-48 text-[14px] leading-snug font-semibold text-muted">
        {mineOnly
          ? "You reported this post. It's hidden for you while the Tamada team takes a look."
          : "Hidden while the Tamada team reviews a report."}
      </p>
      {canModerate ? (
        <button
          type="button"
          onClick={onShow}
          className="tap hit px-1 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase underline decoration-line-strong underline-offset-4 hf:text-red-lite"
        >
          Show anyway
        </button>
      ) : mineOnly ? (
        <button
          type="button"
          onClick={() => onUnreport(row)}
          className="tap hit px-1 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase underline decoration-line-strong underline-offset-4 hf:text-red-lite"
        >
          Undo report
        </button>
      ) : null}
    </div>
  );
}

function ThreadCard({
  thread,
  canReply,
  tutorId,
  tutorFirst,
  ctx,
  likes,
  onLike,
  onReport,
  onUnreport,
}: {
  thread: Thread;
  canReply: boolean;
  tutorId: string;
  tutorFirst: string;
  ctx: ItemContext;
  likes: Likes;
  onLike: (c: Row) => void;
  onReport?: (c: Row, reason: string) => void;
  onUnreport: (row: Row) => void;
}) {
  const { session, course, courseAccess, player } = useLearn();
  const [replying, setReplying] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // the composer can open near the bottom of the window: bring all of it in
  useEffect(() => {
    if (replying) reveal(formRef.current, "nearest");
  }, [replying]);
  const [reply, setReply] = useState("");
  const [del, setDel] = useState<Row | null>(null);
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const q = thread.question;
  const isTutorViewer = session?.userId === tutorId;
  const canModerate = courseAccess.owner || courseAccess.admin;
  const isHidden = (r: Row) => !!r.report && !shown.has(r.id);
  const show = (id: string) => setShown((s) => new Set(s).add(id));
  // the tutor doesn't "answer" their own update; learners can still reply to it
  const showReply = canReply && !(thread.update && isTutorViewer);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || reply.trim().length < 2) return;
    demo.addComment(session.userId, course.id, ctx.item.id, reply, q.id);
    setReply("");
    setReplying(false);
    toast.success(
      isTutorViewer && !thread.update
        ? "Answer posted. Thread marked answered."
        : "Reply posted",
    );
  };
  // the owner can close a thread that needs no answer (and reopen it)
  const canResolve = isTutorViewer && !thread.update && !thread.answered;
  const setResolved = (v: boolean) => {
    demo.setCommentResolved(q.id, v);
    toast.success(v ? "Marked as resolved" : "Reopened", {
      description: v
        ? "It no longer counts as waiting."
        : "It's back in your waiting questions.",
      action: {
        label: "Undo",
        onClick: () => demo.setCommentResolved(q.id, !v),
      },
    });
  };

  if (isHidden(q))
    return (
      <li className="app-fade py-5">
        <HiddenPost
          row={q}
          canModerate={canModerate}
          onShow={() => show(q.id)}
          onUnreport={onUnreport}
        />
      </li>
    );

  return (
    <li className="app-fade py-5">
      <div>
        <CommentRow
          c={q}
          tutorId={tutorId}
          likes={likes}
          onLike={onLike}
          onDelete={setDel}
          onReport={onReport}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px] max-sm:pl-0">
          {thread.update ? (
            <Badge tone="cyan" dot size="sm">
              Update from {tutorFirst}
            </Badge>
          ) : thread.answered ? (
            <Badge tone="mint" dot size="sm">
              Answered
            </Badge>
          ) : thread.resolved ? (
            <Badge tone="lilac" dot size="sm">
              Resolved
            </Badge>
          ) : (
            <Badge tone="butter" dot size="sm">
              Waiting for {tutorFirst}
            </Badge>
          )}
          {showReply && (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              aria-expanded={replying}
              data-answer-waiting={
                isTutorViewer && !thread.handled ? "" : undefined
              }
              className="tap hit ml-1 px-1.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase hf:text-red-lite coarse:py-2"
            >
              {replying
                ? "Cancel"
                : isTutorViewer && !thread.handled
                  ? "Answer"
                  : "Reply"}
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              onClick={() => setResolved(!thread.resolved)}
              className="tap hit px-1.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase hf:text-fg coarse:py-2"
            >
              {thread.resolved ? "Reopen" : "Mark as resolved"}
            </button>
          )}
        </div>
        {thread.replies.length > 0 && (
          <ul className="mt-4 space-y-4 pl-[52px] max-sm:pl-0">
            {thread.replies.map((r) => {
              const isTutor = r.userId === tutorId;
              return (
                <li
                  key={r.id}
                  className={clsx(
                    "border-l-2 py-1 pl-4",
                    isTutor ? "border-red" : "border-line-strong",
                  )}
                >
                  {isHidden(r) ? (
                    <HiddenPost
                      row={r}
                      canModerate={canModerate}
                      onShow={() => show(r.id)}
                      onUnreport={onUnreport}
                      small
                    />
                  ) : (
                    <CommentRow
                      c={r}
                      tutorId={tutorId}
                      likes={likes}
                      onLike={onLike}
                      onDelete={setDel}
                      onReport={onReport}
                      small
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {replying && (
          <form
            ref={formRef}
            onSubmit={send}
            className="app-fade mt-3 scroll-mb-24 space-y-2 pl-[52px] max-sm:pl-0 lg:scroll-mb-6"
            noValidate
          >
            <label htmlFor={`reply-${q.id}`} className="sr-only">
              {isTutorViewer ? "Your answer" : "Your reply"}
            </label>
            <Textarea
              id={`reply-${q.id}`}
              rows={3}
              maxLength={600}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => player.current?.pause()}
              placeholder={
                isTutorViewer
                  ? "Write your answer…"
                  : "Add to the conversation…"
              }
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplying(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={reply.trim().length < 2}
              >
                {isTutorViewer ? "Post answer" : "Post reply"}
              </Button>
            </div>
          </form>
        )}
      </div>
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del) demo.deleteComment(del.id);
          setDel(null);
          toast("Deleted");
        }}
        tone="danger"
        surface="ink"
        title="Delete this post?"
        description="It disappears for everyone in the course."
        confirmLabel="Delete"
      />
    </li>
  );
}

type Likes = ReturnType<typeof useCommentLikes>;

function CommentRow({
  c,
  tutorId,
  likes,
  onLike,
  onDelete,
  onReport,
  small,
}: {
  c: Row;
  tutorId: string;
  likes: Likes;
  onLike: (c: Row) => void;
  onDelete: (c: Row) => void;
  onReport?: (c: Row, reason: string) => void;
  small?: boolean;
}) {
  const { session } = useLearn();
  const isTutor = c.userId === tutorId;
  const mine = session?.userId === c.userId;
  const name = c.user?.name ?? "Former learner";
  const on = likes.isLiked(c);
  const count = likes.count(c);
  const likeLabel = `${count} ${count === 1 ? "like" : "likes"}`;
  return (
    <div className="flex gap-3">
      <Avatar
        name={name}
        src={c.user?.avatar}
        tone={c.user?.tone}
        size={small ? "sm" : "md"}
        decorative
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold">{mine ? "You" : name}</span>
          {isTutor && (
            <Badge tone="ink" size="sm">
              Tutor
            </Badge>
          )}
          {c.report && (
            <Badge tone="flame" size="sm">
              Reported: {c.report.reason}
            </Badge>
          )}
          <span className="font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            {timeAgo(c.createdAt)}
          </span>
        </p>
        <p
          className={clsx(
            "mt-1.5 leading-relaxed break-words whitespace-pre-line text-fg/85",
            small ? "text-[14px]" : "text-[15px]",
          )}
        >
          {c.body}
        </p>
        <div className="mt-1.5 flex items-center gap-1 coarse:gap-3">
          {session && !mine ? (
            <button
              type="button"
              onClick={() => onLike(c)}
              aria-pressed={on}
              aria-label={`Helpful, ${likeLabel}`}
              title={on ? "Take back your like" : "Mark as helpful"}
              className={clsx(
                "tap hit inline-flex h-7 items-center gap-1.5 px-1.5 font-mono text-[11.5px] tabular-nums coarse:h-9",
                on ? "text-red-deep on-dark:text-red-lite" : "text-muted hf:text-fg",
              )}
            >
              <Icon name="heart" className={clsx("size-3.5", on && "fill-current")} strokeWidth={1.8} />
              {count}
            </button>
          ) : (
            <span className="inline-flex h-7 items-center gap-1.5 px-1.5 font-mono text-[11.5px] text-muted tabular-nums">
              <Icon name="heart" className="size-3.5" strokeWidth={1.8} />
              {count}
              <span className="sr-only"> {count === 1 ? "like" : "likes"}</span>
            </span>
          )}
          {mine && (
            <button
              type="button"
              onClick={() => onDelete(c)}
              className="tap hit inline-flex h-7 items-center gap-1.5 px-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase hf:text-red-deep on-dark:hf:text-red-lite coarse:h-9"
            >
              <Icon name="trash" className="size-3.5" />
              Delete
            </button>
          )}
          {onReport && !mine && !isTutor && !c.report && (
            <DropdownMenu
              label={`Report post by ${name}`}
              align="start"
              width={232}
              triggerClassName="tap hit inline-flex h-7 items-center gap-1.5 px-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase hf:text-fg coarse:h-9"
              trigger={
                <>
                  <Icon name="flag" className="size-3.5" />
                  Report
                </>
              }
              header={
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  What&apos;s wrong with it?
                </p>
              }
              items={REPORT_REASONS.map((reason) => ({
                label: reason,
                onSelect: () => onReport(c, reason),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================= notes */
function NotesPanel({
  ctx,
  access,
}: {
  ctx: ItemContext;
  access: AccessResult;
}) {
  const {
    course,
    session,
    db,
    player,
    focusRequest,
    takeFocus,
    tracking,
    courseAccess,
    settled,
    tutorBrowsing,
  } = useLearn();
  const canNote = useCanTalk(access) && tracking;
  const isVideo = ctx.item.type === "video";
  const [scope, setScope] = useState<"item" | "course">("item");
  const [text, setText] = useState("");
  const [at, setAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const ref = useRef<HTMLTextAreaElement>(null);
  const all = session ? getNotes(session.userId, course.id, db) : [];
  const list =
    scope === "item"
      ? all
          .filter((n) => n.itemId === ctx.item.id)
          .sort((a, b) => a.atSec - b.atSec)
      : all;

  const syncTime = () => {
    if (isVideo && player.current) setAt(player.current.getTime());
  };
  // "Add a note": consumed once, on this item only (never replayed on the next)
  useEffect(() => {
    if (!takeFocus("notes", ctx.item.id)) return;
    const field = ref.current;
    if (!field) {
      reveal(document.getElementById("lesson-details"), "start");
      return;
    }
    field.focus({ preventScroll: true });
    reveal(field, "center");
  }, [focusRequest, takeFocus, ctx.item.id]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!text.trim())
      return setError("Write something first. Even one line helps future you.");
    demo.addNote(
      session.userId,
      course.id,
      ctx.item.id,
      isVideo ? at : 0,
      text,
    );
    setText("");
    setError(null);
    setScope("item");
    toast.success("Note saved", {
      description: isVideo
        ? `Pinned at ${formatDuration(at, "clock")}.`
        : undefined,
    });
  };
  const remove = (id: string) => {
    const n = all.find((x) => x.id === id);
    demo.deleteNote(id);
    toast({
      title: "Note deleted",
      tone: "neutral",
      action:
        n && session
          ? {
              label: "Undo",
              onClick: () =>
                demo.addNote(
                  session.userId,
                  n.courseId,
                  n.itemId,
                  n.atSec,
                  n.text,
                ),
            }
          : undefined,
    });
  };
  const jump = (itemId: string, sec: number) => {
    const p = player.current;
    if (itemId !== ctx.item.id || !p) return;
    // a time past the end of the (shorter) sample clip is scaled to fit it
    const d = p.getDuration();
    const nominal = ctx.item.type === "video" ? ctx.item.lesson.durationSec : 0;
    p.seek(d && sec >= d - 1 && nominal ? (sec / nominal) * d : sec);
    p.play();
    p.reveal();
  };

  if (session && (courseAccess.owner || courseAccess.admin)) {
    return (
      <div className="border-t border-line">
        <EmptyState
          compact
          art="none"
          align="start"
          eyebrow="Notes · private"
          className="px-0"
          title="Notes are personal to each learner."
          body={
            courseAccess.owner
              ? "Your learners pin private, timestamped notes here. In tutor preview nothing is saved, so there's nothing to show."
              : "Learners pin private, timestamped notes here. Admins can't read them, and nothing is saved in this view."
          }
        />
      </div>
    );
  }
  if (session && !canNote && !settled) {
    // the store overlay may still enroll them (a demo purchase): wait a beat
    return (
      <div className="border-t border-line py-8">
        <Skeleton className="h-5 w-48" />
        <Skeleton variant="text" lines={2} className="mt-3 max-w-md" />
      </div>
    );
  }
  if (session && !canNote && access.reason === "gated") {
    const test = access.blockedBy;
    return (
      <div className="border-t border-line">
        <EmptyState
          compact
          art="none"
          align="start"
          eyebrow="Notes · locked"
          className="px-0"
          title={
            test
              ? `Notes open once you pass “${itemTitle(test)}”.`
              : "Notes open once you pass the checkpoint test."
          }
          body="This lesson sits behind a checkpoint. Pass the test and you can pin timestamped notes here, like on every other lesson."
          action={
            test ? (
              <Button
                size="sm"
                variant="accent"
                icon="quiz"
                href={learnHref(course.slug, test.id)}
              >
                Take the test
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  if (!session || !canNote) {
    return (
      <div className="border-t border-line">
        <EmptyState
          compact
          art="none"
          align="start"
          eyebrow="Notes · learners only"
          className="px-0"
          title="Notes are for learners in the course."
          body={
            !session
              ? "Log in to keep timestamped notes that follow you across devices (well, across this browser in the demo)."
              : tutorBrowsing
                ? TUTOR_BROWSING_LINE
                : "Unlock the course to keep timestamped notes on every lesson."
          }
          action={
            !session ? (
              <Button
                size="sm"
                href={`/login?next=${encodeURIComponent(learnHref(course.slug, ctx.item.id))}`}
              >
                Log in
              </Button>
            ) : (
              <BuyButton
                size="sm"
                variant="red"
                arrow={false}
                label="Unlock the full course"
              />
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-x-12 gap-y-10 @[860px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">
            Your notes
          </h2>
          <Segmented
            label="Which notes"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "item", label: "This lesson" },
              { value: "course", label: `Whole course (${all.length})` },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <div className="mt-5 border-t border-line">
            <EmptyState
              compact
              art="none"
              align="start"
              eyebrow="Notes · 00"
              className="px-0"
              title={
                scope === "item"
                  ? "No notes on this one yet."
                  : "No notes in this course yet."
              }
              body="Jot down the bits you'll want later. Notes are private to you."
            />
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {list.map((n) => {
              const sameItem = n.itemId === ctx.item.id;
              const isEditing = editing?.id === n.id;
              return (
                <li key={n.id} className="app-fade py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(isVideo || !sameItem) &&
                        (sameItem ? (
                          <button
                            type="button"
                            onClick={() => jump(n.itemId, n.atSec)}
                            className="tap hit inline-flex h-7 items-center gap-1.5 bg-red px-2 font-mono text-[11.5px] text-white tabular-nums hf:bg-red-deep coarse:h-9"
                            aria-label={`Jump to ${formatDuration(n.atSec, "clock")}`}
                          >
                            <Icon
                              name="play"
                              className="size-3"
                              strokeWidth={2.6}
                            />
                            {formatDuration(n.atSec, "clock")}
                          </button>
                        ) : (
                          <NoteTarget
                            courseSlug={course.slug}
                            itemId={n.itemId}
                            atSec={n.atSec}
                          />
                        ))}
                      <span className="font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
                        {timeAgo(n.createdAt)}
                      </span>
                      <span className="flex-1" />
                      {!isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            icon="edit"
                            aria-label="Edit note"
                            onClick={() =>
                              setEditing({ id: n.id, text: n.text })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            icon="trash"
                            aria-label="Delete note"
                            onClick={() => remove(n.id)}
                          />
                        </>
                      )}
                    </div>
                    {isEditing ? (
                      <form
                        className="mt-2 space-y-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!editing.text.trim()) return;
                          demo.updateNote(n.id, editing.text);
                          setEditing(null);
                          toast.success("Note updated");
                        }}
                      >
                        <label htmlFor={`edit-${n.id}`} className="sr-only">
                          Edit note
                        </label>
                        <Textarea
                          id={`edit-${n.id}`}
                          rows={3}
                          maxLength={500}
                          value={editing.text}
                          onChange={(e) =>
                            setEditing({ id: n.id, text: e.target.value })
                          }
                          onFocus={() => player.current?.pause()}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" type="submit">
                            Save
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-2.5 text-[15px] leading-relaxed whitespace-pre-line text-fg/90">
                        {n.text}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="@[860px]:sticky @[860px]:top-[84px] @[860px]:self-start">
        <div className="border border-line bg-night p-5 md:p-6">
          <h2 className="flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
            New note
            <span className="font-mono text-[10.5px] font-normal tracking-[0.04em] text-muted">
              Private
            </span>
          </h2>
          <form onSubmit={save} className="mt-3 space-y-3" noValidate>
            <Field
              label={
                isVideo ? `Note at ${formatDuration(at, "clock")}` : "Note"
              }
              error={error ?? undefined}
              hint={isVideo ? "The video pauses while you type." : undefined}
              labelAction={
                isVideo ? (
                  <button
                    type="button"
                    onClick={syncTime}
                    className="hit text-red-deep underline-offset-4 on-dark:text-red-lite hf:underline"
                  >
                    Use current time
                  </button>
                ) : undefined
              }
            >
              <Textarea
                ref={ref}
                rows={4}
                maxLength={500}
                showCount
                value={text}
                onFocus={() => {
                  syncTime();
                  player.current?.pause();
                }}
                onChange={(e) => setText(e.target.value)}
                placeholder="What do you want to remember?"
              />
            </Field>
            <Button type="submit" icon="note" fullWidth>
              Save note
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * A note from another item in "Whole course". Video notes open that lesson at
 * the note (?t=); notes on a test or a download have no time, so they just
 * link to the item with its type.
 */
function NoteTarget({
  courseSlug,
  itemId,
  atSec,
}: {
  courseSlug: string;
  itemId: string;
  atSec: number;
}) {
  const { flat } = useLearn();
  const item = flat.find((f) => f.item.id === itemId)?.item;
  const title = item ? itemTitle(item) : "Lesson";
  const chip =
    "tap hit inline-flex h-7 max-w-full items-center gap-1.5 px-2 font-mono text-[11px] tracking-[0.02em] text-fg ring-1 ring-line-strong ring-inset hf:ring-fg coarse:h-9";
  if (!item || item.type === "video")
    return (
      <Link
        // ?t= opens that lesson at the note, not the resume point
        href={`${learnHref(courseSlug, itemId)}?t=${Math.floor(atSec)}`}
        aria-label={`Open ${title} at ${formatDuration(atSec, "clock")}`}
        className={chip}
      >
        <Icon name="play" className="size-3" strokeWidth={2.6} />
        <span className="tabular-nums">{formatDuration(atSec, "clock")}</span>
        <span className="truncate">· {title}</span>
      </Link>
    );
  const kind = item.type === "quiz" ? "Test" : "Download";
  return (
    <Link
      href={learnHref(courseSlug, itemId)}
      aria-label={`Open ${kind.toLowerCase()}: ${title}`}
      className={chip}
    >
      <Icon
        name={item.type === "quiz" ? "quiz" : "file"}
        className="size-3.5 shrink-0"
      />
      <span className="truncate">
        {kind} · {title}
      </span>
    </Link>
  );
}

/* ============================================================================= resources */
function ResourcesPanel({ ctx }: { ctx: ItemContext }) {
  const {
    course,
    flat,
    accessMap,
    session,
    tracking,
    completed,
    afterProgress,
  } = useLearn();
  const res = flat.filter(
    (x): x is ItemContext & { item: ResourceItem } =>
      x.item.type === "resource",
  );
  const ordered = [
    ...res.filter((x) => x.module.id === ctx.module.id),
    ...res.filter((x) => x.module.id !== ctx.module.id),
  ];
  if (!ordered.length)
    return (
      <div className="border-t border-line">
        <EmptyState
          compact
          art="none"
          align="start"
          eyebrow="Downloads · 00"
          className="px-0"
          title="No downloads in this course."
          body="Everything you need is in the videos and tests."
        />
      </div>
    );
  const get = (x: ItemContext & { item: ResourceItem }) => {
    downloadDemoResource(x.item.resource, course.title);
    let celebrating = false;
    if (tracking && session && !completed.has(x.item.id)) {
      demo.setItemComplete(session.userId, course.id, x.item.id, true);
      celebrating = afterProgress();
    }
    if (x.item.resource.fileType !== "link" && !celebrating)
      toast.success("Download started", {
        description: "Demo file generated in your browser.",
      });
  };
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <h2 className="font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">
          Course downloads
        </h2>
        <p className="max-w-[52ch] t-small text-muted">
          Cheat sheets and project files. In this demo they&apos;re small sample
          files made in your browser.
        </p>
      </div>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {ordered.map((x, i) => {
          const r = x.item.resource;
          const meta = FILE_META[r.fileType];
          const ok = accessMap[x.item.id]?.allowed;
          const here = x.module.id === ctx.module.id;
          return (
            <li
              key={x.item.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4"
            >
              <span
                aria-hidden
                className="w-6 shrink-0 self-start pt-[3px] font-mono text-[11px] text-muted tabular-nums"
              >
                {pad2(i + 1)}
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-[15px] leading-snug font-medium tracking-[-0.01em]">
                  {r.title}
                </p>
                <p className="mt-1 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
                  {[
                    meta.label,
                    formatSize(r.sizeKb),
                    `Module ${x.module.position}: ${x.module.title}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {here && " · this module"}
                </p>
              </div>
              {ok ? (
                <Button
                  size="sm"
                  variant={completed.has(x.item.id) ? "outline" : "primary"}
                  icon={r.fileType === "link" ? "external" : "download"}
                  onClick={() => get(x)}
                  aria-label={
                    r.fileType === "link"
                      ? `Open “${r.title}”`
                      : completed.has(x.item.id)
                        ? `Download “${r.title}” again`
                        : `Download “${r.title}”`
                  }
                >
                  {r.fileType === "link"
                    ? "Open"
                    : completed.has(x.item.id)
                      ? "Download again"
                      : "Download"}
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
                  <Icon name="lock" className="size-3.5" strokeWidth={1.7} />
                  {lockReason(accessMap[x.item.id], ctx.item.id) ?? "Locked"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
