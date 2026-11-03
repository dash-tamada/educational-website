"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Button, DropdownMenu, EmptyState, Icon, PageHeader, SearchInput, Select, Skeleton, TabPanel, Tabs, toast, type MenuItem } from "@/components/app";
import { cropSrc } from "@/lib/img";
import { lessonPoster } from "@/lib/media";
import { useDb, demo } from "@/lib/demo/store";
import { formatDate, formatDuration, getCertificates, getCourseCard, getCurriculum, getItem, getNotes, itemTitle, plural, timeAgo, type EnrolledCourse } from "@/lib/mock";
import { courseState, STATE_META, type CourseState, getMyCourses } from "./data";
import { ContinueHero } from "./ContinueHero";
import { Hydrated } from "./Hydrated";
import { rescueFocus } from "./hooks";
import { SeeAll, idx, timecode } from "./bits";
import { useStudentId } from "./prefs";
import { ReviewDialog } from "./ReviewDialog";

/* =============================================================================
   My courses, v2: one editorial "poster row" per enrolment (a lesson still with
   a mono slate, the course title in Anton, a big percent, the modules as square
   cells, the next step as a ruled row, the red CTA), then a ruled "explore"
   block. With two or more courses, underline status tabs + search + sort sit on
   a hairline toolbar (state mirrored in the URL: ?status=&q=&sort=).
   ============================================================================= */

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
  { value: "enrolled", label: "Newest enrollment" },
  { value: "title", label: "Title A–Z" },
];

const HEADER = {
  eyebrow: "Student space",
  title: (
    <>
      My <em>courses</em>.
    </>
  ),
  description: "Everything you've enrolled in, with exactly where you stopped.",
  breadcrumbs: [{ label: "Dashboard", href: "/dashboard" }, { label: "My courses" }],
};

type Props = {
  initialFilter: CourseFilter;
  initialQuery: string;
  initialSort: CourseSortKey;
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function MyCoursesFallback() {
  return (
    <div aria-busy="true" className="app-fade">
      <span className="sr-only" role="status">
        Loading your data
      </span>
      <PageHeader {...HEADER} rule={false} meta={<Skeleton className="h-4 w-56" />} />
      <div className="grid gap-6 border-t border-line-strong pt-6 lg:grid-cols-12 lg:gap-10" aria-hidden>
        <Skeleton className="aspect-[16/10] lg:col-span-5" />
        <div className="space-y-4 lg:col-span-7">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-8 h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-60" />
        </div>
      </div>
    </div>
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

  // keep the URL shareable (query-only changes are instant, no curtain)
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("status", filter);
    if (q.trim()) p.set("q", q.trim());
    if (sort !== "recent") p.set("sort", sort);
    const qs = p.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    const t = setTimeout(() => {
      if (window.location.pathname + window.location.search !== next) window.history.replaceState(window.history.state, "", next);
    }, 250);
    return () => clearTimeout(t);
  }, [filter, q, sort, pathname]);

  const all = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const certs = useMemo(() => new Map(getCertificates(uid, db).map((c) => [c.courseId, c])), [uid, db]);
  // one course: the toolbar is noise, so filters are off and the poster row is the page
  const tools = all.length > 1;
  const counts = useMemo(() => {
    const c = { all: all.length, "in-progress": 0, completed: 0, "not-started": 0 } as Record<CourseFilter, number>;
    for (const e of all) {
      const s = courseState(e.progress);
      c[s === "in_progress" ? "in-progress" : s === "completed" ? "completed" : "not-started"]++;
    }
    return c;
  }, [all]);

  const rows = useMemo(() => {
    if (!tools) return all;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter((e) => {
      if (filter !== "all" && courseState(e.progress) !== FILTER_STATE[filter]) return false;
      if (!words.length) return true;
      const hay = `${e.course.title} ${e.tutor?.name ?? ""} ${e.course.tags.join(" ")} ${db.categories.find((c) => c.id === e.course.categoryId)?.name ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const recent = (e: EnrolledCourse) => e.progress.lastActivityAt ?? e.enrollment.createdAt;
    list.sort((a, b) =>
      sort === "progress"
        ? b.progress.percent - a.progress.percent || recent(b).localeCompare(recent(a))
        : sort === "title"
          ? a.course.title.localeCompare(b.course.title)
          : sort === "enrolled"
            ? b.enrollment.createdAt.localeCompare(a.enrollment.createdAt)
            : recent(b).localeCompare(recent(a)),
    );
    return list;
  }, [all, tools, filter, q, sort, db.categories]);

  const leftSec = useMemo(() => {
    let s = 0;
    for (const e of all) {
      const done = new Set(e.progress.completedItemIds);
      for (const m of db.curricula[e.course.id] ?? []) for (const it of m.items) if (it.type === "video" && !done.has(it.id)) s += it.lesson.durationSec;
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
        action: { label: "View", onClick: () => router.push(`/certificates/${cert.code}`) },
      });
    else toast.error("Not quite yet", { description: "Finish every lesson and quiz first." });
  };

  return (
    <div className="app-enter">
      <PageHeader
        {...HEADER}
        rule={false}
        meta={
          all.length ? (
            <p className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
              <span className="text-fg">{plural(all.length, "course")}</span>
              <span>{formatDuration(leftSec)} of video left</span>
            </p>
          ) : undefined
        }
      />

      {all.length === 0 ? (
        <ContinueHero mode={{ kind: "new" }} db={db} />
      ) : (
        <>
          {tools && (
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <Tabs
                label="Filter by status"
                idBase="my-courses"
                className="lg:shrink-0"
                value={filter}
                onChange={(v) => setFilter(v as CourseFilter)}
                items={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "in-progress", label: "In progress", count: counts["in-progress"] },
                  { id: "completed", label: "Completed", count: counts.completed },
                  { id: "not-started", label: "Not started", count: counts["not-started"] },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap lg:min-w-0 lg:flex-1 lg:justify-end">
                <div className="w-full min-w-0 sm:w-auto sm:flex-1 lg:max-w-[280px]">
                  <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} placeholder="Search my courses" aria-label="Search my courses" />
                </div>
                <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                  <Select aria-label="Sort courses" value={sort} onChange={(e) => setSort(e.target.value as CourseSortKey)} options={SORTS} />
                </div>
              </div>
            </div>
          )}

          <p className="sr-only" role="status" aria-live="polite">
            {plural(rows.length, "course")} shown
          </p>

          <TabPanel id={tools ? filter : "all"} active={tools ? filter : "all"} idBase="my-courses">
            <h2 className="sr-only">Your enrolled courses</h2>
            {rows.length === 0 ? (
              <div className="border-t border-fg">
                <EmptyState
                  compact
                  art="none"
                  align="start"
                  eyebrow="No match"
                  className="px-0!"
                  title={q ? `Nothing matches “${q}”.` : `No ${filter === "completed" ? "completed" : filter === "not-started" ? "unstarted" : "in-progress"} courses.`}
                  body={q ? "Try a course name, a tutor or a topic." : "Switch the filter to see the rest of your courses."}
                  action={
                    <Button
                      variant="outline"
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
              </div>
            ) : (
              <ul className="app-fade space-y-14 md:space-y-20">
                {rows.map((e, i) => (
                  <CourseRow key={e.course.id} e={e} n={i + 1} priority={i === 0} certCode={certs.get(e.course.id)?.code} onClaim={() => claim(e)} />
                ))}
              </ul>
            )}
          </TabPanel>

          {/* the shelf: one course, done properly */}
          <section aria-labelledby="explore" className="mt-16 grid gap-x-8 gap-y-4 border-t border-fg pt-5 md:mt-20 lg:grid-cols-12">
            <p className="flex items-baseline gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase lg:col-span-3">
              <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-red-deep">{idx(rows.length + 1)}</span>
              Explore
            </p>
            <div className="min-w-0 lg:col-span-9">
              <h2 id="explore" className="max-w-[24ch] t-statement-m text-balance">
                That&apos;s the whole shelf, for now. One course, made <span className="text-red">properly</span>.
              </h2>
              <p className="mt-3 max-w-[56ch] t-small text-muted">New modules land inside the course you already own, free. Read the journal for what we&apos;re testing next.</p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4">
                <SeeAll href="/courses">The course library</SeeAll>
                <SeeAll href="/journal">The journal</SeeAll>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Everything a course row needs: state, labels, the More menu and the claim/review focus handling. */
function useCourseActions(e: EnrolledCourse, certCode: string | undefined, onClaim: () => void) {
  const db = useDb();
  const uid = useStudentId();
  const rowRef = useRef<HTMLLIElement>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const { course, progress, tutor } = e;
  const review = db.reviews.find((r) => r.userId === uid && r.courseId === course.id);
  const notes = getNotes(uid, course.id, db).length;
  const canRate = progress.completed > 0;
  const state = courseState(progress);
  const card = getCourseCard(course.id, db);
  const ctx = progress.resumeItemId ? getItem(course.id, progress.resumeItemId, db) : null;
  const href = `/learn/${course.slug}${ctx ? `/${ctx.item.id}` : ""}`;
  const archived = course.status === "archived";
  const video = ctx?.item.type === "video" ? ctx.item.lesson : null;
  const pos = video ? Math.min(progress.resumePositionSec, video.durationSec) : 0;
  const cta = state === "completed" ? "Rewatch" : state === "not_started" ? "Start the course" : video && pos > 0 ? "Resume lesson" : ctx?.item.type === "quiz" ? "Take the test" : "Continue";

  // the claim button and "Rate it" disappear once used: hand focus to what replaced them
  const claimHere = () => {
    onClaim();
    rescueFocus(() => [...(rowRef.current?.querySelectorAll<HTMLElement>('a[href^="/certificates/"]') ?? [])].find((a) => a.offsetParent));
  };
  const afterReview = () => rescueFocus(() => [...(rowRef.current?.querySelectorAll<HTMLElement>('button[aria-haspopup="menu"]') ?? [])].find((b) => b.offsetParent));

  const items: MenuItem[] = [
    { label: "Course page", icon: "book", href: `/courses/${course.slug}` },
    ...(tutor?.slug ? [{ label: `About ${tutor.name.split(" ")[0]}`, icon: "user" as const, href: `/tutors/${tutor.slug}` }] : []),
    { divider: true },
    state === "completed"
      ? certCode
        ? { label: "View certificate", icon: "award" as const, href: `/certificates/${certCode}` }
        : { label: "Claim certificate", icon: "award" as const, onSelect: onClaim }
      : { label: "Certificate at 100%", icon: "lock" as const, disabled: true, hint: `${progress.percent}%` },
    canRate
      ? { label: review ? `Edit your review (${review.rating}★)` : "Rate this course", icon: "star" as const, onSelect: () => setRateOpen(true) }
      : { label: "Rate after a lesson", icon: "star" as const, disabled: true },
    ...(e.enrollment.orderId ? [{ label: "Order details", icon: "receipt" as const, href: `/dashboard/orders?order=${e.enrollment.orderId}` }] : []),
  ];

  return { db, uid, rowRef, rateOpen, setRateOpen, review, notes, canRate, state, card, ctx, href, archived, cta, video, pos, claimHere, afterReview, items };
}

function CourseRow({ e, n, certCode, onClaim, priority }: { e: EnrolledCourse; n: number; certCode?: string; onClaim: () => void; priority?: boolean }) {
  const { db, uid, rowRef, rateOpen, setRateOpen, review, notes, state, card, ctx, href, archived, cta, video, pos, claimHere, afterReview, items } = useCourseActions(e, certCode, onClaim);
  const { course, progress, enrollment, tutor } = e;
  const modules = getCurriculum(course.id, db);
  const done = new Set(progress.completedItemIds);
  const modsDone = modules.filter((m) => m.items.length && m.items.every((i) => done.has(i.id))).length;
  const currentModule = ctx?.module.position ?? null;
  const poster = lessonPoster(state === "completed" ? 11 : (currentModule ?? 1));
  const lessonNo = ctx ? ctx.module.items.findIndex((x) => x.id === ctx.item.id) + 1 : 0;
  const metaBits = [
    progress.lastActivityAt ? `Opened ${timeAgo(progress.lastActivityAt)}` : "Not opened yet",
    `Enrolled ${formatDate(enrollment.createdAt)}`,
    enrollment.completedAt && `Finished ${formatDate(enrollment.completedAt)}`,
    notes > 0 && plural(notes, "note"),
    enrollment.source === "admin_grant" && "Gift from the team",
    review && `You rated ${review.rating}★`,
    archived && "Retired · still yours",
  ].filter((x): x is string => !!x);

  return (
    <li ref={rowRef} className="border-t border-fg pt-5 md:pt-6">
      {/* slate */}
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] tracking-[0.08em] uppercase md:mb-6">
        <span className="flex items-baseline gap-3">
          <span className="text-red-deep">{idx(n)}</span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className={clsx("size-[6px]", state === "completed" ? "bg-fg" : state === "in_progress" ? "bg-red" : "ring-1 ring-current ring-inset")} />
            {STATE_META[state].label}
          </span>
        </span>
        <span className="text-muted">{card?.category?.name ?? "Course"}</span>
      </div>

      <article className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        {/* poster */}
        <Link href={href} tabIndex={-1} aria-hidden className="group relative block aspect-[16/10] overflow-hidden bg-ink lg:col-span-5 lg:self-start">
          <Image
            src={cropSrc(poster.src, 10 / 16)}
            alt=""
            fill
            preload={priority}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover opacity-85 transition-[scale,opacity] duration-[1.2s] ease-expo group-hf:scale-[1.03] group-hf:opacity-100"
            style={{ objectPosition: poster.pos }}
          />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_11_11/0.55)_0%,rgb(11_11_11/0)_35%,rgb(11_11_11/0)_55%,rgb(11_11_11/0.8)_100%)]" />
          <span className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 font-mono text-[10.5px] tracking-[0.08em] text-cream uppercase">
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-[6px] rounded-full bg-red" />
              {state === "completed" ? "That's a wrap" : ctx ? `M${idx(ctx.module.position)} / ${ctx.item.type === "quiz" ? "Test" : `L${idx(lessonNo)}`}` : "Start"}
            </span>
            <span className="text-cream/70">{idx(currentModule ?? modules.length)} / {idx(modules.length)}</span>
          </span>
          <span className="absolute inset-x-4 bottom-4 flex items-center gap-3 font-mono text-[11px] tracking-[0.06em] text-cream tabular-nums">
            {video ? (
              <>
                <span>{timecode(pos)}</span>
                <span className="relative h-px flex-1 bg-cream/30">
                  <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${(pos / Math.max(1, video.durationSec)) * 100}%` }} />
                </span>
                <span className="text-cream/70">{timecode(video.durationSec)}</span>
              </>
            ) : (
              <span className="uppercase">{card ? `${card.stats.modules} modules · ${formatDuration(card.stats.totalSec)}` : course.title}</span>
            )}
          </span>
          <span className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-red text-white opacity-0 transition-opacity duration-300 group-hf:opacity-100">
            <Icon name="play" className="size-5 translate-x-px" strokeWidth={1.8} />
          </span>
        </Link>

        {/* content */}
        <div className="min-w-0 lg:col-span-7">
          <h3 className="t-display-m text-balance">
            <Link href={`/courses/${course.slug}`} className="transition-colors hf:text-red">
              {course.title}
            </Link>
          </h3>
          <p className="mt-3 t-small text-muted">
            {tutor?.name ?? "Tamada tutor"}
            {card && ` · ${card.stats.modules} modules · ${formatDuration(card.stats.totalSec)}`}
          </p>

          {/* progress: big percent + line */}
          <div className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-5 border-t border-line pt-4">
            <p className="t-display-s text-[clamp(2.25rem,1.6rem+1.8vw,3.5rem)] leading-[0.8] tabular-nums">
              {progress.percent}
              <span className="text-[0.5em]">%</span>
            </p>
            <div className="min-w-0 pb-1">
              <p className="flex justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                <span>
                  {progress.completed} / {progress.total} items
                </span>
                <span>
                  {modsDone} / {modules.length} modules
                </span>
              </p>
              <div role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} className="relative mt-2.5 h-px bg-line-strong">
                <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          </div>

          {/* modules as square cells */}
          <ol aria-label="Modules" className="mt-5 grid grid-cols-[repeat(11,minmax(0,1fr))] border-t border-l border-line-strong" style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}>
            {modules.map((m) => {
              const all = m.items.length > 0 && m.items.every((i) => done.has(i.id));
              const cur = m.position === currentModule && !all;
              return (
                <li
                  key={m.id}
                  title={`Module ${m.position}: ${m.title}${all ? " (done)" : cur ? " (now)" : ""}`}
                  className={clsx("relative grid h-9 place-items-center border-r border-b border-line-strong font-mono text-[10px] tabular-nums", all ? "bg-fg text-surface" : cur ? "text-red-deep" : "text-muted")}
                >
                  {cur && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-red" />}
                  <span className="sr-only">Module </span>
                  {idx(m.position)}
                  <span className="sr-only">{all ? ", done" : cur ? ", current" : ""}</span>
                </li>
              );
            })}
          </ol>

          {/* the next step */}
          {ctx && state !== "completed" && (
            <Link href={href} className="group mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-y border-line py-3.5 transition-colors hf:bg-fg/[0.03] sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
              <span className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase max-sm:col-span-2">{state === "not_started" ? "Starts with" : "Up next"}</span>
              <span className="min-w-0 truncate text-[15.5px] font-medium max-sm:mt-1">{itemTitle(ctx.item)}</span>
              <Icon name="arrow-right" className="size-4 shrink-0 text-muted transition-[translate,color] duration-500 ease-expo group-hf:translate-x-1 group-hf:text-red max-sm:col-start-2 max-sm:row-start-2" strokeWidth={1.7} />
            </Link>
          )}

          {/* actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button href={href} variant={state === "completed" ? "outline" : "red"} icon={state === "completed" ? "refresh" : "play"} aria-label={`${cta}: ${course.title}`} className="max-sm:flex-1">
              {cta}
            </Button>
            {state === "completed" &&
              (certCode ? (
                <Button href={`/certificates/${certCode}`} variant="red" icon="award">
                  Certificate
                </Button>
              ) : (
                <Button variant="red" icon="award" onClick={claimHere}>
                  Claim certificate
                </Button>
              ))}
            {state === "completed" && !review && (
              <Button variant="outline" icon="star" onClick={() => setRateOpen(true)}>
                Rate it
              </Button>
            )}
            <Button href={`/courses/${course.slug}`} variant="outline" className="max-sm:hidden">
              Course page
            </Button>
            <DropdownMenu
              label={`More for ${course.title}`}
              trigger={<Icon name="more" className="size-5" strokeWidth={1.7} />}
              triggerClassName="tap grid size-11 place-items-center text-fg ring-1 ring-inset ring-line-strong transition-colors hf:bg-fg hf:text-surface"
              items={items}
              width={240}
              align="end"
            />
          </div>

          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            {metaBits.map((t) => (
              <span key={t} className="whitespace-nowrap">
                {t}
              </span>
            ))}
          </p>
        </div>
      </article>
      <ReviewDialog open={rateOpen} onClose={() => setRateOpen(false)} onSaved={afterReview} uid={uid} course={course} existing={review} />
    </li>
  );
}
