"use client";

import { ArrowButton, type BtnVariant } from "@/components/decor/Bits";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseById, getCourseProgress } from "@/lib/mock";
import { getCourseAccess } from "@/lib/access";

/** Hero CTA: "Watch the free first video" for visitors, "Continue learning" once you have access. */
export function HeroCta({ courseId, slug, freeHref, variant }: { courseId: string; slug: string; freeHref: string | null; variant: BtnVariant }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const course = getCourseById(courseId, db);
  if (!course) return null;
  const access = getCourseAccess(session, course, db);
  if (access.enrolled && session) {
    const p = getCourseProgress(session.userId, courseId, db);
    const href = `/learn/${slug}${p.resumeItemId ? `/${p.resumeItemId}` : ""}`;
    return (
      <ArrowButton href={href} variant={variant} icon="play">
        {p.percent >= 100 ? "Rewatch the course" : p.percent > 0 ? "Continue learning" : "Start learning"}
      </ArrowButton>
    );
  }
  if (access.fullAccess) {
    return (
      <ArrowButton href={`/learn/${slug}`} variant={variant} icon="play">
        Preview the course
      </ArrowButton>
    );
  }
  if (!freeHref) return null;
  // a student's demo purchases land with the store overlay: hold the space, don't
  // flash the visitor CTA for a course they may already own
  if (!hydrated && session?.role === "student") {
    return (
      <span className="invisible" aria-hidden>
        <ArrowButton variant={variant} icon="play">
          Watch the free first video
        </ArrowButton>
      </span>
    );
  }
  return (
    <ArrowButton href={freeHref} variant={variant} icon="play">
      Watch the free first video
    </ArrowButton>
  );
}
