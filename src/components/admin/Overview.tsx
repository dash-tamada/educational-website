"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  BarChart,
  Button,
  Card,
  Donut,
  EmptyState,
  LineChart,
  PageHeader,
  ProgressBar,
  Rating,
  Section,
  Segmented,
  StatGrid,
  StatTile,
  StatusPill,
  type IconName,
} from "@/components/app";
import { LineIcon, MonoMeta, RuleNote, pad2 } from "@/components/tutor/editorial";
import { useDb } from "@/lib/demo/store";
import {
  formatCompact,
  formatDate,
  formatINR,
  formatNumber,
  getCategory,
  getCourseById,
  getCourseStats,
  getOrders,
  getPlatformSeries,
  getPlatformStats,
  getTopCourses,
  getTutorApplications,
  getUser,
  getUsers,
  plural,
  timeAgo,
  type Db,
  type Course,
} from "@/lib/mock";
import { wasLive } from "./reviewKit";
import { CourseCell, PersonCell, QueueTile, STRETCH } from "./shared";

/** ruled list under a column head (the head draws the ink rule) */
const LIST = "divide-y divide-line border-b border-line";

/** "2 courses sent back" / "1 course unpublished" / "1 course sent back and 1 unpublished" */
function sentBackLabel(courses: Course[]) {
  const unpub = courses.filter(wasLive).length;
  const back = courses.length - unpub;
  if (!unpub) return `${plural(back, "course")} sent back`;
  if (!back) return `${plural(unpub, "course")} unpublished`;
  return `${plural(back, "course")} sent back and ${unpub} unpublished`;
}

type Range = "7d" | "30d" | "12m";

export function AdminOverview() {
  const db = useDb();
  const [range, setRange] = useState<Range>("12m");
  const stats = useMemo(() => getPlatformStats(db), [db]);
  const series = useMemo(() => getPlatformSeries(range), [range]);
  const monthly = range === "12m";
  const revenue = (monthly ? series.revenue.slice(0, -1) : series.revenue).map(
    (p) => ({ label: p.label, value: p.value }),
  );
  const revenueTotal = revenue.reduce((s, p) => s + p.value, 0);
  const signups = (monthly ? series.signups.slice(0, -1) : series.signups).map(
    (p) => ({ label: p.label, value: p.value }),
  );
  const enrollments = (
    monthly ? series.enrollments.slice(0, -1) : series.enrollments
  ).map((p) => ({ label: p.label, value: p.value }));

  const pendingApps = useMemo(() => getTutorApplications("pending", db), [db]);
  const inReview = useMemo(
    () =>
      db.courses
        .filter((c) => c.status === "in_review")
        .sort((a, b) =>
          (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""),
        ),
    [db],
  );
  const sentBack = useMemo(
    () => db.courses.filter((c) => c.status === "rejected"),
    [db],
  );
  const top = useMemo(() => getTopCourses(5, db), [db]);
  const orders = useMemo(() => getOrders({ pageSize: 6 }, db).items, [db]);
  const latest = useMemo(
    () => getUsers({ sort: "newest", pageSize: 7 }, db).items,
    [db],
  );
  const roles = useMemo(() => {
    const c = { student: 0, tutor: 0, admin: 0 };
    for (const u of db.users) c[u.role]++;
    return c;
  }, [db]);
  const activity = useMemo(() => buildActivity(db), [db]);
  // September vs August enrollments (the last monthly point is October so far)
  const monthlyEnroll = getPlatformSeries("12m").enrollments;
  const enrollSep = monthlyEnroll[monthlyEnroll.length - 2]?.value ?? 0;
  const enrollAug = monthlyEnroll[monthlyEnroll.length - 3]?.value ?? 0;
  const enrollDelta = enrollAug
    ? Math.round(((enrollSep - enrollAug) / enrollAug) * 1000) / 10
    : undefined;

  const rangeLabel =
    range === "7d"
      ? "last 7 days"
      : range === "30d"
        ? "last 30 days"
        : "last 12 months";
  const attention = [
    {
      label: "Tutor applications pending",
      count: stats.pendingApplications,
      href: "/admin/tutors",
      cta: "Oldest first is kindest",
    },
    {
      label: "Courses awaiting review",
      count: stats.coursesInReview,
      href: "/admin/courses?tab=review",
      cta: "Watch the preview, run the checks",
    },
    {
      label: "Reports to resolve",
      count: stats.openReports,
      href: "/admin/reports",
      cta: "Resolve or dismiss",
    },
    {
      label: "Refunds to check",
      count: stats.refundRequests,
      href: "/admin/orders?status=refund_requests",
      cta: "Check the policy, then decide",
    },
  ];
  const waiting = attention.reduce((s, a) => s + a.count, 0);

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room"
        title={
          <>
            The control <em>room</em>.
          </>
        }
        description="A quick read on people, courses, money and the bits asking for attention."
        actions={
          <>
            <Button href="/admin/settings" variant="outline" icon="settings">
              Settings
            </Button>
            <Button
              href="/admin/courses?tab=review"
              variant="red"
              iconRight="arrow-right"
            >
              Review queue
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatTile
          index="01"
          label="Learners"
          value={formatCompact(stats.totalLearners)}
          delta={stats.learnersDelta}
          hint="across all courses"
          href="/admin/users"
        />
        <StatTile
          index="02"
          label="Revenue · Sep"
          value={formatINR(stats.monthlyRevenue, { compact: true })}
          delta={stats.revenueDelta}
          hint="vs August"
          href="/admin/payments"
        />
        <StatTile
          index="03"
          label="Enrollments · Sep"
          value={formatNumber(enrollSep)}
          delta={enrollDelta}
          hint="vs August"
          href="/admin/payments"
        />
        <StatTile
          index="04"
          label="Pending approvals"
          value={stats.pendingApplications + stats.coursesInReview}
          hint={`${plural(stats.pendingApplications, "tutor")} · ${plural(stats.coursesInReview, "course")}`}
          href={
            stats.pendingApplications
              ? "/admin/tutors"
              : "/admin/courses?tab=review"
          }
        />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          index="01"
          label="Needs you today"
          id="attn-title"
          note={
            waiting
              ? "Decisions only an admin can make. Oldest first is kindest."
              : "Nothing waiting. Go get a chai."
          }
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
            {/* the page's one ink moment */}
            <Card variant="ink" className="flex flex-col">
              <p className="t-label text-ash">Waiting on a decision</p>
              <p className="t-display-xl mt-5 leading-[0.8] tabular-nums">
                {pad2(waiting)}
              </p>
              <p className="mt-4 max-w-[26ch] t-small text-ash">
                {waiting
                  ? `${plural(waiting, "thing")} across applications, reviews, reports and refunds.`
                  : "Every queue is clear."}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-8">
                <Button
                  href="/admin/reports"
                  size="sm"
                  variant="cream"
                  iconRight="arrow-right"
                >
                  View reports
                </Button>
                <Button href="/admin/payouts" size="sm" variant="outline">
                  Payouts
                </Button>
              </div>
            </Card>
            <ul
              aria-labelledby="attn-title"
              className="divide-y divide-line self-start border-y border-line border-t-fg"
            >
              {attention.map((a, i) => (
                <li key={a.label}>
                  <QueueTile
                    index={i + 1}
                    label={a.label}
                    count={a.count}
                    href={a.href}
                    cta={a.cta}
                  />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section
          index="02"
          label="Revenue"
          note={
            monthly
              ? `${formatINR(revenueTotal, { compact: true })} over the ${rangeLabel}. October so far: ${formatINR(stats.monthToDateRevenue, { compact: true })}.`
              : `${formatINR(revenueTotal, { compact: true })} over the ${rangeLabel}.`
          }
          title={formatINR(revenueTotal, { compact: true })}
          action={
            <Segmented
              label="Chart range"
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: "7 days" },
                { value: "30d", label: "30 days" },
                { value: "12m", label: "12 months" },
              ]}
            />
          }
        >
          <BarChart
            data={revenue}
            tone="ink"
            highlight={revenue.length - 1}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel={`Revenue, ${rangeLabel}`}
            height={280}
          />
        </Section>

        <Section
          index="03"
          label="Growth"
          note={`New accounts and course enrollments, ${rangeLabel}. Platform-wide sample analytics.`}
          title="Signups and enrollments."
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_240px]">
            <LineChart
              series={[
                { name: "Signups", tone: "hotpink", data: signups },
                { name: "Enrollments", tone: "ink", data: enrollments },
              ]}
              area
              ariaLabel={`Signups and enrollments, ${rangeLabel}`}
              format={(n) => formatNumber(Math.round(n))}
              height={262}
            />
            <div className="min-w-0 border-t border-line pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
              <p className="mb-4 t-label text-muted">People by role</p>
              <Donut
                data={[
                  { label: "Students", value: roles.student, tone: "ink" },
                  { label: "Tutors", value: roles.tutor, tone: "hotpink" },
                  { label: "Admins", value: roles.admin, tone: "olive" },
                ]}
                size={160}
                centerLabel="accounts"
                centerValue={formatNumber(db.users.length)}
                ariaLabel="Accounts by role"
              />
              <p className="mt-4 t-small text-muted">
                {stats.suspendedUsers
                  ? `${plural(stats.suspendedUsers, "account")} suspended right now.`
                  : "No suspended accounts."}{" "}
                <Link
                  href="/admin/users?filter=suspended"
                  className="font-medium text-fg underline underline-offset-[3px] hf:decoration-red"
                >
                  See who
                </Link>
              </p>
            </div>
          </div>
        </Section>

        <Section
          index="04"
          label="Queues"
          note="Who wants to teach, and what's waiting for a green light."
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
            <section aria-labelledby="apps-title" className="min-w-0">
              <ColumnHead
                id="apps-title"
                title="Who wants to teach?"
                sub={
                  pendingApps.length
                    ? `${plural(pendingApps.length, "application")} waiting.`
                    : "Every application has an answer."
                }
                href="/admin/tutors"
                linkLabel="All"
              />
              {pendingApps.length ? (
                <ul className={LIST}>
                  {[...pendingApps]
                    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                    .slice(0, 4)
                    .map((a) => {
                      const cat = getCategory(a.categoryId, db);
                      return (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 py-3.5"
                        >
                          <Avatar
                            name={a.name}
                            tone={getUser(a.userId, db)?.tone ?? "sun"}
                            size="md"
                            decorative
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                              {a.name}
                            </p>
                            <p className="truncate text-[13px] text-muted">
                              {a.subject}
                              {cat ? ` · ${cat.name}` : ""}
                            </p>
                            <MonoMeta>Sent {timeAgo(a.submittedAt)}</MonoMeta>
                          </div>
                          <Button
                            href={`/admin/tutors?app=${a.id}`}
                            size="sm"
                            variant="outline"
                            aria-label={`Review ${a.name}'s application`}
                          >
                            Review
                          </Button>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <EmptyState
                  compact
                  art="none"
                  align="start"
                  eyebrow="Queue clear"
                  title="Queue's empty."
                  body="New applications from /become-tutor land here."
                  className="!px-0"
                />
              )}
            </section>

            <section aria-labelledby="review-title" className="min-w-0">
              <ColumnHead
                id="review-title"
                title="Waiting for a green light"
                sub={
                  inReview.length
                    ? `${plural(inReview.length, "course")} in review.`
                    : "Nothing in review right now."
                }
                href="/admin/courses?tab=review"
                linkLabel="Queue"
              />
              {inReview.length ? (
                <ul className={LIST}>
                  {inReview.slice(0, 4).map((c) => {
                    const s = getCourseStats(c.id, db);
                    return (
                      <li key={c.id} className="flex items-center gap-3 py-3.5">
                        <div className="min-w-0 flex-1">
                          <CourseCell
                            course={c}
                            sub={
                              <>
                                <span className="block truncate">
                                  {getUser(c.tutorId, db)?.name ?? "Unknown"} ·{" "}
                                  {plural(s.videos, "video")},{" "}
                                  {plural(s.quizzes, "test")}
                                </span>
                                <MonoMeta as="span" className="block">
                                  Sent{" "}
                                  {c.submittedAt
                                    ? timeAgo(c.submittedAt)
                                    : "recently"}
                                </MonoMeta>
                              </>
                            }
                          />
                        </div>
                        <Button
                          href={`/admin/courses/${c.id}`}
                          size="sm"
                          variant="outline"
                          aria-label={`Review ${c.title}`}
                        >
                          Review
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  compact
                  art="none"
                  align="start"
                  eyebrow="Queue clear"
                  title="All caught up."
                  body="When a tutor hits “Submit for review”, it shows up here."
                  className="!px-0"
                />
              )}
              {sentBack.length > 0 && (
                <RuleNote
                  tone="quiet"
                  className="tap relative mt-5"
                  label={`${sentBackLabel(sentBack)}`}
                >
                  Waiting on the tutor: {sentBack.map((c) => c.title).join(", ")}.{" "}
                  <Link
                    href="/admin/courses?tab=review#sentback-title"
                    className={clsx(
                      "font-medium whitespace-nowrap text-fg underline underline-offset-[3px] hf:decoration-red",
                      STRETCH,
                    )}
                  >
                    See notes
                  </Link>
                </RuleNote>
              )}
            </section>
          </div>
        </Section>

        <Section
          index="05"
          label="Top courses"
          id="top-title"
          note="Most learners, all time."
          action={
            <Button href="/admin/courses?tab=all" size="sm" variant="arrow">
              All courses
            </Button>
          }
        >
          <ol aria-labelledby="top-title" className="border-t border-fg">
            {top.map((c, i) => {
              const max = top[0]?.learners || 1;
              return (
                <li
                  key={c.id}
                  className="tap relative grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 transition-colors hf:bg-cream-2/60 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,14rem)_auto] md:gap-x-6"
                >
                  <span className="t-display-s text-muted tabular-nums">
                    {pad2(i + 1)}
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className={clsx(
                        "block truncate font-heading text-[16px] font-semibold tracking-[-0.02em] underline-offset-[3px] hf:underline md:text-[17px]",
                        STRETCH,
                      )}
                    >
                      {c.title}
                    </Link>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {getUser(c.tutorId, db)?.name}
                    </span>
                  </span>
                  <span className="col-span-2 col-start-2 flex min-w-0 items-center gap-3 md:col-span-1 md:col-start-auto">
                    <ProgressBar
                      value={(c.learners / max) * 100}
                      size="sm"
                      label={`${c.title}: ${formatCompact(c.learners)} learners`}
                    />
                    <Rating value={c.rating} size="sm" className="shrink-0" />
                  </span>
                  <span className="row-start-1 col-start-3 text-right font-mono text-[13px] whitespace-nowrap tabular-nums md:col-start-4">
                    {formatCompact(c.learners)}
                    <span className="ml-1 text-muted max-sm:hidden">learners</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section
          index="06"
          label="Latest"
          note="Fresh orders and new faces."
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
            <section aria-labelledby="orders-title" className="min-w-0">
              <ColumnHead
                id="orders-title"
                title="Recent orders"
                href="/admin/orders"
                linkLabel="Orders"
              />
              <ul className={LIST}>
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">
                        {o.user?.name ?? "Unknown"}
                      </p>
                      <p className="truncate text-[13px] text-muted">
                        {o.course?.title ?? "Course"} · {timeAgo(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-heading text-[15px] font-semibold tabular-nums">
                        {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                      </span>
                      <StatusPill
                        status={o.provider === "admin" ? "grant" : o.status}
                        size="sm"
                        variant="text"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="signups-title" className="min-w-0">
              <ColumnHead
                id="signups-title"
                title="Latest signups"
                href="/admin/users"
                linkLabel="People"
              />
              <ul className={LIST}>
                {latest.map((u) => (
                  <li
                    key={u.id}
                    className="tap relative flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <PersonCell
                        stretch
                        user={u}
                        href={`/admin/users/${u.id}`}
                        sub={`${u.city} · joined ${timeAgo(u.joinedAt)}`}
                      />
                    </div>
                    <StatusPill status={u.role} size="sm" variant="text" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Section>

        <Section
          index="07"
          label="Activity"
          id="activity-title"
          note="What happened lately, newest first. Sample activity."
        >
          <ol aria-labelledby="activity-title" className="border-t border-fg">
            {activity.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-line py-3.5 sm:grid-cols-[6.5rem_1.25rem_minmax(0,1fr)] md:gap-x-5"
              >
                <MonoMeta as="span" className="whitespace-nowrap">
                  <time dateTime={a.at} title={formatDate(a.at, "datetime")}>
                    {timeAgo(a.at)}
                  </time>
                </MonoMeta>
                <LineIcon
                  name={a.icon}
                  tone="muted"
                  className="!size-4 self-center max-sm:hidden"
                />
                <p className="min-w-0 text-[14.5px] leading-snug">
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="font-semibold underline-offset-[3px] hf:underline"
                    >
                      {a.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">{a.title}</span>
                  )}{" "}
                  <span className="text-muted">{a.body}</span>
                </p>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}

/** Column heading inside a two-column Section: Inter Tight title, muted line, arrow link. */
function ColumnHead({
  id,
  title,
  sub,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  sub?: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-fg pb-3">
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

/* ----------------------------------------------------------------------------- activity */
interface Activity {
  id: string;
  at: string;
  icon: IconName;
  title: string;
  body: string;
  href?: string;
}

function buildActivity(db: Db): Activity[] {
  const out: Activity[] = [];
  for (const o of db.orders) {
    const c = getCourseById(o.courseId, db);
    const u = getUser(o.userId, db);
    if (o.status === "refunded" && o.refundedAt)
      out.push({
        id: `rf${o.id}`,
        at: o.refundedAt,
        icon: "refresh",
        title: `${o.number} refunded`,
        body: `${formatINR(o.amount)} to ${u?.name ?? "a learner"}.`,
        href: "/admin/orders?status=refunded",
      });
    if (o.provider === "admin")
      out.push({
        id: `gr${o.id}`,
        at: o.createdAt,
        icon: "unlock",
        title: `${u?.name ?? "A learner"} got ${c?.title ?? "a course"}`,
        body: "as an admin grant.",
      });
    else if (o.status === "paid")
      out.push({
        id: `o${o.id}`,
        at: o.createdAt,
        icon: "receipt",
        title: `${u?.name ?? "Someone"} bought ${c?.title ?? "a course"}`,
        body: `for ${formatINR(o.amount)}.`,
        href: "/admin/orders",
      });
  }
  for (const u of db.users)
    out.push({
      id: `u${u.id}`,
      at: u.joinedAt,
      icon: "user",
      title: `${u.name} joined`,
      body: `from ${u.city}.`,
      href: `/admin/users/${u.id}`,
    });
  for (const a of db.tutorApplications) {
    out.push({
      id: `a${a.id}`,
      at: a.submittedAt,
      icon: "shield",
      title: `${a.name} applied to teach`,
      body: `“${a.subject}”.`,
      href: `/admin/tutors?app=${a.id}`,
    });
    if (a.decidedAt && a.status !== "pending")
      out.push({
        id: `ad${a.id}`,
        at: a.decidedAt,
        icon:
          a.status === "approved"
            ? "check-circle"
            : a.status === "rejected"
              ? "x"
              : "edit",
        title: `${a.name}'s application`,
        body:
          a.status === "approved"
            ? "was approved."
            : a.status === "rejected"
              ? "was declined."
              : "was sent back for changes.",
        href: `/admin/tutors?app=${a.id}`,
      });
  }
  for (const c of db.courses) {
    if (c.submittedAt && c.status === "in_review")
      out.push({
        id: `s${c.id}`,
        at: c.submittedAt,
        icon: "layers",
        title: c.title,
        body: "was sent for review.",
        href: `/admin/courses/${c.id}`,
      });
    if (c.publishedAt)
      out.push({
        id: `p${c.id}`,
        at: c.publishedAt,
        icon: "sparkles",
        title: c.title,
        body: "went live.",
        href: `/admin/courses/${c.id}`,
      });
  }
  for (const r of db.reports)
    out.push({
      id: `r${r.id}`,
      at: r.createdAt,
      icon: "flag",
      title: "New report",
      body: `“${r.reason}”.`,
      href: "/admin/reports",
    });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
}
