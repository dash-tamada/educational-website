"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  DescriptionList,
  DropdownMenu,
  EmptyState,
  Field,
  Icon,
  PageHeader,
  Rating,
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
import { cropSrc } from "@/lib/img";
import { toneBg } from "@/lib/landing-data";
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

const ITEM_ICON: Record<ModuleItem["type"], IconName> = {
  video: "play-circle",
  quiz: "quiz",
  resource: "file",
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
          eyebrowTone="purple"
          title="Course not found."
        />
        <Card>
          <EmptyState
            art="tami"
            title="We can't find that course."
            body={`Nothing matches “${courseId}”. It may have been deleted, or the link is off by a letter.`}
            action={<Button href="/admin/courses?tab=all">All courses</Button>}
          />
        </Card>
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
      triggerClassName={buttonClass({ variant: "secondary", iconOnly: true })}
      items={moreItems}
    />
  );

  const tutorActions = tutorUser && (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon="user"
        href={`/admin/users/${tutorUser.id}`}
      >
        Open account
      </Button>
      {tutor && (
        <Button
          size="sm"
          variant="ghost"
          icon="external"
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
              variant={allPass ? "success" : "secondary"}
              icon="check"
              onClick={publish}
            >
              {allPass ? "Publish" : "Publish…"}
            </Button>
            <Button
              variant={allPass ? "secondary" : "primary"}
              icon="arrow-left"
              onClick={() => setAction({ kind: "send_back", course })}
            >
              Send back
            </Button>
            {moreMenu}
          </>
        );
      case "published":
        return (
          <>
            <Button
              variant="secondary"
              icon="external"
              href={`/courses/${course.slug}`}
            >
              View on site
            </Button>
            <Button
              variant="ghost"
              onClick={() => setAction({ kind: "send_back", course })}
            >
              Unpublish…
            </Button>
            {moreMenu}
          </>
        );
      case "archived":
        return (
          <>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => setAction({ kind: "restore", course })}
            >
              Restore to catalogue
            </Button>
            {moreMenu}
          </>
        );
      default:
        return (
          <>
            {unpublished ? (
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => setAction({ kind: "publish", course })}
              >
                Republish
              </Button>
            ) : (
              <Button variant="secondary" icon="check" onClick={publish}>
                Publish anyway
              </Button>
            )}
            {moreMenu}
          </>
        );
    }
  })();

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
          course.status === "in_review" ? "Course review" : "Course details"
        }
        eyebrowTone="purple"
        title={course.title}
        description={course.promise || "No promise written yet."}
        meta={
          <>
            <CourseStatusPill course={course} />
            {course.featured && course.status === "published" && (
              <Badge tone="sun" dot>
                Featured
              </Badge>
            )}
            {cat && <Badge tone="neutral">{cat.name}</Badge>}
            <Badge tone="neutral">{course.level}</Badge>
            <Badge tone="neutral">{course.language}</Badge>
          </>
        }
        actions={actions}
      />
      <div ref={headActionsRef} aria-hidden className="-mt-5 mb-5 h-px sm:hidden" />

      {course.status === "rejected" && course.reviewNote && (
        <div className="mb-6 rounded-card bg-[#ffe1d4] px-5 py-4 text-[#8a2600]">
          <p className="text-[13px] font-bold tracking-wide uppercase">
            {unpublished
              ? `Unpublished ${timeAgo(course.updatedAt)} · ${plural(course.learners, "learner")} keep access`
              : `Sent back ${timeAgo(course.updatedAt)}`}
          </p>
          <p className="mt-1 text-[15px] font-semibold">
            “{course.reviewNote}”
          </p>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 md:space-y-6 xl:col-span-2">
          <Card padding="none" className="overflow-hidden">
            <div
              className={clsx("relative aspect-[16/7]", toneBg[course.tone])}
            >
              <Image
                src={cropSrc(course.thumbnail, 7 / 16)}
                alt={`Cover image for ${course.title}`}
                fill
                sizes="(min-width: 1280px) 60vw, (min-width: 1024px) 70vw, 100vw"
                className="object-cover"
                preload
              />
            </div>
            <div className="p-5 md:p-6">
              <h2 className="t-app-h2">About the course</h2>
              <p className="mt-3 t-body text-ink/80">
                {course.description || "No description yet."}
              </p>
              {course.outcomes.length > 0 && (
                <>
                  <h3 className="mt-6 t-app-h3">Learners will be able to</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {course.outcomes.map((o) => (
                      <li
                        key={o}
                        className="flex gap-2 text-[14px] leading-snug"
                      >
                        <Icon
                          name="check"
                          className="mt-0.5 size-4 shrink-0 text-green"
                          strokeWidth={2.6}
                        />
                        {o}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {course.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {course.tags.map((t) => (
                    <Badge key={t} tone="neutral" size="sm">
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card as="section" aria-labelledby="curr-title">
            <CardHeader
              id="curr-title"
              title="Curriculum"
              description={`${plural(stats.modules, "module")} · ${plural(stats.videos, "video")} · ${plural(stats.quizzes, "test")} · ${plural(stats.resources, "resource")} · ${formatDuration(stats.totalSec, "long")}`}
              action={
                mods.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
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
            />
            {mods.length ? (
              <ol className="space-y-3">
                {mods.map((m, mi) => {
                  const open = isOpen(m.id, mi);
                  const secs = m.items.reduce(
                    (s, it) =>
                      s + (it.type === "video" ? it.lesson.durationSec : 0),
                    0,
                  );
                  return (
                    <li
                      key={m.id}
                      className="overflow-hidden rounded-card bg-cream"
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenMods((s) => ({ ...s, [m.id]: !open }))
                        }
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hf:bg-butter/50"
                      >
                        <span className="font-display text-[22px] leading-none font-black text-ink/35">
                          {pad2(m.position)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-bold">
                            {m.title}
                          </span>
                          <span className="block text-[13px] font-medium text-ink/55">
                            {plural(m.items.length, "item")} ·{" "}
                            {formatDuration(secs)}
                          </span>
                        </span>
                        <Icon
                          name="chevron-down"
                          className={clsx(
                            "size-5 shrink-0 transition-transform duration-200",
                            open && "rotate-180",
                          )}
                        />
                      </button>
                      {open && (
                        <ul className="app-fade space-y-1 px-2 pb-2">
                          {m.items.length === 0 && (
                            <li className="px-3 py-2 text-[14px] text-ink/55">
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
                              className="scroll-mt-24 rounded-tag bg-white"
                            >
                            <div className="relative flex items-start gap-3 px-3 py-2.5 coarse:min-h-12">
                              <Icon
                                name={ITEM_ICON[it.type]}
                                className={clsx(
                                  "mt-px size-[18px] shrink-0",
                                  it.type === "quiz"
                                    ? "text-purple"
                                    : it.type === "resource"
                                      ? "text-tangerine"
                                      : "text-blue",
                                )}
                              />
                              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                                <Link
                                  href={`/learn/${course.slug}/${it.id}`}
                                  className={clsx("max-w-full min-w-0 text-[14px] font-semibold break-words underline-offset-2 hf:underline", STRETCH)}
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
                                    <Badge tone="mint" size="sm">
                                      Free preview
                                    </Badge>
                                  )}
                                {it.type === "video" &&
                                  !it.lesson.hasCaptions && (
                                    <Badge tone="flame" size="sm">
                                      No captions
                                    </Badge>
                                  )}
                                {it.type === "quiz" && (
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    {it.quiz.isGating && (
                                      <Badge tone="lilac" size="sm">
                                        <Icon name="lock" className="size-3" />{" "}
                                        Gates next
                                      </Badge>
                                    )}
                                    {problems.length > 0 && (
                                      <Badge tone="flame" size="sm">
                                        {plural(problems.length, "issue")}
                                      </Badge>
                                    )}
                                    <span className="text-[12.5px] font-semibold text-ink/55">
                                      {plural(
                                        it.quiz.questions.length,
                                        "question",
                                      )}{" "}
                                      · pass {it.quiz.passPercentage}%
                                    </span>
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
                                      className="hit relative z-[1] inline-flex h-7 items-center gap-1 rounded-full bg-cream px-2.5 text-[12.5px] font-bold transition-colors hf:bg-butter coarse:h-9 coarse:px-3.5"
                                    >
                                      {quizOpen ? "Hide answers" : "Check answers"}
                                      <Icon
                                        name="chevron-down"
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
                                <span className="mt-0.5 shrink-0 text-[12.5px] font-semibold text-ink/55 uppercase">
                                  {it.resource.fileType}
                                </span>
                              )}
                              {it.type === "video" && (
                                <span className="mt-0.5 w-12 shrink-0 text-right text-[12.5px] font-semibold whitespace-nowrap text-ink/55 tabular-nums">
                                  {formatDuration(
                                    it.lesson.durationSec,
                                    "clock",
                                  )}
                                </span>
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
                art="buddy"
                title="No lessons yet."
                body="The tutor hasn't added anything to this course."
              />
            )}
          </Card>
        </div>

        {/* md–lg: full-width cards, each laid out in two columns inside (no ragged
            half-empty columns whatever the checklist's height); xl: one column
            beside the curriculum */}
        <div className="grid min-w-0 content-start items-start gap-4 md:gap-6">
          <Card
            as="section"
            tone={passed === checks.length ? "mint" : "butter"}
            aria-labelledby="check-title"
          >
            <CardHeader
              id="check-title"
              title="Review checklist"
              description={`${passed} of ${checks.length} automatic checks pass.`}
            />
            <ul className="grid gap-3 md:grid-cols-2 md:gap-x-8 xl:grid-cols-1">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span
                    className={clsx(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                      c.ok ? "bg-green text-white" : "bg-flame text-white",
                    )}
                    aria-hidden
                  >
                    <Icon
                      name={c.ok ? "check" : "x"}
                      className="size-3.5"
                      strokeWidth={3}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold">
                      {c.label}
                      <span className="sr-only">
                        {c.ok ? ": passes" : ": needs work"}
                      </span>
                    </p>
                    <p className="mt-0.5 t-small break-words opacity-75">
                      {c.detail}
                    </p>
                    {!c.ok && c.issues && c.issues.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {(showAll[c.id] ? c.issues : c.issues.slice(0, 5)).map(
                          (x) => (
                            <li key={x.itemId}>
                              <button
                                type="button"
                                onClick={() => showItem(x.moduleId, x.itemId)}
                                className="text-left text-[13px] font-bold break-words underline underline-offset-2"
                              >
                                {x.label}
                              </button>
                            </li>
                          ),
                        )}
                        {c.issues.length > 5 && !showAll[c.id] && (
                          <li>
                            <button
                              type="button"
                              onClick={() =>
                                setShowAll((s) => ({ ...s, [c.id]: true }))
                              }
                              className="text-left text-[13px] font-semibold opacity-75 underline-offset-2 hf:underline"
                            >
                              and {c.issues.length - 5} more
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {reviewing && (
              <div className="mt-5 rounded-tag bg-white/70 p-3">
                <Checkbox
                  label="I watched the free preview"
                  description="Sound, picture and pace feel right for a first impression. We remind you before publishing if this isn’t ticked."
                  checked={watched}
                  onChange={(e) => setWatched(e.target.checked)}
                />
                {previewHref && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="play"
                    href={previewHref}
                    className="mt-3 max-w-full"
                  >
                    <span className="truncate">{previewLabel}</span>
                  </Button>
                )}
              </div>
            )}
            {course.status === "in_review" && (
              <div ref={checklistActionsRef} className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={allPass ? "success" : "secondary"}
                  icon="check"
                  onClick={publish}
                >
                  {allPass ? "Publish course" : "Publish…"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAction({ kind: "send_back", course })}
                >
                  Send back
                </Button>
              </div>
            )}
          </Card>

          <Card as="section" aria-labelledby="tutor-title">
            <CardHeader id="tutor-title" as="h3" title="Tutor" />
            {tutorUser ? (
              <div className="md:grid md:grid-cols-2 md:gap-x-8 xl:block">
                <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={tutorUser.name}
                    src={tutorUser.avatar}
                    tone={tutorUser.tone}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${tutorUser.id}`}
                      className="t-app-h3 underline-offset-2 hf:underline"
                    >
                      {tutorUser.name}
                    </Link>
                    <p className="t-small text-ink/60">
                      {tutor?.headline ?? tutorUser.city}
                    </p>
                    {tutor && tutor.rating > 0 && (
                      <Rating
                        value={tutor.rating}
                        count={tutor.reviewCount}
                        size="sm"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 max-md:hidden xl:hidden">
                  {tutorActions}
                </div>
                </div>
                <DescriptionList
                  className="mt-4 md:mt-0 xl:mt-4"
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
                <div className="flex flex-wrap gap-2 pt-5 md:hidden xl:flex">
                  {tutorActions}
                </div>
              </div>
            ) : (
              <p className="t-small text-ink/60">Tutor account not found.</p>
            )}
          </Card>

          <Card
            as="section"
            aria-labelledby="details-title"
          >
            <CardHeader id="details-title" as="h3" title="Price and details" />
            <div className="md:grid md:grid-cols-2 md:gap-x-8 xl:block">
            <DescriptionList
              items={[
                {
                  label: "Price",
                  value: (
                    <span>
                      {formatINR(course.price)}
                      {course.compareAtPrice && (
                        <span className="ml-1.5 text-ink/45 line-through">
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
            <div className="min-w-0">
            <div className="mt-5 border-t border-ink/[0.07] pt-4 md:mt-0 md:border-t-0 md:pt-0 xl:mt-5 xl:border-t xl:pt-4">
              <CategoryMover key={course.categoryId} course={course} />
            </div>
            <div className="mt-4 border-t border-ink/[0.07] pt-4">
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
          </Card>
        </div>
      </div>

      {course.status === "in_review" && (
        <StickyActionBar
          show={actionsAway}
          label="Review decision"
          context={
            <span className="sr-only">
              {passed} of {checks.length} checks pass
            </span>
          }
        >
          {moreMenu}
          <Button
            variant="secondary"
            className="h-12 px-4!"
            onClick={() => setAction({ kind: "send_back", course })}
          >
            Send back
          </Button>
          <Button
            variant={allPass ? "success" : "primary"}
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
    <div id={id} className="app-fade border-t border-ink/[0.06] px-3 pt-3 pb-3.5">
      <p className="text-[12.5px] font-semibold text-ink/55">
        Answer key, admins only. Learners never see the correct answers before
        they submit.
        {quiz.maxAttempts > 0
          ? ` ${plural(quiz.maxAttempts, "attempt")} allowed.`
          : " Unlimited attempts."}
        {quiz.timeLimitMin ? ` ${quiz.timeLimitMin} min limit.` : ""}
      </p>
      {quiz.questions.length === 0 ? (
        <p className="mt-2 rounded-tag bg-[#ffe1d4] p-2.5 text-[13px] font-bold text-[#7a2200]">
          This test has no questions yet.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {quiz.questions.map((q, i) => {
            const problem = questionProblem(q);
            return (
              <li
                key={q.id}
                className={clsx(
                  "rounded-tag p-3",
                  problem ? "bg-[#ffe1d4]" : "bg-cream",
                )}
              >
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[13px] font-black text-ink/45">
                    Q{i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-bold">
                    {q.text}
                  </span>
                  <span className="basis-full text-[12px] font-semibold text-ink/50 sm:basis-auto">
                    {Q_TYPE[q.type]} · {plural(q.points, "point")}
                  </span>
                </p>
                {problem && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#9a2c00]">
                    <Icon name="alert" className="size-4" />
                    {problem}
                  </p>
                )}
                {q.type === "short" ? (
                  q.acceptedAnswers?.length ? (
                    <p className="mt-2 text-[13px]">
                      <span className="font-semibold text-ink/60">Accepted: </span>
                      {q.acceptedAnswers.map((a, j) => (
                        <span key={a}>
                          {j > 0 && ", "}
                          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[12.5px] font-bold">
                            {a}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : null
                ) : (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={clsx(
                          "flex items-start gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px]",
                          o.isCorrect ? "bg-mint font-bold" : "bg-white/80",
                        )}
                      >
                        <Icon
                          name={o.isCorrect ? "check-circle" : "x"}
                          className={clsx(
                            "mt-px size-4 shrink-0",
                            o.isCorrect ? "text-[#00813a]" : "text-ink/30",
                          )}
                          strokeWidth={2.4}
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
                  <p className="mt-2 text-[12.5px] text-ink/65">
                    <span className="font-bold">Why: </span>
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
