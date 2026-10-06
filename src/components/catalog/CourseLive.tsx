"use client";

import { Icon } from "@/components/app";
import { getCourseAccess } from "@/lib/access";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb } from "@/lib/demo/store";
import { getCourseById, getCourseStats, getTutor, type Course } from "@/lib/mock";
import { courseFaqs } from "@/lib/mock/extra/catalog";
import { Accordion } from "./Accordion";

const STATUS_NOTE: Partial<Record<Course["status"], string>> = {
  draft: "This course is a draft. Only its tutor and admins can see this page.",
  in_review: "This course is in the review queue. Only its tutor and admins can see this page.",
  rejected: "This course was sent back with notes. Only its tutor and admins can see this page.",
  archived: "This course is archived. People who own it keep access; it is no longer for sale.",
};

/** The live course (seed + demo-store edits), falling back to what the server rendered. */
function useLiveCourse(course: Course) {
  const db = useDb();
  return { live: getCourseById(course.id, db) ?? course, db };
}

/** What a learner who owns an unpublished course sees (no review-queue wording). */
const OWNER_LEARNER_NOTE = "This course isn't in the catalogue right now. You still have full access.";

/**
 * Status banner, chosen by viewer. Tutor and admin get the review-state copy; a
 * learner who owns an unpublished course is told they keep access. Reads the
 * live status, so it disappears the moment the admin demo publishes the course
 * (server markup = the seed status).
 */
export function CourseStatusBanner({ course }: { course: Course }) {
  const { live, db } = useLiveCourse(course);
  const session = useDemoSession();
  const access = getCourseAccess(session, live, db);
  const staff = access.owner || access.admin;
  const note =
    live.status === "archived" || staff
      ? STATUS_NOTE[live.status]
      : live.status !== "published" && access.enrolled
        ? OWNER_LEARNER_NOTE
        : undefined;
  if (!note) return null;
  return (
    <div className="container-x">
      <p role="status" className="mb-3 flex items-start gap-2 rounded-card bg-butter px-4 py-3 text-[14px] font-semibold text-[#6b5400]">
        <Icon name="info" className="mt-px size-4 shrink-0" />
        {note}
      </p>
    </div>
  );
}

/** Course FAQ built from the live course (on-sale answers follow its status). */
export function CourseFaq({ course, className }: { course: Course; className?: string }) {
  const { live, db } = useLiveCourse(course);
  const session = useDemoSession();
  const access = getCourseAccess(session, live, db);
  const stats = getCourseStats(live.id, db);
  const tutor = getTutor(live.tutorId, db);
  const learnerOwns = access.enrolled && !access.owner && !access.admin;
  return <Accordion className={className} items={courseFaqs(live, stats, tutor, { learnerOwns })} />;
}
