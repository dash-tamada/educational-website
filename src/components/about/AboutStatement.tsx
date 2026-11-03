"use client";

import { useRef } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { ABOUT } from "@/lib/content/team";
import { Eyebrow, ParallaxPhoto } from "@/components/editorial";

/* =============================================================================
   ABOUT 02 STATEMENT (Mobius "brings the missing pieces together"). Cream.
   One big Inter Tight sentence, first line indented to the second column, that
   fills in word by word as it scrolls through the viewport (opacity only,
   scrubbed; red words stay red). Then a Mobius photo pair: a narrow set photo and
   a wide one, drifting inside their frames. Reduced motion: the sentence is static.
   ============================================================================= */

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

export function AboutStatement() {
  const root = useRef<HTMLElement>(null);
  const s = ABOUT.statement;
  const red = new Set(s.red.map(norm));
  const words = s.text.split(" ");

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el.querySelectorAll("[data-word]"),
          { opacity: 0.14 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: { trigger: el.querySelector("[data-statement]"), start: "top 82%", end: "bottom 45%", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="about-statement-label" className="ground-cream relative">
      <div className="container-wide py-section">
        <Eyebrow index="02" as="h2">
          <span id="about-statement-label">{s.label}</span>
        </Eyebrow>
        <p data-statement="" className="mt-[clamp(32px,5vw,72px)] font-heading text-[clamp(2rem,1rem+3.6vw,5rem)] leading-[1.04] font-semibold tracking-[-0.04em] lg:indent-[25%]">
          {words.map((w, i) => (
            <span key={i}>
              <span data-word="" className={clsx(red.has(norm(w)) && "text-red")}>
                {w}
              </span>
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </p>

        <div className="edit-grid mt-[clamp(64px,9vw,140px)] items-end gap-y-6">
          <ParallaxPhoto
            k={ABOUT.photos.narrow}
            sizes="(min-width: 1024px) 22vw, 40vw"
            amount={9}
            className="col-span-5 aspect-[3/5] sm:col-span-4 lg:col-span-3"
          />
          <ParallaxPhoto
            k={ABOUT.photos.wide}
            sizes="(min-width: 1024px) 72vw, 100vw"
            amount={7}
            className="col-span-12 aspect-[16/10] max-sm:-order-1 sm:col-span-8 lg:col-span-9"
          />
          <p className="t-timecode col-span-12 text-muted lg:col-span-6 lg:col-start-4">{ABOUT.photos.caption}</p>
        </div>
      </div>
    </section>
  );
}
