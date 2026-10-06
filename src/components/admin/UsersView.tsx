"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  DescriptionList,
  Drawer,
  PageHeader,
  StatGrid,
  StatTile,
  StatusPill,
  Tabs,
  type MenuItem,
} from "@/components/app";
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
      <span className="text-ink/40" title="Admins don't enrol or teach">
        —
      </span>
    ) : (
      <span title={u.role === "tutor" ? "Courses taught" : "Courses enrolled"}>
        {courseCount(u, db)}
        <span className="ml-1 text-[12px] font-semibold text-ink/45">
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
          cell: (u) => <StatusPill status={u.role} size="sm" />,
          sortValue: (u) => u.role,
        },
        {
          key: "status",
          header: "Status",
          cell: (u) => <StatusPill status={u.status} size="sm" />,
          sortValue: (u) => u.status,
        },
        {
          key: "city",
          header: "City",
          minBox: 1180,
          cell: (u) => <span className="text-ink/75">{u.city}</span>,
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
            <span className="whitespace-nowrap text-ink/75">
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
            <span className="whitespace-nowrap text-ink/75">
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
        eyebrow="People"
        eyebrowTone="purple"
        title="People on Tamada."
        description="Find anyone, change what they can do, and unlock courses when someone needs a hand."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "People" },
        ]}
        actions={
          <Button
            variant="secondary"
            icon="download"
            onClick={() => exportCsv()}
          >
            Export CSV
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatTile
          label="Accounts (sample)"
          value={formatNumber(counts.all)}
          tone="white"
          icon="users"
          hint={`of ${formatCompact(learners)} learners platform-wide`}
        />
        <StatTile
          label="Students (sample)"
          value={formatNumber(counts.student)}
          tone="blush"
          icon="book"
          hint={`${joinedThisMonth} joined in the last 30 days`}
        />
        <StatTile
          label="Tutors"
          value={formatNumber(counts.tutor)}
          tone="cyan"
          icon="briefcase"
          href="/admin/tutors"
          hint="See applications"
        />
        <StatTile
          label="Suspended"
          value={formatNumber(counts.suspended)}
          tone={counts.suspended ? "butter" : "white"}
          icon="lock"
          href="/admin/users?filter=suspended"
        />
      </StatGrid>

      <Tabs
        label="Filter people"
        value={filter}
        className="mb-4"
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
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 t-small text-ink/60">
        <Badge tone="neutral" size="sm">
          Sample · {formatNumber(counts.all)} accounts
        </Badge>
        <span>
          This list is a sample of {formatNumber(counts.all)} accounts. Platform
          totals on the Overview count all {formatNumber(learners)} learners.
        </span>
      </p>

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

  return (
    <Drawer
      open={!!u}
      onClose={onClose}
      width={480}
      title={u?.name ?? "Person"}
      description={u ? `${u.email}` : undefined}
      footer={
        u && (
          <>
            <Button
              variant="ghost"
              size="sm"
              href={`/admin/users/${u.id}`}
              icon="user"
            >
              Full profile
            </Button>
            {!isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                icon="unlock"
                onClick={() => onGrant(u.id)}
              >
                Grant course
              </Button>
            )}
            {!self && (
              <Button
                variant={u.status === "suspended" ? "success" : "danger"}
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
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-card bg-cream p-4">
            <PersonCell user={u} size="md" sub={u.headline ?? `${u.city}`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={u.role} />
            <StatusPill status={u.status} />
            {u.tutorStatus === "pending" && (
              <StatusPill status="pending" label="Tutor application pending" />
            )}
            {!self && (
              <Button
                size="sm"
                variant="ghost"
                icon="switch"
                onClick={() => onRole(u.id)}
                className="ml-auto"
              >
                Change role
              </Button>
            )}
          </div>
          {u.status === "suspended" && <SuspensionNote userId={u.id} />}
          <MetaRow
            items={[
              { icon: "globe", label: u.city },
              { icon: "calendar", label: `Joined ${formatDate(u.joinedAt)}` },
              { icon: "clock", label: `Active ${timeAgo(u.lastActiveAt)}` },
            ]}
          />
          <div className="grid grid-cols-3 gap-2">
            {(isAdmin
              ? [
                  { label: "Role", value: "Admin" },
                  { label: "Decisions", value: decisions },
                  { label: "Last seen", value: timeAgo(u.lastActiveAt).replace(" ago", "") },
                ]
              : [
                  {
                    label: u.role === "tutor" ? "Teaching" : "Courses",
                    value: u.role === "tutor" ? teaching.length : enrolled.length,
                  },
                  { label: "Spent", value: formatINR(spent, { compact: true }) },
                  { label: "Certificates", value: certs },
                ]
            ).map((s) => (
              <div key={s.label} className="rounded-tag bg-cream px-3 py-2.5">
                <p className="t-micro text-ink/55 uppercase">{s.label}</p>
                <p className="mt-1 font-display text-[26px] leading-none font-black">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {isAdmin ? (
            <p className="rounded-tag bg-lilac/40 p-3 t-small text-ink/75">
              Admins run the control room: they review tutor applications and
              courses, issue refunds and manage people. They don&apos;t enrol
              in or teach courses.
            </p>
          ) : u.role === "tutor" ? (
            <section>
              <h3 className="mb-3 t-app-h3">Courses they teach</h3>
              {teaching.length ? (
                <ul className="space-y-3">
                  {teaching.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <CourseCell
                        course={c}
                        href={`/admin/courses/${c.id}`}
                        sub={formatINR(c.price)}
                      />
                      <StatusPill status={c.status} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-small text-ink/60">No courses yet.</p>
              )}
            </section>
          ) : (
            <section>
              <h3 className="mb-3 t-app-h3">Learning</h3>
              {enrolled.length ? (
                <ul className="space-y-3">
                  {enrolled.slice(0, 6).map((e) => (
                    <li
                      key={e.enrollment.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <CourseCell
                        course={e.course}
                        sub={`${e.progress.percent}% done`}
                      />
                      <StatusPill status={e.enrollment.source} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-small text-ink/60">
                  Not enrolled in anything yet. Window shopping, probably.
                </p>
              )}
            </section>
          )}

          {orders.length > 0 && (
            <section>
              <h3 className="mb-2 t-app-h3">Orders</h3>
              <DescriptionList
                items={orders.slice(0, 5).map((o) => ({
                  label: (
                    <span>
                      {o.number} · {smartDate(o.createdAt)}
                    </span>
                  ),
                  value: (
                    <span className="inline-flex items-center gap-2">
                      {o.provider === "admin" ? "₹0" : formatINR(o.amount)}
                      <StatusPill
                        status={o.provider === "admin" ? "grant" : o.status}
                        size="sm"
                      />
                    </span>
                  ),
                }))}
              />
              {orders.length > 5 && (
                <p className="mt-2 t-small text-ink/55">
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
