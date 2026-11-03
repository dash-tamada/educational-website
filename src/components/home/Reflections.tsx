"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { media } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { REFLECTIONS } from "@/lib/content/home";
import { ArrowIcon, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   09 REFLECTIONS (Mobius "Client reflections" slider). Cream-2.
   Giant /1 index + round prev/next on the left, a tall portrait, the quote in big
   Inter Tight, name and role. All slides are stacked in one grid cell (the cell
   takes the tallest slide: no layout shift on change); the active one fades and
   rises in (CSS transitions). Keyboard: ← → on the slider, buttons, swipe on
   touch. These are SAMPLE reviews and say so under the headline.
   ============================================================================= */

export function Reflections() {
  const items = REFLECTIONS.items;
  const [i, setI] = useState(0);
  const start = useRef<number | null>(null);
  const go = useCallback((d: number) => setI((v) => (v + d + items.length) % items.length), [items.length]);
  const n = String(i + 1);

  return (
    <section aria-labelledby="reflections-title" className="ground-cream-2 relative overflow-hidden">
      <div className="container-wide py-section">
        <div className="edit-grid gap-y-6">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <Eyebrow index="09">Reflections</Eyebrow>
            <SplitReveal as="h2" id="reflections-title" className="t-headline-xl mt-6">
              {REFLECTIONS.title}
            </SplitReveal>
            <p className="t-small mt-5 max-w-[30rem] text-muted">{REFLECTIONS.note}</p>
          </div>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Sample learner reviews"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(-1);
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") start.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (start.current === null) return;
            const dx = e.clientX - start.current;
            start.current = null;
            if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
          }}
          className="edit-grid mt-[clamp(40px,6vw,96px)] gap-y-8 focus-visible:outline-offset-8"
        >
          {/* index + controls */}
          <div className="col-span-12 flex items-end justify-between lg:col-span-2 lg:flex-col lg:items-start">
            <p aria-hidden className="font-heading text-[clamp(3.5rem,2rem+5vw,7rem)] leading-[0.85] font-semibold tracking-[-0.06em] text-ink/15">
              /{n}
            </p>
            <div className="flex items-center gap-2 lg:mt-auto">
              <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="round-btn">
                <ArrowIcon dir="left" className="size-4" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next review" className="round-btn">
                <ArrowIcon className="size-4" />
              </button>
              <span className="t-timecode ml-3 text-muted">
                {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* portrait */}
          <div className="col-span-7 sm:col-span-5 lg:col-span-3 lg:col-start-3">
            <div className="media-frame aspect-[3/4] w-full">
              {items.map((r, k) => {
                const m = media(r.image);
                return (
                  <div key={r.name} data-active={k === i ? "" : undefined} className="slide-photo absolute inset-0">
                    <Image
                      src={cropSrc(m.src, 4 / 3)}
                      alt={k === i ? m.alt : ""}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 58vw"
                      className="object-cover"
                      style={{ objectPosition: m.pos }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* quote */}
          <div className="col-span-12 grid lg:col-span-6 lg:col-start-7" aria-live="polite">
            {items.map((r, k) => (
              <figure
                key={r.name}
                role="group"
                aria-roledescription="slide"
                aria-label={`${k + 1} of ${items.length}`}
                aria-hidden={k !== i}
                inert={k !== i}
                data-active={k === i ? "" : undefined}
                className="slide-quote [grid-area:1/1]"
              >
                <blockquote className="t-statement-l">&ldquo;{r.quote}&rdquo;</blockquote>
                <figcaption className="mt-8">
                  <p className="text-[15px] font-semibold tracking-[-0.01em]">{r.name}</p>
                  <p className="t-small mt-1 text-muted">{r.role} · sample review</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
