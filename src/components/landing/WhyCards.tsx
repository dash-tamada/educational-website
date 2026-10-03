"use client";

import { useRef } from "react";
import clsx from "clsx";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Script } from "@/components/decor/Bits";

/** Circles in the section colour take "bites" out of a card corner. */
function Bites() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-3 -right-3 block size-24"
    >
      <span className="absolute top-0 right-0 size-10 rounded-full bg-paper" />
      <span className="absolute top-0 right-7 size-8 rounded-full bg-paper" />
      <span className="absolute top-7 right-0 size-8 rounded-full bg-paper" />
      <span className="absolute -top-1 right-12 size-6 rounded-full bg-paper" />
      <span className="absolute top-12 -right-1 size-6 rounded-full bg-paper" />
    </span>
  );
}

const cards = [
  {
    title: (
      <>
        Learn at <Script className="text-[1.15em] text-lime">your</Script> pace
      </>
    ),
    body: "Short videos grouped into modules. Pause, rewind, speed up. Your progress saves itself and waits for you.",
    className: "bg-tomato",
    from: -7,
  },
  {
    title: (
      <>
        Tests that make it{" "}
        <Script className="text-[1.15em] text-lime">stick</Script>
      </>
    ),
    body: "Tutors drop quick tests between lessons. Pass to unlock the next part, and see why each answer is right.",
    className: "bg-wine",
    from: 7,
  },
];

export function WhyCards() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>(".why-card").forEach((el, i) => {
        gsap.fromTo(
          el,
          { rotate: cards[i].from, y: 80, x: cards[i].from * 10 },
          {
            rotate: 0,
            y: 0,
            x: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "top 55%",
              scrub: 0.6,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="overflow-hidden bg-paper pb-24 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
        {cards.map((c, i) => (
          <article
            key={i}
            className={clsx(
              "why-card relative rounded-[1.75rem] p-8 text-paper md:p-10",
              c.className,
            )}
          >
            <Bites />
            <h3 className="max-w-[14ch] font-display text-2xl leading-[1.25] uppercase md:text-[2rem]">
              {c.title}
            </h3>
            <p className="mt-5 max-w-md text-base leading-relaxed font-medium text-paper/90 md:text-lg">
              {c.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
