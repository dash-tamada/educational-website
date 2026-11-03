"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { armEnter, markEntered, onPageReady, prefersReducedMotion } from "@/lib/motion";
import { media } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { HERO } from "@/lib/content/home";
import { FLAGSHIP } from "@/lib/content/site";
import { GridLines, RedWords, ArrowLink } from "@/components/editorial";

/* =============================================================================
   01 HERO (Marlowe). Pitch-black theatre, full viewport. The director's low-key
   portrait stands in the centre column behind everything (vignetted into the
   black), the statement sits top-left in condensed caps with red words, the
   header nav + wide red CTA top-right (SiteHeader, same 1fr 2fr 1fr columns as
   the hairlines here), the side note in the right column, and the giant Anton
   title PROMPT TO / PREMIERE at the bottom of the centre column.
   Load: portrait fades in from 1.1x, hairlines draw down, lines rise out of masks.
   Scroll: portrait drifts down + the title rises (scrub, transform only).
   ============================================================================= */

export function HomeHero() {
  const root = useRef<HTMLElement>(null);
  const portrait = media(HERO.portrait);

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      const stop = onPageReady(() => {
        armEnter(el);
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo(q("[data-hero-portrait]"), { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 2.2 }, 0)
          .fromTo(q("[data-hero-lines]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0)
          .fromTo(q("[data-hero-lines] span"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", duration: 1.6, stagger: 0.1, ease: "expo.inOut" }, 0)
          .fromTo(q("[data-hero-st]"), { autoAlpha: 0, yPercent: 110 }, { autoAlpha: 1, yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.25)
          .fromTo(q("[data-hero-title]"), { autoAlpha: 0, yPercent: 105 }, { autoAlpha: 1, yPercent: 0, duration: 1.4, stagger: 0.1 }, 0.35)
          .fromTo(q("[data-hero-fade]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.7)
          .call(() => markEntered(q("[data-enter]")));
      });

      // scroll-out: portrait sinks, title lifts (scrub)
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const st = { trigger: el, start: "top top", end: "bottom top", scrub: true };
        gsap.to(q("[data-hero-drift]"), { yPercent: 14, ease: "none", scrollTrigger: st });
        gsap.to(q("[data-hero-lift]"), { yPercent: -18, ease: "none", scrollTrigger: st });
        gsap.to(q("[data-hero-dim]"), { opacity: 0.85, ease: "none", scrollTrigger: st });
      });
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="theatre relative isolate h-[100svh] min-h-[620px] overflow-hidden lg:min-h-[700px]"
    >
      {/* Portrait: centre column, bleeding into the black */}
      <div data-hero-drift="" className="absolute inset-0 -z-10">
        <div className="hero-portrait absolute inset-y-0 left-1/2 w-full -translate-x-1/2 lg:w-[min(52vw,calc(100svh*0.82))] lg:-translate-x-[56%]">
          <div data-hero-portrait="" data-enter="" className="absolute inset-0">
          <Image
            src={cropSrc(portrait.src, 1.25)}
            alt={portrait.alt}
            fill
            preload
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
            style={{ objectPosition: portrait.pos }}
          />
          </div>
        </div>
        {/* vignette + bottom scrim for the title */}
        <div aria-hidden className="hero-vignette absolute inset-0" />
        <div data-hero-dim="" aria-hidden className="absolute inset-0 bg-ink opacity-0" />
      </div>

      <div data-hero-lines="" data-enter="" className="max-lg:hidden">
        <GridLines stops={[22, 78]} />
      </div>

      <div className="container-wide relative flex h-full flex-col pt-[calc(var(--header-offset)+var(--sat)+clamp(8px,3vh,32px))] pb-[max(20px,var(--sab))] lg:grid lg:grid-cols-[11fr_28fr_11fr] lg:gap-x-grid lg:pt-[calc(var(--header-offset)+var(--sat)+8px)] lg:pb-0">
        {/* Left column: the statement (top) + course meta (bottom) */}
        <div className="flex flex-col justify-between lg:pb-[clamp(24px,4vh,44px)]">
          <p className="hero-statement font-display uppercase">
            {HERO.statement.map((line) => (
              <span key={line} className="line-mask">
                <span data-hero-st="" data-enter="" className="block">
                  <RedWords text={line} red={HERO.statementRed} />
                </span>
              </span>
            ))}
          </p>
          <div className="mt-6 hidden max-w-[17rem] lg:block">
            <p data-hero-fade="" data-enter="" className="t-label text-ash">
              {HERO.meta.course}
            </p>
            <p data-hero-fade="" data-enter="" className="t-small mt-3 text-cream/80">
              {HERO.meta.facts}
            </p>
          </div>
        </div>

        {/* Centre column: the giant title at the bottom */}
        <div data-hero-lift="" className="relative mt-auto flex flex-col justify-end lg:mt-0">
          <h1 id="hero-title" className="hero-title font-display uppercase">
            <span className="line-mask">
              <span data-hero-title="" data-enter="" className="hero-title-top block">
                {HERO.titleTop}
              </span>
            </span>
            <span className="line-mask">
              <span data-hero-title="" data-enter="" className="hero-title-main block">
                {HERO.title}
              </span>
            </span>
            <span className="sr-only">: {FLAGSHIP.title}, an AI filmmaking course by {HERO.sideBy}</span>
          </h1>
        </div>

        {/* Right column: side note (middle) + year */}
        <div className="relative hidden flex-col lg:flex">
          <div className="mt-[34vh] max-w-[19rem]">
            <p data-hero-fade="" data-enter="" className="t-body text-cream/90">
              {HERO.side}
            </p>
            <p data-hero-fade="" data-enter="" className="t-label mt-4 text-ash">
              {HERO.sideBy}
            </p>
            <div data-hero-fade="" data-enter="" className="mt-8">
              <ArrowLink href={FLAGSHIP.href}>See the course</ArrowLink>
            </div>
          </div>
          <p data-hero-fade="" data-enter="" className="t-statement-m mt-auto pb-[clamp(64px,10vh,104px)] text-cream">
            {HERO.meta.year}
          </p>
        </div>

        {/* Phones / tablets: facts line under the title */}
        <p data-hero-fade="" data-enter="" className="t-label mt-4 text-ash lg:hidden">
          {HERO.meta.course}
        </p>
      </div>
    </section>
  );
}
