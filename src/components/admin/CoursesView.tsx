"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  Rating,
  Select,
  StatusPill,
  Switch,
  Tabs,
  toast,
  type MenuItem,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import { cropSrc } from "@/lib/img";
import { toneBg } from "@/lib/landing-data";
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
  SectionTitle,
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
      <span className="text-[13px] text-ink/35">—</span>
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
                  <Badge tone="sun" size="sm">
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
            <span className="whitespace-nowrap text-ink/75">
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
          cell: (c) => <span className="whitespace-nowrap">{formatINR(c.price)}</span>,
          sortValue: (c) => c.price,
        },
        {
          key: "learners",
          header: "Learners",
          align: "right",
          minBox: 780,
          cell: (c) => formatCompact(c.learners),
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
              <span className="whitespace-nowrap text-ink/40">No reviews</span>
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
            <span className="whitespace-nowrap text-ink/70">
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

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Courses"
        eyebrowTone="purple"
        title={
          tab === "review"
            ? "Courses waiting for a green light."
            : "Every course on Tamada."
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
        meta={
          <>
            <Badge tone="butter" dot>
              {counts.in_review ?? 0} in review
            </Badge>
            <Badge tone="mint" dot>
              {counts.published ?? 0} published
            </Badge>
            <Badge tone="neutral" dot>
              {
                db.courses.filter((c) => c.featured && c.status === "published")
                  .length
              }{" "}
              featured
            </Badge>
          </>
        }
      />

      <Tabs
        label="Courses view"
        value={tab}
        className="mb-6"
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
        <>
          {queue.length ? (
            <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
              {queue.map((c, i) => (
                <li
                  key={c.id}
                  className="app-enter"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <QueueCard
                    course={c}
                    preload={i === 0}
                    onPublish={() =>
                      setAction({ kind: "publish", course: c, watched: false })
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState
                art="tami"
                tone="cyan"
                title="All caught up."
                body="When a tutor submits a course for review, it lands here. Oldest first."
                action={
                  <Button href="/admin/courses?tab=all" variant="secondary">
                    Browse all courses
                  </Button>
                }
              />
            </Card>
          )}

          <section className="mt-10 md:mt-12" aria-labelledby="sentback-title">
            <SectionTitle
              id="sentback-title"
              title="Sent back, waiting on the tutor"
              description="Courses you returned or unpublished with a note. They come back here when resubmitted."
            />
            {sentBack.length ? (
              <Card padding="none" className="overflow-hidden">
                <ul className="divide-y divide-ink/[0.07]">
                  {sentBack.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center md:px-6"
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
                          <p className="mt-2 line-clamp-2 t-small text-ink/65 sm:pl-[66px]">
                            “{c.reviewNote}”
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        href={`/admin/courses/${c.id}`}
                        className="self-start sm:self-center"
                      >
                        Open
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <p className="t-small text-ink/60">
                  Nothing sent back right now.
                </p>
              </Card>
            )}
          </section>
        </>
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
              <span className="text-[14px] font-bold sm:sr-only">Status</span>
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
              <span className="text-[14px] font-bold sm:sr-only">Category</span>
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
                    <span key="f" className="font-bold text-[#8a6100]">★ Featured</span>
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

function QueueCard({
  course,
  onPublish,
  preload,
}: {
  course: Course;
  onPublish: () => void;
  preload?: boolean;
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
  return (
    <Card padding="none" className="flex h-full flex-col overflow-hidden">
      <div
        className={clsx(
          "relative aspect-[16/7] overflow-hidden",
          toneBg[course.tone],
        )}
      >
        <Image
          src={cropSrc(course.thumbnail, 7 / 16)}
          alt=""
          fill
          sizes="(min-width: 768px) 45vw, 100vw"
          preload={preload}
          loading={preload ? "eager" : undefined}
          className="object-cover"
        />
        <span className="absolute top-3 left-3 flex gap-2">
          <StatusPill status="in_review" />
          {cat && <Badge tone="white">{cat.name}</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 className="t-app-h2">
          <Link
            href={`/admin/courses/${course.id}`}
            className="underline-offset-2 hf:underline"
          >
            {course.title}
          </Link>
        </h3>
        <p className="mt-1.5 t-small text-ink/65">
          by {tutor?.name ?? "Unknown"} · sent{" "}
          {course.submittedAt ? timeAgo(course.submittedAt) : "recently"}
          {course.submittedAt
            ? ` (${smartDate(course.submittedAt)})`
            : ""}
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-ink/70">
          <li className="inline-flex items-center gap-1.5">
            <Icon name="video" className="size-4 text-ink/45" />
            {plural(s.videos, "video")}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Icon name="quiz" className="size-4 text-ink/45" />
            {plural(s.quizzes, "test")}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Icon name="clock" className="size-4 text-ink/45" />
            {formatDuration(s.totalSec)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Icon name="tag" className="size-4 text-ink/45" />
            {formatINR(course.price)}
          </li>
        </ul>
        <div className="mt-4 rounded-tag bg-cream p-3">
          <p className="flex items-center justify-between text-[13px] font-bold">
            <span>Checklist</span>
            <span
              className={
                passed === checks.length ? "text-[#006b30]" : "text-[#b02f00]"
              }
            >
              {passed}/{checks.length} pass
            </span>
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {checks.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 text-[13px] font-medium"
              >
                <Icon
                  name={c.ok ? "check-circle" : "alert"}
                  className={clsx(
                    "size-4 shrink-0",
                    c.ok ? "text-green" : "text-flame",
                  )}
                />
                <span className={c.ok ? "text-ink/75" : "font-semibold"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Button href={`/admin/courses/${course.id}`} size="sm">
            Open review
          </Button>
          {freeItem && (
            <Button
              href={`/learn/${course.slug}/${freeItem}`}
              size="sm"
              variant="secondary"
              icon="play"
            >
              {isFree ? "Watch free preview" : "Watch first video"}
            </Button>
          )}
          {passed === checks.length && (
            <Button size="sm" variant="ghost" icon="check" onClick={onPublish}>
              Publish now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
