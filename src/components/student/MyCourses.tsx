"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  CourseCard,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  useIsPhone,
  SearchInput,
  Segmented,
  Select,
  TabPanel,
  Tabs,
  toast,
  type MenuItem,
} from "@/components/app";
import { Tag } from "@/components/decor/Bits";
import { cropSrc } from "@/lib/img";
import { toneBg } from "@/lib/landing-data";
import { useDb, demo } from "@/lib/demo/store";
import {
  formatDate,
  formatDuration,
  getCertificates,
  getCourseCard,
  getItem,
  getNotes,
  itemTitle,
  plural,
  timeAgo,
  type EnrolledCourse,
} from "@/lib/mock";
import {
  courseState,
  STATE_META,
  type CourseState,
  getMyCourses,
} from "./data";
import { Hydrated, ListPageSkeleton } from "./Hydrated";
import { rescueFocus } from "./hooks";
import { BADGE_SM, TABS_GRID_SM } from "./bits";
import { useLocalPref, useStudentId } from "./prefs";
import { ReviewDialog } from "./ReviewDialog";

export type CourseFilter = "all" | "in-progress" | "completed" | "not-started";
export type CourseSortKey = "recent" | "progress" | "title" | "enrolled";

const FILTER_STATE: Record<Exclude<CourseFilter, "all">, CourseState> = {
  "in-progress": "in_progress",
  completed: "completed",
  "not-started": "not_started",
};
const SORTS: { value: CourseSortKey; label: string }[] = [
  { value: "recent", label: "Recently opened" },
  { value: "progress", label: "Most progress" },
  { value: "enrolled", label: "Newest enrolment" },
  { value: "title", label: "Title A–Z" },
];
const VIEW_KEY = "tm-student-courses-view";
const VIEWS = ["list", "grid"] as const;

const HEADER = {
  eyebrow: "Student space",
  eyebrowTone: "hotpink" as const,
  title: "My courses.",
  description: "Everything you've enrolled in, with exactly where you stopped.",
  breadcrumbs: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My courses" },
  ],
};

type Props = {
  initialFilter: CourseFilter;
  initialQuery: string;
  initialSort: CourseSortKey;
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function MyCoursesFallback() {
  return (
    <ListPageSkeleton
      toolbar={<ToolbarSkeleton />}
      header={
        <PageHeader
          {...HEADER}
          meta={<span className="skeleton block h-7 w-56 rounded-full" />}
          actions={
            <Button href="/courses" variant="accent" icon="plus">
              Find a new course
            </Button>
          }
        />
      }
    />
  );
}

export function MyCourses(props: Props) {
  return (
    <Hydrated fallback={<MyCoursesFallback />}>
      <MyCoursesInner {...props} />
    </Hydrated>
  );
}

function MyCoursesInner({ initialFilter, initialQuery, initialSort }: Props) {
  const db = useDb();
  const uid = useStudentId();
  const router = useTransitionRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<CourseFilter>(initialFilter);
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<CourseSortKey>(initialSort);
  const [pickedView, changeView] = useLocalPref(VIEW_KEY, "list", VIEWS);
  // phones always get the compact list (S-04): a 1-up image grid is three screens for five courses
  const phone = useIsPhone();
  const view = phone ? "list" : pickedView;

  // keep the URL shareable (query-only changes are instant, no curtain)
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("status", filter);
    if (q.trim()) p.set("q", q.trim());
    if (sort !== "recent") p.set("sort", sort);
    const qs = p.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    const t = setTimeout(() => {
      if (window.location.pathname + window.location.search !== next)
        window.history.replaceState(window.history.state, "", next);
    }, 250);
    return () => clearTimeout(t);
  }, [filter, q, sort, pathname]);

  const all = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const certs = useMemo(
    () => new Map(getCertificates(uid, db).map((c) => [c.courseId, c])),
    [uid, db],
  );
  const counts = useMemo(() => {
    const c = {
      all: all.length,
      "in-progress": 0,
      completed: 0,
      "not-started": 0,
    } as Record<CourseFilter, number>;
    for (const e of all) {
      const s = courseState(e.progress);
      c[
        s === "in_progress"
          ? "in-progress"
          : s === "completed"
            ? "completed"
            : "not-started"
      ]++;
    }
    return c;
  }, [all]);

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter((e) => {
      if (filter !== "all" && courseState(e.progress) !== FILTER_STATE[filter])
        return false;
      if (!words.length) return true;
      const hay =
        `${e.course.title} ${e.tutor?.name ?? ""} ${e.course.tags.join(" ")} ${db.categories.find((c) => c.id === e.course.categoryId)?.name ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const recent = (e: EnrolledCourse) =>
      e.progress.lastActivityAt ?? e.enrollment.createdAt;
    list.sort((a, b) =>
      sort === "progress"
        ? b.progress.percent - a.progress.percent ||
          recent(b).localeCompare(recent(a))
        : sort === "title"
          ? a.course.title.localeCompare(b.course.title)
          : sort === "enrolled"
            ? b.enrollment.createdAt.localeCompare(a.enrollment.createdAt)
            : recent(b).localeCompare(recent(a)),
    );
    return list;
  }, [all, filter, q, sort, db.categories]);

  const leftSec = useMemo(() => {
    let s = 0;
    for (const e of all) {
      const done = new Set(e.progress.completedItemIds);
      for (const m of db.curricula[e.course.id] ?? [])
        for (const it of m.items)
          if (it.type === "video" && !done.has(it.id))
            s += it.lesson.durationSec;
    }
    return s;
  }, [all, db.curricula]);

  const claim = (e: EnrolledCourse) => {
    const cert = demo.issueCertificate(uid, e.course.id);
    if (cert)
      toast({
        title: "Certificate issued",
        description: `${e.course.title} · ${cert.code}`,
        tone: "success",
        action: {
          label: "View",
          onClick: () => router.push(`/certificates/${cert.code}`),
        },
      });
    else
      toast.error("Not quite yet", {
        description: "Finish every lesson and quiz first.",
      });
  };

  return (
    <div className="app-enter">
      <PageHeader
        {...HEADER}
        meta={
          all.length ? (
            <>
              <Badge tone="white">{plural(all.length, "course")}</Badge>
              <Badge tone="white">
                <Icon name="clock" className="size-3.5" />{" "}
                {formatDuration(leftSec)} of video left
              </Badge>
            </>
          ) : undefined
        }
        actions={
          // the empty state below carries the only "browse" CTA for brand-new learners
          all.length ? (
            <Button href="/courses" variant="accent" icon="plus">
              Find a new course
            </Button>
          ) : undefined
        }
      />

      {all.length === 0 ? (
        <Card padding="none">
          <EmptyState
            art="tami"
            tone="blush"
            title="No courses yet. Your first rabbit hole awaits."
            body="Every course starts with a free lesson, so you can try before you buy."
            action={
              <Button href="/courses" variant="accent" iconRight="arrow-right">
                Browse courses
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Tabs keep their own row until everything fits on one line (they are the page's main filter). */}
          <div className="flex flex-col gap-3 min-[1440px]:flex-row min-[1440px]:items-center min-[1440px]:justify-between">
            <Tabs
              label="Filter by status"
              idBase="my-courses"
              className={clsx(TABS_GRID_SM, "min-[1440px]:shrink-0")}
              value={filter}
              onChange={(v) => setFilter(v as CourseFilter)}
              items={[
                { id: "all", label: "All", count: counts.all },
                {
                  id: "in-progress",
                  label: "In progress",
                  count: counts["in-progress"],
                },
                {
                  id: "completed",
                  label: "Completed",
                  count: counts.completed,
                },
                {
                  id: "not-started",
                  label: "Not started",
                  count: counts["not-started"],
                },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2 min-[1440px]:min-w-0 min-[1440px]:flex-1 min-[1440px]:justify-end sm:flex-nowrap">
              <div className="w-full min-w-0 min-[1440px]:max-w-[280px] sm:w-auto sm:flex-1">
                <SearchInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onClear={() => setQ("")}
                  placeholder="Search my courses"
                  aria-label="Search my courses"
                />
              </div>
              <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                <Select
                  aria-label="Sort courses"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as CourseSortKey)}
                  options={SORTS}
                />
              </div>
              <Segmented
                className="max-sm:hidden"
                label="Layout"
                value={view}
                onChange={changeView}
                options={[
                  {
                    value: "list",
                    label: <Icon name="menu" className="size-4" />,
                    ariaLabel: "List view",
                  },
                  {
                    value: "grid",
                    label: <Icon name="grid" className="size-4" />,
                    ariaLabel: "Grid view",
                  },
                ]}
              />
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {plural(rows.length, "course")} shown
          </p>

          <TabPanel
            id={filter}
            active={filter}
            idBase="my-courses"
            className="mt-5"
          >
            <h2 className="sr-only">Your enrolled courses</h2>
            {rows.length === 0 ? (
              <Card padding="none">
                <EmptyState
                  compact
                  art="buddy"
                  tone="cyan"
                  title={
                    q
                      ? `Nothing matches “${q}”.`
                      : `No ${filter === "completed" ? "completed" : filter === "not-started" ? "unstarted" : "in-progress"} courses.`
                  }
                  body={
                    q
                      ? "Try a course name, a tutor or a topic."
                      : "Switch the filter to see the rest of your courses."
                  }
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setQ("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              </Card>
            ) : view === "grid" ? (
              <ul className="app-fade grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((e, i) => (
                  <CourseTile
                    key={e.course.id}
                    e={e}
                    priority={i < 3}
                    certCode={certs.get(e.course.id)?.code}
                    onClaim={() => claim(e)}
                  />
                ))}
              </ul>
            ) : (
              // rows lay out on the LIST's width (container query), so the sidebar never squeezes the text column
              <ul className="app-fade @container space-y-3">
                {rows.map((e) => (
                  <CourseRow
                    key={e.course.id}
                    e={e}
                    certCode={certs.get(e.course.id)?.code}
                    onClaim={() => claim(e)}
                  />
                ))}
              </ul>
            )}
          </TabPanel>
        </>
      )}
    </div>
  );
}

/** Everything a course row or grid tile needs: state, labels, the More menu and the claim/review focus handling. */
function useCourseActions(
  e: EnrolledCourse,
  certCode: string | undefined,
  onClaim: () => void,
) {
  const db = useDb();
  const uid = useStudentId();
  const rowRef = useRef<HTMLLIElement>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const { course, progress, enrollment, tutor } = e;
  const review = db.reviews.find(
    (r) => r.userId === uid && r.courseId === course.id,
  );
  const notes = getNotes(uid, course.id, db).length;
  // you can rate a course once you've actually watched something
  const canRate = progress.completed > 0;
  const state = courseState(progress);
  const meta = STATE_META[state];
  const card = getCourseCard(course.id, db);
  const ctx = progress.resumeItemId
    ? getItem(course.id, progress.resumeItemId, db)
    : null;
  const href = `/learn/${course.slug}${ctx ? `/${ctx.item.id}` : ""}`;
  const archived = course.status === "archived";
  const cta =
    state === "completed"
      ? "Rewatch"
      : state === "not_started"
        ? "Start"
        : "Continue";

  // the claim button and "Rate it" disappear once used: hand focus to what replaced them
  const claimHere = () => {
    onClaim();
    rescueFocus(() =>
      [
        ...(rowRef.current?.querySelectorAll<HTMLElement>(
          'a[href^="/certificates/"]',
        ) ?? []),
      ].find((a) => a.offsetParent),
    );
  };
  const afterReview = () =>
    rescueFocus(() =>
      [
        ...(rowRef.current?.querySelectorAll<HTMLElement>(
          'button[aria-haspopup="menu"]',
        ) ?? []),
      ].find((b) => b.offsetParent),
    );

  const items: MenuItem[] = [
    { label: "Course page", icon: "book", href: `/courses/${course.slug}` },
    ...(tutor?.slug
      ? [
          {
            label: `About ${tutor.name.split(" ")[0]}`,
            icon: "user" as const,
            href: `/tutors/${tutor.slug}`,
          },
        ]
      : []),
    { divider: true },
    state === "completed"
      ? certCode
        ? {
            label: "View certificate",
            icon: "award" as const,
            href: `/certificates/${certCode}`,
          }
        : {
            label: "Claim certificate",
            icon: "award" as const,
            onSelect: onClaim,
          }
      : {
          label: "Certificate at 100%",
          icon: "lock" as const,
          disabled: true,
          hint: `${progress.percent}%`,
        },
    canRate
      ? {
          label: review
            ? `Edit your review (${review.rating}★)`
            : "Rate this course",
          icon: "star" as const,
          onSelect: () => setRateOpen(true),
        }
      : { label: "Rate after a lesson", icon: "star" as const, disabled: true },
    ...(enrollment.orderId
      ? [
          {
            label: "Order details",
            icon: "receipt" as const,
            href: `/dashboard/orders?order=${enrollment.orderId}`,
          },
        ]
      : []),
  ];

  return {
    db,
    uid,
    rowRef,
    rateOpen,
    setRateOpen,
    review,
    notes,
    canRate,
    state,
    meta,
    card,
    ctx,
    href,
    archived,
    cta,
    claimHere,
    afterReview,
    items,
  };
}

/** Grid view: the progress card plus a compact action strip (last opened, certificate, rating, More). */
function CourseTile({
  e,
  certCode,
  onClaim,
  priority,
}: {
  e: EnrolledCourse;
  certCode?: string;
  onClaim: () => void;
  priority?: boolean;
}) {
  const {
    uid,
    rowRef,
    rateOpen,
    setRateOpen,
    review,
    state,
    card,
    claimHere,
    afterReview,
    items,
  } = useCourseActions(e, certCode, onClaim);
  const { course, progress } = e;
  if (!card) return null;
  return (
    <li ref={rowRef} className="flex min-w-0 flex-col gap-2">
      <CourseCard
        data={card}
        variant="progress"
        progress={progress}
        priority={priority}
        ctaLabel={state === "in_progress" ? "Continue" : undefined}
        statusLabel={
          state === "in_progress" && progress.percent === 0
            ? "Just started"
            : undefined
        }
        className="h-auto! flex-1"
      />
      <div className="flex flex-col gap-1 rounded-card bg-white py-1.5 pr-1.5 pl-4 shadow-soft">
        <div className="flex min-h-11 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink/70">
            {progress.lastActivityAt
              ? `Last opened ${timeAgo(progress.lastActivityAt)}`
              : "Not opened yet"}
          </p>
          <DropdownMenu
            label={`More for ${course.title}`}
            trigger={<Icon name="more" className="size-5" />}
            triggerClassName="tap grid size-11 place-items-center rounded-full bg-cream text-ink hf:bg-butter"
            items={items}
            width={240}
            align="end"
          />
        </div>
        {/* every tile gets this second line, so tiles in a row keep the same card and strip heights */}
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/[0.07] pt-1.5 pb-1">
          {state !== "completed" ? (
            <p className="inline-flex min-h-8 items-center gap-1 text-[13px] font-semibold text-ink/65">
              <Icon
                name={course.hasCertificate === false ? "info" : "lock"}
                className="size-4"
              />
              {course.hasCertificate === false
                ? "No certificate for this course"
                : `Certificate at 100% · ${progress.percent}% now`}
            </p>
          ) : (
            <>
              {certCode ? (
                <Link
                  href={`/certificates/${certCode}`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-ink/75 hf:text-ink"
                >
                  <Icon name="award" className="size-4" /> Certificate
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={claimHere}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-berry hf:underline"
                >
                  <Icon name="award" className="size-4" /> Claim certificate
                </button>
              )}
              {!review && (
                <button
                  type="button"
                  onClick={() => setRateOpen(true)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-ink/75 hf:text-ink"
                >
                  <Icon name="star" className="size-4" /> Rate it
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <ReviewDialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        onSaved={afterReview}
        uid={uid}
        course={course}
        existing={review}
      />
    </li>
  );
}

function CourseRow({
  e,
  certCode,
  onClaim,
}: {
  e: EnrolledCourse;
  certCode?: string;
  onClaim: () => void;
}) {
  const {
    uid,
    rowRef,
    rateOpen,
    setRateOpen,
    review,
    notes,
    state,
    meta,
    card,
    ctx,
    href,
    archived,
    cta,
    claimHere,
    afterReview,
    items,
  } = useCourseActions(e, certCode, onClaim);
  const { course, progress, enrollment, tutor } = e;
  const metaBits = [
    progress.lastActivityAt
      ? `Last opened ${timeAgo(progress.lastActivityAt)}`
      : "Not opened yet",
    `Enrolled ${formatDate(enrollment.createdAt)}`,
    enrollment.completedAt && `Finished ${formatDate(enrollment.completedAt)}`,
    notes > 0 && plural(notes, "note"),
  ].filter((x): x is string => !!x);

  return (
    <li ref={rowRef}>
      {/* Phones (list narrower than 560px): a compact row card (S-04): 16:10 thumb beside a
          2-line title, then progress, up next and one row of 44px actions. */}
      <article className="rounded-card bg-white p-3 shadow-soft @[560px]:hidden">
        <div className="flex items-start gap-3">
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden
            className={clsx(
              "relative block aspect-[16/10] w-[104px] shrink-0 overflow-hidden rounded-[12px]",
              toneBg[course.tone],
            )}
          >
            <Image
              src={cropSrc(course.thumbnail, 10 / 16)}
              alt=""
              fill
              sizes="104px"
              className="object-cover"
            />
            {state === "completed" && (
              <span className="absolute inset-x-0 bottom-0 grid h-5 place-items-center bg-green text-[11px] font-extrabold tracking-[0.04em] uppercase">
                Done
              </span>
            )}
          </Link>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="line-clamp-2 text-[16px] leading-[1.18] font-bold tracking-[-0.01em]">
              <Link href={`/courses/${course.slug}`}>{course.title}</Link>
            </h3>
            <p className="mt-1 truncate text-[13px] font-semibold text-ink/65">
              {tutor?.name ?? "Tamada tutor"} ·{" "}
              {progress.lastActivityAt
                ? `opened ${timeAgo(progress.lastActivityAt)}`
                : "not opened yet"}
            </p>
          </div>
        </div>
        {(state !== "in_progress" ||
          enrollment.source === "admin_grant" ||
          review ||
          archived) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {state !== "in_progress" && (
              <Badge tone={meta.tone} dot size="sm" className={BADGE_SM}>
                {meta.label}
              </Badge>
            )}
            {enrollment.source === "admin_grant" && (
              <Badge size="sm" tone="lilac" className={BADGE_SM}>
                <Icon name="sparkles" className="size-3" /> Gift from the team
              </Badge>
            )}
            {review && (
              <Badge size="sm" tone="sun" className={BADGE_SM}>
                <Icon name="star" className="size-3" /> You rated{" "}
                {review.rating}
              </Badge>
            )}
            {archived && (
              <Badge size="sm" tone="butter" className={BADGE_SM}>
                Retired · still yours
              </Badge>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            value={progress.percent}
            size="sm"
            tone={state === "completed" ? "green" : "hotpink"}
            label={`${course.title} progress`}
          />
          <span className="shrink-0 text-[13px] font-bold tabular-nums">
            {progress.percent}%{" "}
            <span className="font-semibold text-ink/65">
              · {progress.completed}/{progress.total}
            </span>
          </span>
        </div>
        {ctx && state !== "completed" && (
          <p className="mt-2 truncate text-[13px] font-semibold text-ink/80">
            <span className="text-ink/65">
              {state === "not_started" ? "Starts with" : "Up next"}:
            </span>{" "}
            {itemTitle(ctx.item)}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Button
            href={href}
            variant={state === "completed" ? "secondary" : "primary"}
            iconRight="arrow-right"
            aria-label={`${cta} ${course.title}`}
            className={clsx(
              "flex-1",
              state === "completed" && "bg-cream! shadow-none!",
            )}
          >
            {cta}
          </Button>
          <DropdownMenu
            label={`More for ${course.title}`}
            trigger={<Icon name="more" className="size-5" />}
            triggerClassName="tap grid size-11 place-items-center rounded-full bg-cream text-ink"
            items={items}
            width={240}
          />
        </div>
        {state === "completed" && (certCode || !review) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {certCode ? (
              <Link
                href={`/certificates/${certCode}`}
                className="tap inline-flex h-11 items-center gap-1.5 rounded-full bg-mint px-4 text-[14px] font-bold"
              >
                <Icon name="award" className="size-4" /> Certificate
              </Link>
            ) : (
              <button
                type="button"
                onClick={claimHere}
                className="tap inline-flex h-11 items-center gap-1.5 rounded-full bg-mint px-4 text-[14px] font-bold"
              >
                <Icon name="award" className="size-4" /> Claim certificate
              </button>
            )}
            {!review && (
              <button
                type="button"
                onClick={() => setRateOpen(true)}
                className="tap inline-flex h-11 items-center gap-1.5 rounded-full bg-butter px-4 text-[14px] font-bold"
              >
                <Icon name="star" className="size-4" /> Rate it
              </button>
            )}
          </div>
        )}
      </article>

      {/* From 560px of list width:
          @560 (tablet, 1024)   thumbnail beside the text, actions on a footer line
          @860 (wide)           thumbnail | text | actions column */}
      <Card
        padding="sm"
        className="group grid gap-4 @max-[560px]:hidden @[560px]:grid-cols-[176px_minmax(0,1fr)] @[560px]:gap-x-5 @[560px]:gap-y-3 @[560px]:p-3 @[860px]:grid-cols-[200px_minmax(0,1fr)_auto] @[860px]:items-center @[860px]:pr-5 @[1040px]:grid-cols-[224px_minmax(0,1fr)_auto]"
      >
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={clsx(
            "relative block aspect-video w-full overflow-hidden rounded-img @[560px]:self-start @[860px]:self-center",
            toneBg[course.tone],
          )}
        >
          <Image
            src={cropSrc(course.thumbnail, 9 / 16)}
            alt=""
            fill
            sizes="(min-width: 1440px) 224px, (min-width: 640px) 200px, 92vw"
            className="object-cover"
          />
          {state === "completed" && (
            <span className="absolute top-2.5 left-2.5">
              <Tag tone="green" className="tracking-[0.04em] uppercase">
                <Icon name="check" className="size-3" strokeWidth={3} /> Done
              </Tag>
            </span>
          )}
        </Link>

        <div className="min-w-0 px-1 @[560px]:px-0 @[560px]:py-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={meta.tone} dot size="sm" className={BADGE_SM}>
              {meta.label}
            </Badge>
            {card?.category && (
              <Badge size="sm" tone="neutral" className={BADGE_SM}>
                {card.category.name}
              </Badge>
            )}
            {enrollment.source === "admin_grant" && (
              <Badge size="sm" tone="lilac" className={BADGE_SM}>
                <Icon name="sparkles" className="size-3" /> Gift from the Tamada
                team
              </Badge>
            )}
            {review && (
              <Badge size="sm" tone="sun" className={BADGE_SM}>
                <Icon name="star" className="size-3" /> You rated{" "}
                {review.rating}
              </Badge>
            )}
            {archived && (
              <Badge size="sm" tone="butter" className={BADGE_SM}>
                Retired course · still yours
              </Badge>
            )}
          </div>
          <h3 className="mt-2 font-heading text-[19px] leading-[1.1] font-extrabold tracking-[-0.02em] [font-variation-settings:'opsz'_96] @[560px]:text-[21px]">
            <Link
              href={`/courses/${course.slug}`}
              className="rounded-sm hf:underline hf:decoration-ink/25 hf:underline-offset-4"
            >
              {course.title}
            </Link>
          </h3>
          <p className="mt-1 truncate text-[13.5px] font-semibold text-ink/70">
            {tutor?.name ?? "Tamada tutor"}
            {card &&
              ` · ${card.stats.modules} modules · ${formatDuration(card.stats.totalSec)}`}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar
              value={progress.percent}
              tone={state === "completed" ? "green" : "hotpink"}
              className="max-w-[260px]"
              label={`${course.title} progress`}
            />
            <span className="shrink-0 text-[13px] font-bold">
              {progress.percent}%{" "}
              <span className="font-semibold text-ink/70">
                · {progress.completed}/{progress.total}
              </span>
            </span>
          </div>
          {ctx && state !== "completed" && (
            <p className="mt-2 truncate text-[13px] font-semibold text-ink/80">
              <span className="text-ink/70">
                {state === "not_started" ? "Starts with" : "Up next"}:
              </span>{" "}
              {itemTitle(ctx.item)}
            </p>
          )}
          {/* Each bit carries its own leading dot inside a negative margin and the line clips it:
              a bit that wraps to the start of a line loses its dot, so no "·" ever dangles. */}
          <p className="mt-1.5 overflow-hidden text-[12.5px] font-semibold text-ink/70">
            <span className="-ml-3 flex flex-wrap">
              {metaBits.map((t, i) => (
                <span key={t} className="whitespace-nowrap">
                  <span aria-hidden className="inline-block w-3 text-center">
                    ·
                  </span>
                  {i > 0 && <span className="sr-only">, </span>}
                  {t}
                </span>
              ))}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pb-1 @[560px]:col-span-2 @[560px]:flex-row-reverse @[560px]:justify-between @[560px]:border-t @[560px]:border-ink/[0.07] @[560px]:pt-3 @[860px]:col-span-1 @[860px]:flex-col @[860px]:items-end @[860px]:justify-center @[860px]:border-0 @[860px]:p-0">
          <div className="flex w-full items-center gap-2 @[560px]:w-auto">
            <Button
              href={href}
              variant={state === "completed" ? "secondary" : "primary"}
              size="md"
              iconRight="arrow-right"
              aria-label={`${cta} ${course.title}`}
              className={clsx(
                "flex-1 @[560px]:flex-none",
                state === "completed" && "bg-cream! shadow-none! hf:bg-butter!",
              )}
            >
              {cta}
            </Button>
            <DropdownMenu
              label={`More for ${course.title}`}
              trigger={<Icon name="more" className="size-5" />}
              triggerClassName="tap grid size-11 place-items-center rounded-full bg-cream text-ink hf:bg-butter"
              items={items}
              width={240}
            />
          </div>
          {state === "completed" && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 @[860px]:flex-col @[860px]:items-end @[860px]:gap-y-1">
              {certCode ? (
                <Link
                  href={`/certificates/${certCode}`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-ink/75 hf:text-ink"
                >
                  <Icon name="award" className="size-4" /> Certificate
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={claimHere}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-berry hf:underline"
                >
                  <Icon name="award" className="size-4" /> Claim certificate
                </button>
              )}
              {!review && (
                <button
                  type="button"
                  onClick={() => setRateOpen(true)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm text-[13px] font-bold text-ink/75 hf:text-ink"
                >
                  <Icon name="star" className="size-4" /> Rate it
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
      <ReviewDialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        onSaved={afterReview}
        uid={uid}
        course={course}
        existing={review}
      />
    </li>
  );
}

/**
 * The toolbar as the skeleton draws it, per breakpoint, so the list doesn't jump when the data lands:
 * phones: the 2x2 tab grid (84px), search, then sort + layout; sm to 1439px: a tabs row, then a
 * toolbar row; from 1440px: one row.
 */
function ToolbarSkeleton() {
  return (
    <div
      className="mb-5 flex flex-col gap-3 min-[1440px]:flex-row min-[1440px]:items-center min-[1440px]:justify-between"
      aria-hidden
    >
      <span className="skeleton block h-[84px] w-full rounded-[22px] min-[1440px]:shrink-0 sm:h-11 sm:w-[487px] sm:max-w-full sm:rounded-full" />
      <div className="flex flex-wrap items-center gap-2 min-[1440px]:min-w-0 min-[1440px]:flex-1 min-[1440px]:justify-end sm:flex-nowrap">
        <span className="skeleton block h-11 w-full rounded-full min-[1440px]:max-w-[280px] sm:w-auto sm:flex-1" />
        <span className="skeleton block h-11 min-w-0 flex-1 rounded-full sm:w-52 sm:flex-none" />
        <span className="skeleton block h-11 w-[112px] shrink-0 rounded-full max-sm:hidden" />
      </div>
    </div>
  );
}
