"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { plural, formatDate, formatINR, formatNumber, getCategory, getCourseStats, getFirstFreeItem, flattenCurriculum, formatDuration, timeAgo, type Course, type CourseStatus } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import {
  Button,
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
import { Idx, MonoMeta, Poster, RuleNote } from "./editorial";

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
      title={
        <>
          Your <em>courses</em>.
        </>
      }
      description="Drafts, courses waiting for review and everything that's live. Open one to edit lessons, tests and pricing."
      breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses" }]}
      actions={
        <Button href="/tutor/courses/new" variant="red" icon="plus">
          New course
        </Button>
      }
    />
  );

  return (
    <div className="app-enter">
      {header}

      <div className="mb-10 flex flex-col gap-4 md:mb-12 xl:flex-row xl:items-end xl:gap-8">
        <Tabs
          className="min-w-0 xl:flex-1"
          label="Filter by status"
          value={active}
          onChange={(id) => {
            setFilter(id as Filter);
            syncUrl({ status: id as Filter });
          }}
          items={FILTERS.filter((f) => f.id === "all" || f.id === "draft" || f.id === "published" || f.id === "in_review" || counts[f.id] || f.id === active).map((f) => ({ id: f.id, label: f.label, count: counts[f.id] ?? 0 }))}
        />
        <div className="flex items-center gap-2 xl:ml-auto xl:pb-1">
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
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="border-t border-fg">
          <EmptyState
            art="none"
            align="start"
            eyebrow="No courses yet"
            title="Your studio is ready for its first course."
            body="Start with a title. Lessons, tests and resources come next, in whatever order makes sense."
            className="!px-0"
            action={
              <Button href="/tutor/courses/new" variant="red" iconRight="arrow-right">
                Start with a title
              </Button>
            }
          />
        </div>
      ) : view === "cards" ? (
        rows.length === 0 ? (
          <div className="border-t border-fg">
            <EmptyState
              compact
              art="none"
              align="start"
              eyebrow="0 results"
              title="Nothing matches."
              body="Try another word or switch the status filter back to All."
              className="!px-0"
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setFilter("all");
                    syncUrl({ q: "", status: "all" });
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-14">
            {rows.map((c, i) => (
              <CourseTile key={c.id} course={c} index={i + 1} actions={actionsFor(c)} eager={i < 6} />
            ))}
            {active === "all" && !q && (
              <li className="flex">
                <Link
                  href="/tutor/courses/new"
                  className="group relative flex min-h-[320px] w-full flex-col justify-between border border-line-strong p-6 transition-colors duration-300 ease-ui hf:border-ink hf:bg-ink hf:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red md:p-7"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">New course</span>
                    <span className="font-mono text-[11px] text-red-deep tabular-nums group-hf:text-red-lite" aria-hidden>
                      {String(rows.length + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <Icon name="plus" strokeWidth={1} className="size-20 self-start transition-transform duration-500 ease-expo motion-ok:group-hf:rotate-90 md:size-24" />
                  <span>
                    <span className="block font-heading text-[22px] leading-[1.1] font-semibold tracking-[-0.03em]">Start another course</span>
                    <span className="mt-2 block max-w-[30ch] text-[13.5px] leading-snug text-muted group-hf:text-ash">Title first, lessons later. You can drag everything around once it exists.</span>
                  </span>
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
                <div className="flex items-center gap-3.5">
                  <CourseThumb src={c.thumbnail} ratio={1} className="size-11 max-sm:hidden" sizes="44px" />
                  <div className="min-w-0">
                    <Link href={`/tutor/courses/${c.id}/builder`} className="block max-w-[280px] truncate font-heading text-[15px] font-semibold tracking-[-0.015em] underline-offset-[3px] hf:underline">
                      {c.title}
                    </Link>
                    {c.status === "rejected" ? (
                      <span className="block max-w-[280px] truncate text-[12.5px] text-red-deep" title={c.reviewNote}>
                        Changes requested{c.reviewNote ? `: ${c.reviewNote}` : ""}
                      </span>
                    ) : (
                      <span className="block text-[12.5px] text-muted">
                        {getCategory(c.categoryId, db)?.name} · {c.level}
                        <span className="sm:hidden"> · {formatNumber(c.learners)} learners</span>
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <StatusPill status={c.status} size="sm" variant="text" /> },
            { key: "learners", header: "Learners", align: "right", hideBelow: "sm", sortValue: (c) => c.learners, cell: (c) => <span className="font-mono text-[13px] tabular-nums">{formatNumber(c.learners)}</span> },
            {
              key: "revenue",
              header: `Revenue · ${salesMonthLabel()}`,
              align: "right",
              hideBelow: "md",
              sortValue: (c) => courseMonthSales(c).revenue,
              cell: (c) => {
                const rev = courseMonthSales(c).revenue;
                if (rev > 0) return <span className="font-mono text-[13px] tabular-nums">{formatINR(rev, { compact: true })}</span>;
                return c.status === "published" ? <span className="text-muted">No sales yet</span> : <span className="text-muted" aria-label="Not on sale">–</span>;
              },
            },
            { key: "rating", header: "Rating", hideBelow: "md", sortValue: (c) => c.rating, cell: (c) => (c.rating ? <Rating value={c.rating} size="sm" count={c.reviewCount} /> : <span className="text-muted">No ratings</span>) },
            { key: "price", header: "Price", align: "right", sortValue: (c) => c.price, cell: (c) => <span className="font-heading text-[15px] font-semibold tracking-[-0.015em] tabular-nums">{formatINR(c.price)}</span> },
            { key: "updated", header: "Edited", hideBelow: "lg", sortValue: (c) => c.updatedAt, cell: (c) => <span className="font-mono text-[12px] tracking-[0.04em] text-muted uppercase">{timeAgo(c.updatedAt)}</span> },
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

function CourseTile({ course: c, index, actions, eager }: { course: Course; index: number; actions: MenuItem[]; eager?: boolean }) {
  const { db } = useTutorContext();
  const stats = getCourseStats(c.id, db);
  const free = getFirstFreeItem(c.id, db);
  const live = c.status === "published" || c.status === "archived";
  const cat = getCategory(c.categoryId, db);
  return (
    <li className="group relative flex min-w-0 flex-col">
      <div className="relative">
        <Poster src={c.thumbnail} ratio={4 / 3} eager={eager} sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 90vw" className="aspect-[4/3] w-full">
          <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hf:bg-ink/10" aria-hidden />
        </Poster>
        <div className="absolute top-3 left-3 bg-paper">
          <StatusPill status={c.status} size="sm" />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu
            label={`Actions for ${c.title}`}
            trigger={<Icon name="more" className="size-5" strokeWidth={1.8} />}
            items={actions}
            triggerClassName="hit grid size-9 place-items-center bg-paper text-ink transition-colors hf:bg-ink hf:text-cream coarse:size-11"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col border-b border-line pt-4 pb-5">
        <div className="flex items-baseline gap-3">
          <Idx n={index} />
          <MonoMeta as="span" className="min-w-0 truncate">
            {[cat?.name, c.level].filter(Boolean).join(" · ")}
          </MonoMeta>
        </div>
        <h2 className="mt-2 font-heading text-[20px] leading-[1.12] font-semibold tracking-[-0.03em] [overflow-wrap:anywhere] md:text-[22px]">
          <Link
            href={`/tutor/courses/${c.id}/builder`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-red"
          >
            {c.title}
          </Link>
        </h2>
        <MonoMeta className="mt-2">
          {[plural(stats.modules, "module"), plural(stats.videos, "lesson"), plural(stats.quizzes, "test"), stats.totalSec > 0 ? formatDuration(stats.totalSec) : null].filter(Boolean).join(" · ")}
        </MonoMeta>

        <div className="mt-4">
          {c.status === "rejected" && (
            <RuleNote tone="red" label="Note from the review team" icon="alert">
              <span className="line-clamp-3">{c.reviewNote ?? "Some changes are needed before this can go live."}</span>
            </RuleNote>
          )}
          {c.status === "in_review" && (
            <RuleNote tone="quiet" label="With the review team">
              Sent {timeAgo(c.submittedAt ?? c.updatedAt)}. Reviews take 2 to 3 working days. We&apos;ll ping you.
            </RuleNote>
          )}
          {c.status === "draft" && (
            <RuleNote tone="quiet" label="Draft">
              {stats.items === 0 ? "No lessons yet. Add your first video to get going." : free ? `Free preview: ${free.type === "video" ? free.lesson.title : ""}` : "Add a video so learners get a free preview."}
            </RuleNote>
          )}
          {live && free?.type === "video" && (
            <p className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
              <Icon name="play-circle" strokeWidth={1.6} className="size-4 shrink-0 text-fg" />
              <span className="truncate">
                <span className="font-mono text-[11px] tracking-[0.06em] text-fg uppercase">Free preview</span> · {free.lesson.title}
              </span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          {live ? (
            <div className="min-w-0 text-[13px]">
              {c.rating ? <Rating value={c.rating} count={c.reviewCount} size="sm" /> : <span className="text-muted">No ratings yet</span>}
              <div className="mt-1 text-muted">
                {c.learners === 0 && c.status === "published"
                  ? "Just went live · no sales yet"
                  : `${formatNumber(c.learners)} learners · ${c.status === "published" ? courseRevenueLabel(c) : "not on sale"}`}
              </div>
            </div>
          ) : (
            <MonoMeta as="span">Edited {formatDate(c.updatedAt, "short")}</MonoMeta>
          )}
          <span className="shrink-0 font-heading text-[22px] leading-none font-semibold tracking-[-0.035em] tabular-nums">{formatINR(c.price)}</span>
        </div>
      </div>
    </li>
  );
}

/** Phone list row (DataTable mobileRow): square still, two-line title, status + price, one line of numbers. */
function CourseListRow({ course: c }: { course: Course }) {
  const live = c.status === "published" || c.status === "archived";
  return (
    <div className="flex items-center gap-3.5">
      <CourseThumb src={c.thumbnail} ratio={1} className="size-16 phone-s:size-12" sizes="64px" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-heading text-[15.5px] leading-snug font-semibold tracking-[-0.015em] [overflow-wrap:anywhere]">{c.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusPill status={c.status} size="sm" variant="text" />
          <span className="font-heading text-[14px] font-semibold tabular-nums">{formatINR(c.price)}</span>
        </div>
        <p className={clsx("mt-1 line-clamp-2 text-[13px] leading-snug", c.status === "rejected" ? "text-red-deep" : "text-muted")}>
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
