"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { armEnter, markEntered, onPageReady, prefersReducedMotion } from "@/lib/motion";
import { ABOUT } from "@/lib/content/team";
import { ArrowLink, Eyebrow, GridLines, Photo } from "@/components/editorial";

/* =============================================================================
   ABOUT 01 HERO (Mobius "We are Möbius®" x Marlowe theatre).
   Ink, full viewport. Top row: the eyebrow + "Est. 2023 · India" (CLOCK place). Then the
   giant Anton headline: WE ARE on one line, TAMADA MEDIA® filling the column
   (container-query sized, like the footer wordmark). Under it, Mobius' layout:
   a small question + "Join the course →" bottom-left, the intro in the middle
   columns, a small black-and-white set photo in columns 10-11 (Marlowe detail).
   The bottom padding keeps ~84px clear above the fold so the fixed live clock
   (bottom-right) never sits on hero text.
   Load: hairlines draw down, the lines rise out of masks, the rest fades up.
   ============================================================================= */
export function AboutHero() {
  const root = useRef<HTMLElement>(null);
  const h = ABOUT.hero;

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      const stop = onPageReady(() => {
        armEnter(el);
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(q("[data-ab-lines]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0)
          .fromTo(q("[data-ab-lines] span"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", duration: 1.6, stagger: 0.1, ease: "expo.inOut" }, 0)
          .fromTo(q("[data-ab-line]"), { autoAlpha: 0, yPercent: 106 }, { autoAlpha: 1, yPercent: 0, duration: 1.35, stagger: 0.1 }, 0.2)
          .fromTo(q("[data-ab-fade]"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.07 }, 0.6)
          .call(() => markEntered(q("[data-enter]")));
      });
      // scroll-out: the headline lifts a little faster than the page
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        gsap.to(q("[data-ab-lift]"), { yPercent: -12, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
      });
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="about-title" className="theatre relative isolate overflow-hidden">
      <div data-ab-lines="" data-enter="" className="max-lg:hidden">
        <GridLines stops={[25, 75]} />
      </div>
      <div className="container-wide relative flex min-h-[100svh] flex-col pt-[calc(var(--header-offset)+var(--sat)+clamp(20px,4vh,56px))] pb-[max(84px,10vh)]">
        <div data-ab-fade="" data-enter="" className="flex items-center justify-between gap-6">
          <Eyebrow index="01">{h.label}</Eyebrow>
          <p className="t-timecode text-ash">{h.meta}</p>
        </div>

        <div data-ab-lift="" className="@container mt-[clamp(28px,6vh,88px)]">
          <h1 id="about-title" className="font-display leading-[0.8] uppercase">
            <span className="line-mask text-[16cqw] leading-[0.86] sm:text-[9.6cqw]">
              <span data-ab-line="" data-enter="" className="block text-cream/90">
                {h.titleTop}
              </span>
            </span>
            {/* phones: TAMADA / MEDIA® stacked at full width; from 640px one line */}
            <span className="line-mask text-[29.5cqw] leading-[0.82] tracking-[-0.012em] sm:text-[17.3cqw] sm:leading-[0.8]">
              <span data-ab-line="" data-enter="" className="block whitespace-nowrap">
                <span className="max-sm:block">{h.title.split(" ")[0]}</span>{" "}
                <span className="max-sm:block">
                  {h.title.split(" ").slice(1).join(" ")}
                  <sup className="relative top-[0.08em] ml-[0.04em] align-top text-[0.3em] text-red">®</sup>
                </span>
              </span>
            </span>
          </h1>
        </div>

        <div className="edit-grid mt-[clamp(28px,5vh,72px)] flex-1 items-end gap-y-10">
          <div data-ab-fade="" data-enter="" className="col-span-12 sm:col-span-6 lg:col-span-3 max-lg:order-2">
            <p className="t-small max-w-[14rem] text-ash">{h.side}</p>
            <div className="mt-5">
              <ArrowLink href={h.cta.href} size="xl">
                {h.cta.label}
              </ArrowLink>
            </div>
          </div>
          <div className="col-span-12 grid gap-5 lg:col-span-6 lg:col-start-4 xl:col-span-5">
            {h.intro.map((p) => (
              <p key={p.slice(0, 24)} data-ab-fade="" data-enter="" className="t-body-l max-w-[38rem] text-cream/85">
                {p}
              </p>
            ))}
          </div>
          <figure data-ab-fade="" data-enter="" className="col-span-2 col-start-10 max-lg:hidden short:hidden">
            <figcaption className="t-timecode mb-3 text-ash">Fig. 01 · Take one</figcaption>
            <Photo k="bts-slate-hands" ratio={5 / 4} sizes="15vw" className="aspect-[4/5]" imgClassName="grayscale contrast-[1.08]" />
          </figure>
        </div>
      </div>
    </section>
  );
}
