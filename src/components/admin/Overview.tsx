"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  CardHeader,
  Donut,
  EmptyState,
  Icon,
  LineChart,
  PageHeader,
  Rating,
  Segmented,
  StatGrid,
  StatTile,
  StatusPill,
  type IconName,
} from "@/components/app";
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
import { CourseCell, PersonCell, STRETCH } from "./shared";

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
      icon: "shield" as IconName,
      tone: "bg-sun",
    },
    {
      label: "Courses awaiting review",
      count: stats.coursesInReview,
      href: "/admin/courses?tab=review",
      icon: "layers" as IconName,
      tone: "bg-cyan",
    },
    {
      label: "Reports to resolve",
      count: stats.openReports,
      href: "/admin/reports",
      icon: "flag" as IconName,
      tone: "bg-blush",
    },
    {
      label: "Refunds to check",
      count: stats.refundRequests,
      href: "/admin/orders?status=refund_requests",
      icon: "receipt" as IconName,
      tone: "bg-mint",
    },
  ];
  const waiting = attention.reduce((s, a) => s + a.count, 0);

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Overview"
        eyebrowTone="purple"
        title="The control room."
        description="A quick read on people, courses, money and the bits asking for attention."
        actions={
          <>
            <Button
              href="/admin/courses?tab=review"
              variant="accent"
              iconRight="arrow-right"
            >
              Review queue
            </Button>
            <Button href="/admin/settings" variant="secondary" icon="settings">
              Settings
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatTile
          label="Learners"
          value={formatCompact(stats.totalLearners)}
          tone="sun"
          icon="users"
          delta={stats.learnersDelta}
          hint="across all courses"
          href="/admin/users"
        />
        <StatTile
          label="Revenue · Sep"
          value={formatINR(stats.monthlyRevenue, { compact: true })}
          tone="blush"
          icon="wallet"
          delta={stats.revenueDelta}
          hint="vs August"
          href="/admin/payments"
        />
        <StatTile
          label="Enrollments · Sep"
          value={formatNumber(enrollSep)}
          tone="mint"
          icon="book"
          delta={enrollDelta}
          hint="vs August"
          href="/admin/payments"
        />
        <StatTile
          label="Pending approvals"
          value={stats.pendingApplications + stats.coursesInReview}
          tone="cyan"
          icon="shield"
          hint={`${plural(stats.pendingApplications, "tutor")} · ${plural(stats.coursesInReview, "course")}`}
          href={
            stats.pendingApplications
              ? "/admin/tutors"
              : "/admin/courses?tab=review"
          }
        />
      </StatGrid>

      <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Revenue"
            description={
              monthly
                ? `${formatINR(revenueTotal, { compact: true })} over the ${rangeLabel}. October so far: ${formatINR(stats.monthToDateRevenue, { compact: true })}.`
                : `${formatINR(revenueTotal, { compact: true })} over the ${rangeLabel}.`
            }
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
          />
          <BarChart
            data={revenue}
            tone="purple"
            highlight={revenue.length - 1}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel={`Revenue, ${rangeLabel}`}
            height={280}
          />
        </Card>

        <Card as="section" className="flex flex-col" aria-labelledby="attn-title">
          <CardHeader
            id="attn-title"
            title="Needs you today"
            description={
              waiting
                ? `${plural(waiting, "thing")} waiting on a decision.`
                : "Nothing waiting. Go get a chai."
            }
          />
          <ul className="-mx-2 mb-4 space-y-1">
            {attention.map((a) => (
              <li key={a.label}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 rounded-tag px-2 py-2.5 transition-colors hf:bg-cream"
                >
                  <span
                    className={clsx(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      a.count ? a.tone : "bg-cream text-ink/45",
                    )}
                    aria-hidden
                  >
                    <Icon
                      name={a.count ? a.icon : "check"}
                      className="size-[18px]"
                      strokeWidth={2.3}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] leading-snug font-semibold break-words">
                    {a.label}
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 font-display text-[28px] leading-none font-black tabular-nums",
                      !a.count && "text-ink/30",
                    )}
                  >
                    {a.count}
                  </span>
                  <Icon
                    name="chevron-right"
                    className="size-4 shrink-0 text-ink/35 transition-colors group-hf:text-ink"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2 border-t border-ink/[0.07] pt-4">
            <Button
              href="/admin/reports"
              size="sm"
              variant="secondary"
              iconRight="arrow-right"
            >
              View reports
            </Button>
            <Button
              href="/admin/payouts"
              size="sm"
              variant="ghost"
              icon="wallet"
            >
              Payouts
            </Button>
          </div>
        </Card>

        <Card className="xl:order-last">
          <CardHeader
            title="People by role"
            description="The sample accounts you can open in People."
          />
          <Donut
            data={[
              { label: "Students", value: roles.student, tone: "hotpink" },
              { label: "Tutors", value: roles.tutor, tone: "turquoise" },
              { label: "Admins", value: roles.admin, tone: "purple" },
            ]}
            centerLabel="accounts"
            centerValue={formatNumber(db.users.length)}
            ariaLabel="Accounts by role"
          />
          <p className="mt-4 t-small text-ink/60">
            {stats.suspendedUsers
              ? `${plural(stats.suspendedUsers, "account")} suspended right now.`
              : "No suspended accounts."}{" "}
            <Link
              href="/admin/users?status=suspended"
              className="font-bold text-ink underline-offset-2 hf:underline"
            >
              See who
            </Link>
          </p>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader
            title="Signups and enrollments"
            description={`New accounts and course enrollments, ${rangeLabel}. Platform-wide sample analytics.`}
          />
          <LineChart
            series={[
              { name: "Signups", tone: "hotpink", data: signups },
              { name: "Enrollments", tone: "blue", data: enrollments },
            ]}
            area
            ariaLabel={`Signups and enrollments, ${rangeLabel}`}
            format={(n) => formatNumber(Math.round(n))}
            height={262}
          />
        </Card>

      </div>

      {/* Queues */}
      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 md:grid-cols-2">
        <Card as="section" aria-labelledby="apps-title">
          <CardHeader
            id="apps-title"
            title="Who wants to teach?"
            description={
              pendingApps.length
                ? `${plural(pendingApps.length, "application")} waiting. Oldest first is kindest.`
                : "Every application has an answer."
            }
            action={
              <Button
                href="/admin/tutors"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                All
              </Button>
            }
          />
          {pendingApps.length ? (
            <ul className="divide-y divide-ink/[0.07]">
              {[...pendingApps]
                .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                .slice(0, 4)
                .map((a) => {
                  const cat = getCategory(a.categoryId, db);
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Avatar
                        name={a.name}
                        tone={getUser(a.userId, db)?.tone ?? "sun"}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">
                          {a.name}
                        </p>
                        <p className="truncate text-[13px] font-medium text-ink/60">
                          {a.subject}
                          {cat ? ` · ${cat.name}` : ""}
                        </p>
                        <p className="text-[12.5px] font-semibold text-ink/50">
                          Sent {timeAgo(a.submittedAt)}
                        </p>
                      </div>
                      <Button
                        href={`/admin/tutors?app=${a.id}`}
                        size="sm"
                        variant="secondary"
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
              art="buddies"
              tone="mint"
              title="Queue's empty."
              body="New applications from /become-tutor land here."
            />
          )}
        </Card>

        <Card
          as="section"
          className="flex flex-col"
          aria-labelledby="review-title"
        >
          <CardHeader
            id="review-title"
            title="Courses waiting for a green light"
            description={
              inReview.length
                ? `${plural(inReview.length, "course")} in review.`
                : "Nothing in review right now."
            }
            action={
              <Button
                href="/admin/courses?tab=review"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                Queue
              </Button>
            }
          />
          {inReview.length ? (
            <ul className="divide-y divide-ink/[0.07]">
              {inReview.slice(0, 4).map((c) => {
                const s = getCourseStats(c.id, db);
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <CourseCell
                        course={c}
                        sub={
                          <>
                            <span className="block truncate">
                              {getUser(c.tutorId, db)?.name ?? "Unknown"}
                              <span className="hidden xl:inline">
                                {" "}
                                · {plural(s.videos, "video")},{" "}
                                {plural(s.quizzes, "test")}
                              </span>
                            </span>
                            <span className="block text-[12.5px] font-semibold text-ink/50">
                              Sent{" "}
                              {c.submittedAt
                                ? timeAgo(c.submittedAt)
                                : "recently"}
                            </span>
                          </>
                        }
                      />
                    </div>
                    <Button
                      href={`/admin/courses/${c.id}`}
                      size="sm"
                      variant="secondary"
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
              art="tami"
              tone="cyan"
              title="All caught up."
              body="When a tutor hits “Submit for review”, it shows up here."
            />
          )}
          {sentBack.length > 0 && (
            <div className="mt-auto pt-5">
              <div className="tap relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-tag bg-cream px-4 py-3">
                <Icon
                  name="arrow-left"
                  className="size-4 shrink-0 text-ink/45"
                />
                <p className="min-w-0 flex-1 text-[14px] leading-snug">
                  <span className="font-bold">
                    {sentBackLabel(sentBack)}
                  </span>{" "}
                  <span className="text-ink/65">
                    and waiting on the tutor:{" "}
                    {sentBack.map((c) => c.title).join(", ")}.
                  </span>
                </p>
                <Link
                  href="/admin/courses?tab=review#sentback-title"
                  className={clsx("shrink-0 text-[13px] font-bold underline-offset-2 hf:underline", STRETCH)}
                >
                  See notes
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-2 md:gap-6 xl:grid-cols-5">
        <Card
          as="section"
          className="xl:col-span-3"
          aria-labelledby="top-title"
        >
          <CardHeader
            id="top-title"
            title="Top courses"
            description="Most learners, all time."
            action={
              <Button
                href="/admin/courses?tab=all"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                All courses
              </Button>
            }
          />
          <ol className="space-y-3">
            {top.map((c, i) => {
              const max = top[0]?.learners || 1;
              return (
                <li key={c.id} className="tap relative flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center font-display text-[22px] leading-none font-black text-ink/35">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/admin/courses/${c.id}`}
                        className={clsx("truncate text-[15px] font-bold underline-offset-2 hf:underline", STRETCH)}
                      >
                        {c.title}
                      </Link>
                      <span className="shrink-0 text-[13px] font-bold">
                        {formatCompact(c.learners)} learners
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                        <div
                          className="h-full rounded-full bg-purple"
                          style={{ width: `${(c.learners / max) * 100}%` }}
                        />
                      </div>
                      <Rating value={c.rating} size="sm" className="shrink-0" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card
          as="section"
          className="xl:col-span-2"
          aria-labelledby="orders-title"
        >
          <CardHeader
            id="orders-title"
            title="Recent orders"
            action={
              <Button
                href="/admin/orders"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                Orders
              </Button>
            }
          />
          <ul className="divide-y divide-ink/[0.07]">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">
                    {o.user?.name ?? "Unknown"}
                  </p>
                  <p className="truncate text-[13px] font-medium text-ink/55">
                    {o.course?.title ?? "Course"} · {timeAgo(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[14px] font-bold">
                    {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                  </span>
                  <StatusPill
                    status={o.provider === "admin" ? "grant" : o.status}
                    size="sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 md:grid-cols-2">
        <Card as="section" aria-labelledby="signups-title">
          <CardHeader
            id="signups-title"
            title="Latest signups"
            action={
              <Button
                href="/admin/users"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                People
              </Button>
            }
          />
          <ul className="divide-y divide-ink/[0.07]">
            {latest.map((u) => (
              <li
                key={u.id}
                className="tap relative flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <PersonCell
                    stretch
                    user={u}
                    href={`/admin/users/${u.id}`}
                    sub={`${u.city} · joined ${timeAgo(u.joinedAt)}`}
                  />
                </div>
                <StatusPill status={u.role} size="sm" />
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" aria-labelledby="activity-title">
          <CardHeader
            id="activity-title"
            title="Platform activity"
            description="What happened lately, newest first."
          />
          <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-ink/[0.1]">
            {activity.map((a) => (
              <li key={a.id} className="relative flex gap-3">
                <span
                  className={clsx(
                    "relative z-[1] grid size-8 shrink-0 place-items-center rounded-full",
                    a.tone,
                  )}
                  aria-hidden
                >
                  <Icon name={a.icon} className="size-4" strokeWidth={2.3} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[14px] leading-snug">
                    {a.href ? (
                      <Link
                        href={a.href}
                        className="font-bold underline-offset-2 hf:underline"
                      >
                        {a.title}
                      </Link>
                    ) : (
                      <span className="font-bold">{a.title}</span>
                    )}{" "}
                    <span className="text-ink/70">{a.body}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-ink/45">
                    <time dateTime={a.at} title={formatDate(a.at, "datetime")}>
                      {timeAgo(a.at)}
                    </time>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex justify-end">
            <Badge tone="neutral" size="sm">
              Sample activity
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- activity */
interface Activity {
  id: string;
  at: string;
  icon: IconName;
  tone: string;
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
        tone: "bg-lilac/40",
        title: `${o.number} refunded`,
        body: `${formatINR(o.amount)} to ${u?.name ?? "a learner"}.`,
        href: "/admin/orders?status=refunded",
      });
    if (o.provider === "admin")
      out.push({
        id: `gr${o.id}`,
        at: o.createdAt,
        icon: "unlock",
        tone: "bg-[#dfe8ff]",
        title: `${u?.name ?? "A learner"} got ${c?.title ?? "a course"}`,
        body: "as an admin grant.",
      });
    else if (o.status === "paid")
      out.push({
        id: `o${o.id}`,
        at: o.createdAt,
        icon: "receipt",
        tone: "bg-mint",
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
      tone: "bg-blush",
      title: `${u.name} joined`,
      body: `from ${u.city}.`,
      href: `/admin/users/${u.id}`,
    });
  for (const a of db.tutorApplications) {
    out.push({
      id: `a${a.id}`,
      at: a.submittedAt,
      icon: "shield",
      tone: "bg-sun",
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
        tone: a.status === "approved" ? "bg-mint" : "bg-cream",
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
        tone: "bg-cyan",
        title: c.title,
        body: "was sent for review.",
        href: `/admin/courses/${c.id}`,
      });
    if (c.publishedAt)
      out.push({
        id: `p${c.id}`,
        at: c.publishedAt,
        icon: "sparkles",
        tone: "bg-sun",
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
      tone: "bg-[#ffe1d4]",
      title: "New report",
      body: `“${r.reason}”.`,
      href: "/admin/reports",
    });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
}
