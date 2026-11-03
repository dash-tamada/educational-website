"use client";

import { useRef } from "react";
import { PricingPlans } from "@/components/home/PricingPlans";
import { FaqList } from "@/components/home/FaqList";
import { Enquiry } from "@/components/home/Enquiry";
import type { Course } from "@/lib/mock";
import { CourseBar, PurchaseRail } from "./course/Commerce";
import { CourseHero } from "./course/CourseHero";
import { CourseReviews } from "./course/CourseReviews";
import { Curriculum } from "./course/Curriculum";
import { Audience, Capstone, CertificateSection, CourseFaq, DirectorBlock, FinalCta, FreeLesson, Outcomes, ToolsStrip } from "./course/Sections";
import { isFlagship, useCourseState } from "./course/state";

/* =============================================================================
   /courses/[slug] below the header (Mobius flow x Marlowe mood). A client
   component on the live demo store: price, learners, rating, ownership and the
   curriculum follow demo edits (server render + hydration = the seed).

   01 Hero (theatre)                       -> CourseHero
   02 Outcomes · 03 Who it's for · 04 Curriculum   cream zone + sticky purchase rail
   05 Capstone (theatre) · 06 Toolkit strip · 07 Director (theatre) · 08 Reviews
   09 Certificate (night) · 10 Pricing + 12 FAQ + 13 Enquiry (the home sections,
   same numbers) · 11 First lesson free (full-bleed still) · final CTA (theatre)
   Non-flagship courses (studio drafts, bonus packs) get the generic subset.
   Below lg: the rail sits after the curriculum and a bottom bar carries the CTA.
   ============================================================================= */
export function CourseView({ course: initial }: { course: Course }) {
  const id = initial.id;
  const { course, mode } = useCourseState(id);
  const ctaRef = useRef<HTMLDivElement>(null);
  const live = course ?? initial;
  const flagship = isFlagship(live);

  return (
    <>
      <CourseHero courseId={id} ctaRef={ctaRef} />

      <div className="ground-cream relative">
        <div className="container-wide edit-grid gap-y-[calc(var(--section-y)*0.7)] py-section">
          <div className="col-span-12 min-w-0 space-y-[calc(var(--section-y)*0.8)] lg:col-span-7 lg:row-start-1 xl:col-span-8">
            <Outcomes courseId={id} index="02" />
            <Audience courseId={id} index="03" />
            <Curriculum courseId={id} index="04" />
          </div>
          <aside aria-label="Enroll" className="col-span-12 max-lg:max-w-[560px] lg:col-span-4 lg:col-start-9 lg:row-start-1 xl:col-span-3 xl:col-start-10">
            <PurchaseRail courseId={id} />
          </aside>
        </div>
      </div>

      {flagship ? (
        <>
          <Capstone index="05" />
          <ToolsStrip index="06" />
          <DirectorBlock courseId={id} index="07" />
          <CourseReviews courseId={id} index="08" />
          <CertificateSection courseId={id} index="09" />
          {mode !== "enrolled" && <PricingPlans />}
          <FreeLesson courseId={id} index="11" />
          <FaqList />
          <Enquiry />
        </>
      ) : (
        <>
          <DirectorBlock courseId={id} index="05" />
          <CourseReviews courseId={id} index="06" />
          <CertificateSection courseId={id} index="07" />
          <FreeLesson courseId={id} index="08" />
          <CourseFaq courseId={id} index="09" />
        </>
      )}

      <FinalCta courseId={id} />
      <CourseBar courseId={id} watch={ctaRef} />
    </>
  );
}
