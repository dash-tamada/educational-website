"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Rating,
  Section,
  Select,
  Switch,
  Tabs,
  toast,
  type MenuItem,
} from "@/components/app";
import {
  CheckRow,
  Idx,
  MonoMeta,
  Poster,
  RuledList,
} from "@/components/tutor/editorial";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatCompact,
  formatDuration,
  formatINR,
  getCategories,
  getCategory,
  getCourseStats,
  getFirstFreeItem,
  getUser,
  plural,
  timeAgo,
  type Course,
  type CourseStatus,
} from "@/lib/mock";
import {
  CourseActionDialogs,
  CourseStatusPill,
  courseChecks,
  wasLive,
  type CourseAction,
} from "./reviewKit";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  CourseCell,
  PhoneRow,
  PhoneThumb,
  fitColumns,
  pickSort,
  smartDate,
  useBoxWidth,
  type FitColumn,
} from "./shared";

type Tab = "review" | "all";
const STATUSES: (CourseStatus | "any")[] = [
  "any",
  "published",
  "in_review",
  "draft",
  "rejected",
  "archived",
];

export function CoursesPage() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const tab: Tab =
    sp.get("tab") === "all" || (q && sp.get("tab") !== "review")
      ? "all"
      : "review";
  const rawStatus = sp.get("status") ?? "any";
  const status = (STATUSES as string[]).includes(rawStatus)
    ? (rawStatus as CourseStatus | "any")
    : "any";
  return (
    <CoursesView
      key={`${q}|${status}`}
      tab={tab}
      initialQ={q}
      initialStatus={status}
    />
  );
}

function CoursesView({
  tab,
  initialQ,
  initialStatus,
}: {
  tab: Tab;
  initialQ: string;
  initialStatus: CourseStatus | "any";
}) {
  const db = useDb();
  const [action, setAction] = useState<CourseAction>(null);
  const [status, setStatus] = useState<CourseStatus | "any">(initialStatus);
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState(initialQ);
  const [boxRef, boxW] = useBoxWidth();

  const queue = useMemo(
    () =>
      db.courses
        .filter((c) => c.status === "in_review")
        .sort((a, b) =>
          (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""),
        ),
    [db],
  );
  const sentBack = useMemo(
    () =>
      db.courses
        .filter((c) => c.status === "rejected")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [db],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { any: db.courses.length };
    for (const x of db.courses) c[x.status] = (c[x.status] ?? 0) + 1;
    return c;
  }, [db]);
  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return db.courses
      .filter((c) => {
        if (status !== "any" && c.status !== status) return false;
        if (category !== "all" && c.categoryId !== category) return false;
        if (!words.length) return true;
        const hay =
          `${c.title} ${c.promise} ${c.tags.join(" ")} ${getUser(c.tutorId, db)?.name ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db, status, category, q]);
  const cats = getCategories(db);

  const actionsFor = (c: Course): MenuItem[] => {
    const items: MenuItem[] = [
      {
        label: c.status === "in_review" ? "Open review" : "Open details",
        icon: "eye",
        href: `/admin/courses/${c.id}`,
      },
    ];
    if (c.status === "published")
      items.push({
        label: "View on site",
        icon: "external",
        href: `/courses/${c.slug}`,
      });
    items.push({ divider: true });
    if (
      c.status === "in_review" ||
      c.status === "rejected" ||
      c.status === "draft"
    )
      items.push(
        wasLive(c)
          ? {
              label: "Republish",
              icon: "refresh",
              onSelect: () => setAction({ kind: "publish", course: c }),
            }
          : {
              label: "Publish course",
              icon: "check-circle",
              onSelect: () =>
                setAction({ kind: "publish", course: c, watched: false }),
            },
      );
    if (c.status === "in_review" || c.status === "published")
      items.push({
        label: c.status === "published" ? "Unpublish…" : "Send back with note",
        icon: "arrow-left",
        onSelect: () => setAction({ kind: "send_back", course: c }),
      });
    if (c.status === "published")
      items.push({
        label: c.featured ? "Remove featured mark" : "Mark as featured",
        icon: "star",
        onSelect: () => toggleFeatured(c),
      });
    if (c.status === "archived")
      items.push({
        label: "Restore",
        icon: "refresh",
        onSelect: () => setAction({ kind: "restore", course: c }),
      });
    else
      items.push({
        label: "Archive",
        icon: "inbox",
        danger: true,
        onSelect: () => setAction({ kind: "archive", course: c }),
      });
    return items;
  };

  const toggleFeatured = (c: Course) => {
    demo.setCourseFeatured(c.id, !c.featured);
    toast.success(
      c.featured
        ? `${c.title} is no longer featured.`
        : `${c.title} is marked as featured.`,
      {
        description:
          "Saved on the course. The homepage carousel will use it once the site reads live data (it’s static in this demo).",
      },
    );
  };

  const compact = boxW != null && boxW < COMPACT_BOX;
  const featuredCell = (c: Course) =>
    c.status === "published" ? (
      <Switch
        hideLabel
        label={`Mark ${c.title} as featured`}
        checked={!!c.featured}
        onChange={() => toggleFeatured(c)}
      />
    ) : (
      <span className="text-[13px] text-muted">—</span>
    );
  const allColumns: FitColumn<Course>[] = compact
    ? [
        {
          key: "title",
          header: "Course",
          cell: (c) => (
            <span className="block min-w-0">
              <CourseCell
                course={c}
                href={`/admin/courses/${c.id}`}
                sub={getUser(c.tutorId, db)?.name}
              />
              <CompactFacts>
                <CourseStatusPill course={c} size="sm" />
                <span>{formatINR(c.price)}</span>
                <span>{formatCompact(c.learners)} learners</span>
                {c.featured && c.status === "published" && (
                  <Badge tone="ink" size="sm">
                    Featured
                  </Badge>
                )}
              </CompactFacts>
            </span>
          ),
          sortValue: (c) => c.title,
          searchValue: (c) =>
            `${c.title} ${getUser(c.tutorId, db)?.name} ${c.tags.join(" ")}`,
        },
      ]
    : [
        {
          key: "title",
          header: "Course",
          cell: (c) => (
            <CourseCell
              course={c}
              href={`/admin/courses/${c.id}`}
              sub={getUser(c.tutorId, db)?.name}
            />
          ),
          sortValue: (c) => c.title,
          searchValue: (c) =>
            `${c.title} ${getUser(c.tutorId, db)?.name} ${c.tags.join(" ")}`,
        },
        {
          key: "cat",
          header: "Category",
          minBox: 1160,
          cell: (c) => (
            <span className="whitespace-nowrap text-muted">
              {getCategory(c.categoryId, db)?.name}
            </span>
          ),
          sortValue: (c) => getCategory(c.categoryId, db)?.name,
        },
        {
          key: "status",
          header: "Status",
          cell: (c) => <CourseStatusPill course={c} size="sm" />,
          sortValue: (c) => c.status,
        },
        {
          key: "price",
          header: "Price",
          align: "right",
          cell: (c) => <span className="font-heading font-semibold whitespace-nowrap tabular-nums">{formatINR(c.price)}</span>,
          sortValue: (c) => c.price,
        },
        {
          key: "learners",
          header: "Learners",
          align: "right",
          minBox: 780,
          cell: (c) => <span className="font-mono text-[13px] tabular-nums">{formatCompact(c.learners)}</span>,
          sortValue: (c) => c.learners,
        },
        {
          key: "rating",
          header: "Rating",
          minBox: 1260,
          cell: (c) =>
            c.reviewCount ? (
              <Rating value={c.rating} size="sm" />
            ) : (
              <span className="whitespace-nowrap text-muted">No reviews</span>
            ),
          sortValue: (c) => c.rating,
        },
        {
          key: "featured",
          header: "Featured",
          cell: featuredCell,
          sortValue: (c) => (c.featured ? 1 : 0),
        },
        {
          key: "updated",
          header: "Updated",
          minBox: 900,
          cell: (c) => (
            <span className="whitespace-nowrap text-muted">
              {timeAgo(c.updatedAt)}
            </span>
          ),
          sortValue: (c) => c.updatedAt,
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  // rows arrive most recently updated first; the Updated arrow shows whenever it fits
  const { initialSort, sortKey } = pickSort(columns, {
    key: "updated",
    dir: "desc",
  });

  const featuredCount = db.courses.filter(
    (c) => c.featured && c.status === "published",
  ).length;

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · Courses"
        title={
          tab === "review" ? (
            <>
              Waiting for a green <em>light</em>.
            </>
          ) : (
            <>
              Every course on <em>Tamada</em>.
            </>
          )
        }
        description={
          tab === "review"
            ? "Check the promise, watch the free preview, peek at the tests. Then publish, or send it back with a kind, specific note."
            : "Publish, send back, archive or feature anything in the catalogue."
        }
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Courses" },
        ]}
        rule={false}
        meta={
          <MonoMeta as="span">
            {counts.in_review ?? 0} in review · {counts.published ?? 0} published
            · {featuredCount} featured
          </MonoMeta>
        }
      />

      <Tabs
        label="Courses view"
        value={tab}
        className="mb-10 md:mb-14"
        items={[
          {
            id: "review",
            label: "Review queue",
            count: queue.length,
            href: "/admin/courses?tab=review",
          },
          {
            id: "all",
            label: "All courses",
            count: db.courses.length,
            href: "/admin/courses?tab=all",
          },
        ]}
      />

      {tab === "review" ? (
        <div className="space-y-14 md:space-y-20">
          <Section
            index="01"
            label="Review queue"
            note="Oldest first. Every course runs five automatic checks before you open it."
            title={
              queue.length
                ? `${plural(queue.length, "course")} in review.`
                : "Nothing in review."
            }
          >
            {queue.length ? (
              <RuledList label="Courses in review">
                {queue.map((c, i) => (
                  <QueueRow
                    key={c.id}
                    index={i + 1}
                    course={c}
                    preload={i === 0}
                    onPublish={() =>
                      setAction({ kind: "publish", course: c, watched: false })
                    }
                  />
                ))}
              </RuledList>
            ) : (
              <EmptyState
                art="none"
                align="start"
                eyebrow="Queue clear"
                title="All caught up."
                body="When a tutor submits a course for review, it lands here. Oldest first."
                action={
                  <Button
                    href="/admin/courses?tab=all"
                    variant="outline"
                    iconRight="arrow-right"
                  >
                    Browse all courses
                  </Button>
                }
                className="border-t border-fg !px-0"
                compact
              />
            )}
          </Section>

          <Section
            index="02"
            label="Sent back"
            id="sentback-title"
            note="Courses you returned or unpublished with a note. They come back to the queue when resubmitted."
            title="Waiting on the tutor."
          >
            {sentBack.length ? (
              <RuledList label="Sent back">
                {sentBack.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <CourseCell
                        course={c}
                        href={`/admin/courses/${c.id}`}
                        sub={
                          wasLive(c)
                            ? `${getUser(c.tutorId, db)?.name} · unpublished ${timeAgo(c.updatedAt)} · ${plural(c.learners, "learner")} keep access`
                            : `${getUser(c.tutorId, db)?.name} · returned ${timeAgo(c.updatedAt)}`
                        }
                      />
                      {c.reviewNote && (
                        <p className="mt-3 line-clamp-2 border-l-2 border-red pl-3 t-small text-fg/80 sm:ml-14">
                          “{c.reviewNote}”
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      href={`/admin/courses/${c.id}`}
                      iconRight="arrow-right"
                      className="self-start"
                    >
                      Open
                    </Button>
                  </li>
                ))}
              </RuledList>
            ) : (
              <p className="border-t border-fg pt-4 t-small text-muted">
                Nothing sent back right now.
              </p>
            )}
          </Section>
        </div>
      ) : (
        <div ref={boxRef}>
        <DataTable<Course>
          key={sortKey}
          caption="All courses"
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          search={{ placeholder: "Search title, tutor or tag" }}
          searchValue={q}
          onSearchChange={setQ}
          mobileFilters="sheet"
          filterCount={(status !== "any" ? 1 : 0) + (category !== "all" ? 1 : 0)}
          filters={
            <>
              {/* phones: inside the Filters sheet, full width with visible labels */}
              <label className="flex flex-col gap-1.5 max-sm:w-full">
              <span className="text-[11.5px] font-semibold tracking-[0.12em] uppercase sm:sr-only">Status</span>
              <Select
                selectSize="sm"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as CourseStatus | "any")
                }
                className="sm:max-w-[170px] sm:min-w-[170px]"
                options={STATUSES.map((s) => ({
                  value: s,
                  label: `${s === "any" ? "Any status" : s === "in_review" ? "In review" : s[0].toUpperCase() + s.slice(1)} (${counts[s] ?? 0})`,
                }))}
              />
              </label>
              <label className="flex flex-col gap-1.5 max-sm:w-full">
              <span className="text-[11.5px] font-semibold tracking-[0.12em] uppercase sm:sr-only">Category</span>
              <Select
                selectSize="sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="sm:max-w-[170px] sm:min-w-[170px]"
                options={[
                  { value: "all", label: "All categories" },
                  ...cats.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              </label>
            </>
          }
          pageSize={10}
          rowActions={actionsFor}
          rowHref={(c) => `/admin/courses/${c.id}`}
          mobileRow={(c) => (
            <PhoneRow
              leading={<PhoneThumb src={c.thumbnail} tone={c.tone} />}
              title={c.title}
              clampTitle
              leadingHideTiny
              lines={[
                getUser(c.tutorId, db)?.name,
                [
                  <CourseStatusPill key="s" course={c} />,
                  `${formatCompact(c.learners)} learners`,
                  c.featured && c.status === "published" && (
                    <span key="f" className="font-semibold text-fg">★ Featured</span>
                  ),
                ],
              ]}
              trailing={formatINR(c.price)}
            />
          )}
          initialSort={initialSort}
          empty={{
            title: "No courses match.",
            body: "Try another status or category.",
          }}
          dense={boxW != null && boxW < 1160}
          minWidth={compact ? 0 : 600}
          className={compact ? COMPACT_TABLE : undefined}
        />
        </div>
      )}

      <CourseActionDialogs action={action} onClose={() => setAction(null)} />
    </div>
  );
}

/** One course in the review queue: a ruled row with the still, the facts and the checks. */
function QueueRow({
  course,
  onPublish,
  preload,
  index,
}: {
  course: Course;
  onPublish: () => void;
  preload?: boolean;
  index: number;
}) {
  const db = useDb();
  const s = getCourseStats(course.id, db);
  const checks = courseChecks(course, db);
  const passed = checks.filter((c) => c.ok).length;
  const tutor = getUser(course.tutorId, db);
  const cat = getCategory(course.categoryId, db);
  const first = getFirstFreeItem(course.id, db);
  const freeItem = first?.id;
  const isFree = first?.type === "video" && first.lesson.isFreePreview;
  const allPass = passed === checks.length;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 py-6 md:grid-cols-[auto_auto_minmax(0,1fr)] md:gap-x-6 md:py-7">
      <Idx n={index} className="mt-1 max-md:hidden" />
      <Poster
        src={course.thumbnail}
        ratio={1}
        sizes="(min-width: 768px) 132px, 88px"
        eager={preload}
        className="size-[88px] md:size-[132px]"
      />
      <div className="min-w-0">
        <MonoMeta>
          {[cat?.name, `sent ${course.submittedAt ? timeAgo(course.submittedAt) : "recently"}`]
            .filter(Boolean)
            .join(" · ")}
          {course.submittedAt ? ` (${smartDate(course.submittedAt)})` : ""}
        </MonoMeta>
        <h3 className="mt-2 font-heading text-[clamp(1.25rem,1.1rem+0.5vw,1.625rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
          <Link
            href={`/admin/courses/${course.id}`}
            className="underline-offset-[3px] hf:underline"
          >
            {course.title}
          </Link>
        </h3>
        <p className="mt-1.5 t-small text-muted">
          by {tutor?.name ?? "Unknown"} · {plural(s.videos, "video")} ·{" "}
          {plural(s.quizzes, "test")} · {formatDuration(s.totalSec)} ·{" "}
          <span className="font-heading font-semibold text-fg">
            {formatINR(course.price)}
          </span>
        </p>
      </div>

      <div className="col-span-full min-w-0 md:col-start-3">
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase">
            Checklist
          </p>
          <p
            className={clsx(
              "font-mono text-[11.5px] tabular-nums",
              allPass ? "text-fg" : "text-red-deep",
            )}
          >
            {passed}/{checks.length} pass
          </p>
        </div>
        <ul className="mt-1 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((c) => (
            <CheckRow
              key={c.id}
              state={c.ok ? "done" : "fail"}
              className="py-1.5"
            >
              {c.label}
            </CheckRow>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href={`/admin/courses/${course.id}`} size="sm" iconRight="arrow-right">
            Open review
          </Button>
          {freeItem && (
            <Button
              href={`/learn/${course.slug}/${freeItem}`}
              size="sm"
              variant="outline"
              icon="play"
            >
              {isFree ? "Watch free preview" : "Watch first video"}
            </Button>
          )}
          {allPass && (
            <Button size="sm" variant="ghost" icon="check" onClick={onPublish}>
              Publish now
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
