"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { armEnter, markEntered, onPageReady, prefersReducedMotion } from "@/lib/motion";
import { media } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { COURSE_PAGE } from "@/lib/content/course";
import { Eyebrow, GridLines, RedWords } from "@/components/editorial";
import { getCategory, formatDuration, formatNumber, type Course } from "@/lib/mock";
import { getCourseAccess } from "@/lib/access";
import { CourseCtas, PriceLockup } from "./Commerce";
import { courseFacts, isFlagship, splitTitle, useCourseState } from "./state";
import { MetaLine, PlayMark } from "./ui";

/* =============================================================================
   01 HERO (theatre, flush under the header). Marlowe lockup on the left: tiny caps
   kicker, the giant Anton title (PROMPT TO / PREMIERE), the statement with a red
   word; the trailer poster on the right half (play = the free first lesson);
   along the bottom hairline: the facts in mono caps, the price and the CTA pair.
   Load: hairlines draw, title lines rise out of masks, the poster settles from
   1.08 (transform/opacity only; reduced motion = static).
   ============================================================================= */

const STATUS_NOTE: Partial<Record<Course["status"], string>> = {
  draft: "Draft · only its tutor and admins can see this page",
  in_review: "In review · only its tutor and admins can see this page",
  rejected: "Sent back with notes · only its tutor and admins can see this page",
  archived: "Archived · owners keep access, it is no longer for sale",
};

export function CourseHero({ courseId, ctaRef }: { courseId: string; ctaRef?: React.Ref<HTMLDivElement> }) {
  const root = useRef<HTMLElement>(null);
  const s = useCourseState(courseId);
  const { course, db, session } = s;

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      const stop = onPageReady(() => {
        armEnter(el);
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(q("[data-ch-lines]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0)
          .fromTo(q("[data-ch-lines] span"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", duration: 1.5, stagger: 0.08, ease: "expo.inOut" }, 0)
          .fromTo(q("[data-ch-poster]"), { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 1.9 }, 0.1)
          .fromTo(q("[data-ch-title]"), { autoAlpha: 0, yPercent: 105 }, { autoAlpha: 1, yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.25)
          .fromTo(q("[data-ch-fade]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.55)
          .call(() => markEntered(q("[data-enter]")));
      });
      // scroll-out: the poster image drifts inside its frame (scrub, transform only)
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        gsap.to(q("[data-ch-drift]"), { yPercent: 8, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
      });
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope: root },
  );

  if (!course) return null;
  const flagship = isFlagship(course);
  const facts = courseFacts(course, db);
  const category = getCategory(course.categoryId, db);
  const access = getCourseAccess(session, course, db);
  const staff = access.owner || access.admin;
  const status =
    course.status === "archived" || staff
      ? STATUS_NOTE[course.status]
      : course.status !== "published" && access.enrolled
        ? "Not in the catalogue right now · you still have full access"
        : undefined;

  const t = flagship ? { top: COURSE_PAGE.hero.titleTop, main: COURSE_PAGE.hero.title } : splitTitle(course.title);
  const fitWord = flagship; // the flagship's one-word title fills its column exactly
  const poster = flagship ? media(COURSE_PAGE.hero.poster) : { src: course.thumbnail, alt: "", pos: undefined };
  const freeLesson = s.free?.type === "video" ? s.free.lesson : null;
  const canPlay = !!freeLesson && course.status === "published";

  const meta = [
    `${facts.modules} module${facts.modules === 1 ? "" : "s"}`,
    `${facts.lessons} lessons`,
    facts.runtime,
    flagship ? COURSE_PAGE.hero.languages : course.language,
    course.hasCertificate && "Certificate",
  ];

  return (
    <section ref={root} aria-labelledby="course-title" className="theatre relative isolate overflow-hidden">
      <div data-ch-lines="" data-enter="" className="max-lg:hidden">
        <GridLines stops={[50]} className="top-[calc(var(--header-offset)+var(--sat))]" />
      </div>

      <div className="container-wide relative flex flex-col pt-[calc(var(--header-offset)+var(--sat)+clamp(16px,3vh,32px))] pb-[clamp(28px,5vh,48px)] lg:min-h-[max(100svh,760px)]">
        {status && (
          <p role="status" className="t-timecode mb-6 flex items-center gap-3 border border-line-strong px-3 py-2.5 text-cream/85">
            <span aria-hidden className="block size-[7px] shrink-0 bg-red" />
            {status}
          </p>
        )}

        {/* row 1: kicker | the facts (md+) */}
        <div className="grid items-start gap-y-3 md:grid-cols-2">
          <div data-ch-fade="" data-enter="">
            <Eyebrow index="01">{flagship ? COURSE_PAGE.hero.kicker : `Course · ${category?.name ?? course.level}`}</Eyebrow>
          </div>
          <div data-ch-fade="" data-enter="" className="max-md:hidden md:pl-[var(--grid-gap)]">
            <MetaLine className="text-cream/85" items={meta} />
          </div>
        </div>

        {/* row 2: title + statement | poster */}
        <div className="mt-8 grid flex-1 gap-y-8 lg:mt-10 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col justify-end lg:pr-[var(--grid-gap)] lg:pb-1">
            <h1 id="course-title" className={clsx("font-display uppercase", fitWord ? "hero-title" : "t-display-xl text-balance")}>
              {t.top && (
                <span className="line-mask">
                  <span data-ch-title="" data-enter="" className={clsx("block", fitWord ? "hero-title-top" : "text-[0.5em] leading-[0.95]")}>
                    {t.top}
                  </span>
                </span>
              )}
              <span className="line-mask">
                <span data-ch-title="" data-enter="" className={clsx("block", fitWord && "hero-title-main")}>
                  {t.main}
                </span>
              </span>
              {flagship && <span className="sr-only">: {course.title}</span>}
            </h1>
            <p data-ch-fade="" data-enter="" className="t-statement-m mt-6 max-w-[30ch] text-cream/90 md:mt-8">
              {flagship ? <RedWords text={COURSE_PAGE.hero.statement.text} red={COURSE_PAGE.hero.statement.red} /> : course.promise}
            </p>
          </div>

          {/* the trailer poster */}
          <div className="relative min-h-[260px] sm:min-h-[380px] lg:min-h-0">
            <div data-ch-poster="" data-enter="" className="absolute inset-0">
              {canPlay ? (
                <Link
                  href={s.freeHref}
                  className="group hover-zoom-parent absolute inset-0 block overflow-hidden bg-charcoal"
                  aria-label={`Play the free first lesson: ${freeLesson!.title} (${formatDuration(freeLesson!.durationSec, "long")})`}
                >
                  <PosterImage src={poster.src} pos={poster.pos} />
                  <PosterOverlay title={freeLesson!.title} duration={formatDuration(freeLesson!.durationSec, "clock")} />
                </Link>
              ) : (
                <div className="absolute inset-0 overflow-hidden bg-charcoal">
                  <PosterImage src={poster.src} pos={poster.pos} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* row 3: price + social proof | the CTA pair (split on the 50% hairline) */}
        <div className="mt-8 grid gap-y-7 border-t border-line pt-6 lg:mt-10 lg:grid-cols-2 lg:items-end">
          <div data-ch-fade="" data-enter="" className="min-w-0">
            <MetaLine className="mb-6 text-cream/85 md:hidden" items={meta} />
            <PriceLockup courseId={courseId} note={false} />
            <MetaLine
              className="mt-3 text-ash"
              items={[
                course.reviewCount > 0 && `★ ${course.rating.toFixed(1)} · ${formatNumber(course.reviewCount)} reviews`,
                `${formatNumber(course.learners)} enrolled`,
                flagship ? COURSE_PAGE.hero.by : course.level,
              ]}
            />
          </div>
          <div data-ch-fade="" data-enter="" className="lg:flex lg:justify-end lg:pl-[var(--grid-gap)]">
            <CourseCtas ref={ctaRef} courseId={courseId} full />
          </div>
        </div>
      </div>
    </section>
  );
}

function PosterImage({ src, pos }: { src: string; pos?: string }) {
  return (
    <div data-ch-drift="" className="absolute -inset-y-[6%] inset-x-0">
      <Image
        src={cropSrc(src, 0.9)}
        alt=""
        fill
        preload
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="hover-zoom object-cover opacity-[0.88]"
        style={{ objectPosition: pos ?? "50% 50%" }}
      />
    </div>
  );
}

function PosterOverlay({ title, duration }: { title: string; duration: string }) {
  return (
    <>
      <div aria-hidden className="scrim-b absolute inset-0" />
      <p className="t-timecode absolute top-4 left-4 flex items-center gap-2.5 text-cream md:top-5 md:left-5">
        <span aria-hidden className="block size-[7px] animate-rec bg-red" />
        Preview · Lesson 01
      </p>
      <p className="t-timecode absolute top-4 right-4 text-cream/80 md:top-5 md:right-5">{duration}</p>
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 md:gap-5 md:p-5">
        <PlayMark />
        <div className="min-w-0 pb-0.5">
          <p className="t-label text-cream/75">Watch free · no card</p>
          <p className="mt-1.5 font-heading text-[clamp(1.0625rem,0.95rem+0.5vw,1.375rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-cream">{title}</p>
        </div>
      </div>
    </>
  );
}
