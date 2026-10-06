"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, Button, DemoPill, EmptyState, Rating } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { getTutorCourses, getTutorReviews, timeAgo } from "@/lib/mock";
import { SectionTitle } from "./ui";

/** Reviews across all of a tutor's courses (sample data, demo-store aware). */
export function TutorReviews({ tutorId, firstName }: { tutorId: string; firstName: string }) {
  const db = useDb();
  const [shown, setShown] = useState(6);
  // "Show more": focus the first newly shown review (the button unmounts on the last page)
  const focusFrom = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focusFrom.current === null) return;
    const i = focusFrom.current;
    focusFrom.current = null;
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li")[i]?.focus();
  });
  const all = getTutorReviews(tutorId, db).filter((r) => !r.hidden && r.course?.status === "published");
  const list = all.slice(0, shown);
  const avg = all.length ? all.reduce((n, r) => n + r.rating, 0) / all.length : 0;
  const courseCount = new Set(all.map((r) => r.courseId)).size;
  const hasLiveCourse = getTutorCourses(tutorId, {}, db).length > 0;
  return (
    <section aria-labelledby="tutor-reviews-title">
      <SectionTitle kicker="Reviews" title={`What learners say about ${firstName}`} id="tutor-reviews-title" action={<DemoPill />} />
      {all.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] font-semibold text-ink/65">
          <Rating value={avg} size="sm" showValue={false} />
          <span>
            <strong className="text-ink">{avg.toFixed(1)}</strong> average from {all.length} review{all.length === 1 ? "" : "s"} across {courseCount} course{courseCount === 1 ? "" : "s"}
          </span>
        </p>
      )}
      {all.length === 0 ? (
        <div className="mt-6 rounded-card-lg bg-white shadow-soft">
          <EmptyState
            title="No reviews yet."
            body={
              hasLiveCourse
                ? `${firstName}'s first learners are still busy learning.`
                : `Reviews show up once ${firstName}'s first course is live.`
            }
            art="buddy"
            tone="mint"
          />
        </div>
      ) : (
        <>
          <ul ref={listRef} className="mt-6 columns-1 gap-4 md:columns-2 [&>li]:mb-4 [&>li]:break-inside-avoid">
            {list.map((r) => {
              const name = r.user?.name ?? "A learner";
              return (
                <li key={r.id} tabIndex={-1} className="rounded-card bg-white p-5 shadow-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} src={r.user?.avatar} tone={r.user?.tone} size="md" decorative />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{name}</p>
                      {/* wraps instead of truncating: long city names never eat the date */}
                      <p className="text-[13px] leading-snug font-semibold break-words text-ink/55">
                        {r.user?.city ? `${r.user.city} · ` : ""}
                        <span className="whitespace-nowrap">{timeAgo(r.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Rating value={r.rating} size="sm" showValue={false} />
                  </div>
                  {r.title && <p className="t-app-h3 mt-2">{r.title}</p>}
                  <p className="t-body mt-1.5 text-ink/80">{r.comment}</p>
                  <p className="mt-3 text-[13px] font-semibold text-ink/55">
                    on{" "}
                    <Link href={`/courses/${r.course.slug}`} className="font-bold text-blue underline-offset-4 hf:underline">
                      {r.course.title}
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
          {shown < all.length && (
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                focusFrom.current = list.length;
                setShown((n) => n + 6);
              }}
            >
              Show more reviews ({all.length - shown} left)
            </Button>
          )}
        </>
      )}
    </section>
  );
}
