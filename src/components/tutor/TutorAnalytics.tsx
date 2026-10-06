"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatDuration, formatINR, formatNumber, getFirstFreeItem, getTutorAnalytics, type AnalyticsRange } from "@/lib/mock";
import { getCourseFunnel } from "@/lib/mock/extra/tutor";
import { BarChart, Button, Card, CardHeader, DataTable, EmptyState, Field, Icon, LineChart, PageHeader, ProgressBar, Rating, Segmented, Select, StatTile, useIsPhone } from "@/components/app";
import { CourseThumb, biggestModuleDrop, splitPartialDay, useTutorContext } from "./shared";

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

export function TutorAnalytics({ initialRange, initialCourse }: { initialRange?: string; initialCourse?: string }) {
  const { userId, db } = useTutorContext();
  const phone = useIsPhone();
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsRange>(RANGES.some((r) => r.value === initialRange) ? (initialRange as AnalyticsRange) : "30d");
  const live = useMemo(() => db.courses.filter((c) => c.tutorId === userId && (c.status === "published" || c.status === "archived")), [db, userId]);
  // The focus is derived, not frozen: a ?course= for a course published in the demo only exists
  // once the store hydrates, so it resolves on the next render instead of falling back for good.
  const [courseId, setCourseId] = useState(initialCourse ?? "");
  const focus = live.find((c) => c.id === courseId) ?? live[0];
  const a = useMemo(() => getTutorAnalytics(userId, range, focus?.id, db), [userId, range, focus?.id, db]);
  // The focus course's purchases in every range, so the empty funnel only suggests a longer
  // range when that range really has sales.
  const salesByRange = useMemo(() => {
    const out = {} as Record<AnalyticsRange, number>;
    if (!focus) return out;
    for (const r of RANGES) out[r.value] = getTutorAnalytics(userId, r.value, focus.id, db).byCourse.find((b) => b.courseId === focus.id)?.enrollments ?? 0;
    return out;
  }, [userId, focus, db]);
  const onSale = live.filter((c) => c.status === "published").length;
  const archived = live.length - onSale;

  const sync = (r: AnalyticsRange, c: string) => {
    const p = new URLSearchParams();
    if (r !== "30d") p.set("range", r);
    if (c && live.some((x) => x.id === c) && c !== live[0]?.id) p.set("course", c);
    router.replace(`/tutor/analytics${p.size ? `?${p}` : ""}`, {
      scroll: false,
    });
  };
  const pickCourse = (id: string) => {
    setCourseId(id);
    sync(range, id);
  };

  const header = (
    <PageHeader
      eyebrow="Analytics"
      eyebrowTone="green"
      title="See where the spark catches."
      description="What learners finish, where they drop and which moments they replay. Use it to improve one lesson at a time."
      breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Analytics" }]}
    />
  );

  if (!focus)
    return (
      <div className="app-enter">
        {header}
        <Card padding="lg">
          <EmptyState
            art="buddy"
            tone="cyan"
            title="Analytics wake up after your first course goes live."
            body="Finish a draft, send it for review and come back once learners start watching."
            action={<Button href="/tutor/courses">Go to your courses</Button>}
          />
        </Card>
      </div>
    );

  const rangeMeta = RANGES.find((r) => r.value === range)!;
  const rangeLong = rangeMeta.long;
  const focusSales = a.byCourse.find((b) => b.courseId === focus.id);
  const funnel = getCourseFunnel(focus.id, focusSales?.enrollments ?? 0, range, a.totals.previewToPurchase);
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
  const hardQuiz = [...a.quizStats].sort((x, y) => y.retryRate - x.retryRate)[0];
  const lessons = a.completionByLesson;
  let biggestDrop = { idx: -1, d: 0 };
  lessons.forEach((l, i) => {
    if (i && lessons[i - 1].completion - l.completion > biggestDrop.d) biggestDrop = { idx: i, d: lessons[i - 1].completion - l.completion };
  });
  // A course nobody has enrolled in yet has nothing real to show: no completion, quiz or replay data.
  const noData = focus.learners === 0;
  const previewItem = getFirstFreeItem(focus.id, db);
  const rangeIdx = RANGES.findIndex((r) => r.value === range);
  // the shortest longer range that actually has sales for this course
  const longer = RANGES.slice(rangeIdx + 1).find((r) => (salesByRange[r.value] ?? 0) > 0) ?? null;
  const neverSold = (salesByRange.all ?? 0) === 0;
  const endRate = mods.length > 1 && mods[0].learners ? Math.round((mods[mods.length - 1].learners / mods[0].learners) * 100) : null;
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

  return (
    <div className="app-enter">
      {header}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Segmented
          label="Date range"
          value={range}
          onChange={(r) => {
            setRange(r);
            sync(r, courseId);
          }}
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          className="max-w-full overflow-x-auto max-sm:[&>button]:px-3"
        />
        <p className="text-[13px] font-semibold text-ink/55 sm:ml-auto">
          Showing {rangeLong} · {onSale} live {onSale === 1 ? "course" : "courses"}
          {archived > 0 && ` + ${archived} archived`}
        </p>
      </div>

      {/* ------------------------------------------------------------- studio-wide */}
      <h2 className="sr-only">Across all your courses</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        <StatTile label="Enrollments" value={formatNumber(a.totals.enrollments)} tone="sun" icon="users" hint={rangeLong} />
        <StatTile label="Revenue" value={formatINR(a.totals.revenue, { compact: true })} tone="mint" icon="wallet" hint="gross, all courses" />
        <StatTile label="Avg completion" value={`${a.totals.avgCompletion}%`} tone="cyan" icon="check-circle" hint="of enrolled learners" />
        <StatTile label="Quiz pass rate" value={`${a.totals.quizPassRate}%`} tone="blush" icon="quiz" hint="any attempt" />
        <StatTile label="Preview → purchase" value={`${a.totals.previewToPurchase}%`} tone="lilac" icon="play" hint="of preview watchers" className="col-span-2 xl:col-span-1" />
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader
            title="Revenue over time"
            description={`${formatINR(a.totals.revenue)} gross ${rangeMeta.during}, across all your courses.${revSplit.today ? ` ${partialLabel}: ${formatINR(revSplit.today.value)}.` : ""}`}
          />
          <LineChart series={[{ name: "Revenue", tone: "green", data: revenue }]} area height={240} format={(n) => formatINR(n, { compact: true })} ariaLabel={`Revenue over ${rangeLong}`} />
        </Card>
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader
            title="Enrollments"
            description={`${formatNumber(a.totals.enrollments)} new learners ${rangeMeta.during}.${enrolSplit.today ? ` ${partialLabel}: ${formatNumber(enrolSplit.today.value)}.` : ""}`}
          />
          <BarChart tone="sun" data={enrollments} height={240} ariaLabel={`Enrollments over ${rangeLong}`} />
        </Card>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 t-app-h2">
          By course <span className="text-ink/45">· {range === "all" ? "all time" : rangeLong}</span>
        </h2>
        <DataTable
          caption="Performance by course"
          rows={byCourseRows}
          getRowId={(r) => r.courseId}
          // phones: the whole list row opens the course deep dive
          onRowClick={
            phone
              ? (r) => {
                  pickCourse(r.courseId);
                  document.getElementById("deep-dive")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              : undefined
          }
          pageSize={0}
          minWidth={320}
          initialSort={{ key: "revenue", dir: "desc" }}
          columns={[
            {
              key: "course",
              header: "Course",
              sortValue: (r) => r.course.title,
              cell: (r) => (
                <div className="flex min-w-[180px] items-center gap-3">
                  <CourseThumb src={r.course.thumbnail} tone={r.course.tone} className="h-10 w-12" sizes="48px" eager />
                  <button
                    type="button"
                    onClick={() => {
                      pickCourse(r.courseId);
                      document.getElementById("deep-dive")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="rounded-sm text-left font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue hf:underline"
                  >
                    {r.course.title}
                    {r.course.status === "archived" && <span className="font-semibold text-ink/50"> (archived)</span>}
                    <span className="block text-[12px] font-semibold whitespace-nowrap text-ink/50 sm:hidden">
                      {formatNumber(r.enrollments)} new {range === "all" ? "in total" : `in ${rangeMeta.label}`}
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
              cell: (r) => formatNumber(r.enrollments),
            },
            {
              key: "revenue",
              // one element: the sort button lays out right-aligned headers in reverse, so a
              // fragment's text node and span would swap places
              header: "Revenue",
              align: "right",
              sortValue: (r) => r.revenue,
              cell: (r) => formatINR(r.revenue),
            },
            {
              key: "completion",
              header: "Completion",
              hideBelow: "md",
              sortValue: (r) => (r.course.learners ? r.completion : -1),
              cell: (r) =>
                r.course.learners ? (
                  <ProgressBar value={r.completion} size="sm" showValue label="Completion" className="w-28 [&>div:first-child>span:first-child]:sr-only" />
                ) : (
                  <span className="text-[13px] font-semibold text-ink/50">No learners yet</span>
                ),
            },
            {
              key: "rating",
              header: "Rating",
              hideBelow: "xl",
              sortValue: (r) => r.rating,
              cell: (r) => (r.course.reviewCount && r.rating ? <Rating value={r.rating} size="sm" /> : <span className="text-[13px] font-semibold text-ink/50">No ratings yet</span>),
            },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------- course deep dive */}
      <section id="deep-dive" aria-labelledby="deep-dive-title" className="mt-10 scroll-mt-6 md:mt-12">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-5">
          <div className="min-w-0">
            <p className="t-micro text-ink/50 uppercase">Course deep dive</p>
            <h2 id="deep-dive-title" className="mt-1.5 t-app-h2">
              {focus.title}
            </h2>
          </div>
          <div className="sm:w-[280px]">
            <Field label="Course">
              <Select
                value={focus.id}
                onChange={(e) => pickCourse(e.target.value)}
                options={live.map((c) => ({
                  value: c.id,
                  label: c.status === "archived" ? `${c.title} (archived)` : c.title,
                }))}
              />
            </Field>
          </div>
        </div>

        {!noData && (
          <ul className="grid gap-3 md:grid-cols-3 md:gap-4" aria-label="Insights">
            <Insight tone="bg-mint/70" icon="sparkles" title={hook.title} body={hook.body} />
            {topReplay ? (
              <Insight
                tone="bg-butter"
                icon="refresh"
                title={`Learners replay ${topReplay.title} at ${formatDuration(topReplay.atSec, "clock")}.`}
                body="Consider adding another worked example right there, or a resource that spells it out."
              />
            ) : (
              <Insight tone="bg-butter" icon="refresh" title="No replay hot spots yet." body="Once more learners watch, the most rewatched moments show up here." />
            )}
            {hardQuiz ? (
              <Insight
                tone="bg-blush"
                icon="quiz"
                title={`${hardQuiz.title} has a ${hardQuiz.retryRate}% retry rate.`}
                body="The explanation may need a friendlier example. Check which question trips people up."
              />
            ) : (
              <Insight tone="bg-blush" icon="quiz" title="Add a test to see pass rates." body="Tests between lessons show you what actually stuck." />
            )}
          </ul>
        )}

        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-5">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader title="Course page funnel" description={`Visits, free preview, purchase. ${rangeLong[0].toUpperCase()}${rangeLong.slice(1)}.`} />
            {funnel.purchases > 0 ? (
              <Funnel visits={funnel.visits} previews={funnel.previews} purchases={funnel.purchases} wishlisted={funnel.wishlisted} />
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-[16px] bg-cream/80 p-4">
                <p className="t-small text-ink/65">
                  {focus.status === "archived"
                    ? `Not on sale while it's archived${neverSold ? "." : `, so no sales ${rangeMeta.during}.`}`
                    : neverSold
                      ? "No visits or sales yet. The funnel fills in once learners find your course page."
                      : `No sales ${rangeMeta.during}.`}
                </p>
                {longer ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="calendar"
                    onClick={() => {
                      setRange(longer.value);
                      sync(longer.value, courseId);
                    }}
                  >
                    Show {longer.long}
                  </Button>
                ) : (
                  // a course with no learners already offers its preview in the card next to this one
                  neverSold &&
                  !noData &&
                  focus.status !== "archived" &&
                  previewItem && (
                    <Button href={`/learn/${focus.slug}/${previewItem.id}`} variant="secondary" size="sm" icon="play">
                      Check your free preview
                    </Button>
                  )
                )}
              </div>
            )}
          </Card>
          {noData ? (
            <Card className="min-w-0 xl:col-span-3">
              <EmptyState
                compact
                art="tami"
                tone="butter"
                title={focus.status === "archived" ? "No learners on this course." : "No learners yet, so no numbers yet."}
                body="Completion, test pass rates and replay hot spots show up once your first learners enroll. Share your free preview to get there."
                action={
                  previewItem ? (
                    <Button href={`/learn/${focus.slug}/${previewItem.id}`} variant="secondary" size="sm" icon="play">
                      Watch your free preview
                    </Button>
                  ) : (
                    <Button href={`/tutor/courses/${focus.id}/builder`} variant="secondary" size="sm" icon="edit">
                      Open the course studio
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <Card className="min-w-0 xl:col-span-3">
              <CardHeader
                title="Completion by module"
                description={drop ? "How many learners reached each module, all time. The highlighted bar is the module after the biggest drop." : "How many learners reached each module, all time."}
              />
              <BarChart layout="horizontal" tone="blue" data={mods.map((m) => ({ label: m.module, value: m.learners }))} ariaLabel={`Learners by module, ${focus.title}`} highlight={drop?.index} />
              {mods.length > 1 && (
                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-ink/[0.07] pt-4">
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
                  ].map((x) => (
                    <div key={x.label} className="min-w-0">
                      <dt className="text-[12.5px] leading-tight font-semibold text-ink/55">{x.label}</dt>
                      <dd className="mt-1 font-heading text-[20px] leading-none font-extrabold tracking-[-0.02em]">{x.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          )}
        </div>

        {!noData && (
          <div className="mt-5 grid gap-4 md:gap-5 xl:grid-cols-5">
            <Card className="min-w-0 xl:col-span-3">
              <CardHeader title="Completion by lesson" description="Share of starters who finished each video (90% watched), all time." />
              {lessons.length === 0 ? (
                <p className="t-small text-ink/60">No video lessons yet.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {lessons.map((l, i) => (
                    <li
                      key={l.itemId}
                      className={clsx(
                        "grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-[14px] px-2 py-2 sm:grid-cols-[1.75rem_minmax(0,1fr)_minmax(150px,36%)]",
                        i === biggestDrop.idx && "bg-[#ffe1d4]/70",
                      )}
                    >
                      <span className="text-[12px] font-bold text-ink/45 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[14px] leading-snug font-semibold break-words" title={l.title}>
                          {l.title}
                        </span>
                        {i === biggestDrop.idx && <span className="block text-[12px] font-bold text-[#b02f00]">Biggest drop: −{biggestDrop.d} points</span>}
                      </span>
                      <span className="col-start-2 flex items-center gap-2.5 sm:col-start-3">
                        <ProgressBar
                          value={l.completion}
                          size="sm"
                          tone={l.completion >= 70 ? "green" : l.completion >= 45 ? "sun" : "flame"}
                          label={`${l.title} completion`}
                          className="min-w-0 flex-1"
                        />
                        <span className="w-9 shrink-0 text-right text-[12.5px] font-bold tabular-nums">{l.completion}%</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 md:gap-5 xl:col-span-2 xl:grid-cols-1">
              <Card>
                <CardHeader title="Quiz pass rates" description="Pass rate per test and how often learners retry, all time." />
                {a.quizStats.length === 0 ? (
                  <p className="t-small text-ink/60">This course has no tests yet.</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {a.quizStats.map((q) => (
                      <li key={q.itemId}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="line-clamp-2 min-w-0 text-[14px] leading-snug font-bold break-words" title={q.title}>
                            {q.title}
                          </span>
                          <span className="shrink-0 text-[13px] font-bold">{q.passRate}% pass</span>
                        </div>
                        <ProgressBar value={q.passRate} size="sm" tone={q.passRate >= 80 ? "green" : "sun"} label={`${q.title} pass rate`} className="mt-1.5" />
                        <p className="mt-1 text-[12.5px] font-semibold text-ink/55">
                          Avg score {q.avgScore}% · {q.retryRate}% retry
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <CardHeader title="Most replayed moments" description="All time. Rewinds usually mean confusion. Or a great bit." />
                {a.replays.length === 0 ? (
                  <p className="t-small text-ink/60">Not enough views yet.</p>
                ) : (
                  <ol className="flex flex-col gap-2.5">
                    {a.replays.map((r, i) => (
                      <li key={r.itemId} className="flex items-center gap-3 rounded-[16px] bg-cream/70 p-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-cream">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[14px] leading-snug font-bold break-words" title={r.title}>
                            {r.title}
                          </span>
                          <span className="text-[12.5px] font-semibold text-ink/55">at {formatDuration(r.atSec, "clock")}</span>
                        </span>
                        <span className="shrink-0 text-[13px] font-bold">{formatNumber(r.replays)}×</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          </div>
        )}
      </section>
      <p className="mt-6 text-[12.5px] font-semibold text-ink/45">All analytics on this page are generated sample data for the demo.</p>
    </div>
  );
}

function Insight({ tone, icon, title, body }: { tone: string; icon: "sparkles" | "refresh" | "quiz"; title: string; body: string }) {
  return (
    <li className={clsx("rounded-card p-5", tone)}>
      <span className="grid size-9 place-items-center rounded-full bg-white/70" aria-hidden>
        <Icon name={icon} className="size-[18px]" strokeWidth={2.2} />
      </span>
      <p className="mt-3 t-app-h3">{title}</p>
      <p className="mt-1.5 t-small text-ink/70">{body}</p>
    </li>
  );
}

/** Visits -> free preview -> purchase, with step conversion under each bar and the wishlist as a side note. */
function Funnel({ visits, previews, purchases, wishlisted }: { visits: number; previews: number; purchases: number; wishlisted: number }) {
  const pctOf = (x: number, y: number) => (y ? Math.round((x / y) * 1000) / 10 : 0);
  const steps = [
    {
      label: "Visited the course page",
      value: visits,
      tone: "bg-blue",
      note: null as string | null,
    },
    {
      label: "Watched the free preview",
      value: previews,
      tone: "bg-turquoise",
      note: `${pctOf(previews, visits)}% of visitors`,
    },
    {
      label: "Bought the course",
      value: purchases,
      tone: "bg-green",
      note: `${pctOf(purchases, previews)}% of preview watchers`,
    },
  ];
  return (
    <div>
      <ol className="flex flex-col gap-3.5">
        {steps.map((s) => {
          const w = Math.max(4, Math.round((s.value / (visits || 1)) * 100));
          return (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="font-semibold text-ink/75">{s.label}</span>
                <span className="shrink-0 font-bold tabular-nums">{formatNumber(s.value)}</span>
              </div>
              <div className="mt-1.5 h-6 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className={clsx("h-full rounded-full transition-[width] duration-700 ease-expo", s.tone)} style={{ width: `${w}%` }} />
              </div>
              {s.note && <p className="mt-1 text-[12px] font-bold text-ink/55">{s.note}</p>}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-col gap-1 rounded-[16px] bg-cream/80 p-3 text-[13px] font-semibold">
        <span>
          <span className="font-bold">{pctOf(purchases, visits)}%</span> of visitors end up buying.
        </span>
        <span className="text-ink/60">
          {formatNumber(wishlisted)} saved it for later ({pctOf(wishlisted, previews)}% of preview watchers).
        </span>
      </div>
    </div>
  );
}
