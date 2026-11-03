"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DescriptionList,
  DropdownMenu,
  EmptyState,
  Field,
  Icon,
  PageHeader,
  Rating,
  Section,
  Select,
  Skeleton,
  StatusPill,
  StickyActionBar,
  Switch,
  buttonClass,
  toast,
  type IconName,
  type MenuItem,
} from "@/components/app";
import { demo, useDb, useStoreHydrated } from "@/lib/demo/store";
import {
  formatDate,
  formatDuration,
  formatINR,
  formatNumber,
  getCategories,
  getCategory,
  getCourse,
  getCourseStats,
  getCurriculum,
  getFirstFreeItem,
  getTutor,
  getUser,
  itemTitle,
  pad2,
  plural,
  timeAgo,
  type ModuleItem,
  type Course,
  type Quiz,
} from "@/lib/mock";
import {
  CourseActionDialogs,
  CourseStatusPill,
  courseChecks,
  questionProblem,
  quizProblems,
  wasLive,
  type CourseAction,
} from "./reviewKit";
import { STRETCH, useNoneInView } from "./shared";
import {
  CheckRow,
  Idx,
  MonoMeta,
  Poster,
  RuleNote,
  RuledList,
  SquareTick,
} from "@/components/tutor/editorial";

/** item types as mono caps words (no coloured icons) */
const ITEM_WORD: Record<ModuleItem["type"], string> = {
  video: "Video",
  quiz: "Test",
  resource: "File",
};

export function CourseReview({ courseId }: { courseId: string }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const course = getCourse(courseId, db);
  const [action, setAction] = useState<CourseAction>(null);
  const [watched, setWatched] = useState(false);
  const [openMods, setOpenMods] = useState<Record<string, boolean>>({});
  const [openQuiz, setOpenQuiz] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  // phones: the decision bar shows while neither inline action row is on screen
  const headActionsRef = useRef<HTMLDivElement>(null);
  const checklistActionsRef = useRef<HTMLDivElement>(null);
  const actionsAway = useNoneInView(headActionsRef, checklistActionsRef);

  if (!course) {
    if (!hydrated)
      return (
        <div aria-busy="true" aria-label="Loading course">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-6 h-14 w-2/3" />
          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <Skeleton className="h-80 xl:col-span-2" />
            <Skeleton className="h-80" />
          </div>
        </div>
      );
    return (
      <div className="app-enter">
        <PageHeader
          breadcrumbs={[
            { label: "Control room", href: "/admin" },
            { label: "Courses", href: "/admin/courses?tab=all" },
            { label: "Not found" },
          ]}
          eyebrow="Course review"
          title={
            <>
              Course not <em>found</em>.
            </>
          }
        />
        <EmptyState
          art="none"
          align="start"
          eyebrow={`Error 404 · ${courseId}`}
          title="We can't find that course."
          body={`Nothing matches “${courseId}”. It may have been deleted, or the link is off by a letter.`}
          action={<Button href="/admin/courses?tab=all" variant="outline" iconRight="arrow-right">All courses</Button>}
          className="border-t border-fg !px-0"
        />
      </div>
    );
  }

  const mods = getCurriculum(course.id, db);
  const stats = getCourseStats(course.id, db);
  const checks = courseChecks(course, db);
  const passed = checks.filter((c) => c.ok).length;
  const tutor = getTutor(course.tutorId, db);
  const tutorUser = getUser(course.tutorId, db);
  const cat = getCategory(course.categoryId, db);
  const tutorCourses = db.courses.filter((c) => c.tutorId === course.tutorId);
  const isOpen = (id: string, i: number) => openMods[id] ?? i < 2;
  const freeItem = getFirstFreeItem(course.id, db);
  const previewHref = freeItem ? `/learn/${course.slug}/${freeItem.id}` : null;
  // getFirstFreeItem falls back to the first video when nothing is marked free
  const previewLabel =
    freeItem?.type === "video" && freeItem.lesson.isFreePreview
      ? "Watch free preview"
      : "Watch first video";
  const allPass = passed === checks.length;
  /** the "I watched the free preview" box only matters while publishing is still a decision */
  const unpublished = wasLive(course);
  const reviewing =
    course.status === "in_review" ||
    (course.status === "rejected" && !unpublished) ||
    course.status === "draft";
  const publish = () => setAction({ kind: "publish", course, watched });
  /** open a module + quiz and bring it into view (from the checklist) */
  const showItem = (moduleId: string, itemId: string) => {
    setOpenMods((s) => ({ ...s, [moduleId]: true }));
    setOpenQuiz((s) => ({ ...s, [itemId]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`item-${itemId}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
    });
  };

  // The header keeps at most two buttons plus a "More" menu, so the actions fit
  // on one line beside the title even at 1024px with the sidebar open. The free
  // preview also lives in the checklist card.
  const moreItems: MenuItem[] = [
    ...(previewHref
      ? [{ label: previewLabel, icon: "play" as IconName, href: previewHref }]
      : []),
    ...(course.status !== "archived"
      ? [
          { divider: true as const },
          {
            label: "Archive course",
            icon: "inbox" as IconName,
            danger: true,
            onSelect: () => setAction({ kind: "archive", course }),
          },
        ]
      : []),
  ];
  // no preview link: don't open the menu on a divider
  if (moreItems[0] && "divider" in moreItems[0]) moreItems.shift();
  const moreMenu = moreItems.length > 0 && (
    <DropdownMenu
      label="More course actions"
      trigger={<Icon name="more" className="size-5" />}
      triggerClassName={buttonClass({ variant: "outline", iconOnly: true })}
      items={moreItems}
    />
  );

  const tutorActions = tutorUser && (
    <>
      <Button
        size="sm"
        variant="outline"
        icon="user"
        href={`/admin/users/${tutorUser.id}`}
      >
        Open account
      </Button>
      {tutor && (
        <Button
          size="sm"
          variant="arrow"
          href={`/tutors/${tutor.slug}`}
        >
          Public profile
        </Button>
      )}
    </>
  );

  const actions = (() => {
    switch (course.status) {
      case "in_review":
        return (
          <>
            <Button
              variant="outline"
              icon="arrow-left"
              onClick={() => setAction({ kind: "send_back", course })}
            >
              Send back
            </Button>
            <Button variant="red" icon="check" onClick={publish}>
              {allPass ? "Publish" : "Publish…"}
            </Button>
            {moreMenu && <span className="inline-flex max-sm:!flex-none">{moreMenu}</span>}
          </>
        );
      case "published":
        return (
          <>
            <Button
              variant="outline"
              icon="external"
              href={`/courses/${course.slug}`}
            >
              View on site
            </Button>
            <Button
              variant="ghost"
              icon="eye-off"
              onClick={() => setAction({ kind: "send_back", course })}
            >
              Unpublish…
            </Button>
            {moreMenu && <span className="inline-flex max-sm:!flex-none">{moreMenu}</span>}
          </>
        );
      case "archived":
        return (
          <>
            <Button
              variant="primary"
              icon="refresh"
              onClick={() => setAction({ kind: "restore", course })}
            >
              Restore to catalogue
            </Button>
            {moreMenu && <span className="inline-flex max-sm:!flex-none">{moreMenu}</span>}
          </>
        );
      default:
        return (
          <>
            {unpublished ? (
              <Button
                variant="primary"
                icon="refresh"
                onClick={() => setAction({ kind: "publish", course })}
              >
                Republish
              </Button>
            ) : (
              <Button variant="outline" icon="check" onClick={publish}>
                Publish anyway
              </Button>
            )}
            {moreMenu && <span className="inline-flex max-sm:!flex-none">{moreMenu}</span>}
          </>
        );
    }
  })();

  const failing = checks.length - passed;
  const slate: { label: string; value: React.ReactNode }[] = [
    { label: "Modules", value: pad2(stats.modules) },
    { label: "Videos", value: pad2(stats.videos) },
    { label: "Tests", value: pad2(stats.quizzes) },
    { label: "Files", value: pad2(stats.resources) },
    { label: "Runtime", value: formatDuration(stats.totalSec) },
    { label: "Price", value: formatINR(course.price) },
  ];

  return (
    <div className="app-enter">
      <PageHeader
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          {
            label: "Courses",
            href:
              course.status === "in_review"
                ? "/admin/courses?tab=review"
                : "/admin/courses?tab=all",
          },
          { label: course.title },
        ]}
        eyebrow={
          course.status === "in_review"
            ? `Course review · sent ${course.submittedAt ? timeAgo(course.submittedAt) : "recently"}`
            : "Course details"
        }
        size="sm"
        title={
          <>
            {course.title}
            <em>.</em>
          </>
        }
        description={course.promise || "No promise written yet."}
        meta={
          <>
            <CourseStatusPill course={course} />
            {course.featured && course.status === "published" && (
              <Badge tone="ink" dot>
                Featured
              </Badge>
            )}
            <MonoMeta as="span" className="ml-1">
              {[cat?.name, course.level, course.language]
                .filter(Boolean)
                .join(" · ")}
            </MonoMeta>
          </>
        }
        actions={actions}
      />
      <div ref={headActionsRef} aria-hidden className="-mt-5 mb-5 h-px sm:hidden" />

      {course.status === "rejected" && course.reviewNote && (
        <RuleNote
          tone="red"
          className="mb-10 md:mb-14"
          label={
            unpublished
              ? `Unpublished ${timeAgo(course.updatedAt)} · ${plural(course.learners, "learner")} keep access`
              : `Sent back ${timeAgo(course.updatedAt)}`
          }
        >
          <span className="text-[15px] text-fg">“{course.reviewNote}”</span>
        </RuleNote>
      )}

      {/* Slate: the course's vital numbers in one ruled strip */}
      <dl className="mb-12 grid grid-cols-3 gap-px border-y border-line bg-line md:mb-16 lg:grid-cols-6">
        {slate.map((f) => (
          <div
            key={f.label}
            className="min-w-0 bg-surface px-3 py-4 max-lg:[&:nth-child(3n+1)]:pl-0 md:px-5 lg:first:pl-0"
          >
            <dt className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
              {f.label}
            </dt>
            <dd className="mt-2 truncate font-heading text-[clamp(1.25rem,1.05rem+0.6vw,1.625rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-14 md:space-y-20">
        <Section
          index="01"
          label="Review checklist"
          note={`${passed} of ${checks.length} automatic checks pass. Click a problem to jump to it in the curriculum.`}
          title={allPass ? "Ready for the catalogue." : `${plural(failing, "check")} to look at.`}
          action={
            <span className="t-display-s tabular-nums" aria-hidden>
              {passed}
              <span className="text-muted">/{checks.length}</span>
            </span>
          }
        >
          <ul
            aria-label="Review checklist"
            className="grid border-t border-fg md:grid-cols-2 md:gap-x-10"
          >
            {checks.map((c) => (
              <CheckRow
                key={c.id}
                state={c.ok ? "done" : "fail"}
                className="border-b border-line py-3.5"
                hint={
                  <>
                    <span className="break-words">{c.detail}</span>
                    {!c.ok && c.issues && c.issues.length > 0 && (
                      <span className="mt-1.5 block space-y-1">
                        {(showAll[c.id] ? c.issues : c.issues.slice(0, 5)).map(
                          (x) => (
                            <button
                              key={x.itemId}
                              type="button"
                              onClick={() => showItem(x.moduleId, x.itemId)}
                              className="block text-left text-[12.5px] font-medium break-words text-fg underline decoration-line-strong underline-offset-[3px] hf:decoration-red"
                            >
                              {x.label}
                            </button>
                          ),
                        )}
                        {c.issues.length > 5 && !showAll[c.id] && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAll((s) => ({ ...s, [c.id]: true }))
                            }
                            className="block text-left text-[12.5px] text-muted underline-offset-[3px] hf:underline"
                          >
                            and {c.issues.length - 5} more
                          </button>
                        )}
                      </span>
                    )}
                  </>
                }
              >
                <span className="font-semibold">{c.label}</span>
                <span className="sr-only">
                  {c.ok ? ": passes" : ": needs work"}
                </span>
              </CheckRow>
            ))}
          </ul>

          {reviewing && (
            /* the page's one ink moment: the decision */
            <Card variant="ink" className="mt-8" padding="lg">
              <p className="t-label text-ash">Your call</p>
              <p className="mt-3 max-w-[30ch] font-heading text-[clamp(1.375rem,1.15rem+0.7vw,1.875rem)] leading-[1.08] font-semibold tracking-[-0.035em]">
                {allPass
                  ? "Every check passes. Watch the preview, then publish."
                  : "Some checks fail. Send it back with a note, or publish anyway."}
              </p>
              <div className="mt-7 flex flex-col gap-6 border-t border-line pt-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 max-w-[44ch]">
                  <Checkbox
                    label="I watched the free preview"
                    description="Sound, picture and pace feel right for a first impression. We remind you before publishing if this isn’t ticked."
                    checked={watched}
                    onChange={(e) => setWatched(e.target.checked)}
                  />
                  {previewHref && (
                    <Button variant="arrow" href={previewHref} className="mt-2 ml-9 max-w-full">
                      <span className="truncate">{previewLabel}</span>
                    </Button>
                  )}
                </div>
                <div
                  ref={checklistActionsRef}
                  className="flex shrink-0 flex-wrap gap-2 max-sm:[&>*]:flex-[1_1_auto]"
                >
                  {course.status === "in_review" && (
                    <Button
                      variant="outline"
                      icon="arrow-left"
                      onClick={() => setAction({ kind: "send_back", course })}
                    >
                      Send back
                    </Button>
                  )}
                  <Button variant="red" icon="check" onClick={publish}>
                    {course.status === "in_review"
                      ? allPass
                        ? "Publish course"
                        : "Publish…"
                      : "Publish anyway"}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Section>

        <Section
          index="02"
          label="The course"
          note="What learners read on the course page."
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
            <Poster
              src={course.thumbnail}
              alt={`Cover image for ${course.title}`}
              ratio={4 / 5}
              sizes="(min-width: 1280px) 340px, (min-width: 768px) 38vw, 100vw"
              eager
              className="aspect-[4/3] w-full md:aspect-[4/5]"
            />
            <div className="min-w-0">
              <p className="font-heading text-[clamp(1.125rem,1rem+0.45vw,1.375rem)] leading-[1.32] font-medium tracking-[-0.02em]">
                {course.description || "No description yet."}
              </p>
              {course.outcomes.length > 0 && (
                <>
                  <p className="mt-8 mb-1 t-label text-muted">
                    Learners will be able to
                  </p>
                  <RuledList as="ol" strong={false}>
                    {course.outcomes.map((o, i) => (
                      <li key={o} className="flex gap-4 py-3 text-[14.5px] leading-snug">
                        <Idx n={i + 1} className="mt-[3px]" />
                        <span className="min-w-0">{o}</span>
                      </li>
                    ))}
                  </RuledList>
                </>
              )}
              {course.tags.length > 0 && (
                <MonoMeta className="mt-5">
                  {course.tags.map((t) => `#${t}`).join("   ")}
                </MonoMeta>
              )}
            </div>
          </div>
        </Section>

        <Section
          index="03"
          label="Curriculum"
          id="curr-title"
          note={`${plural(stats.modules, "module")} · ${plural(stats.videos, "video")} · ${plural(stats.quizzes, "test")} · ${plural(stats.resources, "resource")} · ${formatDuration(stats.totalSec, "long")}`}
          action={
            mods.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setOpenMods(
                    Object.fromEntries(
                      mods.map((m) => [
                        m.id,
                        !mods.every((mm, i) => isOpen(mm.id, i)),
                      ]),
                    ),
                  )
                }
              >
                {mods.every((m, i) => isOpen(m.id, i))
                  ? "Collapse all"
                  : "Expand all"}
              </Button>
            )
          }
          title="Every lesson, in order."
        >
          {mods.length ? (
            <ol className="border-b border-line">
              {mods.map((m, mi) => {
                const open = isOpen(m.id, mi);
                const secs = m.items.reduce(
                  (s, it) =>
                    s + (it.type === "video" ? it.lesson.durationSec : 0),
                  0,
                );
                return (
                  <li key={m.id} className="border-t border-fg">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setOpenMods((s) => ({ ...s, [m.id]: !open }))
                      }
                      className="group flex w-full items-center gap-4 py-4 text-left transition-colors hf:bg-cream-2/60 md:gap-5"
                    >
                      <span className="t-display-s w-10 shrink-0 text-muted tabular-nums group-aria-expanded:text-fg">
                        {pad2(m.position)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block t-app-h3 [overflow-wrap:anywhere]">
                          {m.title}
                        </span>
                        <MonoMeta as="span" className="mt-1 block">
                          {plural(m.items.length, "item")} · {formatDuration(secs)}
                        </MonoMeta>
                      </span>
                      <Icon
                        name={open ? "minus" : "plus"}
                        strokeWidth={1.5}
                        className="size-5 shrink-0"
                      />
                    </button>
                    {open && (
                      <ul className="app-fade divide-y divide-line border-t border-line">
                        {m.items.length === 0 && (
                          <li className="py-3 pl-14 text-[14px] text-muted md:pl-[60px]">
                            Empty module.
                          </li>
                        )}
                        {m.items.map((it) => {
                          const quizOpen =
                            it.type === "quiz" && !!openQuiz[it.id];
                          const problems =
                            it.type === "quiz" ? quizProblems(it.quiz) : [];
                          return (
                            <li
                              key={it.id}
                              id={`item-${it.id}`}
                              className="scroll-mt-24"
                            >
                              <div className="relative flex items-start gap-4 py-3 transition-colors hf:bg-cream-2/50 coarse:min-h-12 md:gap-5">
                                <span className="w-10 shrink-0 pt-[3px] font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                                  {ITEM_WORD[it.type]}
                                </span>
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                                  <Link
                                    href={`/learn/${course.slug}/${it.id}`}
                                    className={clsx("max-w-full min-w-0 text-[14.5px] font-medium break-words underline-offset-[3px] hf:underline", STRETCH)}
                                    title={
                                      it.type === "video"
                                        ? "Watch in the player"
                                        : it.type === "quiz"
                                          ? "Open the test in the player"
                                          : "Open in the player"
                                    }
                                  >
                                    {itemTitle(it)}
                                  </Link>
                                  {it.type === "video" &&
                                    it.lesson.isFreePreview && (
                                      <Badge tone="ink" size="sm">
                                        Free preview
                                      </Badge>
                                    )}
                                  {it.type === "video" &&
                                    !it.lesson.hasCaptions && (
                                      <Badge tone="flame" size="sm" dot>
                                        No captions
                                      </Badge>
                                    )}
                                  {it.type === "quiz" && (
                                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                      {it.quiz.isGating && (
                                        <Badge tone="neutral" size="sm">
                                          <Icon name="lock" className="size-3" strokeWidth={1.8} />
                                          Gates next
                                        </Badge>
                                      )}
                                      {problems.length > 0 && (
                                        <Badge tone="flame" size="sm" dot>
                                          {plural(problems.length, "issue")}
                                        </Badge>
                                      )}
                                      <MonoMeta as="span">
                                        {plural(it.quiz.questions.length, "question")}{" "}
                                        · pass {it.quiz.passPercentage}%
                                      </MonoMeta>
                                      <button
                                        type="button"
                                        aria-expanded={quizOpen}
                                        aria-controls={`quiz-${it.id}`}
                                        onClick={() =>
                                          setOpenQuiz((s) => ({
                                            ...s,
                                            [it.id]: !quizOpen,
                                          }))
                                        }
                                        className="hit relative z-[1] inline-flex h-7 items-center gap-1.5 px-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase ring-1 ring-line-strong transition-colors ring-inset hf:bg-fg hf:text-surface coarse:h-9 coarse:px-3.5"
                                      >
                                        {quizOpen ? "Hide answers" : "Check answers"}
                                        <Icon
                                          name="chevron-down"
                                          strokeWidth={1.8}
                                          className={clsx(
                                            "size-3.5 transition-transform duration-200",
                                            quizOpen && "rotate-180",
                                          )}
                                        />
                                      </button>
                                    </span>
                                  )}
                                </div>
                                {it.type === "resource" && (
                                  <MonoMeta as="span" className="mt-0.5 shrink-0">
                                    {it.resource.fileType}
                                  </MonoMeta>
                                )}
                                {it.type === "video" && (
                                  <MonoMeta as="span" className="mt-0.5 w-12 shrink-0 text-right whitespace-nowrap">
                                    {formatDuration(it.lesson.durationSec, "clock")}
                                  </MonoMeta>
                                )}
                              </div>
                              {it.type === "quiz" && quizOpen && (
                                <QuizAnswers id={`quiz-${it.id}`} quiz={it.quiz} />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              compact
              art="none"
              align="start"
              eyebrow="Curriculum"
              title="No lessons yet."
              body="The tutor hasn't added anything to this course."
            />
          )}
        </Section>

        <Section index="04" label="Tutor" note="Who made it, and how they're doing.">
          {tutorUser ? (
            <div className="grid gap-6 md:grid-cols-2 md:gap-10">
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                  <Avatar
                    name={tutorUser.name}
                    src={tutorUser.avatar}
                    tone={tutorUser.tone}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${tutorUser.id}`}
                      className="t-app-h2 underline-offset-[3px] hf:underline"
                    >
                      {tutorUser.name}
                    </Link>
                    <p className="mt-1 t-small text-muted">
                      {tutor?.headline ?? tutorUser.city}
                    </p>
                    {tutor && tutor.rating > 0 && (
                      <Rating
                        value={tutor.rating}
                        count={tutor.reviewCount}
                        size="sm"
                        className="mt-1.5"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">{tutorActions}</div>
              </div>
              <DescriptionList
                items={[
                  {
                    label: "Courses",
                    value: `${tutorCourses.filter((c) => c.status === "published").length} published · ${tutorCourses.length} total`,
                  },
                  {
                    label: "Learners",
                    value: formatNumber(tutor?.learners ?? 0),
                  },
                  {
                    label: "On Tamada since",
                    value: formatDate(tutorUser.joinedAt),
                  },
                  {
                    label: "Account",
                    value: <StatusPill status={tutorUser.status} size="sm" />,
                  },
                ]}
              />
            </div>
          ) : (
            <p className="t-small text-muted">Tutor account not found.</p>
          )}
        </Section>

        <Section
          index="05"
          label="Listing"
          note="Price, dates and where it sits in the catalogue."
        >
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <DescriptionList
              items={[
                {
                  label: "Price",
                  value: (
                    <span>
                      {formatINR(course.price)}
                      {course.compareAtPrice && (
                        <span className="ml-1.5 text-muted line-through">
                          {formatINR(course.compareAtPrice)}
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  label: "Free previews",
                  value: plural(stats.freePreviews, "video"),
                },
                {
                  label: "Certificate",
                  value: course.hasCertificate ? "Yes, on completion" : "No",
                },
                { label: "Created", value: formatDate(course.createdAt) },
                // a live or archived course that never went through review has nothing to show here
                ...(course.submittedAt || reviewing
                  ? [
                      {
                        label: "Submitted",
                        value: course.submittedAt
                          ? formatDate(course.submittedAt, "datetime")
                          : "Not yet",
                      },
                    ]
                  : []),
                {
                  label: "Published",
                  value: course.publishedAt
                    ? formatDate(course.publishedAt)
                    : "Not yet",
                },
                {
                  label: "Slug",
                  value: (
                    <span className="font-mono text-[13px] break-all">
                      /{course.slug}
                    </span>
                  ),
                },
              ]}
            />
            <div className="min-w-0 space-y-6">
              <CategoryMover key={course.categoryId} course={course} />
              <div className="border-t border-line pt-5">
                <Switch
                  label="Mark as featured"
                  description={
                    course.status === "published"
                      ? "Saved on the course. The homepage carousel will use it once the site reads live data (it’s static in this demo)."
                      : "Only published courses can be featured."
                  }
                  checked={!!course.featured}
                  disabled={course.status !== "published"}
                  onChange={(v) => {
                    demo.setCourseFeatured(course.id, v);
                    toast.success(
                      v ? "Marked as featured." : "No longer featured.",
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {course.status === "in_review" && (
        <StickyActionBar
          show={actionsAway}
          label="Review decision"
          context={
            <span className="font-mono text-[12px] tracking-[0.06em] uppercase">
              {passed}/{checks.length} checks
            </span>
          }
        >
          {moreMenu}
          <Button
            variant="outline"
            className="h-12 px-4!"
            onClick={() => setAction({ kind: "send_back", course })}
          >
            Send back
          </Button>
          <Button
            variant="red"
            icon="check"
            className="h-12 px-4! phone-s:[&_svg]:hidden"
            onClick={publish}
          >
            Publish
          </Button>
        </StickyActionBar>
      )}
      <CourseActionDialogs action={action} onClose={() => setAction(null)} />
    </div>
  );
}

/* ----------------------------------------------------------------------------- category */
/** Category picker that commits only on "Move": arrow keys on a closed select fire
 *  change events, so saving on change would move the course at every step. */
function CategoryMover({ course }: { course: Course }) {
  const db = useDb();
  const [value, setValue] = useState(course.categoryId);
  const cats = getCategories(db);
  const nameOf = (id: string) => {
    const c = getCategory(id, db);
    if (!c) return "…";
    return c.parentId
      ? `${getCategory(c.parentId, db)?.name ?? "…"} › ${c.name}`
      : c.name;
  };
  const changed = value !== course.categoryId;
  const move = () => {
    const to = getCategory(value, db);
    if (!to) return;
    demo.updateCourse(course.id, { categoryId: to.id });
    toast.success(`Moved to ${to.name}.`, {
      description: `${getUser(course.tutorId, db)?.name ?? "The tutor"} sees the new category on their course.`,
    });
  };
  return (
    <div>
      <Field
        label="Category"
        hint="Where learners find it in the catalogue filters."
      >
        <Select
          selectSize="sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          options={cats.map((c) => ({ value: c.id, label: nameOf(c.id) }))}
        />
      </Field>
      {changed && (
        <div className="app-fade mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" icon="check" onClick={move}>
            Move to {getCategory(value, db)?.name ?? "category"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setValue(course.categoryId)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- quiz answers */
const Q_TYPE: Record<Quiz["questions"][number]["type"], string> = {
  single: "One answer",
  multiple: "Pick all that apply",
  true_false: "True or false",
  short: "Short answer",
};

/** Read-only answer key for a test: correct options ticked, broken questions flagged. */
function QuizAnswers({ id, quiz }: { id: string; quiz: Quiz }) {
  return (
    <div id={id} className="app-fade pb-5 pl-14 md:pl-[60px]">
      <MonoMeta>
        Answer key, admins only.
        {quiz.maxAttempts > 0
          ? ` ${plural(quiz.maxAttempts, "attempt")} allowed.`
          : " Unlimited attempts."}
        {quiz.timeLimitMin ? ` ${quiz.timeLimitMin} min limit.` : ""}
      </MonoMeta>
      <p className="mt-1 text-[12.5px] text-muted">
        Learners never see the correct answers before they submit.
      </p>
      {quiz.questions.length === 0 ? (
        <RuleNote tone="red" className="mt-3" label="This test has no questions yet." />
      ) : (
        <ol className="mt-3 border-t border-line">
          {quiz.questions.map((q, i) => {
            const problem = questionProblem(q);
            return (
              <li
                key={q.id}
                className={clsx(
                  "border-b border-line py-3.5",
                  problem && "border-l-2 border-l-red pl-3",
                )}
              >
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[11px] text-red-deep tabular-nums">
                    Q{pad2(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold">
                    {q.text}
                  </span>
                  <MonoMeta as="span" className="basis-full sm:basis-auto">
                    {Q_TYPE[q.type]} · {plural(q.points, "point")}
                  </MonoMeta>
                </p>
                {problem && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-red-deep">
                    <Icon name="alert" className="size-3.5" strokeWidth={1.8} />
                    {problem}
                  </p>
                )}
                {q.type === "short" ? (
                  q.acceptedAnswers?.length ? (
                    <p className="mt-2 text-[13px]">
                      <span className="text-muted">Accepted: </span>
                      {q.acceptedAnswers.map((a, j) => (
                        <span key={a}>
                          {j > 0 && ", "}
                          <span className="bg-cream-2 px-1.5 py-0.5 font-mono text-[12.5px] font-medium">
                            {a}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : null
                ) : (
                  <ul className="mt-2.5 grid gap-x-6 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={clsx(
                          "flex items-start gap-2.5 py-1 text-[13px] leading-snug",
                          o.isCorrect ? "font-semibold text-fg" : "text-muted",
                        )}
                      >
                        <SquareTick
                          state={o.isCorrect ? "done" : "todo"}
                          className="mt-px !size-4"
                        />
                        <span className="min-w-0">
                          {o.text}
                          <span className="sr-only">
                            {o.isCorrect ? " (correct)" : " (incorrect)"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {q.explanation && (
                  <p className="mt-2 text-[12.5px] text-muted">
                    <span className="font-semibold text-fg">Why: </span>
                    {q.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
