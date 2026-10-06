"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  PageHeader,
  Rating,
  StatusPill,
  Tabs,
  toast,
  type IconName,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatDate,
  getCourseById,
  getItem,
  getReports,
  getUser,
  itemTitle,
  timeAgo,
  type Report,
} from "@/lib/mock";
import { toneBg } from "@/lib/landing-data";
import { wasLive } from "./reviewKit";
import { CourseCell } from "./shared";

type Tab = Report["status"] | "all";
const TABS: Tab[] = ["open", "resolved", "dismissed", "all"];
/** URL tabs like the other admin queues: the tab survives a reload or a shared link */
const tabHref = (t: Tab) =>
  t === "open" ? "/admin/reports" : `/admin/reports?status=${t}`;
const KIND: Record<
  Report["kind"],
  { label: string; noun: string; icon: IconName; tone: "blush" | "cyan" | "butter" }
> = {
  review: { label: "Review", noun: "review", icon: "star", tone: "butter" },
  comment: { label: "Q&A comment", noun: "Q&A comment", icon: "chat", tone: "cyan" },
  course: { label: "Course", noun: "course", icon: "layers", tone: "blush" },
};

export function ReportsView() {
  const sp = useSearchParams();
  const raw = sp.get("status") ?? "open";
  const tab: Tab = (TABS as string[]).includes(raw) ? (raw as Tab) : "open";
  const db = useDb();
  const [removing, setRemoving] = useState<Report | null>(null);
  const reports = useMemo(() => getReports(db), [db]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      open: 0,
      resolved: 0,
      dismissed: 0,
      all: reports.length,
    };
    for (const r of reports) c[r.status]++;
    return c;
  }, [reports]);
  const list =
    tab === "all" ? reports : reports.filter((r) => r.status === tab);

  const resolve = (r: Report, msg: string) => {
    demo.setReportStatus(r.id, "resolved");
    toast.success(msg);
  };

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Moderation"
        eyebrowTone="purple"
        title="Keep it kind in here."
        description="Things learners flagged: reviews, Q&A replies and courses. Fix what's wrong, dismiss what isn't."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Reports" },
        ]}
        meta={
          counts.open ? (
            <Badge tone="butter" dot>
              {counts.open} open
            </Badge>
          ) : (
            <Badge tone="mint" dot>
              All clear
            </Badge>
          )
        }
      />
      <Tabs
        label="Report status"
        value={tab}
        className="mb-5"
        items={[
          { id: "open", label: "Open", count: counts.open, href: tabHref("open") },
          {
            id: "resolved",
            label: "Resolved",
            count: counts.resolved,
            href: tabHref("resolved"),
          },
          {
            id: "dismissed",
            label: "Dismissed",
            count: counts.dismissed,
            href: tabHref("dismissed"),
          },
          { id: "all", label: "All", count: counts.all, href: tabHref("all") },
        ]}
      />

      {list.length ? (
        <ul className="space-y-4">
          {list.map((r, i) => {
            const k = KIND[r.kind];
            const course = getCourseById(r.courseId, db);
            const reporter = getUser(r.reporterId, db);
            const review =
              r.kind === "review"
                ? db.reviews.find((x) => x.id === r.targetId)
                : undefined;
            const comment =
              r.kind === "comment"
                ? db.comments.find((x) => x.id === r.targetId)
                : undefined;
            const author = review
              ? getUser(review.userId, db)
              : comment
                ? getUser(comment.userId, db)
                : null;
            const item =
              comment && course
                ? getItem(course.id, comment.itemId, db)?.item
                : null;
            const gone =
              (r.kind === "review" && !review) ||
              (r.kind === "comment" && !comment);
            return (
              <li
                key={r.id}
                className="app-enter"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Card>
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${toneBg[k.tone]}`}
                      aria-hidden
                    >
                      <Icon name={k.icon} className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" size="sm">
                          {k.label}
                        </Badge>
                        <StatusPill status={r.status} size="sm" />
                        <span className="text-[13px] font-semibold text-ink/50">
                          <time
                            dateTime={r.createdAt}
                            title={formatDate(r.createdAt, "datetime")}
                          >
                            {timeAgo(r.createdAt)}
                          </time>
                        </span>
                      </div>
                      <h2 className="mt-2 t-app-h3">“{r.reason}”</h2>
                      <p className="mt-1 t-small text-ink/60">
                        Flagged by{" "}
                        {reporter ? (
                          <Link
                            href={`/admin/users/${reporter.id}`}
                            className="font-bold text-ink underline-offset-2 hf:underline"
                          >
                            {reporter.name}
                          </Link>
                        ) : (
                          "a learner"
                        )}
                        {course && (
                          <>
                            {" "}
                            on{" "}
                            <Link
                              href={`/admin/courses/${course.id}`}
                              className="font-bold text-ink underline-offset-2 hf:underline"
                            >
                              {course.title}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-tag bg-cream p-4">
                    {gone ? (
                      <p className="t-small text-ink/55">
                        This {k.noun} has already been removed.
                      </p>
                    ) : review ? (
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {author && (
                            <Avatar
                              name={author.name}
                              src={author.avatar}
                              tone={author.tone}
                              size="sm"
                              decorative
                            />
                          )}
                          <span className="text-[14px] font-bold">
                            {author?.name ?? "Learner"}
                          </span>
                          <Rating
                            value={review.rating}
                            size="sm"
                            showValue={false}
                          />
                          {review.hidden && (
                            <Badge tone="lilac" size="sm">
                              Hidden from the course page
                            </Badge>
                          )}
                        </div>
                        {review.title && (
                          <p className="mt-2 text-[15px] font-bold">
                            {review.title}
                          </p>
                        )}
                        <p className="mt-1 t-small text-ink/80">
                          {review.comment}
                        </p>
                      </div>
                    ) : comment ? (
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {author && (
                            <Avatar
                              name={author.name}
                              src={author.avatar}
                              tone={author.tone}
                              size="sm"
                              decorative
                            />
                          )}
                          <span className="text-[14px] font-bold">
                            {author?.name ?? "Learner"}
                          </span>
                          {item && course && (
                            <Link
                              href={`/learn/${course.slug}/${item.id}`}
                              className="text-[13px] font-semibold text-ink/55 underline-offset-2 hf:underline"
                            >
                              in “{itemTitle(item)}”
                            </Link>
                          )}
                        </div>
                        <p className="mt-1.5 t-small text-ink/80">
                          {comment.body}
                        </p>
                      </div>
                    ) : (
                      <CourseCell
                        course={course}
                        href={
                          course ? `/admin/courses/${course.id}` : undefined
                        }
                        sub={
                          course
                            ? `${getUser(course.tutorId, db)?.name} · ${wasLive(course) ? "unpublished" : course.status.replace("_", " ")}`
                            : undefined
                        }
                        wide
                      />
                    )}
                  </div>

                  {/* phones: 44px buttons share each row with 12px gaps; the
                      destructive action keeps its own row (it comes first) */}
                  <div className="mt-4 flex flex-wrap gap-2 max-sm:gap-3 max-sm:[&>*]:flex-[1_1_auto] max-sm:[&>.btn-danger-row]:basis-full">
                    {r.status === "open" ? (
                      <>
                        {review && !review.hidden && (
                          <Button
                            size="sm"
                            variant="danger"
                            icon="eye-off"
                            className="btn-danger-row"
                            onClick={() => {
                              demo.setReviewHidden(review.id, true);
                              resolve(r, "Review hidden and report resolved.");
                            }}
                          >
                            Hide review
                          </Button>
                        )}
                        {comment && (
                          <Button
                            size="sm"
                            variant="danger"
                            icon="trash"
                            className="btn-danger-row"
                            onClick={() => setRemoving(r)}
                          >
                            Remove comment
                          </Button>
                        )}
                        {r.kind === "course" && course && (
                          <Button
                            size="sm"
                            variant="secondary"
                            href={`/admin/courses/${course.id}`}
                            icon="eye"
                          >
                            Review course
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="check"
                          onClick={() => resolve(r, "Marked as resolved.")}
                        >
                          Mark resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            demo.setReportStatus(r.id, "dismissed");
                            toast("Report dismissed. Nothing was changed.");
                          }}
                        >
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="refresh"
                          onClick={() => {
                            demo.setReportStatus(r.id, "open");
                            toast("Report reopened.");
                          }}
                        >
                          Reopen
                        </Button>
                        {review?.hidden && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="eye"
                            onClick={() => {
                              demo.setReviewHidden(review.id, false);
                              toast.success("Review is visible again.");
                            }}
                          >
                            Unhide review
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <EmptyState
            art="tami"
            tone="mint"
            title={
              tab === "open" ? "Nothing flagged. Lovely." : "Nothing here."
            }
            body={
              tab === "open"
                ? "When a learner reports a review, comment or course, it shows up here."
                : "Reports move here once they're handled."
            }
          />
        </Card>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        title="Remove this comment?"
        description="It disappears from the lesson Q&A for everyone. This can't be undone in the demo."
        confirmLabel="Remove comment"
        onConfirm={() => {
          if (!removing) return;
          demo.deleteComment(removing.targetId);
          resolve(removing, "Comment removed and report resolved.");
        }}
      />
    </div>
  );
}
