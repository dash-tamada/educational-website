"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  formatDuration,
  formatINR,
  formatNumber,
  getFirstFreeItem,
  getTutorAnalytics,
  type AnalyticsRange,
} from "@/lib/mock";
import { getCourseFunnel } from "@/lib/mock/extra/tutor";
import {
  BarChart,
  Button,
  DataTable,
  EmptyState,
  LineChart,
  PageHeader,
  ProgressBar,
  Rating,
  Section,
  Segmented,
  Select,
  StatGrid,
  StatTile,
  useIsPhone,
} from "@/components/app";
import { WideSection } from "@/components/admin/ledgerKit";
import { Figure, Idx, MonoMeta, Poster, RuleNote } from "./editorial";
import { biggestModuleDrop, splitPartialDay, useTutorContext } from "./shared";

/* =============================================================================
   Tutor analytics, design system v2: indexed studio-wide numbers, then Mobius split
   sections: revenue (red line), enrollments (ink bars, the latest full bucket red),
   the by-course awards table, and the course deep dive: where learners drop (the
   module after the biggest drop in red + a red-ruled insight), the page funnel,
   completion by lesson, tests and replays. All sample data.
   ============================================================================= */

const RANGES: {
  value: AnalyticsRange;
  label: string;
  long: string;
  during: string;
}[] = [
  {
    value: "7d",
    label: "7 days",
    long: "the last 7 days",
    during: "in the last 7 days",
  },
  {
    value: "30d",
    label: "30 days",
    long: "the last 30 days",
    during: "in the last 30 days",
  },
  {
    value: "12m",
    label: "12 months",
    long: "the last 12 months",
    during: "in the last 12 months",
  },
  {
    value: "all",
    label: "All time",
    long: "all time",
    during: "since you started",
  },
];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function TutorAnalytics({
  initialRange,
  initialCourse,
}: {
  initialRange?: string;
  initialCourse?: string;
}) {
  const { userId, db } = useTutorContext();
  const phone = useIsPhone();
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsRange>(
    RANGES.some((r) => r.value === initialRange)
      ? (initialRange as AnalyticsRange)
      : "30d",
  );
  const live = useMemo(
    () =>
      db.courses.filter(
        (c) =>
          c.tutorId === userId &&
          (c.status === "published" || c.status === "archived"),
      ),
    [db, userId],
  );
  // The focus is derived, not frozen: a ?course= for a course published in the demo only exists
  // once the store hydrates, so it resolves on the next render instead of falling back for good.
  const [courseId, setCourseId] = useState(initialCourse ?? "");
  const focus = live.find((c) => c.id === courseId) ?? live[0];
  const a = useMemo(
    () => getTutorAnalytics(userId, range, focus?.id, db),
    [userId, range, focus?.id, db],
  );
  // The focus course's purchases in every range, so the empty funnel only suggests a longer
  // range when that range really has sales.
  const salesByRange = useMemo(() => {
    const out = {} as Record<AnalyticsRange, number>;
    if (!focus) return out;
    for (const r of RANGES)
      out[r.value] =
        getTutorAnalytics(userId, r.value, focus.id, db).byCourse.find(
          (b) => b.courseId === focus.id,
        )?.enrollments ?? 0;
    return out;
  }, [userId, focus, db]);
  const onSale = live.filter((c) => c.status === "published").length;
  const archived = live.length - onSale;

  const sync = (r: AnalyticsRange, c: string) => {
    const p = new URLSearchParams();
    if (r !== "30d") p.set("range", r);
    if (c && live.some((x) => x.id === c) && c !== live[0]?.id)
      p.set("course", c);
    router.replace(`/tutor/analytics${p.size ? `?${p}` : ""}`, {
      scroll: false,
    });
  };
  const pickCourse = (id: string) => {
    setCourseId(id);
    sync(range, id);
  };
  const changeRange = (r: AnalyticsRange) => {
    setRange(r);
    sync(r, courseId);
  };
  const rangeMeta = RANGES.find((r) => r.value === range)!;
  const rangeLong = rangeMeta.long;

  const header = (
    <PageHeader
      eyebrow="Tutor studio"
      title={
        <>
          How it&apos;s <em>landing</em>.
        </>
      }
      description="What learners finish, where they drop and which moments they replay. Improve one lesson at a time."
      breadcrumbs={[
        { label: "Studio", href: "/tutor" },
        { label: "Analytics" },
      ]}
      actions={
        focus && (
          <Segmented
            label="Date range"
            value={range}
            onChange={changeRange}
            options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
            className="max-w-full overflow-x-auto max-sm:[&>button]:px-3"
          />
        )
      }
      meta={
        focus && (
          <MonoMeta>
            Showing {rangeLong} · {onSale} live{" "}
            {onSale === 1 ? "course" : "courses"}
            {archived > 0 && ` + ${archived} archived`}
          </MonoMeta>
        )
      }
    />
  );

  if (!focus)
    return (
      <div className="app-enter">
        {header}
        <div className="border-t border-fg">
          <EmptyState
            art="none"
            align="start"
            eyebrow="Nothing live yet"
            title="Analytics wake up after your first course goes live."
            body="Finish a draft, send it for review and come back once learners start watching."
            action={
              <Button
                href="/tutor/courses"
                variant="outline"
                iconRight="arrow-right"
              >
                Go to your courses
              </Button>
            }
          />
        </div>
      </div>
    );

  const focusSales = a.byCourse.find((b) => b.courseId === focus.id);
  const funnel = getCourseFunnel(
    focus.id,
    focusSales?.enrollments ?? 0,
    range,
    a.totals.previewToPurchase,
  );
  const monthly = range === "12m" || range === "all";
  // Every series ends with a partial bucket: October so far (monthly) or today up to 10:30 (daily).
  // Keep it out of the trend and mention it in the copy instead.
  const revSplit = monthly
    ? {
        full: a.revenue.slice(0, -1),
        today: a.revenue[a.revenue.length - 1] ?? null,
      }
    : splitPartialDay(a.revenue);
  const enrolSplit = monthly
    ? {
        full: a.enrollments.slice(0, -1),
        today: a.enrollments[a.enrollments.length - 1] ?? null,
      }
    : splitPartialDay(a.enrollments);
  const revenue = revSplit.full.map((p) => ({
    label: p.label,
    value: p.value,
  }));
  const enrollments = enrolSplit.full.map((p) => ({
    label: p.label,
    value: p.value,
  }));
  const partialLabel = monthly ? "October so far" : "Today so far";

  // insights from the data (same drop helper as the overview nudge)
  const mods = a.learnersByModule;
  const drop = biggestModuleDrop(mods);
  const topReplay = [...a.replays].sort((x, y) => y.replays - x.replays)[0];
  const hardQuiz = [...a.quizStats].sort(
    (x, y) => y.retryRate - x.retryRate,
  )[0];
  const lessons = a.completionByLesson;
  let biggestDrop = { idx: -1, d: 0 };
  lessons.forEach((l, i) => {
    if (i && lessons[i - 1].completion - l.completion > biggestDrop.d)
      biggestDrop = { idx: i, d: lessons[i - 1].completion - l.completion };
  });
  // A course nobody has enrolled in yet has nothing real to show: no completion, quiz or replay data.
  const noData = focus.learners === 0;
  const previewItem = getFirstFreeItem(focus.id, db);
  const rangeIdx = RANGES.findIndex((r) => r.value === range);
  // the shortest longer range that actually has sales for this course
  const longer =
    RANGES.slice(rangeIdx + 1).find((r) => (salesByRange[r.value] ?? 0) > 0) ??
    null;
  const neverSold = (salesByRange.all ?? 0) === 0;
  const endRate =
    mods.length > 1 && mods[0].learners
      ? Math.round((mods[mods.length - 1].learners / mods[0].learners) * 100)
      : null;
  const modNo = (i: number) => String(i + 1).padStart(2, "0");
  const hook = drop
    ? {
        title: `Module ${modNo(drop.index)} is where learners slip away.`,
        body: `${Math.round(drop.pct * 100)}% of learners who reach Module ${modNo(drop.index - 1)} never start Module ${modNo(drop.index)} (${formatNumber(drop.lost)} people). A recap or a quick win at its start could keep them going.`,
      }
    : endRate !== null
      ? {
          title: `${endRate}% of starters reach your last module.`,
          body: "No single module loses more learners than the rest. Keep the pacing you have.",
        }
      : {
          title: `${formatNumber(mods[0]?.learners ?? 0)} learners have started this course.`,
          body: "Add a second module to see where learners keep going and where they stop.",
        };
  const byCourseRows = a.byCourse
    .map((b) => ({
      ...b,
      course: db.courses.find((c) => c.id === b.courseId)!,
    }))
    .filter((r) => r.course);
  /** fixed rank by revenue in the range (the table can re-sort; the rank stays) */
  const rank = new Map(
    [...byCourseRows]
      .sort((x, y) => y.revenue - x.revenue)
      .map((r, i) => [r.courseId, i + 1]),
  );
  const jumpToDeepDive = (id: string) => {
    pickCourse(id);
    document
      .getElementById("deep-dive")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-enter">
      {header}

      <h2 className="sr-only">Across all your courses</h2>
      <StatGrid>
        <StatTile
          index="01"
          label="Enrollments"
          value={formatNumber(a.totals.enrollments)}
          hint={rangeLong}
        />
        <StatTile
          index="02"
          label="Revenue"
          value={formatINR(a.totals.revenue, { compact: true })}
          hint="gross, all courses"
        />
        <StatTile
          index="03"
          label="Avg completion"
          value={`${a.totals.avgCompletion}%`}
          hint="of enrolled learners"
        />
        <StatTile
          index="04"
          label="Preview → purchase"
          value={`${a.totals.previewToPurchase}%`}
          hint="of free-preview watchers"
        />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          index="01"
          label="Revenue"
          note={
            <>
              Gross {rangeMeta.during}, across all your courses.
              {revSplit.today &&
                ` ${partialLabel}: ${formatINR(revSplit.today.value)}.`}
            </>
          }
          title={formatINR(a.totals.revenue)}
        >
          <LineChart
            series={[{ name: "Revenue", tone: "hotpink", data: revenue }]}
            area
            height={260}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel={`Revenue over ${rangeLong}`}
          />
        </Section>

        <Section
          index="02"
          label="Enrollments"
          note={
            <>
              New learners {rangeMeta.during}. The red bar is the latest full{" "}
              {monthly ? "month" : "day"}.
              {enrolSplit.today &&
                ` ${partialLabel}: ${formatNumber(enrolSplit.today.value)}.`}
            </>
          }
          title={`${formatNumber(a.totals.enrollments)} new learners`}
        >
          <BarChart
            tone="ink"
            data={enrollments}
            height={240}
            highlight={enrollments.length ? enrollments.length - 1 : undefined}
            ariaLabel={`Enrollments over ${rangeLong}`}
          />
        </Section>

        <WideSection
          index="03"
          label="By course"
          note={`${cap(rangeLong)}. Pick a course to open its deep dive below.`}
          title="Performance by course"
        >
          <DataTable
            caption="Performance by course"
            rows={byCourseRows}
            getRowId={(r) => r.courseId}
            // phones: the whole list row opens the course deep dive
            onRowClick={phone ? (r) => jumpToDeepDive(r.courseId) : undefined}
            pageSize={0}
            minWidth={320}
            initialSort={{ key: "revenue", dir: "desc" }}
            columns={[
              {
                key: "rank",
                header: "No.",
                width: "56px",
                mobile: "hidden",
                cell: (r) => <Idx n={rank.get(r.courseId) ?? 0} />,
              },
              {
                key: "course",
                header: "Course",
                mobile: "title",
                sortValue: (r) => r.course.title,
                cell: (r) => (
                  <div className="flex min-w-[200px] items-center gap-3.5">
                    <Poster
                      src={r.course.thumbnail}
                      className="size-11 max-sm:hidden"
                      sizes="44px"
                      eager
                    />
                    <button
                      type="button"
                      onClick={() => jumpToDeepDive(r.courseId)}
                      className="text-left font-semibold tracking-[-0.01em] underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red hf:underline"
                    >
                      {r.course.title}
                      {r.course.status === "archived" && (
                        <span className="font-normal text-muted">
                          {" "}
                          (archived)
                        </span>
                      )}
                      <span className="block text-[12.5px] font-normal whitespace-nowrap text-muted sm:hidden">
                        {formatNumber(r.enrollments)} new{" "}
                        {range === "all" ? "in total" : `in ${rangeMeta.label}`}
                      </span>
                      <span className="sr-only"> (open the deep dive)</span>
                    </button>
                  </div>
                ),
              },
              {
                key: "enrollments",
                header: "Enrollments",
                align: "right",
                hideBelow: "sm",
                sortValue: (r) => r.enrollments,
                cell: (r) => (
                  <span className="font-mono text-[13px] tabular-nums">
                    {formatNumber(r.enrollments)}
                  </span>
                ),
              },
              {
                key: "revenue",
                // one element: the sort button lays out right-aligned headers in reverse, so a
                // fragment's text node and span would swap places
                header: "Revenue",
                align: "right",
                mobile: "trailing",
                sortValue: (r) => r.revenue,
                cell: (r) => (
                  <span className="font-heading text-[15px] font-semibold tracking-[-0.015em] whitespace-nowrap tabular-nums">
                    {formatINR(r.revenue)}
                  </span>
                ),
              },
              {
                key: "completion",
                header: "Completion",
                hideBelow: "md",
                sortValue: (r) => (r.course.learners ? r.completion : -1),
                cell: (r) =>
                  r.course.learners ? (
                    <span className="flex w-36 items-center gap-3">
                      <ProgressBar
                        value={r.completion}
                        size="sm"
                        tone="ink"
                        label={`${r.course.title} completion`}
                        className="min-w-0 flex-1"
                      />
                      <span className="w-9 shrink-0 text-right font-mono text-[12px] tabular-nums">
                        {r.completion}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">
                      No learners yet
                    </span>
                  ),
              },
              {
                key: "rating",
                header: "Rating",
                hideBelow: "xl",
                sortValue: (r) => r.rating,
                cell: (r) =>
                  r.course.reviewCount && r.rating ? (
                    <Rating value={r.rating} size="sm" />
                  ) : (
                    <span className="text-[13px] text-muted">
                      No ratings yet
                    </span>
                  ),
              },
            ]}
          />
        </WideSection>

        {/* ------------------------------------------------------------- course deep dive */}
        <Section
          id="deep-dive"
          index="04"
          label="Where they drop"
          note={
            drop
              ? "Learners who reached each module, all time. The red bar is the module after the biggest drop."
              : "Learners who reached each module, all time."
          }
          title={<span id="deep-dive-title">{focus.title}</span>}
          action={
            live.length > 1 && (
              <div className="w-full sm:w-[280px]">
                <Select
                  aria-label="Course for the deep dive"
                  value={focus.id}
                  onChange={(e) => pickCourse(e.target.value)}
                  options={live.map((c) => ({
                    value: c.id,
                    label:
                      c.status === "archived"
                        ? `${c.title} (archived)`
                        : c.title,
                  }))}
                />
              </div>
            )
          }
          className="scroll-mt-6"
        >
          {noData ? (
            <div className="border-t border-line">
              <EmptyState
                compact
                art="none"
                align="start"
                eyebrow="No learners yet"
                title={
                  focus.status === "archived"
                    ? "No learners on this course."
                    : "No learners yet, so no numbers yet."
                }
                body="Completion, test pass rates and replay hot spots show up once your first learners enroll. Share your free preview to get there."
                action={
                  previewItem ? (
                    <Button
                      href={`/learn/${focus.slug}/${previewItem.id}`}
                      variant="outline"
                      size="sm"
                      icon="play"
                    >
                      Watch your free preview
                    </Button>
                  ) : (
                    <Button
                      href={`/tutor/courses/${focus.id}/builder`}
                      variant="outline"
                      size="sm"
                      icon="edit"
                    >
                      Open the course studio
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <RuleNote
                tone={drop ? "red" : "ink"}
                label={hook.title}
                action={
                  <Button
                    variant="arrow"
                    size="sm"
                    href={`/tutor/courses/${focus.id}/builder`}
                  >
                    {drop
                      ? `Open Module ${modNo(drop.index)} in the studio`
                      : "Open the course studio"}
                  </Button>
                }
              >
                {hook.body}
              </RuleNote>
              <div className="mt-8">
                <BarChart
                  layout="horizontal"
                  tone="ink"
                  data={mods.map((m) => ({
                    label: m.module,
                    value: m.learners,
                  }))}
                  ariaLabel={`Learners by module, ${focus.title}`}
                  highlight={drop?.index}
                />
              </div>
              {mods.length > 1 && (
                <dl className="mt-8 grid grid-cols-3 border-t border-fg">
                  {[
                    { label: "Started", value: formatNumber(mods[0].learners) },
                    {
                      label: "Reached the last module",
                      value: formatNumber(mods[mods.length - 1].learners),
                    },
                    {
                      label: "Make it to the end",
                      value: `${mods[0].learners ? Math.round((mods[mods.length - 1].learners / mods[0].learners) * 100) : 0}%`,
                    },
                  ].map((x, i) => (
                    <div
                      key={x.label}
                      className={clsx(
                        "min-w-0 pt-4 pr-3",
                        i > 0 && "border-l border-line pl-3 sm:pl-5",
                      )}
                    >
                      <dt className="text-[11px] leading-[1.35] font-semibold tracking-[0.14em] text-muted uppercase">
                        {x.label}
                      </dt>
                      <dd className="mt-2 font-heading text-[22px] leading-none font-semibold tracking-[-0.035em] tabular-nums md:text-[26px]">
                        {x.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </Section>

        <Section
          index="05"
          label="Funnel"
          note={`Visits, free preview, purchase. ${cap(rangeLong)}.`}
          title="Course page funnel"
        >
          {funnel.purchases > 0 ? (
            <Funnel
              visits={funnel.visits}
              previews={funnel.previews}
              purchases={funnel.purchases}
              wishlisted={funnel.wishlisted}
            />
          ) : (
            <RuleNote
              tone="quiet"
              action={
                longer ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon="calendar"
                    onClick={() => changeRange(longer.value)}
                  >
                    Show {longer.long}
                  </Button>
                ) : (
                  // a course with no learners already offers its preview in the section above
                  neverSold &&
                  !noData &&
                  focus.status !== "archived" &&
                  previewItem && (
                    <Button
                      href={`/learn/${focus.slug}/${previewItem.id}`}
                      variant="outline"
                      size="sm"
                      icon="play"
                    >
                      Check your free preview
                    </Button>
                  )
                )
              }
            >
              {focus.status === "archived"
                ? `Not on sale while it's archived${neverSold ? "." : `, so no sales ${rangeMeta.during}.`}`
                : neverSold
                  ? "No visits or sales yet. The funnel fills in once learners find your course page."
                  : `No sales ${rangeMeta.during}.`}
            </RuleNote>
          )}
        </Section>

        {!noData && (
          <Section
            index="06"
            label="Lessons"
            note="Share of starters who finished each video (90% watched), all time. The red bar is the biggest drop."
            title="Completion by lesson"
          >
            {lessons.length === 0 ? (
              <p className="t-small text-muted">No video lessons yet.</p>
            ) : (
              <ol className="divide-y divide-line border-y border-line border-t-fg">
                {lessons.map((l, i) => {
                  const dropHere = i === biggestDrop.idx;
                  return (
                    <li
                      key={l.itemId}
                      className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_minmax(170px,34%)]"
                    >
                      <Idx n={i + 1} muted={!dropHere} />
                      <span className="min-w-0">
                        <span
                          className="line-clamp-2 text-[14.5px] leading-snug font-medium [overflow-wrap:anywhere]"
                          title={l.title}
                        >
                          {l.title}
                        </span>
                        {dropHere && (
                          <MonoMeta className="mt-0.5 !text-red-deep">
                            Biggest drop · −{biggestDrop.d} points
                          </MonoMeta>
                        )}
                      </span>
                      <span className="col-start-2 flex items-center gap-3 sm:col-start-3">
                        <ProgressBar
                          value={l.completion}
                          size="sm"
                          tone={dropHere ? undefined : "ink"}
                          label={`${l.title} completion`}
                          className="min-w-0 flex-1"
                        />
                        <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums">
                          {l.completion}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        )}

        {!noData && (
          <Section
            index="07"
            label="Tests and replays"
            note={`All time. Quiz pass rate across your courses: ${a.totals.quizPassRate}% on any attempt.`}
            title="What sticks, what confuses"
          >
            <div className="grid gap-12 xl:grid-cols-2 xl:gap-10">
              <div className="min-w-0">
                <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Test pass rates
                </h3>
                <p className="mt-2 max-w-[48ch] t-small text-muted">
                  {hardQuiz
                    ? `${hardQuiz.title} has a ${hardQuiz.retryRate}% retry rate. The explanation may need a friendlier example.`
                    : "Tests between lessons show you what actually stuck."}
                </p>
                {a.quizStats.length === 0 ? (
                  <p className="mt-5 border-t border-fg pt-4 t-small text-muted">
                    This course has no tests yet.
                  </p>
                ) : (
                  <ul className="mt-5 divide-y divide-line border-y border-line border-t-fg">
                    {a.quizStats.map((q) => (
                      <li key={q.itemId} className="py-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <span
                            className="line-clamp-2 min-w-0 text-[14.5px] leading-snug font-medium [overflow-wrap:anywhere]"
                            title={q.title}
                          >
                            {q.title}
                          </span>
                          <span className="shrink-0 font-heading text-[15px] font-semibold tracking-[-0.015em] tabular-nums">
                            {q.passRate}%
                          </span>
                        </div>
                        <ProgressBar
                          value={q.passRate}
                          size="sm"
                          tone={q === hardQuiz ? undefined : "ink"}
                          label={`${q.title} pass rate`}
                          className="mt-2.5"
                        />
                        <MonoMeta className="mt-2">
                          Avg score {q.avgScore}% · {q.retryRate}% retry
                        </MonoMeta>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Most replayed moments
                </h3>
                <p className="mt-2 max-w-[48ch] t-small text-muted">
                  {topReplay
                    ? `Learners replay ${topReplay.title} at ${formatDuration(topReplay.atSec, "clock")}. Another worked example right there could help.`
                    : "Rewinds usually mean confusion. Or a great bit. Not enough views yet."}
                </p>
                {a.replays.length === 0 ? (
                  <p className="mt-5 border-t border-fg pt-4 t-small text-muted">
                    Not enough views yet.
                  </p>
                ) : (
                  <ol className="mt-5 divide-y divide-line border-y border-line border-t-fg">
                    {a.replays.map((r, i) => (
                      <li
                        key={r.itemId}
                        className="flex items-start gap-4 py-4"
                      >
                        <Idx n={i + 1} className="mt-[5px] w-5" />
                        <span className="min-w-0 flex-1">
                          <span
                            className="line-clamp-2 text-[14.5px] leading-snug font-medium [overflow-wrap:anywhere]"
                            title={r.title}
                          >
                            {r.title}
                          </span>
                          <MonoMeta className="mt-1">
                            At {formatDuration(r.atSec, "clock")}
                          </MonoMeta>
                        </span>
                        <span className="shrink-0 font-heading text-[15px] font-semibold tracking-[-0.015em] tabular-nums">
                          {formatNumber(r.replays)}×
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </Section>
        )}
      </div>

      <p className="mt-14 border-t border-line pt-4 text-[12.5px] text-muted md:mt-20">
        All analytics on this page are generated sample data for the demo.
      </p>
    </div>
  );
}

/** Visits -> free preview -> purchase: hairline tracks, ink fills, the purchase step in red. */
function Funnel({
  visits,
  previews,
  purchases,
  wishlisted,
}: {
  visits: number;
  previews: number;
  purchases: number;
  wishlisted: number;
}) {
  const pctOf = (x: number, y: number) =>
    y ? Math.round((x / y) * 1000) / 10 : 0;
  const steps = [
    {
      label: "Visited the course page",
      value: visits,
      note: null as string | null,
    },
    {
      label: "Watched the free preview",
      value: previews,
      note: `${pctOf(previews, visits)}% of visitors`,
    },
    {
      label: "Bought the course",
      value: purchases,
      note: `${pctOf(purchases, previews)}% of preview watchers`,
    },
  ];
  return (
    <div>
      <ol className="divide-y divide-line border-y border-line border-t-fg">
        {steps.map((s, i) => {
          const w = Math.max(2, Math.round((s.value / (visits || 1)) * 100));
          return (
            <li
              key={s.label}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4 py-4"
            >
              <Idx n={i + 1} className="mt-[5px]" />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[14.5px] font-medium">{s.label}</span>
                  <span className="shrink-0 font-heading text-[18px] font-semibold tracking-[-0.025em] tabular-nums">
                    {formatNumber(s.value)}
                  </span>
                </div>
                <div className="mt-2.5 h-[5px] bg-line" aria-hidden>
                  <div
                    className={clsx(
                      "h-full transition-[width] duration-700 ease-expo",
                      i === steps.length - 1 ? "bg-red" : "bg-fg",
                    )}
                    style={{ width: `${w}%` }}
                  />
                </div>
                {s.note && <MonoMeta className="mt-2">{s.note}</MonoMeta>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Figure
          label="Visitors who buy"
          value={`${pctOf(purchases, visits)}%`}
          hint="of everyone who opened the course page"
        />
        <Figure
          label="Saved for later"
          value={formatNumber(wishlisted)}
          hint={`${pctOf(wishlisted, previews)}% of preview watchers`}
        />
      </div>
    </div>
  );
}
