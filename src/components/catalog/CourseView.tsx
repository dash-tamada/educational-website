"use client";

import clsx from "clsx";
import { Icon } from "@/components/app";
import { Tag } from "@/components/decor/Bits";
import { getCourseAccess } from "@/lib/access";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb } from "@/lib/demo/store";
import { getCourseById, getCourseCard, getCourseStats, getFirstFreeItem, type Course } from "@/lib/mock";
import { relatedFor, whatsIncluded } from "@/lib/mock/extra/catalog";
import { CourseFaq, CourseStatusBanner } from "./CourseLive";
import { CourseGrid } from "./CourseGrid";
import { CourseHero } from "./CourseHero";
import { CourseReviews } from "./CourseReviews";
import { Curriculum } from "./Curriculum";
import { PurchaseCard } from "./PurchaseCard";
import { TutorCard } from "./TutorCard";
import { SectionTitle } from "./ui";

/**
 * Everything on /courses/[slug] below the header. A client component reading the
 * live demo store (useDb), so ratings, learner counts, the breadcrumb category,
 * the tutor block and "Updated" all follow demo edits. Server render and
 * hydration use the seed (same markup), the overlay applies right after.
 */
export function CourseView({ course: initial }: { course: Course }) {
  const db = useDb();
  const session = useDemoSession();
  const course = getCourseById(initial.id, db) ?? initial;
  const data = getCourseCard(course.id, db);
  if (!data) return null;
  const access = getCourseAccess(session, course, db);
  const free = access.visible ? getFirstFreeItem(course.id, db) : null;
  // never suggest a course this student already owns
  const owned = session?.role === "student" ? db.enrollments.filter((e) => e.userId === session.userId && !e.revokedAt).map((e) => e.courseId) : [];
  // four: 2 x 2 between sm and lg, three in a row from lg (see CourseGrid balanced)
  const related = relatedFor(course, owned, 4, db);

  return (
    <>
      <CourseStatusBanner course={course} />
      <CourseHero data={data} freeItem={free} />

      <div className="container-x grid gap-10 pt-10 pb-section md:pt-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <aside aria-label="Buy this course" className="lg:order-2">
          <PurchaseCard courseId={course.id} sticky />
        </aside>

        <div className="min-w-0 space-y-14 md:space-y-20 lg:order-1">
          <section aria-labelledby="learn-title">
            <SectionTitle kicker="The good stuff" title={course.outcomes.length > 0 ? "What you'll learn" : "What's included"} id="learn-title" />
            {course.outcomes.length > 0 && (
              <ul className="mt-6 grid gap-3 rounded-card-lg bg-white p-5 shadow-soft sm:grid-cols-2 md:p-7">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-3 text-[15.5px] leading-snug font-semibold">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-forest" aria-hidden>
                      <Icon name="check" className="size-4" strokeWidth={3} />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            )}
            {/* lg+ only: below lg the purchase card lists these itself */}
            <div className={clsx("hidden rounded-card-lg bg-white p-5 shadow-soft md:p-7 lg:block", course.outcomes.length > 0 ? "mt-4" : "mt-6")}>
              {course.outcomes.length > 0 && <h3 className="t-micro tracking-[0.06em] text-ink/55 uppercase">What&apos;s included</h3>}
              <ul className={clsx("grid gap-x-6 gap-y-2.5 xl:grid-cols-2", course.outcomes.length > 0 && "mt-3")}>
                {whatsIncluded(course, getCourseStats(course.id, db)).map((w) => (
                  <li key={w.text} className="flex items-start gap-2.5 text-[14.5px] font-semibold">
                    <Icon name={w.icon} className="mt-px size-[18px] shrink-0 text-blue" />
                    {w.text}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Curriculum courseId={course.id} />

          <section aria-labelledby="about-title">
            <SectionTitle kicker="The details" title="About this course" id="about-title" />
            {/* side by side on tablets and wide desktops; stacked in the narrow 1024-1279 main column */}
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
              <div className="rounded-card-lg bg-white p-5 shadow-soft md:p-7">
                <p className="t-body text-ink/80">{course.description || course.promise}</p>
                {course.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {course.tags.map((t) => (
                      <Tag key={t} tone="butter">
                        #{t.toLowerCase().replace(/\s+/g, "")}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-card-lg bg-cyan p-5 md:p-6">
                <h3 className="t-app-h3">Before you start</h3>
                <ul className="mt-3 space-y-2.5">
                  {(course.requirements.length ? course.requirements : ["Curiosity and a phone or laptop. That's it."]).map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-[14.5px] leading-snug font-semibold">
                      <Icon name="arrow-right" className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {data.tutor && <TutorCard tutor={data.tutor} />}

          <CourseReviews courseId={course.id} />

          <section aria-labelledby="faq-title">
            <SectionTitle kicker="FAQ" title="Good to know" id="faq-title" />
            <CourseFaq className="mt-6" course={course} />
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-x pb-section">
          <SectionTitle kicker="Keep exploring" title="If you like this, try…" id="related-title" />
          <div className="mt-6">
            <CourseGrid courseIds={related.map((c) => c.id)} balanced />
          </div>
        </section>
      )}
    </>
  );
}
