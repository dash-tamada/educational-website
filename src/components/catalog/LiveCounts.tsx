"use client";

import { useDb } from "@/lib/demo/store";
import { getCourseStats, getCourses, getTutorCourses, getTutors, plural } from "@/lib/mock";

/*
 * Small client islands for counts the demo store can change (an admin demo
 * publishing a course, approving a tutor). The server markup renders the seed
 * numbers; the overlay updates them right after hydration.
 */

/** "12 courses · 10 tutors · every first video free" in the catalog hero. */
export function CatalogCounts() {
  const db = useDb();
  const courses = getCourses({ pageSize: 999 }, db).total;
  const tutors = getTutors(db).length;
  return (
    <span className="opacity-90">
      {courses} course{courses === 1 ? "" : "s"} · {tutors} tutor{tutors === 1 ? "" : "s"} · every first video free
    </span>
  );
}

/** Published course count for a tutor (tutor hero stat). */
export function TutorCourseCount({ tutorId }: { tutorId: string }) {
  const db = useDb();
  return <>{getTutorCourses(tutorId, {}, db).length}</>;
}

/** "Courses" / "Course" label that matches the live count (`lower` for mid-sentence use). */
export function TutorCourseLabel({ tutorId, lower }: { tutorId: string; lower?: boolean }) {
  const db = useDb();
  const word = getTutorCourses(tutorId, {}, db).length === 1 ? "Course" : "Courses";
  return <>{lower ? word.toLowerCase() : word}</>;
}

/** Teach CTA line on the tutor profile: honest for a tutor who hasn't published yet. */
export function TutorTeachLine({ tutorId, first }: { tutorId: string; first: string }) {
  const db = useDb();
  const n = getTutorCourses(tutorId, {}, db).length;
  return (
    <>
      {n === 0
        ? `${first} is filming their first course right now. Got something to teach too? Package what you know into videos people can actually finish.`
        : `${first} started with one short course. Package what you know into videos people can actually finish.`}
    </>
  );
}

/** "29 videos" published across a tutor's live courses. */
export function TutorLessonCount({ tutorId }: { tutorId: string }) {
  const db = useDb();
  const n = getTutorCourses(tutorId, {}, db).reduce((s, c) => s + getCourseStats(c.id, db).videos, 0);
  return <>{plural(n, "video")}</>;
}
