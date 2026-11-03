"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatCompact,
  formatDate,
  formatINR,
  formatNumber,
  getPayouts,
  getTutorAnalytics,
  getTutorQuestions,
  getTutorReviews,
  getTutorStats,
  itemTitle,
  MOCK_NOW_ISO,
  pad2,
  timeAgo,
  type AnalyticsRange,
} from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { STUDIO_TIPS } from "@/lib/mock/extra/tutor";
import {
  Avatar,
  AvatarGroup,
  BarChart,
  Button,
  EmptyState,
  Field,
  Icon,
  LineChart,
  Modal,
  PageHeader,
  ProgressBar,
  Rating,
  Section,
  Segmented,
  Sparkline,
  StatGrid,
  StatTile,
  StatusPill,
  Textarea,
  toast,
  type IconName,
} from "@/components/app";
import { Figure, Idx, LineIcon, MonoMeta, RuleNote } from "./editorial";
import { CourseThumb, biggestModuleDrop, copyText, courseMonthSales, courseRevenueLabel, focusFirstInvalid, greeting, splitPartialDay, tutorCourses, useTutorContext } from "./shared";

/* =============================================================================
   Tutor studio home (/tutor), design system v2: Mobius split sections down a cream
   page. KPIs in Anton (the earnings tile is the page's one ink moment), then
   01 Next up · 02 Revenue · 03 Courses · 04 Learners · 05 Reviews · 06 Shortcuts.
   ============================================================================= */

export function TutorOverview() {
  const { userId, db, tutor, firstName } = useTutorContext();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const stats = useMemo(() => getTutorStats(userId, db), [userId, db]);
  const analytics = useMemo(() => getTutorAnalytics(userId, range, undefined, db), [userId, range, db]);
  const a30 = useMemo(() => getTutorAnalytics(userId, "30d", undefined, db), [userId, db]);
  const courses = useMemo(() => tutorCourses(db, userId), [db, userId]);
  // resolved threads count as handled even without a tutor reply
  const questions = useMemo(() => getTutorQuestions(userId, { unansweredOnly: true }, db).filter((t) => !t.question.resolved), [userId, db]);
  const reviews = useMemo(() => getTutorReviews(userId, db).filter((r) => !r.hidden).slice(0, 4), [userId, db]);
  /** closed months of net earnings, oldest first (the running month is a projection) */
  const earnings = useMemo(
    () =>
      getPayouts(userId, db)
        .filter((p) => p.period < MOCK_NOW_ISO.slice(0, 7))
        .slice(0, 6)
        .reverse(),
    [userId, db],
  );
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const published = courses.filter((c) => c.status === "published");
  const inProgress = courses.filter((c) => c.status === "draft" || c.status === "in_review" || c.status === "rejected");
  /** top courses first (live, by monthly revenue), then work in progress (latest edit first), archived last */
  const topCourses = useMemo(() => {
    const rank = (st: string) => (st === "published" ? 0 : st === "archived" ? 2 : 1);
    return [...courses].sort((a, b) => rank(a.status) - rank(b.status) || (a.status === "published" ? courseMonthSales(b).revenue - courseMonthSales(a).revenue : b.updatedAt.localeCompare(a.updatedAt)));
  }, [courses]);
  const completion = a30.totals.avgCompletion;

  // Biggest relative drop between two consecutive modules of the focus course (same helper as Analytics).
  const drop = useMemo(() => {
    const m = a30.learnersByModule;
    const best = biggestModuleDrop(m);
    const course = m[0] ? db.courses.find((c) => c.id === m[0].courseId) : null;
    return best && course ? { ...best, course } : null;
  }, [a30, db]);

  const header = (
    <PageHeader
      eyebrow="Tutor studio"
      title={
        <>
          {greeting()}, <em>{firstName}</em>.
        </>
      }
      description="Let's make the next lesson land. Here's how your courses, learners and earnings are doing today."
      actions={
        <>
          <Button href="/tutor/courses" variant="outline" icon="layers">
            Open course studio
          </Button>
          <Button href="/tutor/courses/new" variant="red" icon="plus">
            Create a course
          </Button>
        </>
      }
    />
  );

  if (courses.length === 0) {
    return (
      <div className="app-enter">
        {header}
        <Section index="01" label="Your first course" note="Lessons, tests and pricing come after the title.">
          <EmptyState
            art="none"
            align="start"
            eyebrow="Studio is empty"
            title="Your studio is ready for its first course."
            body="Pick a title, a price and a cover. You can record and upload lessons afterwards, one module at a time."
            className="!px-0"
            action={
              <Button href="/tutor/courses/new" variant="red" iconRight="arrow-right">
                Start with a title
              </Button>
            }
          />
        </Section>
      </div>
    );
  }

  // The last point is partial (today up to 10:30, or October so far): keep it off the trend line and say it in words.
  const revSplit = range === "12m" ? { full: analytics.revenue.slice(0, -1), today: analytics.revenue[analytics.revenue.length - 1] ?? null } : splitPartialDay(analytics.revenue);
  const revSeries = revSplit.full.map((p) => ({ label: p.label, value: p.value }));
  const enrolSplit = splitPartialDay(a30.enrollments);
  const enrolBars = enrolSplit.full.slice(-14).map((p) => ({ label: p.label, value: p.value }));
  const review = reviews.find((r) => r.id === replyTo) ?? null;
  const next = inProgress[0];

  /* 01 Next up: the three things worth doing now */
  const nudges: { icon: IconName; title: string; body: string; href: string; cta: string; alert?: boolean; extra?: React.ReactNode }[] = [];
  if (drop && drop.lost > 0)
    nudges.push({
      icon: "trend",
      alert: true,
      title: `${Math.round(drop.pct * 100)}% of learners stop before Module ${pad2(drop.index + 1)}.`,
      body: `That's ${formatNumber(drop.lost)} people in ${drop.course.title}. Want to review the lesson just before it?`,
      href: `/tutor/analytics?course=${drop.course.id}`,
      cta: "See where they drop",
    });
  nudges.push({
    icon: "chat",
    alert: questions.length > 0,
    title: questions.length ? `${questions.length} ${questions.length === 1 ? "question is" : "questions are"} waiting.` : "Inbox zero. Nice.",
    body: questions.length ? "Learners who get answers within a day rate courses higher." : "No unanswered questions right now.",
    href: "/tutor/questions",
    cta: questions.length ? "Answer now" : "Open questions",
    extra: questions.length ? (
      <AvatarGroup
        size="xs"
        max={4}
        label={waitingLabel(questions.map((q) => q.question.user?.name?.split(" ")[0] ?? "A learner"))}
        people={questions.map((q) => ({ name: q.question.user?.name ?? "Learner", tone: q.question.user?.tone }))}
      />
    ) : undefined,
  });
  if (next)
    nudges.push({
      icon: next.status === "in_review" ? "clock" : next.status === "rejected" ? "alert" : "edit",
      alert: next.status === "rejected",
      title: next.status === "in_review" ? `${next.title} is in review.` : next.status === "rejected" ? `${next.title} needs a few fixes.` : `${next.title} is still a draft.`,
      body:
        next.status === "in_review"
          ? `Sent ${timeAgo(next.submittedAt ?? next.updatedAt)}. Reviews take 2 to 3 working days.`
          : next.status === "rejected"
            ? (next.reviewNote ?? "The review team left a note.")
            : `Last edited ${timeAgo(next.updatedAt)}. Pick up where you left off.`,
      href: `/tutor/courses/${next.id}/builder`,
      cta: next.status === "draft" ? "Keep building" : "Open course studio",
    });
  else nudges.push({ icon: "plus", title: "Got another course in you?", body: "Learners who finish one course are the most likely to buy your next.", href: "/tutor/courses/new", cta: "Start a new course" });

  const lastEarn = earnings[earnings.length - 1];

  return (
    <div className="app-enter">
      {header}

      <StatGrid>
        <StatTile index="01" label="Learners" value={formatCompact(stats.learners)} hint={`across ${stats.publishedCourses} live ${stats.publishedCourses === 1 ? "course" : "courses"}`} href="/tutor/analytics" />
        <StatTile
          index="02"
          variant="ink"
          label="October so far"
          value={formatINR(stats.monthEarnings, { compact: true })}
          hint={
            stats.lastMonthEarnings
              ? `Sep ${formatINR(stats.lastMonthEarnings, { compact: true })}${stats.earningsDelta && stats.earningsDelta !== 0 ? `, ${Math.abs(stats.earningsDelta)}% ${stats.earningsDelta > 0 ? "above" : "below"} Aug` : ""}`
              : "your net earnings, 1 to 5 Oct"
          }
          href="/tutor/earnings"
        />
        <StatTile index="03" label="Average rating" value={stats.rating ? stats.rating.toFixed(1) : "New"} hint={`${formatNumber(stats.reviewCount)} reviews`} />
        <StatTile index="04" label="Completion rate" value={`${completion}%`} hint="across live courses" href="/tutor/analytics" />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        {/* 01 Next up */}
        <Section index="01" label="Next up" note="The few things worth your time this morning, most useful first." id="next-up">
          <ol aria-labelledby="next-up" className="divide-y divide-line border-y border-line border-t-fg">
            {nudges.map((n, i) => (
              <li key={n.title} className="group/row relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 py-5 transition-colors hf:bg-cream-2/60 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:items-start md:gap-x-6 md:py-6">
                <Idx n={i + 1} className="mt-[7px] w-5" />
                <LineIcon name={n.icon} tone={n.alert ? "red" : undefined} className="mt-[3px] max-sm:hidden" />
                <div className="min-w-0">
                  <p className="font-heading text-[18px] leading-[1.2] font-semibold tracking-[-0.025em] md:text-[20px]">{n.title}</p>
                  <p className="t-small mt-1.5 max-w-[60ch] text-muted">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Link
                      href={n.href}
                      className="inline-flex min-h-6 items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-red coarse:min-h-11"
                    >
                      {n.cta}
                      <Icon name="arrow-right" strokeWidth={1.8} className="size-4 transition-[translate] duration-500 ease-expo motion-ok:group-hover/row:translate-x-1" />
                    </Link>
                    {n.extra && <span className="sm:hidden">{n.extra}</span>}
                  </div>
                </div>
                {n.extra && <span className="self-center max-sm:hidden">{n.extra}</span>}
              </li>
            ))}
          </ol>
        </Section>

        {/* 02 Revenue */}
        <Section
          index="02"
          label="Revenue"
          note={
            <>
              Gross {range === "30d" ? "in the last 30 days" : "over the last 12 months"}
              {revSplit.today && (
                <>
                  . {range === "30d" ? "Today so far" : "October so far"}: {formatINR(revSplit.today.value, { compact: true })}
                </>
              )}
              .
            </>
          }
          title={formatINR(analytics.totals.revenue)}
          action={
            <Segmented
              label="Revenue range"
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: "30d", label: "30 days" },
                { value: "12m", label: "12 months" },
              ]}
            />
          }
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
            <LineChart series={[{ name: "Revenue", tone: "hotpink", data: revSeries }]} area height={240} format={(n) => formatINR(n, { compact: true })} ariaLabel="Revenue over time" />
            <div className="flex min-w-0 flex-col gap-6 border-t border-line pt-5 sm:flex-row sm:gap-10 xl:flex-col xl:gap-7 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
              <div className="min-w-0">
                <Figure label="Your net · Sep" value={formatINR(stats.lastMonthEarnings, { compact: true })} hint={lastEarn ? "Paid out after the platform share" : undefined} />
                {earnings.length > 1 && (
                  <Sparkline values={earnings.map((p) => p.net)} tone="hotpink" width={160} height={36} className="mt-4" ariaLabel={`Net earnings, last ${earnings.length} months`} />
                )}
              </div>
              <div className="min-w-0">
                <Figure label="Learners · 30 days" value={`+${formatNumber(a30.totals.enrollments)}`} hint={enrolSplit.today ? `${formatNumber(enrolSplit.today.value)} today so far` : undefined} />
                <Button href="/tutor/earnings" variant="arrow" size="sm" className="mt-4">
                  Earnings and payouts
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* 03 Courses */}
        <Section
          index="03"
          label="Your courses"
          note={`Top sellers first. ${published.length} live · ${inProgress.length} in the works.`}
          title="On the slate."
          action={
            <Button href="/tutor/courses" variant="arrow" size="sm">
              All {courses.length} courses
            </Button>
          }
        >
          <ul className="divide-y divide-line border-y border-line border-t-fg">
            {topCourses.slice(0, 5).map((c, i) => {
              const byCourse = a30.byCourse.find((b) => b.courseId === c.id);
              return (
                <li key={c.id} className="group/row relative flex items-center gap-4 py-4 transition-colors hf:bg-cream-2/60 md:gap-5">
                  <Idx n={i + 1} className="w-5 max-sm:hidden" />
                  <CourseThumb src={c.thumbnail} ratio={1} sizes="64px" className="size-14 md:size-16" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/tutor/courses/${c.id}/builder`}
                        className="t-app-h3 min-w-0 [overflow-wrap:anywhere] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-red"
                      >
                        {c.title}
                      </Link>
                      <StatusPill status={c.status} size="sm" variant="text" />
                    </div>
                    <MonoMeta className="mt-1.5">
                      {c.status === "published"
                        ? c.learners
                          ? `${formatNumber(c.learners)} learners · ${c.rating ? `${c.rating.toFixed(1)}★` : "no ratings"} · ${courseRevenueLabel(c)}`
                          : "Just went live · no sales yet"
                        : c.status === "archived"
                          ? `${formatNumber(c.learners)} learners keep access · not on sale`
                          : `Edited ${timeAgo(c.updatedAt)} · ${formatINR(c.price)}`}
                    </MonoMeta>
                  </div>
                  {byCourse && c.learners > 0 ? (
                    <div className="hidden w-36 shrink-0 sm:block">
                      <ProgressBar value={byCourse.completion} showValue label="Completion" size="sm" />
                    </div>
                  ) : (
                    <Icon name="arrow-right" strokeWidth={1.6} className="size-4 shrink-0 text-muted transition-[translate,color] duration-300 group-hover/row:text-fg motion-ok:group-hover/row:translate-x-1" />
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {/* 04 Learners: questions + enrollments */}
        <Section index="04" label="Learners" note="Who's asking, and how many joined in the last two weeks.">
          <div className="grid gap-12 xl:grid-cols-2 xl:gap-10">
            <div className="min-w-0">
              <ColumnHead
                id="questions-title"
                title="Latest questions"
                sub={questions.length ? `${questions.length} waiting for an answer` : "All caught up"}
                href="/tutor/questions"
                linkLabel={questions.length ? `See all ${questions.length}` : "Questions"}
              />
              {questions.length === 0 ? (
                <EmptyState compact art="none" align="start" eyebrow="Inbox zero" title="All caught up." body="New questions from your lessons land here." className="!px-0" />
              ) : (
                <ul aria-labelledby="questions-title" className="divide-y divide-line border-b border-line">
                  {questions.slice(0, 3).map((t) => (
                    <li key={t.question.id} className="group/row relative flex gap-3.5 py-4 transition-colors hf:bg-cream-2/60">
                      <span aria-hidden className="mt-[7px] size-[7px] shrink-0 bg-red" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Avatar name={t.question.user?.name ?? "Learner"} tone={t.question.user?.tone} size="xs" decorative />
                          <span className="min-w-0 truncate text-[13.5px] font-semibold">{t.question.user?.name}</span>
                          <MonoMeta as="span" className="ml-auto shrink-0">
                            {timeAgo(t.question.createdAt)}
                          </MonoMeta>
                        </div>
                        <Link
                          href={`/tutor/questions?focus=${t.question.id}`}
                          className="mt-2 line-clamp-2 font-heading text-[15.5px] leading-snug font-medium tracking-[-0.015em] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-red"
                        >
                          <span className="sr-only">Unanswered: </span>
                          {t.question.body}
                        </Link>
                        <MonoMeta className="mt-1.5 truncate">{t.item ? itemTitle(t.item) : t.course.title}</MonoMeta>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="min-w-0">
              <ColumnHead
                id="enrol-title"
                title="Enrollments"
                sub={`${formatNumber(a30.totals.enrollments)} new learners in 30 days${enrolSplit.today ? ` · ${formatNumber(enrolSplit.today.value)} today so far` : ""}`}
                href="/tutor/analytics"
                linkLabel="Analytics"
              />
              <BarChart data={enrolBars} tone="ink" height={200} ariaLabel="New enrollments per day, last 14 full days (yesterday highlighted)" highlight={enrolBars.length - 1} />
            </div>
          </div>
        </Section>

        {/* 05 Reviews */}
        <Section index="05" label="Reviews" note="What learners are saying. Sample reviews for the demo." title="In their words.">
          {reviews.length === 0 ? (
            <EmptyState compact art="none" align="start" eyebrow="No reviews" title="No reviews yet." body="Reviews show up here once learners finish a few lessons." className="!px-0" />
          ) : (
            <ul className="grid border-t border-fg md:grid-cols-2" aria-label="Latest reviews">
              {reviews.map((r, i) => (
                <li
                  key={r.id}
                  className="flex min-w-0 flex-col border-b border-line py-6 md:px-0 md:odd:border-r md:odd:pr-8 md:even:pl-8"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Rating value={r.rating} size="sm" showValue={false} />
                    <Idx n={i + 1} muted />
                  </div>
                  <blockquote className="mt-4 min-w-0">
                    {r.title && <p className="t-app-h3">{r.title}</p>}
                    <p className="mt-1.5 line-clamp-4 font-heading text-[16px] leading-[1.45] tracking-[-0.012em] text-fg/85">&ldquo;{r.comment}&rdquo;</p>
                  </blockquote>
                  <div className="mt-4 flex items-center gap-2.5">
                    <Avatar name={r.user?.name ?? "Learner"} tone={r.user?.tone} size="xs" decorative />
                    <p className="min-w-0 truncate text-[13px]">
                      <span className="font-semibold">{r.user?.name ?? "Learner"}</span>
                      <span className="text-muted">
                        {" "}
                        · {r.course.title} · {timeAgo(r.createdAt)}
                      </span>
                    </p>
                  </div>
                  <div className="mt-auto pt-5">
                    {r.reply ? (
                      <RuleNote tone="quiet" label="You replied">
                        <span className="line-clamp-2">{r.reply.body}</span>
                      </RuleNote>
                    ) : (
                      <Button size="sm" variant="outline" icon="chat" onClick={() => setReplyTo(r.id)} aria-label={`Reply to ${r.user?.name ?? "this learner"}`}>
                        Reply
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 06 Shortcuts + tip */}
        <Section index="06" label="Shortcuts" note="The usual places, one tap away.">
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <ul className="divide-y divide-line border-y border-line border-t-fg">
              <QuickAction n={1} href="/tutor/courses/new" icon="plus" label="Create a course" />
              {next && <QuickAction n={2} href={`/tutor/courses/${next.id}/builder`} icon="edit" label={`${next.status === "in_review" ? "Open" : "Continue"} ${next.title}`} />}
              <QuickAction n={next ? 3 : 2} href="/tutor/analytics" icon="chart" label="Find where learners drop" />
              <QuickAction n={next ? 4 : 3} href="/tutor/earnings" icon="wallet" label="Check your next payout" />
              {tutor && <QuickAction n={next ? 5 : 4} href={`/tutors/${tutor.slug}`} icon="external" label="View your public profile" />}
              <li>
                <button
                  type="button"
                  onClick={async () => {
                    const code = db.coupons.find((c) => c.createdBy === userId && c.active)?.code;
                    if (!code) return toast.info("No live coupon yet", { description: "Create one from a course's Pricing tab." });
                    const ok = await copyText(code);
                    toast.success(ok ? `Copied ${code}` : `Your code is ${code}`, { description: "Share it with your community for a discount." });
                  }}
                  className="group/row tap flex min-h-14 w-full min-w-0 items-center gap-4 py-3 text-left transition-colors hf:bg-cream-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red md:gap-5"
                >
                  <Idx n={(next ? 5 : 4) + (tutor ? 1 : 0)} className="w-5" />
                  <LineIcon name="ticket" tone="muted" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]">Copy your coupon code</span>
                  <Icon name="copy" strokeWidth={1.6} className="size-4 text-muted transition-colors group-hover/row:text-fg" />
                </button>
              </li>
            </ul>
            <div className="self-start">
              <RuleNote label={`Studio tip · ${pad2(((userId.length + courses.length) % STUDIO_TIPS.length) + 1)}`}>
                <span className="block font-heading text-[18px] leading-[1.3] font-medium tracking-[-0.02em] text-fg md:text-[19px]">
                  {STUDIO_TIPS[(userId.length + courses.length) % STUDIO_TIPS.length]}
                </span>
              </RuleNote>
            </div>
          </div>
        </Section>
      </div>

      <ReplyModal
        open={!!review}
        onClose={() => setReplyTo(null)}
        eyebrow={review ? `Review · ${review.course.title}` : undefined}
        title={review ? `Reply to ${review.user?.name?.split(" ")[0] ?? "this learner"}` : "Reply"}
        context={review ? `"${review.comment}"` : ""}
        onSubmit={(body) => {
          if (!review) return;
          demo.replyToReview(review.id, body);
          toast.success("Reply posted", { description: `It shows under the review on ${review.course.title}.` });
          setReplyTo(null);
        }}
      />
      <MonoMeta className="mt-16 border-t border-line pt-4">Sample data · updated {formatDate("2026-10-05T10:30:00+05:30", "datetime")}</MonoMeta>
    </div>
  );
}

/** "Riya, Anushka, Divya and 2 others are waiting" for the avatar stack (no names are visible). */
function waitingLabel(names: string[]) {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const list = rest > 0 ? `${shown.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
  return `${list} ${names.length === 1 ? "is" : "are"} waiting`;
}

/** Column heading inside a two-column Section: Inter Tight title, muted line, arrow link (same as the admin overview). */
function ColumnHead({ id, title, sub, href, linkLabel }: { id: string; title: string; sub?: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-fg pb-3">
      <div className="min-w-0">
        <h2 id={id} className="t-app-h3">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      <Button href={href} size="sm" variant="arrow">
        {linkLabel}
      </Button>
    </div>
  );
}

function QuickAction({ n, href, icon, label }: { n: number; href: string; icon: IconName; label: string }) {
  return (
    <li>
      <Link href={href} className="group/row tap flex min-h-14 min-w-0 items-center gap-4 py-3 transition-colors hf:bg-cream-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red md:gap-5">
        <Idx n={n} className="w-5" />
        <LineIcon name={icon} tone="muted" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]">{label}</span>
        <Icon name="arrow-right" strokeWidth={1.6} className="size-4 text-muted transition-[translate,color] duration-300 group-hover/row:text-fg motion-ok:group-hover/row:translate-x-1" />
      </Link>
    </li>
  );
}

/** Shared reply modal (reviews). */
export function ReplyModal({
  open,
  onClose,
  title,
  context,
  onSubmit,
  eyebrow = "Public reply",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  context?: string;
  onSubmit: (body: string) => void;
  eyebrow?: React.ReactNode;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setBody("");
    setError(null);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow={eyebrow}
      title={title}
      description={context}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            icon="check"
            onClick={() => {
              if (body.trim().length < 2) {
                setError("Write a short reply first.");
                focusFirstInvalid(document.querySelector<HTMLElement>('[role="dialog"]'));
                return;
              }
              onSubmit(body.trim());
              setBody("");
              setError(null);
            }}
          >
            Post reply
          </Button>
        </>
      }
    >
      <Field label="Your reply" hint="Public. Keep it kind and specific; thank them for the detail." error={error ?? undefined}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={600} showCount data-autofocus="" />
      </Field>
    </Modal>
  );
}
