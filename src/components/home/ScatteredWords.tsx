"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { SCATTERED } from "@/lib/content/home";
import { Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   02 SCATTERED WORDS (Mobius "imagination / beauty / design"). Cream.
   The statement's key words start scattered across the screen and travel into
   their places as you scroll (sticky stage + scrubbed timeline, desktop and
   tablet, motion allowed); the rest of the sentence then fades in around them.
   Phones / reduced motion: the statement reads in place (line reveal).
   Then the two-column body copy.
   ============================================================================= */

/** Where each [word] starts, as fractions of the stage (left, top). */
const SCATTER = [
  { x: 0.64, y: 0.14 },
  { x: 0.05, y: 0.58 },
  { x: 0.42, y: 0.8 },
  { x: 0.78, y: 0.62 },
  { x: 0.2, y: 0.24 },
];

type Part = { text: string; key: boolean };
function parse(statement: string): Part[] {
  return statement
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((p) => (p.startsWith("[") ? { text: p.slice(1, -1), key: true } : { text: p, key: false }));
}

export function ScatteredWords() {
  const root = useRef<HTMLElement>(null);
  const parts = parse(SCATTERED.statement);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const stage = el.querySelector<HTMLElement>("[data-stage]")!;
        const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
        const rest = el.querySelectorAll<HTMLElement>("[data-rest]");
        // offsets from each word's layout box to its scatter point (offsetLeft/Top ignore transforms)
        const pos = (w: HTMLElement) => {
          let x = 0;
          let y = 0;
          let n: HTMLElement | null = w;
          while (n && n !== stage) {
            x += n.offsetLeft;
            y += n.offsetTop;
            n = n.offsetParent as HTMLElement | null;
          }
          return { x, y };
        };
        const dx = (i: number) => SCATTER[i % SCATTER.length].x * stage.clientWidth - pos(words[i]).x;
        const dy = (i: number) => SCATTER[i % SCATTER.length].y * stage.clientHeight - pos(words[i]).y;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el.querySelector("[data-track]"),
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        // one tween per word (a staggered fromTo only pre-renders the first target's start)
        words.forEach((w, i) => {
          tl.fromTo(
            w,
            { x: () => dx(i), y: () => dy(i) },
            { x: 0, y: 0, duration: 1, ease: "power2.inOut", immediateRender: true },
            0.08 + i * 0.06,
          );
        });
        tl.fromTo(rest, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power1.inOut", immediateRender: true }, 0.82)
          .fromTo(el.querySelector("[data-scatter-label]"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9)
          .to({}, { duration: 0.25 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="school-title" className="ground-cream relative">
      <div data-track="" className="relative md:motion-ok:h-[260vh]">
        <div
          data-stage=""
          className="relative flex items-center overflow-hidden pt-[calc(var(--section-y)*0.8)] pb-[calc(var(--section-y)*0.5)] md:motion-ok:sticky md:motion-ok:top-0 md:motion-ok:h-[100svh] md:motion-ok:py-0"
        >
          <div className="container-wide w-full">
            <div data-scatter-label="">
              <Eyebrow index="02">{SCATTERED.label}</Eyebrow>
            </div>
            <h2 id="school-title" className="scatter-statement t-statement-xl mt-8 max-w-[25ch] md:mt-10">
              {parts.map((p, i) =>
                p.key ? (
                  <span key={i} data-word="" className="inline-block">
                    {p.text}
                  </span>
                ) : (
                  <span key={i} data-rest="">
                    {p.text}
                  </span>
                ),
              )}
            </h2>
          </div>
        </div>
      </div>

      <div className="container-wide edit-grid gap-y-6 pb-section">
        {SCATTERED.body.map((b, i) => (
          <SplitReveal
            key={i}
            as="p"
            className={i === 0 ? "t-body col-span-12 text-muted sm:col-span-6 lg:col-span-4 lg:col-start-4" : "t-body col-span-12 text-muted sm:col-span-6 lg:col-span-4"}
            delay={i * 0.1}
          >
            {b}
          </SplitReveal>
        ))}
      </div>
    </section>
  );
}
