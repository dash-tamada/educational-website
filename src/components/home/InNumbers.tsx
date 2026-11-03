"use client";

import Image from "next/image";
import { useRef } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { media } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { NUMBERS, type Stat } from "@/lib/content/home";
import { ArrowLink, Button, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   05 IN NUMBERS (Mobius "42 Clients"). Cream.
   Giant Anton numerals with a photo showing through the glyphs: the photo sits
   under a cream plate carrying ink numerals, blended with `lighten`, so only the
   glyphs reveal it (real text stays in the DOM for assistive tech via sr-only).
   Each row: copy + button on one side, the numeral on the other, alternating.
   Scroll: the numeral rises out of its row, the photo drifts inside the glyphs.
   ============================================================================= */

function NumberMask({ stat, wide }: { stat: Stat; wide: boolean }) {
  const m = media(stat.image);
  return (
    <div className="number-mask relative isolate inline-block max-w-full overflow-hidden" aria-hidden>
      <div className="absolute inset-0 overflow-hidden">
        <div data-num-img="" className="absolute inset-x-0 -top-[12%] -bottom-[12%]">
          <Image
            src={cropSrc(m.src, wide ? 0.62 : 1.05)}
            alt=""
            fill
            sizes={wide ? "(min-width: 1024px) 62vw, 92vw" : "(min-width: 1024px) 40vw, 70vw"}
            className="object-cover brightness-[0.88]"
            style={{ objectPosition: m.pos }}
          />
        </div>
      </div>
      <p className={clsx("number-plate relative font-display", wide ? "number-wide" : "number-short")}>{stat.value}</p>
    </div>
  );
}

export function InNumbers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        el.querySelectorAll<HTMLElement>("[data-stat]").forEach((row) => {
          const mask = row.querySelector("[data-num]");
          const img = row.querySelector("[data-num-img]");
          gsap.fromTo(mask, { yPercent: 18, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: row, start: "top 78%", once: true } });
          gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true } });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="numbers-title" className="ground-cream relative overflow-hidden">
      <div className="container-wide border-t border-line pt-section pb-section">
        {/* Header */}
        <div className="edit-grid gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <Eyebrow index="05">{NUMBERS.titleTop}</Eyebrow>
            <SplitReveal as="h2" id="numbers-title" className="t-headline-xl mt-6">
              {NUMBERS.title}
            </SplitReveal>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 lg:col-start-10 lg:pt-2">
            <p className="t-small text-muted">{NUMBERS.note}</p>
            <div className="mt-5">
              <ArrowLink href={NUMBERS.cta.href} size="lg">
                {NUMBERS.cta.label}
              </ArrowLink>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="mt-[clamp(48px,8vw,120px)] grid gap-[clamp(64px,10vw,160px)]">
          {NUMBERS.stats.map((s, i) => {
            const wide = s.value.length > 3;
            const flip = i % 2 === 1;
            return (
              <div key={s.value} data-stat="" className="edit-grid items-end gap-y-8">
                <div className={clsx("col-span-12 lg:col-span-4", flip ? "lg:order-2 lg:col-start-9" : "lg:order-1")}>
                  <h3 className="t-headline-m max-w-[14ch]">
                    <span className="sr-only">{s.value} </span>
                    {s.title}
                  </h3>
                  <p className="t-small mt-4 max-w-[24rem] text-muted">{s.body}</p>
                  <div className="mt-6">
                    <Button href={s.cta.href} variant="ink" size="sm" arrow>
                      {s.cta.label}
                    </Button>
                  </div>
                </div>
                <div
                  data-num=""
                  className={clsx(
                    "col-span-12 flex max-lg:order-first lg:col-span-8",
                    flip ? "justify-start lg:order-1 lg:col-start-1" : "justify-end lg:order-2 lg:col-start-5",
                  )}
                >
                  <NumberMask stat={s} wide={wide} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
