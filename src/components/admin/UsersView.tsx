"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Button,
  DataTable,
  DescriptionList,
  Drawer,
  PageHeader,
  ProgressBar,
  SampleNote,
  StatGrid,
  StatTile,
  StatusPill,
  Tabs,
  type MenuItem,
} from "@/components/app";
import { MonoMeta, RuleNote } from "@/components/tutor/editorial";
import { useDb } from "@/lib/demo/store";
import {
  formatCompact,
  formatDate,
  formatINR,
  formatNumber,
  getCertificates,
  getEnrolledCourses,
  getOrders,
  getPlatformStats,
  getUser,
  getUsers,
  plural,
  timeAgo,
  type Db,
  type Profile,
} from "@/lib/mock";
import { ChangeRoleModal, GrantCourseModal, SuspendModal } from "./modals";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  CourseCell,
  MetaRow,
  PersonCell,
  PhoneRow,
  downloadCsv,
  fitColumns,
  pickSort,
  smartDate,
  useAdminId,
  useBoxWidth,
  type FitColumn,
} from "./shared";
import { SuspensionNote } from "./SuspensionNote";

type Filter = "all" | "student" | "tutor" | "admin" | "suspended";
const FILTERS: Filter[] = ["all", "student", "tutor", "admin", "suspended"];

/** Courses a person "has": enrollments for learners, courses taught for tutors. */
function courseCount(u: Profile, db: Db) {
  if (u.role === "tutor")
    return db.courses.filter((c) => c.tutorId === u.id).length;
  return db.enrollments.filter((e) => e.userId === u.id && !e.revokedAt).length;
}

export function UsersPage() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const raw =
    sp.get("filter") ??
    sp.get("role") ??
    (sp.get("status") === "suspended" ? "suspended" : "all");
  const filter: Filter = (FILTERS as string[]).includes(raw)
    ? (raw as Filter)
    : "all";
  // remount when the top-bar search changes ?q=
  return <UsersView key={q} initialQ={q} filter={filter} />;
}

function UsersView({ initialQ, filter }: { initialQ: string; filter: Filter }) {
  const db = useDb();
  const adminId = useAdminId();
  const [q, setQ] = useState(initialQ);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [roleFor, setRoleFor] = useState<string | null>(null);
  const [suspendIds, setSuspendIds] = useState<string[]>([]);
  const [grantIds, setGrantIds] = useState<string[]>([]);
  const [boxRef, boxW] = useBoxWidth();

  // this list is a sample of accounts; platform totals live on the Overview
  const learners = useMemo(() => getPlatformStats(db).totalLearners, [db]);
  const counts = useMemo(
    () => ({
      all: db.users.length,
      student: db.users.filter((u) => u.role === "student").length,
      tutor: db.users.filter((u) => u.role === "tutor").length,
      admin: db.users.filter((u) => u.role === "admin").length,
      suspended: db.users.filter((u) => u.status === "suspended").length,
    }),
    [db],
  );
  const rows = useMemo(
    () =>
      getUsers(
        {
          search: q,
          role: filter === "all" || filter === "suspended" ? "all" : filter,
          status: filter === "suspended" ? "suspended" : "all",
          sort: "newest",
          pageSize: 10_000,
        },
        db,
      ).items,
    [db, q, filter],
  );
  const joinedThisMonth = db.users.filter(
    (u) => u.joinedAt >= "2026-09-05",
  ).length;

  const actionsFor = (u: Profile): MenuItem[] => {
    const self = u.id === adminId;
    return [
      { label: "View details", icon: "eye", onSelect: () => setDrawer(u.id) },
      {
        label: "Open full profile",
        icon: "user",
        href: `/admin/users/${u.id}`,
      },
      { divider: true },
      {
        label: "Change role",
        icon: "switch",
        onSelect: () => setRoleFor(u.id),
        disabled: self,
        hint: self ? "You" : undefined,
      },
      {
        label: "Grant course access",
        icon: "unlock",
        onSelect: () => setGrantIds([u.id]),
        disabled: u.role === "admin",
        hint: u.role === "admin" ? "Admin" : undefined,
      },
      { divider: true },
      u.status === "suspended"
        ? {
            label: "Reactivate",
            icon: "refresh",
            onSelect: () => setSuspendIds([u.id]),
          }
        : {
            label: "Suspend",
            icon: "lock",
            danger: true,
            onSelect: () => setSuspendIds([u.id]),
            disabled: self,
          },
    ];
  };

  const compact = boxW != null && boxW < COMPACT_BOX;
  const coursesCell = (u: Profile) =>
    u.role === "admin" ? (
      <span className="text-muted" title="Admins don't enroll or teach">
        —
      </span>
    ) : (
      <span
        title={u.role === "tutor" ? "Courses taught" : "Courses enrolled"}
        className="font-mono text-[13px] whitespace-nowrap tabular-nums"
      >
        {courseCount(u, db)}
        <span className="ml-1.5 text-[10.5px] tracking-[0.08em] text-muted uppercase">
          {u.role === "tutor" ? "teaching" : "enrolled"}
        </span>
      </span>
    );
  // the Joined column needs a 760px box; below that the date moves under the name
  const showJoined = boxW == null || boxW >= 760;
  const allColumns: FitColumn<Profile>[] = compact
    ? [
        {
          key: "name",
          header: "Person",
          cell: (u) => (
            <span className="block min-w-0">
              <PersonCell user={u} href={`/admin/users/${u.id}`} />
              <CompactFacts>
                <StatusPill status={u.role} size="sm" />
                {u.status === "suspended" && (
                  <StatusPill status={u.status} size="sm" />
                )}
                {u.role !== "admin" && (
                  <span>
                    {courseCount(u, db)}{" "}
                    {u.role === "tutor" ? "teaching" : "enrolled"}
                  </span>
                )}
                <span>Joined {smartDate(u.joinedAt)}</span>
              </CompactFacts>
            </span>
          ),
          sortValue: (u) => u.name,
          searchValue: (u) => `${u.name} ${u.email} ${u.city}`,
        },
      ]
    : [
        {
          key: "name",
          header: "Person",
          cell: (u) => (
            <span className="block max-w-[280px] min-w-[180px]">
              <PersonCell
                user={u}
                href={`/admin/users/${u.id}`}
                sub={
                  showJoined ? undefined : (
                    <>
                      Joined {smartDate(u.joinedAt)} · {u.email}
                    </>
                  )
                }
              />
            </span>
          ),
          sortValue: (u) => u.name,
        },
        {
          key: "role",
          header: "Role",
          cell: (u) => <StatusPill status={u.role} size="sm" variant="text" />,
          sortValue: (u) => u.role,
        },
        {
          key: "status",
          header: "Status",
          cell: (u) => <StatusPill status={u.status} size="sm" variant="text" />,
          sortValue: (u) => u.status,
        },
        {
          key: "city",
          header: "City",
          minBox: 1180,
          cell: (u) => <span className="text-muted">{u.city}</span>,
          sortValue: (u) => u.city,
        },
        {
          key: "courses",
          header: "Courses",
          align: "right",
          cell: coursesCell,
          sortValue: (u) => (u.role === "admin" ? -1 : courseCount(u, db)),
        },
        {
          key: "joined",
          header: "Joined",
          minBox: 760,
          cell: (u) => (
            <span className="whitespace-nowrap text-muted">
              {formatDate(u.joinedAt)}
            </span>
          ),
          sortValue: (u) => u.joinedAt,
        },
        {
          key: "active",
          header: "Last active",
          minBox: 960,
          cell: (u) => (
            <span className="whitespace-nowrap text-muted">
              {timeAgo(u.lastActiveAt)}
            </span>
          ),
          sortValue: (u) => u.lastActiveAt,
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  // rows arrive newest first; the arrow shows only while the Joined column is on screen
  const { initialSort, sortKey } = pickSort(columns, { key: "joined", dir: "desc" });

  const exportCsv = (ids?: string[]) => {
    const list = ids ? rows.filter((u) => ids.includes(u.id)) : rows;
    downloadCsv(
      "tamada-people.csv",
      [
        "id",
        "name",
        "email",
        "role",
        "status",
        "city",
        "joined",
        "last_active",
      ],
      list.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.city,
        u.joinedAt.slice(0, 10),
        u.lastActiveAt.slice(0, 10),
      ]),
    );
  };

  const filterHref = (f: Filter) =>
    f === "all" ? "/admin/users" : `/admin/users?filter=${f}`;

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · People"
        title={
          <>
            People on <em>Tamada</em>.
          </>
        }
        description="Find anyone, change what they can do, and unlock courses when someone needs a hand."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "People" },
        ]}
        actions={
          <Button
            variant="outline"
            icon="download"
            onClick={() => exportCsv()}
          >
            Export CSV
          </Button>
        }
      />

      <StatGrid className="mb-12 md:mb-16">
        <StatTile
          index="01"
          label="Accounts (sample)"
          value={formatNumber(counts.all)}
          hint={`of ${formatCompact(learners)} learners platform-wide`}
        />
        <StatTile
          index="02"
          label="Students (sample)"
          value={formatNumber(counts.student)}
          hint={`${joinedThisMonth} joined in the last 30 days`}
        />
        <StatTile
          index="03"
          label="Tutors"
          value={formatNumber(counts.tutor)}
          href="/admin/tutors"
          hint="See applications"
        />
        <StatTile
          index="04"
          label="Suspended"
          value={formatNumber(counts.suspended)}
          hint={counts.suspended ? "Can't sign in or buy" : "Nobody right now"}
          href="/admin/users?filter=suspended"
        />
      </StatGrid>

      <Tabs
        label="Filter people"
        value={filter}
        className="mb-5"
        items={[
          {
            id: "all",
            label: "All",
            count: counts.all,
            href: filterHref("all"),
          },
          {
            id: "student",
            label: "Students",
            count: counts.student,
            href: filterHref("student"),
          },
          {
            id: "tutor",
            label: "Tutors",
            count: counts.tutor,
            href: filterHref("tutor"),
          },
          {
            id: "admin",
            label: "Admins",
            count: counts.admin,
            href: filterHref("admin"),
          },
          {
            id: "suspended",
            label: "Suspended",
            count: counts.suspended,
            href: filterHref("suspended"),
          },
        ]}
      />

      <div ref={boxRef}>
      <DataTable<Profile>
        key={sortKey}
        caption="People"
        rows={rows}
        columns={columns}
        getRowId={(u) => u.id}
        search={{ placeholder: "Search by name, email or city" }}
        searchValue={q}
        onSearchChange={setQ}
        pageSize={12}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        bulkActions={(ids) => (
          <>
            <Button
              size="sm"
              variant="secondary"
              icon="unlock"
              onClick={() => setGrantIds(ids)}
            >
              Grant course
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="lock"
              onClick={() => setSuspendIds(ids)}
            >
              {ids.every((id) => getUser(id, db)?.status === "suspended")
                ? "Reactivate"
                : "Suspend"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="download"
              onClick={() => exportCsv(ids)}
            >
              Export
            </Button>
          </>
        )}
        rowActions={actionsFor}
        onRowClick={(u) => setDrawer(u.id)}
        mobileRow={(u) => (
          <PhoneRow
            leading={<Avatar name={u.name} src={u.avatar} tone={u.tone} size="md" decorative />}
            title={u.name}
            lines={[
              u.email,
              <span key="facts" className="mt-1 flex min-w-0 items-center gap-1.5">
                <StatusPill status={u.role} className="shrink-0" />
                {u.status === "suspended" && <StatusPill status={u.status} className="shrink-0" />}
                {/* the join date lives in the detail view (the list is newest first) */}
                {u.role !== "admin" && (
                  <span className="min-w-0 truncate">
                    {courseCount(u, db)} {u.role === "tutor" ? "teaching" : "enrolled"}
                  </span>
                )}
              </span>,
            ]}
          />
        )}
        empty={
          q.trim()
            ? {
                title: `No one matches “${q.trim()}”.`,
                body: "Check the spelling, or search by email or city.",
                action: (
                  <Button size="sm" variant="secondary" icon="x" onClick={() => setQ("")}>
                    Clear search
                  </Button>
                ),
              }
            : {
                title:
                  filter === "suspended"
                    ? "No suspended accounts."
                    : "Nobody here yet.",
                body:
                  filter === "suspended"
                    ? "Everyone is behaving. Lovely."
                    : "Try another filter.",
              }
        }
        initialSort={initialSort}
        dense={boxW != null && boxW < 1080}
        minWidth={compact ? 0 : 560}
        className={compact ? COMPACT_TABLE : undefined}
      />
      </div>
      <SampleNote className="mt-5">
        This list is a sample of {formatNumber(counts.all)} accounts. Platform
        totals on the Overview count all {formatNumber(learners)} learners.
      </SampleNote>

      <UserDrawer
        userId={drawer}
        onClose={() => setDrawer(null)}
        onRole={(id) => setRoleFor(id)}
        onSuspend={(id) => setSuspendIds([id])}
        onGrant={(id) => setGrantIds([id])}
      />
      <ChangeRoleModal
        open={!!roleFor}
        userId={roleFor}
        onClose={() => setRoleFor(null)}
      />
      <SuspendModal
        open={suspendIds.length > 0}
        userIds={suspendIds}
        onClose={() => setSuspendIds([])}
        onDone={() => setSelected([])}
      />
      <GrantCourseModal
        open={grantIds.length > 0}
        userIds={grantIds}
        onClose={() => setGrantIds([])}
        onDone={() => setSelected([])}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- drawer */
export function UserDrawer({
  userId,
  onClose,
  onRole,
  onSuspend,
  onGrant,
}: {
  userId: string | null;
  onClose: () => void;
  onRole: (id: string) => void;
  onSuspend: (id: string) => void;
  onGrant: (id: string) => void;
}) {
  const db = useDb();
  const adminId = useAdminId();
  const u = userId ? getUser(userId, db) : null;
  const enrolled = useMemo(
    () => (u ? getEnrolledCourses(u.id, db) : []),
    [u, db],
  );
  const orders = useMemo(
    () => (u ? getOrders({ userId: u.id, pageSize: 100 }, db).items : []),
    [u, db],
  );
  const certs = u ? getCertificates(u.id, db).length : 0;
  const spent = orders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.amount, 0);
  const teaching = u ? db.courses.filter((c) => c.tutorId === u.id) : [];
  const self = u?.id === adminId;
  const isAdmin = u?.role === "admin";
  const decisions = u
    ? db.tutorApplications.filter((a) => a.decidedBy === u.id).length
    : 0;

  const figures = isAdmin
    ? [
        { label: "Role", value: "Admin" },
        { label: "Decisions", value: decisions },
        {
          label: "Last seen",
          value: timeAgo(u?.lastActiveAt ?? "").replace(" ago", ""),
        },
      ]
    : [
        {
          label: u?.role === "tutor" ? "Teaching" : "Courses",
          value: u?.role === "tutor" ? teaching.length : enrolled.length,
        },
        { label: "Spent", value: formatINR(spent, { compact: true }) },
        { label: "Certificates", value: certs },
      ];

  return (
    <Drawer
      open={!!u}
      onClose={onClose}
      width={500}
      eyebrow={
        u
          ? `${u.role === "student" ? "Learner" : u.role === "tutor" ? "Tutor" : "Admin"} · ${u.city}`
          : undefined
      }
      title={u?.name ?? "Person"}
      description={u ? `${u.email}` : undefined}
      footer={
        u && (
          <>
            <Button
              variant="arrow"
              size="sm"
              href={`/admin/users/${u.id}`}
              className="mr-auto"
            >
              Full profile
            </Button>
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                icon="unlock"
                onClick={() => onGrant(u.id)}
              >
                Grant course
              </Button>
            )}
            {!self && (
              <Button
                variant={u.status === "suspended" ? "primary" : "danger"}
                size="sm"
                icon={u.status === "suspended" ? "refresh" : "lock"}
                onClick={() => onSuspend(u.id)}
              >
                {u.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            )}
          </>
        )
      }
    >
      {u && (
        <div className="space-y-7">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} src={u.avatar} tone={u.tone} size="lg" decorative />
            <div className="min-w-0 flex-1">
              {u.headline ? (
                <p className="t-small text-muted">{u.headline}</p>
              ) : (
                <MonoMeta>{u.id}</MonoMeta>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill status={u.role} size="sm" />
                <StatusPill status={u.status} size="sm" />
                {u.tutorStatus === "pending" && (
                  <StatusPill status="pending" size="sm" label="Applied to teach" />
                )}
              </div>
            </div>
          </div>
          {u.status === "suspended" && <SuspensionNote userId={u.id} />}
          <MetaRow
            items={[
              { icon: "globe", label: u.city },
              { icon: "calendar", label: `Joined ${formatDate(u.joinedAt)}` },
              { icon: "clock", label: `Active ${timeAgo(u.lastActiveAt)}` },
            ]}
          />
          <dl className="grid grid-cols-3 border-y border-line">
            {figures.map((f, i) => (
              <div
                key={f.label}
                className={i > 0 ? "border-l border-line py-4 pl-4" : "py-4 pr-4"}
              >
                <dt className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
                  {f.label}
                </dt>
                <dd className="mt-2 t-display-s tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
          {!self && (
            <Button
              size="sm"
              variant="outline"
              icon="switch"
              onClick={() => onRole(u.id)}
            >
              Change role
            </Button>
          )}

          {isAdmin ? (
            <RuleNote tone="quiet" label="Admins">
              Admins run the control room: they review tutor applications and
              courses, issue refunds and manage people. They don&apos;t enroll
              in or teach courses.
            </RuleNote>
          ) : u.role === "tutor" ? (
            <section>
              <DrawerHead>Courses they teach</DrawerHead>
              {teaching.length ? (
                <ul className="divide-y divide-line border-b border-line">
                  {teaching.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <CourseCell
                        course={c}
                        href={`/admin/courses/${c.id}`}
                        sub={formatINR(c.price)}
                      />
                      <StatusPill status={c.status} size="sm" variant="text" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-small text-muted">No courses yet.</p>
              )}
            </section>
          ) : (
            <section>
              <DrawerHead>Learning</DrawerHead>
              {enrolled.length ? (
                <ul className="divide-y divide-line border-b border-line">
                  {enrolled.slice(0, 6).map((e) => (
                    <li key={e.enrollment.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <CourseCell course={e.course} />
                        <StatusPill status={e.enrollment.source} size="sm" variant="text" />
                      </div>
                      <div className="mt-2.5 flex items-center gap-3 pl-14">
                        <ProgressBar
                          value={e.progress.percent}
                          size="sm"
                          label={`${e.course.title} progress`}
                        />
                        <span className="w-9 shrink-0 text-right font-mono text-[11.5px] tabular-nums">
                          {e.progress.percent}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-small text-muted">
                  Not enrolled in anything yet. Window shopping, probably.
                </p>
              )}
            </section>
          )}

          {orders.length > 0 && (
            <section>
              <DrawerHead>Orders</DrawerHead>
              <DescriptionList
                items={orders.slice(0, 5).map((o) => ({
                  label: (
                    <span className="font-mono tracking-[0.06em]">
                      {o.number} · {smartDate(o.createdAt)}
                    </span>
                  ),
                  value: (
                    <span className="inline-flex items-center gap-2.5">
                      <span className="font-heading font-semibold tabular-nums">
                        {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                      </span>
                      <StatusPill
                        status={o.provider === "admin" ? "grant" : o.status}
                        size="sm"
                        variant="text"
                      />
                    </span>
                  ),
                }))}
              />
              {orders.length > 5 && (
                <p className="mt-3 t-small text-muted">
                  and {plural(orders.length - 5, "more order")}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** Small section head inside the drawer: an ink rule and tiny caps. */
function DrawerHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 border-b border-fg pb-2.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </h3>
  );
}
