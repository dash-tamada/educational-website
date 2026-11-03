"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirstFreeItem } from "@/lib/mock";
import { learnHref, useLearn } from "./context";
import { Button } from "@/components/app";
import { StageSkeleton } from "./LearnShell";
import { LearnEmpty } from "./LearnEmpty";

/**
 * /learn/[courseSlug]: once the demo store overlay is applied, replace the URL with
 * the item to resume (enrolled learners), the first item (tutor/admin preview) or
 * the free preview video (everyone else).
 */
export function ResumeRedirect() {
  const { course, flat, tracking, progress, courseAccess, db, hydrated } =
    useLearn();
  const router = useRouter();
  const target = tracking
    ? (progress.resumeItemId ?? flat[0]?.item.id)
    : courseAccess.owner || courseAccess.admin
      ? flat[0]?.item.id
      : (getFirstFreeItem(course.id, db)?.id ?? flat[0]?.item.id);

  useEffect(() => {
    if (hydrated && target) router.replace(learnHref(course.slug, target));
  }, [hydrated, target, course.slug, router]);

  return (
    <div>
      {(target || !hydrated) && (
        <>
          <h1 className="sr-only">{course.title}</h1>
          <p className="sr-only" role="status">
            Finding your spot in {course.title}…
          </p>
        </>
      )}
      {!target && hydrated ? (
        <div className="mx-auto max-w-[1120px] border-t border-line">
          <LearnEmpty
            eyebrow="00:00:00:00 · Empty reel"
            title="Nothing to watch here yet."
            body={
              courseAccess.owner
                ? "This course has no lessons yet. Add a video, a checkpoint test or a download in the studio and it shows up here."
                : "The tutor is still putting this course together. Check back soon."
            }
            action={
              courseAccess.owner ? (
                <Button
                  href={`/tutor/courses/${course.id}/builder`}
                  iconRight="arrow-right"
                >
                  Open the course studio
                </Button>
              ) : (
                <Button href="/courses" variant="red" iconRight="arrow-right">
                  Browse courses
                </Button>
              )
            }
          />
        </div>
      ) : (
        <StageSkeleton />
      )}
    </div>
  );
}
