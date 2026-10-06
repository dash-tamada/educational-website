"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { plural, formatDate, formatINR, formatNumber, getCategory, getCourseStats, getFirstFreeItem, flattenCurriculum, formatDuration, timeAgo, type Course, type CourseStatus } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  Rating,
  SearchInput,
  Segmented,
  Skeleton,
  StatusPill,
  Tabs,
  toast,
  isPhone,
  type MenuItem,
} from "@/components/app";
import { CourseThumb, courseMonthSales, courseRevenueLabel, salesMonthLabel, tutorCourses, useTutorContext } from "./shared";

type Filter = "all" | CourseStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In review" },
  { id: "published", label: "Published" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
];
const VIEW_KEY = "tm-tutor-courses-view";
/** phones remember their own choice and default to the compact list (MOBILE_SPEC T-01) */
const VIEW_KEY_PHONE = "tm-tutor-courses-view-phone";

export function CoursesList({ initialQuery = "", initialStatus = "all" }: { initialQuery?: string; initialStatus?: string }) {
  const { userId, db, hydrated } = useTutorContext();
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.id === initialStatus) ? (initialStatus as Filter) : "all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [confirm, setConfirm] = useState<{ kind: "archive" | "restore"; course: Course } | null>(null);
  /** the "Course archived · Undo" toast per course, so a restore can take it away */
  const archiveToasts = useRef(new Map<string, number>());

  // remembered view (per browser convenience); phones start on the compact list
  useEffect(() => {
    const phone = isPhone();
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(phone ? VIEW_KEY_PHONE : VIEW_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v === "table" || v === "cards") setView(v);
    else if (phone) setView("table");
  }, []);
  const changeView = (v: "cards" | "table") => {
    setView(v);
    try {
      window.localStorage.setItem(isPhone() ? VIEW_KEY_PHONE : VIEW_KEY, v);
    } catch {}
  };

  // keep the top-bar search (?q=) in sync when it changes while we're here
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(initialQuery);
  }, [initialQuery]);

  const all = useMemo(() => tutorCourses(db, userId), [db, userId]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const x of all) c[x.status] = (c[x.status] ?? 0) + 1;
    return c;
  }, [all]);
  // Rejected / Archived tabs only exist while they have courses: if the last one leaves, fall back to All
  const active: Filter = (filter === "rejected" || filter === "archived") && !counts[filter] && hydrated ? "all" : filter;
  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((c) => (active === "all" || c.status === active) && words.every((w) => `${c.title} ${c.promise} ${c.tags.join(" ")}`.toLowerCase().includes(w)));
  }, [all, active, q]);

  const syncUrl = (next: { q?: string; status?: Filter }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    const ns = next.status ?? active;
    if (nq) p.set("q", nq);
    if (ns !== "all") p.set("status", ns);
    router.replace(`/tutor/courses${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const actionsFor = (c: Course): MenuItem[] => {
    const first = flattenCurriculum(c.id, db)[0]?.item;
    const items: MenuItem[] = [
      { label: "Edit in course studio", icon: "edit", href: `/tutor/courses/${c.id}/builder` },
      { label: "Preview as a learner", icon: "eye", href: first ? `/learn/${c.slug}/${first.id}` : undefined, disabled: !first },
    ];
    if (c.status === "published") items.push({ label: "View public page", icon: "external", href: `/courses/${c.slug}` });
    items.push({ label: "Duplicate", icon: "copy", onSelect: () => duplicate(c) });
    items.push({ divider: true });
    if (c.status === "archived") items.push({ label: c.publishedAt ? "Restore to published" : "Restore as draft", icon: "refresh", onSelect: () => setConfirm({ kind: "restore", course: c }) });
    else items.push({ label: "Archive", icon: "inbox", danger: true, onSelect: () => setConfirm({ kind: "archive", course: c }) });
    return items;
  };

  const duplicate = (c: Course) => {
    const copy = demo.duplicateCourse(c.id);
    if (!copy) return toast.error("Couldn't duplicate that course.");
    toast.success("Copy created as a draft", {
      description: copy.title,
      action: { label: "Open", onClick: () => router.push(`/tutor/courses/${copy.id}/builder`) },
    });
  };

  const header = (
    <PageHeader
      eyebrow="Tutor studio"
      eyebrowTone="green"
      title="Your courses."
      description="Drafts, courses waiting for review and everything that's live. Open one to edit lessons, tests and pricing."
      breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses" }]}
      actions={
        <Button href="/tutor/courses/new" variant="accent" icon="plus">
          New course
        </Button>
      }
    />
  );

  return (
    <div className="app-enter">
      {header}

      <div className="mb-4 flex flex-col gap-3 md:mb-5 xl:flex-row xl:items-center">
        <Tabs
          label="Filter by status"
          value={active}
          onChange={(id) => {
            setFilter(id as Filter);
            syncUrl({ status: id as Filter });
          }}
          items={FILTERS.filter((f) => f.id === "all" || f.id === "draft" || f.id === "published" || f.id === "in_review" || counts[f.id] || f.id === active).map((f) => ({ id: f.id, label: f.label, count: counts[f.id] ?? 0 }))}
        />
        <div className="flex items-center gap-2 xl:ml-auto">
          <div className="min-w-0 flex-1 xl:w-[260px] xl:flex-none">
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => syncUrl({})}
              onKeyDown={(e) => e.key === "Enter" && syncUrl({})}
              onClear={() => {
                setQ("");
                syncUrl({ q: "" });
              }}
              placeholder="Search your courses"
            />
          </div>
          <Segmented
            label="View"
            value={view}
            onChange={changeView}
            options={[
              {
                value: "cards",
                label: (
                  <>
                    <Icon name="grid" className="size-4" />
                    <span className="sr-only">Cards</span>
                  </>
                ),
              },
              {
                value: "table",
                label: (
                  <>
                    <Icon name="menu" className="size-4" />
                    <span className="sr-only">
                      <span className="sm:hidden">List</span>
                      <span className="max-sm:hidden">Table</span>
                    </span>
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>

      {!hydrated && all.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            art="buddies"
            tone="mint"
            title="Your studio is ready for its first course."
            body="Start with a title. Lessons, tests and resources come next, in whatever order makes sense."
            action={
              <Button href="/tutor/courses/new" variant="accent" iconRight="arrow-right">
                Start with a title
              </Button>
            }
          />
        </Card>
      ) : view === "cards" ? (
        rows.length === 0 ? (
          <Card>
            <EmptyState compact art="buddy" title="Nothing matches." body="Try another word or switch the status filter back to All." action={<Button variant="secondary" onClick={() => { setQ(""); setFilter("all"); syncUrl({ q: "", status: "all" }); }}>Clear filters</Button>} />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c, i) => (
              <CourseTile key={c.id} course={c} actions={actionsFor(c)} eager={i < 6} />
            ))}
            {active === "all" && !q && (
              <li className="flex">
                <Link
                  href="/tutor/courses/new"
                  className="group flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-ink/15 p-6 text-center transition-colors hf:border-green hf:bg-white/60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-green text-white shadow-soft transition-transform duration-200 group-hf:scale-105" aria-hidden>
                    <Icon name="plus" className="size-6" strokeWidth={2.6} />
                  </span>
                  <span className="t-app-h3 text-[18px]">Start another course</span>
                  <span className="max-w-[240px] text-[13.5px] leading-snug font-semibold text-ink/55">Title first, lessons later. You can drag everything around once it exists.</span>
                </Link>
              </li>
            )}
          </ul>
        )
      ) : (
        <DataTable<Course>
          caption="Your courses"
          rows={rows}
          getRowId={(c) => c.id}
          rowHref={(c) => `/tutor/courses/${c.id}/builder`}
          rowActions={actionsFor}
          pageSize={10}
          minWidth={340}
          initialSort={{ key: "updated", dir: "desc" }}
          empty={{ title: "Nothing matches.", body: "Try another word or another status." }}
          mobileRow={(c) => <CourseListRow course={c} />}
          columns={[
            {
              key: "title",
              header: "Course",
              sortValue: (c) => c.title,
              cell: (c) => (
                <div className="flex items-center gap-3">
                  <CourseThumb src={c.thumbnail} tone={c.tone} className="h-11 w-14 max-sm:hidden" sizes="56px" />
                  <div className="min-w-0">
                    <Link href={`/tutor/courses/${c.id}/builder`} className="block max-w-[260px] truncate font-bold hf:underline">
                      {c.title}
                    </Link>
                    {c.status === "rejected" ? (
                      <span className="block max-w-[260px] truncate text-[12.5px] font-semibold text-[#b02f00]" title={c.reviewNote}>
                        Changes requested{c.reviewNote ? `: ${c.reviewNote}` : ""}
                      </span>
                    ) : (
                      <span className="block text-[12.5px] font-semibold text-ink/55">
                        {getCategory(c.categoryId, db)?.name} · {c.level}
                        <span className="sm:hidden"> · {formatNumber(c.learners)} learners</span>
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <StatusPill status={c.status} size="sm" /> },
            { key: "learners", header: "Learners", align: "right", hideBelow: "sm", sortValue: (c) => c.learners, cell: (c) => formatNumber(c.learners) },
            {
              key: "revenue",
              header: `Revenue · ${salesMonthLabel()}`,
              align: "right",
              hideBelow: "md",
              sortValue: (c) => courseMonthSales(c).revenue,
              cell: (c) => {
                const rev = courseMonthSales(c).revenue;
                if (rev > 0) return formatINR(rev, { compact: true });
                return c.status === "published" ? <span className="text-ink/50">No sales yet</span> : <span className="text-ink/40" aria-label="Not on sale">–</span>;
              },
            },
            { key: "rating", header: "Rating", hideBelow: "md", sortValue: (c) => c.rating, cell: (c) => (c.rating ? <Rating value={c.rating} size="sm" count={c.reviewCount} /> : <span className="text-ink/40">No ratings</span>) },
            { key: "price", header: "Price", align: "right", sortValue: (c) => c.price, cell: (c) => formatINR(c.price) },
            { key: "updated", header: "Edited", hideBelow: "lg", sortValue: (c) => c.updatedAt, cell: (c) => <span className="text-ink/60">{timeAgo(c.updatedAt)}</span> },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone={confirm?.kind === "archive" ? "danger" : "default"}
        title={confirm?.kind === "archive" ? `Archive ${confirm.course.title}?` : `Restore ${confirm?.course.title}?`}
        description={
          confirm?.kind === "archive"
            ? "It disappears from the catalog and can't be bought. Learners who already enrolled keep their access."
            : confirm?.course.publishedAt
              ? "It goes back on sale in the catalog right away."
              : "It comes back as a draft you can keep editing."
        }
        confirmLabel={confirm?.kind === "archive" ? "Archive course" : "Restore"}
        onConfirm={() => {
          if (!confirm) return;
          const c = confirm.course;
          if (confirm.kind === "archive") {
            demo.updateCourse(c.id, { status: "archived" });
            const id = toast.success("Course archived", {
              description: c.title,
              action: {
                label: "Undo",
                onClick: () => {
                  demo.updateCourse(c.id, { status: c.status });
                  archiveToasts.current.delete(c.id);
                },
              },
            });
            archiveToasts.current.set(c.id, id);
          } else {
            const stale = archiveToasts.current.get(c.id);
            if (stale) toast.dismiss(stale);
            archiveToasts.current.delete(c.id);
            demo.updateCourse(c.id, { status: c.publishedAt ? "published" : "draft" });
            toast.success(c.publishedAt ? "Back on sale" : "Restored as a draft", { description: c.title });
            // that was the last archived course: leave the (now hidden) Archived tab for All
            if (active === "archived" && (counts.archived ?? 0) <= 1) {
              setFilter("all");
              syncUrl({ status: "all" });
            }
          }
        }}
      />
    </div>
  );
}

function CourseTile({ course: c, actions, eager }: { course: Course; actions: MenuItem[]; eager?: boolean }) {
  const { db } = useTutorContext();
  const stats = getCourseStats(c.id, db);
  const free = getFirstFreeItem(c.id, db);
  const live = c.status === "published" || c.status === "archived";
  return (
    <li className="group relative flex flex-col rounded-card bg-white p-3 shadow-soft hover-lift">
      <div className="relative">
        <CourseThumb src={c.thumbnail} tone={c.tone} className="aspect-[16/10] w-full rounded-img" ratio={10 / 16} eager={eager} sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 90vw" />
        <div className="absolute top-2.5 left-2.5 rounded-full bg-white shadow-soft">
          <StatusPill status={c.status} />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu label={`Actions for ${c.title}`} trigger={<Icon name="more" className="size-5" />} items={actions} triggerClassName="hit grid size-9 place-items-center rounded-full bg-white text-ink shadow-soft hf:bg-butter" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pt-3.5 pb-1">
        <h2 className="t-app-h3 text-[18px]">
          <Link href={`/tutor/courses/${c.id}/builder`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-blue">
            {c.title}
          </Link>
        </h2>
        <p className="mt-1 text-[13px] font-semibold text-ink/55">
          {[plural(stats.modules, "module"), plural(stats.videos, "lesson"), plural(stats.quizzes, "test"), stats.totalSec > 0 ? formatDuration(stats.totalSec) : null].filter(Boolean).join(" · ")}
        </p>

        {c.status === "rejected" && (
          <div className="mt-3 rounded-[16px] bg-[#ffe1d4] p-3 text-[13px] leading-snug text-[#8a2600]">
            <p className="flex items-center gap-1.5 font-bold">
              <Icon name="alert" className="size-4" strokeWidth={2.4} /> Note from the review team
            </p>
            <p className="mt-1 line-clamp-3 font-medium">{c.reviewNote ?? "Some changes are needed before this can go live."}</p>
          </div>
        )}
        {c.status === "in_review" && (
          <p className="mt-3 rounded-[16px] bg-butter p-3 text-[13px] leading-snug font-semibold text-[#6b5400]">
            Sent {timeAgo(c.submittedAt ?? c.updatedAt)}. Reviews take 2 to 3 working days. We&apos;ll ping you.
          </p>
        )}
        {c.status === "draft" && (
          <p className="mt-3 rounded-[16px] bg-cream p-3 text-[13px] leading-snug font-semibold text-ink/70">
            {stats.items === 0 ? "No lessons yet. Add your first video to get going." : free ? `Free preview: ${free.type === "video" ? free.lesson.title : ""}` : "Add a video so learners get a free preview."}
          </p>
        )}
        {live && free?.type === "video" && (
          <p className="mt-3 flex items-center gap-1.5 truncate rounded-[16px] bg-mint/50 p-3 text-[13px] leading-snug font-semibold text-forest">
            <Icon name="play-circle" className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="truncate">Free preview: {free.lesson.title}</span>
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {live ? (
            <div className="min-w-0 text-[13px] font-semibold">
              {c.rating ? <Rating value={c.rating} count={c.reviewCount} size="sm" /> : <span className="text-ink/55">No ratings yet</span>}
              <div className="mt-1 text-ink/60">
                {c.learners === 0 && c.status === "published"
                  ? "Just went live · no sales yet"
                  : `${formatNumber(c.learners)} learners · ${c.status === "published" ? courseRevenueLabel(c) : "not on sale"}`}
              </div>
            </div>
          ) : (
            <span className="text-[13px] font-semibold text-ink/55">Edited {formatDate(c.updatedAt, "short")}</span>
          )}
          <span className={clsx("shrink-0 rounded-full bg-cream px-3 pt-[7px] pb-[6px] font-heading text-[16px] leading-none font-extrabold tracking-[-0.02em]")}>{formatINR(c.price)}</span>
        </div>
      </div>
    </li>
  );
}

/** Phone list row (DataTable mobileRow): 16:10 thumb, two-line title, status + price, one line of numbers. */
function CourseListRow({ course: c }: { course: Course }) {
  const live = c.status === "published" || c.status === "archived";
  return (
    <div className="flex items-center gap-3">
      <CourseThumb src={c.thumbnail} tone={c.tone} className="h-[60px] w-24 rounded-[12px] phone-s:h-10 phone-s:w-16" ratio={10 / 16} sizes="96px" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] leading-snug font-bold [overflow-wrap:anywhere]">{c.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill status={c.status} />
          <span className="text-[13px] font-bold tabular-nums">{formatINR(c.price)}</span>
        </div>
        <p className={clsx("mt-1 line-clamp-2 text-[13px] leading-snug font-semibold", c.status === "rejected" ? "text-[#b02f00]" : "text-ink/60")}>
          {c.status === "rejected"
            ? `Changes requested${c.reviewNote ? `: ${c.reviewNote}` : ""}`
            : live
              ? c.learners === 0 && c.status === "published"
                ? "Just went live · no sales yet"
                : `${formatNumber(c.learners)} learners · ${c.status === "published" ? courseRevenueLabel(c) : "not on sale"}`
              : `Edited ${timeAgo(c.updatedAt)}`}
        </p>
      </div>
    </div>
  );
}
