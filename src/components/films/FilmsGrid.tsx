"use client";

import clsx from "clsx";
import { FILMS, FILMS_PAGE } from "@/lib/content/films";
import { Photo, SplitReveal } from "@/components/editorial";
import { Reveal } from "@/components/motion/Reveal";

/* =============================================================================
   FILMS GRID (the accessible view; the default under reduced motion). Theatre.
   Giant FILMS title + note + the view toggle, then every film as a plain button
   card: still, index + runtime, title, maker · city, tools in mono caps. Cards open
   the same detail overlay as the canvas. Middle column steps down (Mobius feed).
   Mounts after a toggle, so reveals are self-wired (<Reveal>/<SplitReveal>), not
   the route-level data-reveal scanner.
   ============================================================================= */
export function FilmsGrid({ onOpen, toggle }: { onOpen: (index: number) => void; toggle: React.ReactNode }) {
  return (
    <section aria-labelledby="films-title" className="theatre relative">
      <div className="container-wide relative pt-[calc(var(--header-offset)+var(--sat)+clamp(40px,7vw,104px))] pb-section">
        <div className="edit-grid items-end gap-y-8">
          <div className="col-span-12 lg:col-span-9">
            <p className="t-label flex items-center gap-3">
              <span className="t-timecode text-ash">({String(FILMS.length).padStart(2, "0")})</span>
              <span aria-hidden className="block size-[7px] bg-red" />
              {FILMS_PAGE.kicker}
            </p>
            <SplitReveal as="h1" id="films-title" immediate className="mt-5 font-display text-[clamp(6rem,2rem+17vw,20rem)] leading-[0.8] tracking-[-0.01em] uppercase">
              {FILMS_PAGE.title}
            </SplitReveal>
          </div>
          <div className="col-span-12 flex flex-col gap-6 lg:col-span-3 lg:items-end lg:text-right">
            <p className="t-small max-w-[20rem] text-cream/75">{FILMS_PAGE.note}</p>
            {toggle}
          </div>
        </div>

        <ul className="mt-[clamp(48px,7vw,112px)] grid gap-x-grid gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:[&>li:nth-child(3n+2)]:mt-[clamp(48px,6vw,120px)]">
          {FILMS.map((f, i) => (
            <Reveal as="li" key={f.slug} y={32}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                aria-label={`${f.title}, by ${f.maker}. Open details`}
                className="hover-zoom-parent group block w-full text-left"
              >
                <Photo
                  k={f.still}
                  ratio={i % 3 === 1 ? 5 / 4 : 3 / 4}
                  alt=""
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
                  className={clsx(i % 3 === 1 ? "aspect-[4/5]" : "aspect-[4/3]")}
                  imgClassName="hover-zoom"
                />
                <span className="mt-5 flex items-baseline justify-between gap-4">
                  <span className="t-timecode text-ash">
                    ({String(i + 1).padStart(2, "0")}) · {f.kind}
                  </span>
                  <span className="t-timecode text-ash">{f.runtime}</span>
                </span>
                <span className="mt-3 block font-heading text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)] leading-[1.02] font-semibold tracking-[-0.035em] transition-colors duration-300 group-hf:text-red-lite">
                  {f.title}
                </span>
                <span className="t-small mt-2 block text-cream/75">
                  {f.maker} · {f.city} · {f.year}
                </span>
                <span className="t-timecode mt-3 block text-ash">{f.tools.join(" · ")}</span>
              </button>
            </Reveal>
          ))}
        </ul>
        <p className="t-caption mt-16 max-w-[34rem]">{FILMS_PAGE.sample}</p>
      </div>
    </section>
  );
}
