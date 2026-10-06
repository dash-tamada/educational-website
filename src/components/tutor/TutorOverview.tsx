"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  formatCompact,
  formatDate,
  formatINR,
  formatNumber,
  getTutorAnalytics,
  getTutorQuestions,
  getTutorReviews,
  getTutorStats,
  itemTitle,
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
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  LineChart,
  Modal,
  PageHeader,
  ProgressBar,
  Rating,
  Segmented,
  StatGrid,
  StatTile,
  StatusPill,
  Textarea,
  toast,
} from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { CourseThumb, IconChip, biggestModuleDrop, copyText, courseMonthSales, courseRevenueLabel, focusFirstInvalid, greeting, splitPartialDay, tutorCourses, useTutorContext } from "./shared";

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
      eyebrowTone="green"
      title={`${greeting()}, ${firstName}.`}
      description="Let's make the next lesson land. Here's how your courses, learners and earnings are doing today."
      actions={
        <>
          <Button href="/tutor/courses" variant="secondary" icon="layers">
            Open course studio
          </Button>
          <Button href="/tutor/courses/new" variant="accent" icon="plus">
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
        <Card padding="lg">
          <EmptyState
            art="buddies"
            tone="mint"
            title="Your studio is ready for its first course."
            body="Pick a title, a price and a cover. You can record and upload lessons afterwards, one module at a time."
            action={
              <Button href="/tutor/courses/new" variant="accent" iconRight="arrow-right">
                Start with a title
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // The last point is partial (today up to 10:30, or October so far): keep it off the trend line and say it in words.
  const revSplit = range === "12m" ? { full: analytics.revenue.slice(0, -1), today: analytics.revenue[analytics.revenue.length - 1] ?? null } : splitPartialDay(analytics.revenue);
  const revSeries = revSplit.full.map((p) => ({ label: p.label, value: p.value }));
  const enrolSplit = splitPartialDay(a30.enrollments);
  const enrolBars = enrolSplit.full.slice(-14).map((p) => ({ label: p.label, value: p.value }));
  const review = reviews.find((r) => r.id === replyTo) ?? null;

  return (
    <div className="app-enter">
      {header}

      <StatGrid>
        <StatTile label="Learners" value={formatCompact(stats.learners)} tone="sun" icon="users" hint={`across ${stats.publishedCourses} live ${stats.publishedCourses === 1 ? "course" : "courses"}`} href="/tutor/analytics" />
        <StatTile
          label="October so far"
          value={formatINR(stats.monthEarnings, { compact: true })}
          tone="mint"
          icon="wallet"
          hint={
            stats.lastMonthEarnings
              ? `Sep ${formatINR(stats.lastMonthEarnings, { compact: true })}${stats.earningsDelta && stats.earningsDelta !== 0 ? `, ${Math.abs(stats.earningsDelta)}% ${stats.earningsDelta > 0 ? "above" : "below"} Aug` : ""}`
              : "your net earnings, 1 to 5 Oct"
          }
          href="/tutor/earnings"
        />
        <StatTile label="Average rating" value={stats.rating ? stats.rating.toFixed(1) : "New"} tone="blush" icon="star" hint={`${formatNumber(stats.reviewCount)} reviews`} />
        <StatTile label="Completion rate" value={`${completion}%`} tone="cyan" icon="check-circle" hint="across live courses" href="/tutor/analytics" />
      </StatGrid>

      {/* Nudges: the next thing to do */}
      <div className="mt-4 grid gap-3 md:mt-5 md:grid-cols-2 md:gap-4 xl:grid-cols-3 md:[&>*:nth-child(3)]:col-span-2 xl:[&>*:nth-child(3)]:col-span-1">
        {drop && drop.lost > 0 && (
          <Nudge
            icon="trend"
            chip="flame"
            title={`${Math.round(drop.pct * 100)}% of learners stop before Module ${pad2(drop.index + 1)}.`}
            body={`That's ${formatNumber(drop.lost)} people in ${drop.course.title}. Want to review the lesson just before it?`}
            href={`/tutor/analytics?course=${drop.course.id}`}
            cta="See where they drop"
          />
        )}
        <Nudge
          icon="chat"
          chip="lilac"
          title={questions.length ? `${questions.length} ${questions.length === 1 ? "question is" : "questions are"} waiting.` : "Inbox zero. Nice."}
          body={questions.length ? "Learners who get answers within a day rate courses higher." : "No unanswered questions right now."}
          href="/tutor/questions"
          cta={questions.length ? "Answer now" : "Open questions"}
          extra={
            questions.length ? (
              <AvatarGroup
                size="xs"
                max={4}
                label={waitingLabel(questions.map((q) => q.question.user?.name?.split(" ")[0] ?? "A learner"))}
                people={questions.map((q) => ({ name: q.question.user?.name ?? "Learner", tone: q.question.user?.tone }))}
              />
            ) : undefined
          }
        />
        {inProgress[0] ? (
          <Nudge
            icon={inProgress[0].status === "in_review" ? "clock" : inProgress[0].status === "rejected" ? "alert" : "edit"}
            chip={inProgress[0].status === "rejected" ? "flame" : "sun"}
            title={
              inProgress[0].status === "in_review"
                ? `${inProgress[0].title} is in review.`
                : inProgress[0].status === "rejected"
                  ? `${inProgress[0].title} needs a few fixes.`
                  : `${inProgress[0].title} is still a draft.`
            }
            body={
              inProgress[0].status === "in_review"
                ? `Sent ${timeAgo(inProgress[0].submittedAt ?? inProgress[0].updatedAt)}. Reviews take 2 to 3 working days.`
                : inProgress[0].status === "rejected"
                  ? (inProgress[0].reviewNote ?? "The review team left a note.")
                  : `Last edited ${timeAgo(inProgress[0].updatedAt)}. Pick up where you left off.`
            }
            href={`/tutor/courses/${inProgress[0].id}/builder`}
            cta={inProgress[0].status === "draft" ? "Keep building" : "Open course studio"}
          />
        ) : (
          <Nudge icon="plus" chip="mint" title="Got another course in you?" body="Learners who finish one course are the most likely to buy your next." href="/tutor/courses/new" cta="Start a new course" />
        )}
      </div>

      <div className="mt-6 grid gap-4 md:gap-5 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 md:gap-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Revenue"
              description={
                <>
                  <span className="font-bold text-ink">{formatINR(analytics.totals.revenue)}</span> gross {range === "30d" ? "in the last 30 days" : "over the last 12 months"}
                  {revSplit.today && (
                    <>
                      {" "}
                      · {range === "30d" ? "today so far" : "October so far"}: {formatINR(revSplit.today.value, { compact: true })}
                    </>
                  )}
                </>
              }
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
            />
            <LineChart series={[{ name: "Revenue", tone: "green", data: revSeries }]} area height={230} format={(n) => formatINR(n, { compact: true })} ariaLabel="Revenue over time" />
          </Card>

          <Card>
            <CardHeader
              title="Your courses"
              description={`Top sellers first · ${published.length} live · ${inProgress.length} in the works`}
              action={
                <Link href="/tutor/courses" className="inline-flex items-center gap-1 text-[13px] font-bold whitespace-nowrap text-blue hf:underline coarse:-my-3 coarse:min-h-11 coarse:text-[14px]">
                  All {courses.length} courses
                  <Icon name="arrow-right" className="size-3.5" strokeWidth={2.4} />
                </Link>
              }
            />
            <ul className="-mx-2 divide-y divide-ink/[0.07]">
              {topCourses.slice(0, 5).map((c) => {
                const byCourse = a30.byCourse.find((b) => b.courseId === c.id);
                return (
                  <li key={c.id} className="group relative flex items-center gap-3 rounded-[18px] px-2 py-3 transition-colors hf:bg-cream/70 md:gap-4">
                    <CourseThumb src={c.thumbnail} tone={c.tone} className="h-14 w-[72px] md:h-16 md:w-20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={`/tutor/courses/${c.id}/builder`} className="t-app-h3 truncate after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-blue">
                          {c.title}
                        </Link>
                        <StatusPill status={c.status} size="sm" />
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-ink/60">
                        {c.status === "published" ? (
                          <>
                            {c.learners
                              ? `${formatNumber(c.learners)} learners · ${c.rating ? `${c.rating.toFixed(1)}★` : "no ratings yet"} · ${lowerFirst(courseRevenueLabel(c))}`
                              : "Just went live · no sales yet"}
                          </>
                        ) : c.status === "archived" ? (
                          <>
                            {formatNumber(c.learners)} learners keep access · not on sale
                          </>
                        ) : (
                          <>Edited {timeAgo(c.updatedAt)} · {formatINR(c.price)}</>
                        )}
                      </p>
                    </div>
                    {byCourse && c.learners > 0 ? (
                      <div className="hidden w-32 shrink-0 sm:block">
                        <ProgressBar value={byCourse.completion} showValue label="Completion" size="sm" />
                      </div>
                    ) : (
                      <Icon name="chevron-right" className="size-5 shrink-0 text-ink/35" />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Latest reviews" description="What learners are saying. Sample reviews for the demo." />
            {reviews.length === 0 ? (
              <EmptyState compact art="tami" title="No reviews yet." body="Reviews show up here once learners finish a few lessons." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 max-sm:h-scroller max-sm:[--gutter:20px]" aria-label="Latest reviews">
                {reviews.map((r) => (
                  <li key={r.id} className="flex flex-col rounded-[20px] bg-cream/70 p-4 max-sm:w-[74vw] max-sm:max-w-[290px]">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.user?.name ?? "Learner"} tone={r.user?.tone} size="sm" decorative />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{r.user?.name ?? "Learner"}</p>
                        <p className="truncate text-[12.5px] font-semibold text-ink/55">
                          {r.course.title} · {timeAgo(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Rating value={r.rating} size="sm" showValue={false} className="mt-3" />
                    {r.title && <p className="mt-2 text-[14.5px] font-bold">{r.title}</p>}
                    <p className="t-small mt-1 line-clamp-3 text-ink/75">{r.comment}</p>
                    <div className="mt-auto pt-3">
                      {r.reply ? (
                        <p className="rounded-[14px] bg-white px-3 py-2 text-[13px] font-medium text-ink/70">
                          <span className="font-bold text-ink">You replied:</span> <span className="line-clamp-2 inline">{r.reply.body}</span>
                        </p>
                      ) : (
                        <Button size="sm" variant="secondary" icon="chat" onClick={() => setReplyTo(r.id)}>
                          Reply
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 md:gap-5">
          <Card>
            <CardHeader
              title="Enrollments"
              description={`${formatNumber(a30.totals.enrollments)} new learners in 30 days${enrolSplit.today ? ` · ${formatNumber(enrolSplit.today.value)} today so far` : ""}`}
            />
            <BarChart data={enrolBars} tone="blue" height={180} ariaLabel="New enrollments per day, last 14 full days (yesterday highlighted)" highlight={enrolBars.length - 1} />
          </Card>

          <Card>
            <CardHeader
              title="Learner questions"
              action={
                questions.length > 0 && (
                  <Link href="/tutor/questions" className="inline-flex items-center text-[13px] font-bold text-blue hf:underline coarse:-my-3 coarse:min-h-11 coarse:text-[14px]">
                    See all {questions.length}
                  </Link>
                )
              }
            />
            {questions.length === 0 ? (
              <EmptyState compact art="none" title="All caught up." body="New questions from your lessons land here." />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {questions.slice(0, 3).map((t) => (
                  <li key={t.question.id}>
                    <Link href={`/tutor/questions?focus=${t.question.id}`} className="block rounded-[18px] bg-cream/70 p-3.5 transition-colors hf:bg-butter">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.question.user?.name ?? "Learner"} tone={t.question.user?.tone} size="xs" decorative />
                        <span className="truncate text-[13px] font-bold">{t.question.user?.name}</span>
                        <span className="ml-auto shrink-0 text-[12px] font-semibold text-ink/50">{timeAgo(t.question.createdAt)}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[14px] font-medium">{t.question.body}</p>
                      <p className="mt-1.5 truncate text-[12px] font-semibold text-ink/55">{t.item ? itemTitle(t.item) : t.course.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid grid-cols-1 gap-2">
              <QuickAction href="/tutor/courses/new" icon="plus" label="Create a course" />
              {inProgress[0] && <QuickAction href={`/tutor/courses/${inProgress[0].id}/builder`} icon="edit" label={`${inProgress[0].status === "in_review" ? "Open" : "Continue"} ${inProgress[0].title}`} />}
              <QuickAction href="/tutor/analytics" icon="chart" label="Find where learners drop" />
              <QuickAction href="/tutor/earnings" icon="wallet" label="Check your next payout" />
              {tutor && <QuickAction href={`/tutors/${tutor.slug}`} icon="external" label="View your public profile" />}
              <button
                type="button"
                onClick={async () => {
                  const code = db.coupons.find((c) => c.createdBy === userId && c.active)?.code;
                  if (!code) return toast.info("No live coupon yet", { description: "Create one from a course's Pricing tab." });
                  const ok = await copyText(code);
                  toast.success(ok ? `Copied ${code}` : `Your code is ${code}`, { description: "Share it with your community for a discount." });
                }}
                className="tap flex h-12 min-w-0 items-center gap-3 rounded-full bg-cream/70 pr-4 pl-1.5 text-left text-[14.5px] font-bold transition-colors hf:bg-butter max-sm:h-[52px] max-sm:text-[15px]"
              >
                <IconChip name="ticket" tone="white" size="sm" />
                <span className="min-w-0 flex-1 truncate">Copy your coupon code</span>
                <Icon name="copy" className="size-4 text-ink/45" />
              </button>
            </div>
          </Card>

          <Card tone="sun" className="overflow-hidden">
            <div className="flex items-start gap-3">
              <Mascot title="" className="w-12 shrink-0" style={{ transform: "rotate(-8deg)" }} />
              <div className="min-w-0">
                <p className="t-eyebrow opacity-70">Studio tip</p>
                <p className="mt-2 text-[15px] leading-snug font-bold">{STUDIO_TIPS[(userId.length + courses.length) % STUDIO_TIPS.length]}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ReplyModal
        open={!!review}
        onClose={() => setReplyTo(null)}
        title={review ? `Reply to ${review.user?.name?.split(" ")[0] ?? "this learner"}` : "Reply"}
        context={review ? `"${review.comment}"` : ""}
        onSubmit={(body) => {
          if (!review) return;
          demo.replyToReview(review.id, body);
          toast.success("Reply posted", { description: `It shows under the review on ${review.course.title}.` });
          setReplyTo(null);
        }}
      />
      <p className="mt-6 text-[12.5px] font-semibold text-ink/45">Numbers and people on this page are sample data. Updated {formatDate("2026-10-05T10:30:00+05:30", "datetime")}.</p>
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

const lowerFirst = (t: string) => (t ? t[0].toLowerCase() + t.slice(1) : t);

function Nudge({
  icon,
  chip,
  title,
  body,
  href,
  cta,
  extra,
}: {
  icon: Parameters<typeof IconChip>[0]["name"];
  chip: Parameters<typeof IconChip>[0]["tone"];
  title: string;
  body: string;
  href: string;
  cta: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3">
        <IconChip name={icon} tone={chip} />
        <div className="min-w-0 flex-1">
          <p className="t-app-h3">{title}</p>
          <p className="t-small mt-1 line-clamp-3 text-ink/65">{body}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <Link href={href} className="inline-flex min-h-6 shrink-0 items-center gap-1 text-[14px] font-bold whitespace-nowrap text-blue hf:underline coarse:-my-2.5 coarse:min-h-11">
          {cta}
          <Icon name="arrow-right" className="size-4" strokeWidth={2.4} />
        </Link>
        {extra}
      </div>
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: Parameters<typeof IconChip>[0]["name"]; label: string }) {
  return (
    <Link href={href} className={clsx("tap flex h-12 min-w-0 items-center gap-3 rounded-full bg-cream/70 pr-4 pl-1.5 text-[14.5px] font-bold transition-colors hf:bg-butter max-sm:h-[52px] max-sm:text-[15px]")}>
      <IconChip name={icon} tone="white" size="sm" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Icon name="chevron-right" className="size-4 text-ink/45" />
    </Link>
  );
}

/** Shared reply modal (reviews). */
export function ReplyModal({ open, onClose, title, context, onSubmit }: { open: boolean; onClose: () => void; title: string; context?: string; onSubmit: (body: string) => void }) {
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
      title={title}
      description={context}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
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
