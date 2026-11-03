"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ApplicationFacts,
  Avatar,
  Button,
  buttonClass,
  DataTable,
  DescriptionList,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Rating,
  Section,
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
import {
  MonoMeta,
  RuleNote,
  RuledList,
  RuledRow,
  pad2,
} from "@/components/tutor/editorial";

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
          title={
            <>
              Person not <em>found</em>.
            </>
          }
        />
        <EmptyState
          art="none"
          align="start"
          eyebrow={`Error 404 · ${userId}`}
          title="We can't find that person."
          body={`No account matches “${userId}”. They may have been removed, or the link is off by a letter.`}
          action={
            <Button href="/admin/users" variant="outline" iconRight="arrow-right">
              Back to people
            </Button>
          }
          className="border-t border-fg !px-0"
        />
      </div>
    );
  const self = u.id === adminId;
  const suspension = suspensionInfo(u, db);
  const spent = orders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.amount, 0);
  const first = u.name.split(" ")[0];
  const isAdmin = u.role === "admin";
  const profileFacts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Email",
      value: (
        <a
          href={`mailto:${u.email}`}
          className="[overflow-wrap:anywhere] underline-offset-[3px] hf:underline"
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
            />
            <span className="w-9 shrink-0 text-right font-mono text-[12px] tabular-nums">
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
                <span className="font-mono text-[13px] whitespace-nowrap">{o.number}</span>
                <span className="font-heading font-semibold whitespace-nowrap tabular-nums">
                  {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
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
            <span className="font-mono text-[13px] whitespace-nowrap">{o.number}</span>
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
          <span className="font-heading font-semibold whitespace-nowrap tabular-nums">
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

  const roleWord =
    u.role === "tutor" ? "Tutor" : u.role === "admin" ? "Admin" : "Learner";
  let n = 0;
  const idx = () => pad2(++n);

  return (
    <div className="app-enter">
      <PageHeader
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "People", href: "/admin/users" },
          { label: u.name },
        ]}
        eyebrow={`${roleWord} · ${u.id}`}
        size="sm"
        title={
          <>
            {u.name}
            <em>.</em>
          </>
        }
        description={u.headline ?? `${u.email} · ${u.city}`}
        meta={
          <>
            <StatusPill status={u.role} />
            <StatusPill status={u.status} />
            {u.tutorStatus === "pending" && (
              <StatusPill status="pending" label="Applied to teach" />
            )}
            <MonoMeta as="span" className="ml-1">
              Joined {formatDate(u.joinedAt)} · active {timeAgo(u.lastActiveAt)}
            </MonoMeta>
          </>
        }
        actions={
          <>
            {isAdmin && !self && (
              <Button
                variant="outline"
                icon="switch"
                onClick={() => setRoleOpen(true)}
              >
                Change role
              </Button>
            )}
            {isAdmin && self && (
              <Button
                variant="outline"
                icon="settings"
                href="/admin/settings"
              >
                Platform settings
              </Button>
            )}
            {!isAdmin && (
              <Button
                ref={grantRef}
                variant="red"
                icon="unlock"
                onClick={() => setGrantOpen(true)}
              >
                Grant course access
              </Button>
            )}
          </>
        }
      />

      {u.status === "suspended" && (
        <RuleNote
          role="status"
          tone="red"
          icon="lock"
          className="mb-10 md:mb-14"
          label={`${first} is suspended`}
          action={
            <Button
              size="sm"
              variant="primary"
              icon="refresh"
              onClick={() => setSuspendOpen(true)}
            >
              Reactivate
            </Button>
          }
        >
          They can&apos;t sign in, buy or post until you reactivate them.{" "}
          {suspension ? (
            <>
              Suspended by {suspension.by} · {suspension.at}
              {suspension.note ? <>: “{suspension.note}”</> : ". No note left."}
            </>
          ) : (
            "Suspended before this demo started, so there's no note on file."
          )}
        </RuleNote>
      )}

      <StatGrid className="mb-14 md:mb-20">
        {u.role === "tutor" ? (
          <>
            <StatTile
              index="01"
              label="Courses"
              value={teaching.length}
              hint={`${teaching.filter((c) => c.status === "published").length} published`}
            />
            <StatTile
              index="02"
              label="Learners"
              value={formatNumber(tutor?.learners ?? 0)}
            />
            <StatTile
              index="03"
              label="Rating"
              value={tutor?.rating ? tutor.rating.toFixed(1) : "New"}
              hint={`${tutor?.reviewCount ?? 0} reviews`}
            />
            <StatTile
              index="04"
              label="Revenue share"
              value={`${Math.round((tutor?.revenueShare ?? 0.7) * 100)}%`}
              hint="kept by the tutor"
            />
          </>
        ) : isAdmin ? (
          <>
            <StatTile
              index="01"
              label="Applications decided"
              value={decided.length}
              hint={
                decided[0]?.decidedAt
                  ? `Latest ${timeAgo(decided[0].decidedAt)}`
                  : "None yet"
              }
            />
            <StatTile
              index="02"
              label="Approved"
              value={decided.filter((a) => a.status === "approved").length}
              hint="New tutors welcomed"
            />
            <StatTile
              index="03"
              label="Sent back or rejected"
              value={decided.filter((a) => a.status !== "approved").length}
            />
            <StatTile
              index="04"
              label="Last active"
              value={timeAgo(u.lastActiveAt).replace(/ ago$/, "")}
              hint="ago"
            />
          </>
        ) : (
          <>
            <StatTile
              index="01"
              label="Courses"
              value={enrolled.length}
              hint={`${enrolled.filter((e) => e.progress.percent === 100).length} finished`}
            />
            <StatTile
              index="02"
              label="Total spent"
              value={formatINR(spent)}
            />
            <StatTile index="03" label="Certs earned" value={certs.length} />
            <StatTile
              index="04"
              label="Q&A + reviews"
              value={questions + reviews}
              hint={`${plural(questions, "question")}, ${plural(reviews, "review")}`}
            />
          </>
        )}
      </StatGrid>

      <div ref={leftRef} className="space-y-14 md:space-y-20">
        <Section
          index={idx()}
          label="Profile"
          note="Contact details and where they are on Tamada."
        >
          <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
            <div className="flex items-center gap-4 md:flex-col md:items-start">
              <Avatar name={u.name} src={u.avatar} tone={u.tone} size="xl" decorative />
              <div className="min-w-0">
                <p className="t-app-h3">{u.name}</p>
                <MonoMeta>{u.id}</MonoMeta>
              </div>
            </div>
            <DescriptionList items={profileFacts} />
          </div>
        </Section>

        {isAdmin && (
          <Section
            index={idx()}
            label="Recent decisions"
            note="Tutor applications this admin answered."
            action={
              <Button size="sm" variant="arrow" href="/admin/tutors?status=all">
                All applications
              </Button>
            }
          >
            {decided.length ? (
              <RuledList>
                {decided.slice(0, 6).map((a) => (
                  <RuledRow
                    key={a.id}
                    title={a.name}
                    href={`/admin/tutors?app=${a.id}`}
                    arrow={false}
                    meta={
                      <>
                        <span className="whitespace-nowrap">
                          {smartDate(a.decidedAt!)}
                        </span>{" "}
                        · {a.subject}
                      </>
                    }
                    trailing={<StatusPill status={a.status} size="sm" />}
                  />
                ))}
              </RuledList>
            ) : (
              <EmptyState
                compact
                art="none"
                align="start"
                eyebrow="Decisions"
                title="No decisions yet."
                body="Applications they approve, reject or send back show up here."
                className="border-t border-fg !px-0"
              />
            )}
          </Section>
        )}

        {u.role === "tutor" && (
          <Section
            index={idx()}
            label="Teaching"
            note={`${plural(teaching.length, "course")}, most learners first.`}
            action={
              tutor && (
                <Button size="sm" variant="arrow" href={`/tutors/${tutor.slug}`}>
                  Public profile
                </Button>
              )
            }
          >
            {teaching.length ? (
              <RuledList>
                {teaching.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 py-4"
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
              </RuledList>
            ) : (
              <EmptyState
                compact
                art="none"
                align="start"
                eyebrow="Teaching"
                title="No courses yet."
                body="Their first draft will show up here."
                className="border-t border-fg !px-0"
              />
            )}
          </Section>
        )}

        {(u.role === "student" || enrolled.length > 0) && (
          <Section
            index={idx()}
            label={u.role === "tutor" ? "Taking" : "Learning"}
            note={`${plural(enrolled.length, "course")} enrolled.`}
          >
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
                    <span key="p" className="mt-1.5 flex items-center gap-2">
                      <ProgressBar
                        value={e.progress.percent}
                        size="sm"
                        label={`${e.course.title} progress`}
                        className="max-w-[120px] flex-1"
                      />
                      <span className="shrink-0 font-mono text-[11.5px] text-fg">{e.progress.percent}%</span>
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
          </Section>
        )}

        {(u.role === "student" || orders.length > 0) && (
          <Section
            index={idx()}
            label="Orders"
            note={`${plural(orders.length, "order")} · ${formatINR(spent)} paid.`}
          >
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
          </Section>
        )}

        {application && (
          <Section
            index={idx()}
            label="Teaching application"
            note={`${application.subject} · sent ${formatDate(application.submittedAt)}`}
            action={<StatusPill status={application.status} size="sm" />}
            title={splitPlan(application).title}
          >
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div className="min-w-0 space-y-5">
                {application.decisionNote ? (
                  <RuleNote label="Decision note">
                    “{application.decisionNote}”
                  </RuleNote>
                ) : (
                  <p className="t-small text-muted">No decision note yet.</p>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  iconRight="arrow-right"
                  href={`/admin/tutors?app=${application.id}`}
                >
                  Open application
                </Button>
              </div>
              <ApplicationFacts app={application} headingAs="h3" />
            </div>
          </Section>
        )}

        {payouts.length > 0 && (
          <Section
            index={idx()}
            label="Payouts"
            note="The last four months."
            action={
              <Button size="sm" variant="arrow" href="/admin/payouts">
                All payouts
              </Button>
            }
          >
            <ul className="border-t border-fg">
              {payouts.map((p) => (
                <li
                  key={p.period}
                  className="flex items-center justify-between gap-4 border-b border-line py-3.5"
                >
                  <MonoMeta as="span" className="text-fg">
                    {p.period === CURRENT_PERIOD
                      ? `${periodLabel(p.period, true)} (projected)`
                      : periodLabel(p.period, true)}
                  </MonoMeta>
                  <span className="inline-flex items-center gap-4">
                    <span className="font-heading text-[16px] font-semibold tabular-nums">
                      {formatINR(p.net)}
                    </span>
                    <StatusPill status={p.status} size="sm" variant="text" />
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {certs.length > 0 && (
          <Section index={idx()} label="Certificates" note="Earned on completion.">
            <ul className="border-t border-fg">
              {certs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3.5 text-[14.5px]"
                >
                  <span className="min-w-0 truncate font-medium">
                    {c.course.title}
                  </span>
                  <Link
                    href={`/certificates/${c.code}`}
                    className="shrink-0 font-mono text-[12.5px] tracking-[0.04em] underline-offset-[3px] hf:underline"
                  >
                    {c.code}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!self && (
          <Section
            index={idx()}
            label="Access"
            note="Role and account status. Every change is logged."
          >
            <div className="grid gap-px border-y border-line bg-line md:grid-cols-2">
              <div className="bg-surface py-5 md:pr-8">
                <p className="t-app-h3">Role</p>
                <p className="mt-1 t-small text-muted">
                  {first} is {u.role === "admin" ? "an admin" : `a ${u.role}`}.
                  Changing it changes what they can open on Tamada.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  icon="switch"
                  className="mt-4"
                  onClick={() => setRoleOpen(true)}
                >
                  Change role
                </Button>
              </div>
              <div className="bg-surface py-5 md:pl-8">
                <p className="t-app-h3">
                  {u.status === "suspended" ? "Reactivate" : "Suspend"}
                </p>
                <p className="mt-1 t-small text-muted">
                  {u.status === "suspended"
                    ? "Gives them their account back exactly as they left it."
                    : "They can't sign in, buy or post. Purchases and progress are kept."}
                </p>
                <Button
                  size="sm"
                  variant={u.status === "suspended" ? "primary" : "danger"}
                  icon={u.status === "suspended" ? "refresh" : "lock"}
                  className="mt-4"
                  onClick={() => setSuspendOpen(true)}
                >
                  {u.status === "suspended" ? "Reactivate" : "Suspend account"}
                </Button>
              </div>
            </div>
          </Section>
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
              triggerClassName={buttonClass({ variant: "outline", iconOnly: true, className: "size-12" })}
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
          <Button variant="red" icon="unlock" className="h-12" onClick={() => setGrantOpen(true)}>
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
