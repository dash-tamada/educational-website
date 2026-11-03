"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { COURSE_GROUPS, COURSE_INTRO } from "@/lib/content/home";
import { FLAGSHIP } from "@/lib/content/site";
import { ArrowLink, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   04 WHAT YOU'LL LEARN (Mobius "Our Services"). Cream.
   Sticky left column ("The Course" + a small note + "Get started →"); on the
   right, the ten modules grouped into five statements, one after another, each
   with a giant ghost index letter (A/ … E/) and pill chips of topics and tools.
   The letter of the statement crossing the middle of the screen turns red.
   ============================================================================= */

export function CourseServices() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-group]"));
      const triggers = blocks.map((b) =>
        ScrollTrigger.create({
          trigger: b,
          start: "top 55%",
          end: "bottom 55%",
          toggleClass: { targets: b, className: "is-current" },
        }),
      );
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        for (const b of blocks) {
          const chips = b.querySelectorAll("[data-chip]");
          gsap.fromTo(
            chips,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "expo.out",
              stagger: 0.04,
              scrollTrigger: { trigger: b, start: "top 70%", once: true },
            },
          );
        }
      });
      return () => {
        triggers.forEach((t) => t.kill());
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="course" aria-labelledby="course-title" className="ground-cream relative">
      <div className="container-wide edit-grid pt-section pb-[calc(var(--section-y)*0.6)]">
        {/* Sticky label column */}
        <div className="col-span-12 lg:col-span-4">
          <div className="flex flex-col justify-between gap-10 lg:sticky lg:top-[calc(var(--header-offset)+32px)] lg:h-[calc(100svh-var(--header-offset)-96px)]">
            <div>
              <Eyebrow index="04">{COURSE_INTRO.label}</Eyebrow>
              <h2 id="course-title" className="t-headline-l mt-6 max-w-[11ch]">
                What you&rsquo;ll learn
              </h2>
              <p className="t-label mt-6 text-muted">
                {FLAGSHIP.modules} modules · {FLAGSHIP.lessons} lessons · {FLAGSHIP.hours}
              </p>
            </div>
            <div className="max-lg:hidden">
              <p className="t-small max-w-[17rem] text-muted">{COURSE_INTRO.note}</p>
              <div className="mt-5">
                <ArrowLink href={COURSE_INTRO.cta.href} size="lg">
                  {COURSE_INTRO.cta.label}
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        {/* Statements */}
        <div className="col-span-12 mt-12 lg:col-span-8 lg:col-start-5 lg:mt-0">
          {COURSE_GROUPS.map((g) => (
            <article
              key={g.letter}
              data-group=""
              aria-labelledby={`group-${g.letter}`}
              className="course-group grid grid-cols-[auto_1fr] gap-x-4 border-t border-line py-[clamp(48px,9vh,96px)] first:border-t-0 first:pt-0 sm:gap-x-8 lg:min-h-[78svh] lg:grid-cols-[minmax(0,2fr)_minmax(0,6fr)] lg:gap-x-grid lg:border-t-0 lg:py-[10vh]"
            >
              <p aria-hidden className="course-letter font-heading text-[clamp(2.25rem,1.4rem+3vw,4.25rem)] leading-none font-semibold tracking-[-0.05em] lg:text-right">
                {g.letter}/
              </p>
              <div className="min-w-0">
                <h3 id={`group-${g.letter}`} className="t-label flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{g.title}</span>
                  <span className="text-muted">{g.modules}</span>
                </h3>
                <SplitReveal as="p" className="t-statement-l mt-5 max-w-[22ch] sm:max-w-[24ch]">
                  {g.statement}
                </SplitReveal>
                <ul className="mt-8 flex max-w-[40rem] flex-wrap gap-2">
                  {g.chips.map((c) => (
                    <li key={c} data-chip="" className="chip">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
          <div className="mt-4 border-t border-line pt-8 lg:hidden">
            <p className="t-small max-w-[22rem] text-muted">{COURSE_INTRO.note}</p>
            <div className="mt-4">
              <ArrowLink href={COURSE_INTRO.cta.href} size="lg">
                {COURSE_INTRO.cta.label}
              </ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
