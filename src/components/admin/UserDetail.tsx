"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ApplicationFacts,
  Avatar,
  Button,
  Card,
  CardHeader,
  DataTable,
  DescriptionList,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Rating,
  STATUS_META,
  StatGrid,
  StatTile,
  StatusPill,
  StickyActionBar,
  useIsPhone,
  type Column,
  type MenuItem,
} from "@/components/app";
import { useDb } from "@/lib/demo/store";
import {
  formatDate,
  formatINR,
  formatNumber,
  getCategory,
  getCertificates,
  getEnrolledCourses,
  getOrders,
  getPayouts,
  getTutor,
  getUser,
  plural,
  timeAgo,
  type EnrolledCourse,
  type OrderRow,
} from "@/lib/mock";
import {
  ChangeRoleModal,
  GrantCourseModal,
  RefundModal,
  SuspendModal,
} from "./modals";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  CourseCell,
  CURRENT_PERIOD,
  PhoneRow,
  PhoneThumb,
  fitColumns,
  periodLabel,
  pickSort,
  smartDate,
  splitPlan,
  useAdminId,
  useBoxWidth,
} from "./shared";
import { suspensionInfo } from "./SuspensionNote";

export function UserDetail({ userId }: { userId: string }) {
  const db = useDb();
  const adminId = useAdminId();
  const u = getUser(userId, db);
  const [roleOpen, setRoleOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [refund, setRefund] = useState<OrderRow | null>(null);

  const enrolled = useMemo(() => getEnrolledCourses(userId, db), [userId, db]);
  const orders = useMemo(
    () => getOrders({ userId, pageSize: 500 }, db).items,
    [userId, db],
  );
  const certs = useMemo(() => getCertificates(userId, db), [userId, db]);
  const tutor = getTutor(userId, db);
  const teaching = useMemo(
    () =>
      db.courses
        .filter((c) => c.tutorId === userId)
        .sort((a, b) => b.learners - a.learners),
    [db, userId],
  );
  const payouts = useMemo(
    () => (u?.role === "tutor" ? getPayouts(userId, db).slice(0, 4) : []),
    [u?.role, userId, db],
  );
  const application = db.tutorApplications
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const reviews = db.reviews.filter((r) => r.userId === userId).length;
  const decided = useMemo(
    () =>
      db.tutorApplications
        .filter((a) => a.decidedBy === userId && a.decidedAt)
        .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")),
    [db, userId],
  );
  const [leftRef, leftW] = useBoxWidth();
  const phone = useIsPhone();
  const grantRef = useRef<HTMLButtonElement>(null);
  const compact = leftW != null && leftW < COMPACT_BOX;
  const questions = db.comments.filter(
    (c) => c.userId === userId && !c.parentId,
  ).length;

  if (!u)
    return (
      <div className="app-enter">
        <PageHeader
          breadcrumbs={[
            { label: "Control room", href: "/admin" },
            { label: "People", href: "/admin/users" },
            { label: "Not found" },
          ]}
          eyebrow="People"
          eyebrowTone="purple"
          title="Person not found."
        />
        <Card>
          <EmptyState
            art="buddy"
            title="We can't find that person."
            body={`No account matches “${userId}”. They may have been removed, or the link is off by a letter.`}
            action={
              <Button href="/admin/users" icon="users">
                Back to people
              </Button>
            }
          />
        </Card>
      </div>
    );
  const self = u.id === adminId;
  const suspension = suspensionInfo(u, db);
  const spent = orders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.amount, 0);
  const first = u.name.split(" ")[0];
  const isAdmin = u.role === "admin";
  const hasSide =
    !!application || payouts.length > 0 || certs.length > 0;
  // two columns from md: a lone card, or the odd last one, spans both
  const sideCards = [!!application, payouts.length > 0, certs.length > 0];
  const shown = sideCards.filter(Boolean).length;
  const lastShown = sideCards.lastIndexOf(true);
  const sideSpan = (i: number) =>
    shown % 2 === 1 && i === lastShown ? "md:col-span-2 xl:col-span-1" : undefined;
  const profileFacts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Email",
      value: (
        <a
          href={`mailto:${u.email}`}
          className="[overflow-wrap:anywhere] underline-offset-2 hf:underline"
        >
          {u.email}
        </a>
      ),
    },
    { label: "Phone", value: u.phone ?? "Not shared" },
    { label: "City", value: u.city },
    { label: "Joined", value: formatDate(u.joinedAt, "long") },
    { label: "Last active", value: timeAgo(u.lastActiveAt) },
    ...(isAdmin ? [{ label: "Role", value: "Admin (full access)" }] : []),
    {
      label: "Tutor status",
      value:
        u.tutorStatus === "none"
          ? "Not applied"
          : (STATUS_META[u.tutorStatus]?.label ??
            u.tutorStatus.replace(/_/g, " ")),
    },
  ];

  const enrolledCols = fitColumns<EnrolledCourse>(
    [
      {
        key: "course",
        header: "Course",
        cell: (e) => (
          <span className="block min-w-0">
            <CourseCell
              course={e.course}
              href={`/admin/courses/${e.course.id}`}
              sub={
                compact
                  ? `${e.progress.percent}% done · ${STATUS_META[e.enrollment.source]?.label ?? e.enrollment.source}`
                  : e.tutor?.name
              }
            />
          </span>
        ),
        sortValue: (e) => e.course.title,
      },
      {
        key: "progress",
        header: "Progress",
        width: "150px",
        minBox: COMPACT_BOX,
        cell: (e) => (
          <span className="flex items-center gap-2.5">
            <ProgressBar
              value={e.progress.percent}
              size="sm"
              label={`${e.course.title} progress`}
              tone={e.progress.percent === 100 ? "green" : "blue"}
            />
            <span className="w-9 shrink-0 text-right text-[13px] font-bold">
              {e.progress.percent}%
            </span>
          </span>
        ),
        sortValue: (e) => e.progress.percent,
      },
      {
        key: "source",
        header: "Source",
        minBox: COMPACT_BOX,
        cell: (e) => <StatusPill status={e.enrollment.source} size="sm" />,
        sortValue: (e) => e.enrollment.source,
      },
      {
        key: "date",
        header: "Enrolled",
        minBox: 640,
        cell: (e) => (
          <span className="whitespace-nowrap">
            {formatDate(e.enrollment.createdAt)}
          </span>
        ),
        sortValue: (e) => e.enrollment.createdAt,
      },
    ],
    leftW,
  );
  const orderCols = fitColumns<OrderRow>(
    [
      {
        key: "num",
        header: "Order",
        cell: (o) =>
          compact ? (
            <span className="block min-w-0">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-bold whitespace-nowrap">{o.number}</span>
                <span className="font-bold whitespace-nowrap">
                  {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink/65">
                {o.course?.title}
              </span>
              <CompactFacts>
                <StatusPill
                  status={o.provider === "admin" ? "grant" : o.status}
                  size="sm"
                />
                <span>{smartDate(o.createdAt)}</span>
              </CompactFacts>
            </span>
          ) : (
            <span className="font-bold whitespace-nowrap">{o.number}</span>
          ),
        sortValue: (o) => o.number,
      },
      {
        key: "course",
        header: "Course",
        minBox: COMPACT_BOX,
        cell: (o) => <span className="line-clamp-1">{o.course?.title}</span>,
        sortValue: (o) => o.course?.title,
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        minBox: COMPACT_BOX,
        cell: (o) => (
          <span className="whitespace-nowrap">
            {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
          </span>
        ),
        sortValue: (o) => o.amount,
      },
      {
        key: "status",
        header: "Status",
        minBox: COMPACT_BOX,
        cell: (o) => (
          <StatusPill
            status={o.provider === "admin" ? "grant" : o.status}
            size="sm"
          />
        ),
        sortValue: (o) => o.status,
      },
      {
        key: "date",
        header: "Date",
        minBox: 640,
        cell: (o) => (
          <span className="whitespace-nowrap">{formatDate(o.createdAt)}</span>
        ),
        sortValue: (o) => o.createdAt,
      },
    ],
    leftW,
  );
  // phones: these lists are short (a handful of rows) and already arrive in a useful
  // order, so they skip the Sort select the phone list adds for sortable columns
  const unsorted = <T,>(cols: Column<T>[]) =>
    phone ? cols.map(({ sortValue, ...c }) => (void sortValue, c)) : cols;
  const enrolledSort = pickSort(
    enrolledCols,
    { key: "date", dir: "desc" },
    { key: "course", dir: "asc" },
  );
  const orderSort = pickSort(
    orderCols,
    { key: "date", dir: "desc" },
    { key: "num", dir: "desc" },
  );

  return (
    <div className="app-enter">
      <PageHeader
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "People", href: "/admin/users" },
          { label: u.name },
        ]}
        eyebrow={
          u.role === "tutor"
            ? "Tutor"
            : u.role === "admin"
              ? "Admin"
              : "Learner"
        }
        eyebrowTone={
          u.role === "tutor"
            ? "turquoise"
            : u.role === "admin"
              ? "purple"
              : "hotpink"
        }
        title={u.name}
        description={u.headline ?? `${u.email} · ${u.city}`}
        meta={
          <>
            <StatusPill status={u.role} />
            <StatusPill status={u.status} />
            {u.tutorStatus === "pending" && (
              <StatusPill status="pending" label="Applied to teach" />
            )}
            <span className="text-[13px] font-semibold text-ink/55">
              Joined {formatDate(u.joinedAt)} · active {timeAgo(u.lastActiveAt)}
            </span>
          </>
        }
        actions={
          <>
            {!isAdmin && (
              <Button
                ref={grantRef}
                variant="accent"
                icon="unlock"
                onClick={() => setGrantOpen(true)}
              >
                Grant course access
              </Button>
            )}
            {isAdmin && self && (
              <Button
                variant="secondary"
                icon="settings"
                href="/admin/settings"
              >
                Platform settings
              </Button>
            )}
            {!self && (
              <Button
                variant="secondary"
                icon="switch"
                onClick={() => setRoleOpen(true)}
              >
                Change role
              </Button>
            )}
            {!self && (
              <Button
                variant={u.status === "suspended" ? "success" : "ghost"}
                icon={u.status === "suspended" ? "refresh" : "lock"}
                onClick={() => setSuspendOpen(true)}
              >
                {u.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            )}
          </>
        }
      />

      {u.status === "suspended" && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-card bg-[#ffe1d4] px-5 py-4 text-[#8a2600]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              {first} is suspended. They can&apos;t sign in, buy or post until
              you reactivate them.
            </p>
            {suspension ? (
              <p className="mt-1 text-[14px] font-medium break-words">
                Suspended by {suspension.by} · {suspension.at}
                {suspension.note ? (
                  <>: “{suspension.note}”</>
                ) : (
                  ". No note left."
                )}
              </p>
            ) : (
              <p className="mt-1 text-[14px] font-medium opacity-80">
                Suspended before this demo started, so there&apos;s no note on
                file.
              </p>
            )}
          </div>
          {/* phones: the header right above already has Reactivate */}
          <span className="hidden sm:block">
            <Button
              size="sm"
              variant="success"
              icon="refresh"
              onClick={() => setSuspendOpen(true)}
            >
              Reactivate
            </Button>
          </span>
        </div>
      )}

      <StatGrid className="mb-6">
        {u.role === "tutor" ? (
          <>
            <StatTile
              label="Courses"
              value={teaching.length}
              tone="cyan"
              icon="layers"
              hint={`${teaching.filter((c) => c.status === "published").length} published`}
            />
            <StatTile
              label="Learners"
              value={formatNumber(tutor?.learners ?? 0)}
              tone="sun"
              icon="users"
            />
            <StatTile
              label="Rating"
              value={tutor?.rating ? tutor.rating.toFixed(1) : "New"}
              tone="mint"
              icon="star"
              hint={`${tutor?.reviewCount ?? 0} reviews`}
            />
            <StatTile
              label="Revenue share"
              value={`${Math.round((tutor?.revenueShare ?? 0.7) * 100)}%`}
              tone="white"
              icon="wallet"
              hint="kept by the tutor"
            />
          </>
        ) : isAdmin ? (
          <>
            <StatTile
              label="Applications decided"
              value={decided.length}
              tone="lilac"
              icon="briefcase"
              hint={
                decided[0]?.decidedAt
                  ? `Latest ${timeAgo(decided[0].decidedAt)}`
                  : "None yet"
              }
            />
            <StatTile
              label="Approved"
              value={decided.filter((a) => a.status === "approved").length}
              tone="mint"
              icon="check-circle"
              hint="New tutors welcomed"
            />
            <StatTile
              label="Sent back or rejected"
              value={decided.filter((a) => a.status !== "approved").length}
              tone="butter"
              icon="arrow-left"
            />
            <StatTile
              label="Last active"
              value={timeAgo(u.lastActiveAt).replace(/ ago$/, "")}
              tone="white"
              icon="clock"
              hint="ago"
            />
          </>
        ) : (
          <>
            <StatTile
              label="Courses"
              value={enrolled.length}
              tone="blush"
              icon="book"
              hint={`${enrolled.filter((e) => e.progress.percent === 100).length} finished`}
            />
            <StatTile
              label="Total spent"
              value={formatINR(spent)}
              tone="sun"
              icon="wallet"
            />
            <StatTile
              label="Certs earned"
              value={certs.length}
              tone="mint"
              icon="award"
            />
            <StatTile
              label="Q&A + reviews"
              value={questions + reviews}
              tone="white"
              icon="chat"
              hint={`${plural(questions, "question")}, ${plural(reviews, "review")}`}
            />
          </>
        )}
      </StatGrid>

      {/* Profile first in the DOM so phones/tablets see contact details up top;
          from xl it sits at the top of the side column. */}
      <div className="grid gap-4 md:gap-6 xl:grid-cols-3 xl:grid-rows-[auto_1fr]">
        <Card className="min-w-0 xl:col-start-3 xl:row-start-1">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={u.name} src={u.avatar} tone={u.tone} size="lg" />
            <div className="min-w-0">
              <p className="truncate t-app-h3">{u.name}</p>
              <p className="truncate text-[13px] font-medium text-ink/60">
                {u.id}
              </p>
            </div>
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-1">
            {profileFacts.map((f) => (
              <div
                key={f.label}
                className="flex min-w-0 items-start justify-between gap-4 border-t border-ink/[0.07] py-2.5"
              >
                <dt className="shrink-0 t-small text-ink/60">{f.label}</dt>
                <dd className="min-w-0 text-right t-small font-semibold">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <div
          ref={leftRef}
          className="min-w-0 space-y-4 md:space-y-6 xl:col-span-2 xl:col-start-1 xl:row-span-2 xl:row-start-1"
        >
          {isAdmin && (
            <Card padding="none" className="overflow-hidden">
              <div className="p-5 pb-0 md:p-6 md:pb-0">
                <CardHeader
                  title="Recent decisions"
                  description="Tutor applications this admin answered."
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      href="/admin/tutors?status=all"
                      iconRight="arrow-right"
                    >
                      All applications
                    </Button>
                  }
                />
              </div>
              {decided.length ? (
                <ul className="divide-y divide-ink/[0.07]">
                  {decided.slice(0, 6).map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3 md:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/tutors?app=${a.id}`}
                          className="font-bold underline-offset-2 hf:underline"
                        >
                          {a.name}
                        </Link>
                        <p className="truncate text-[13px] font-medium text-ink/60">
                          <span className="whitespace-nowrap">
                            {smartDate(a.decidedAt!)}
                          </span>{" "}
                          · {a.subject}
                        </p>
                      </div>
                      <StatusPill status={a.status} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  art="buddy"
                  title="No decisions yet."
                  body="Applications they approve, reject or send back show up here."
                />
              )}
            </Card>
          )}
          {u.role === "tutor" && (
            <Card padding="none" className="overflow-hidden">
              <div className="p-5 pb-0 md:p-6 md:pb-0">
                <CardHeader
                  title="Courses they teach"
                  action={
                    tutor && (
                      <Button
                        size="sm"
                        variant="ghost"
                        href={`/tutors/${tutor.slug}`}
                        icon="external"
                      >
                        Public profile
                      </Button>
                    )
                  }
                />
              </div>
              {teaching.length ? (
                <ul className="divide-y divide-ink/[0.07]">
                  {teaching.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3 md:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <CourseCell
                          course={c}
                          href={`/admin/courses/${c.id}`}
                          sub={`${getCategory(c.categoryId, db)?.name ?? ""} · ${formatINR(c.price)} · ${formatNumber(c.learners)} learners`}
                        />
                      </div>
                      {c.status === "published" && (
                        <span className="hidden shrink-0 sm:inline-flex">
                          <Rating value={c.rating} size="sm" />
                        </span>
                      )}
                      <StatusPill status={c.status} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  art="buddy"
                  title="No courses yet."
                  body="Their first draft will show up here."
                />
              )}
            </Card>
          )}

          {(u.role === "student" || enrolled.length > 0) && (
            <section>
              <h2 className="mb-4 t-app-h2">
                {u.role === "tutor" ? "Courses they're taking" : "Learning"}
              </h2>
              <DataTable<EnrolledCourse>
                caption="Enrolled courses"
                rows={enrolled}
                getRowId={(e) => e.enrollment.id}
                pageSize={6}
                dense
                minWidth={compact ? 0 : 520}
                className={compact ? COMPACT_TABLE : undefined}
                columns={unsorted(enrolledCols)}
                rowHref={phone ? (e) => `/admin/courses/${e.course.id}` : undefined}
                mobileRow={(e) => (
                  <PhoneRow
                    leading={<PhoneThumb src={e.course.thumbnail} />}
                    title={e.course.title}
                    clampTitle
                    leadingHideTiny
                    lines={[
                      <span key="p" className="mt-1 flex items-center gap-2">
                        <ProgressBar
                          value={e.progress.percent}
                          size="sm"
                          label={`${e.course.title} progress`}
                          tone={e.progress.percent === 100 ? "green" : "blue"}
                          className="max-w-[120px] flex-1"
                        />
                        <span className="shrink-0 font-bold text-ink/75">{e.progress.percent}%</span>
                        <span className="min-w-0 truncate">
                          · {STATUS_META[e.enrollment.source]?.label ?? e.enrollment.source}
                        </span>
                      </span>,
                    ]}
                  />
                )}
                empty={{
                  title: "No courses yet.",
                  body: `Grant ${first} a course to get them started.`,
                  action: (
                    <Button
                      size="sm"
                      icon="unlock"
                      onClick={() => setGrantOpen(true)}
                    >
                      Grant course access
                    </Button>
                  ),
                }}
                key={enrolledSort.sortKey}
                initialSort={enrolledSort.initialSort}
              />
            </section>
          )}

          {(u.role === "student" || orders.length > 0) && (
            <section>
              <h2 className="mb-4 t-app-h2">Orders</h2>
              <DataTable<OrderRow>
                caption="Orders"
                rows={orders}
                getRowId={(o) => o.id}
                pageSize={6}
                dense
                minWidth={compact ? 0 : 520}
                className={compact ? COMPACT_TABLE : undefined}
                columns={unsorted(orderCols)}
                rowHref={phone ? (o) => `/admin/orders?q=${o.number}` : undefined}
                mobileRow={(o) => (
                  <PhoneRow
                    title={o.number}
                    lines={[
                      o.course?.title,
                      [
                        <StatusPill key="s" status={o.provider === "admin" ? "grant" : o.status} />,
                        smartDate(o.createdAt),
                      ],
                    ]}
                    trailing={o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                  />
                )}
                rowActions={(o) => [
                  {
                    label: "Open in orders",
                    icon: "receipt",
                    href: `/admin/orders?q=${o.number}`,
                  },
                  {
                    label: "Issue refund",
                    icon: "refresh",
                    danger: true,
                    disabled: o.status !== "paid" || o.provider === "admin",
                    onSelect: () => setRefund(o),
                  },
                ]}
                empty={{ title: "No orders.", body: "Nothing bought yet." }}
                key={orderSort.sortKey}
                initialSort={orderSort.initialSort}
              />
            </section>
          )}
        </div>

        {hasSide && (
        <div className="grid min-w-0 content-start items-start gap-4 md:grid-cols-2 md:gap-6 xl:col-start-3 xl:row-start-2 xl:grid-cols-1">
          {application && (
            <Card tone="butter" className={sideSpan(0)}>
              <CardHeader
                as="h3"
                title="Teaching application"
                action={<StatusPill status={application.status} size="sm" />}
              />
              <p className="text-[15px] font-bold">
                {splitPlan(application).title}
              </p>
              <p className="mt-1 t-small opacity-75">
                {application.subject} · sent{" "}
                {formatDate(application.submittedAt)}
              </p>
              {application.decisionNote && (
                <p className="mt-3 rounded-tag bg-white/70 p-3 t-small">
                  “{application.decisionNote}”
                </p>
              )}
              <ApplicationFacts
                app={application}
                headingAs="h4"
                className="mt-4"
              />
              <Button
                size="sm"
                variant="primary"
                className="mt-4"
                href={`/admin/tutors?app=${application.id}`}
              >
                Open application
              </Button>
            </Card>
          )}

          {payouts.length > 0 && (
            <Card className={sideSpan(1)}>
              <CardHeader
                as="h3"
                title="Recent payouts"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    href="/admin/payouts"
                    iconRight="arrow-right"
                  >
                    All
                  </Button>
                }
              />
              <DescriptionList
                items={payouts.map((p) => ({
                  label:
                    p.period === CURRENT_PERIOD
                      ? `${periodLabel(p.period, true)} (projected)`
                      : periodLabel(p.period, true),
                  value: (
                    <span className="inline-flex items-center gap-2">
                      {formatINR(p.net)}
                      <StatusPill status={p.status} size="sm" />
                    </span>
                  ),
                }))}
              />
            </Card>
          )}

          {certs.length > 0 && (
            <Card className={sideSpan(2)}>
              <CardHeader as="h3" title="Certificates" />
              <ul className="space-y-2.5">
                {certs.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 text-[14px]"
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {c.course.title}
                    </span>
                    <Link
                      href={`/certificates/${c.code}`}
                      className="shrink-0 font-mono text-[13px] font-bold underline-offset-2 hf:underline"
                    >
                      {c.code}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        )}
      </div>

      {/* phones: once the header actions scroll away, the main action rides in the
          thumb zone; Change role / Suspend sit behind "…" */}
      {!isAdmin && (
        <StickyActionBar
          watch={grantRef}
          title={u.name}
          sub={`${STATUS_META[u.role]?.label ?? u.role} · ${STATUS_META[u.status]?.label ?? u.status}`}
          label={`Actions for ${u.name}`}
        >
          {!self && (
            <DropdownMenu
              label={`More actions for ${u.name}`}
              trigger={<Icon name="more" className="size-5" />}
              triggerClassName="tap grid size-11 place-items-center rounded-full bg-cream text-ink"
              items={
                [
                  { label: "Change role", icon: "switch", onSelect: () => setRoleOpen(true) },
                  u.status === "suspended"
                    ? { label: "Reactivate", icon: "refresh", onSelect: () => setSuspendOpen(true) }
                    : { label: "Suspend", icon: "lock", danger: true, onSelect: () => setSuspendOpen(true) },
                ] satisfies MenuItem[]
              }
            />
          )}
          <Button variant="accent" icon="unlock" className="h-12" onClick={() => setGrantOpen(true)}>
            Grant access
          </Button>
        </StickyActionBar>
      )}

      <ChangeRoleModal
        open={roleOpen}
        userId={u.id}
        onClose={() => setRoleOpen(false)}
      />
      <SuspendModal
        open={suspendOpen}
        userIds={[u.id]}
        onClose={() => setSuspendOpen(false)}
      />
      <GrantCourseModal
        open={grantOpen}
        userIds={[u.id]}
        onClose={() => setGrantOpen(false)}
      />
      <RefundModal order={refund} onClose={() => setRefund(null)} />
    </div>
  );
}

