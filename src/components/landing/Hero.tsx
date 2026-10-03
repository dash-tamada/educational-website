"use client";

import Image from "next/image";
import { useRef } from "react";
import { heroCards } from "@/lib/landing-data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Mascot } from "@/components/decor/Mascot";
import { ArrowButton, Blob, Script, Sparkle } from "@/components/decor/Bits";
import { onIntroDone } from "./IntroCurtain";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      if (prefersReducedMotion()) return;
      gsap.set(".hero-line", { yPercent: 115 });
      gsap.set(".hero-fade", { autoAlpha: 0, y: 20 });
      gsap.set(".hero-card", { y: 260, rotate: 0, autoAlpha: 0 });
      gsap.set(".hero-mascot", { scale: 0, rotate: -90 });

      return onIntroDone(
        contextSafe!(() => {
          gsap
            .timeline({ defaults: { ease: "expo.out" } })
            .to(".hero-line", { yPercent: 0, duration: 1, stagger: 0.09 })
            .to(
              ".hero-mascot",
              {
                scale: 1,
                rotate: -8,
                duration: 1,
                ease: "elastic.out(1.1,0.5)",
              },
              "-=0.7",
            )
            .to(
              ".hero-fade",
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 },
              "-=0.8",
            )
            .to(
              ".hero-card",
              {
                y: 0,
                autoAlpha: 1,
                rotate: (i: number) => heroCards[i].rotate,
                duration: 1.1,
                ease: "elastic.out(0.9,0.75)",
                stagger: 0.07,
              },
              "-=0.7",
            );
        }),
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="bg-dots relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24"
      id="top"
    >
      <Blob
        fill="#fff0a8"
        variant={1}
        className="inset-x-0 bottom-0 h-[55%] w-full opacity-70"
      />
      <Sparkle className="hero-fade absolute top-[24%] left-[8%] hidden w-10 animate-float md:block" />
      <Sparkle
        className="hero-fade absolute top-[30%] right-[10%] hidden w-7 animate-float [animation-delay:1s] md:block"
        fill="#ff4fd8"
      />

      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <p className="hero-fade mx-auto mb-6 inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-lime px-3 pt-2 pb-1.5 font-display text-[9px] leading-none uppercase sm:text-[10px]">
          <span className="grid size-4 place-items-center rounded-full bg-ink text-[8px] text-lime">
            ▶
          </span>
          First video of every course is free
        </p>

        <h1 className="font-display text-[clamp(1.55rem,6.2vw,5.4rem)] leading-[1.18] tracking-tight uppercase">
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="hero-line block">Learn the skills</span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="hero-line flex items-center justify-center gap-[0.15em]">
              <Mascot
                className="hero-mascot -ml-[0.2em] inline-block h-[1.05em] w-[1.05em] shrink-0"
                title=""
              />
              You{" "}
              <Script className="-mt-[0.1em] text-[1.12em] text-brick">
                actually
              </Script>{" "}
              want
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="hero-line block">From real tutors</span>
          </span>
        </h1>

        <p className="hero-fade mx-auto mt-6 max-w-xl text-base font-medium text-ink/75 md:text-lg">
          Bite-size video lessons, tests between modules and tutors who&apos;ve
          done the thing. Watch the first video free, then unlock the whole
          course.
        </p>

        <div className="hero-fade mt-8 flex flex-wrap items-center justify-center gap-4">
          <ArrowButton href="/courses">Try a free lesson</ArrowButton>
          <a
            href="#how"
            className="font-hand text-2xl text-purple underline decoration-wavy underline-offset-4"
          >
            how does it work?
          </a>
        </div>
      </div>

      {/* Fanned photo cards */}
      <div className="no-scrollbar relative mx-auto mt-14 flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-6 pt-4 pb-8 md:mt-20 md:justify-center md:gap-0 md:overflow-visible md:px-4">
        {heroCards.map((c, i) => (
          <figure
            key={c.caption}
            className="hero-card group shadow-hard w-40 shrink-0 snap-center rounded-2xl border-2 border-ink bg-paper p-2 transition-[translate,scale] duration-300 hover:z-10 hover:-translate-y-4 hover:scale-105 sm:w-48 md:-mx-2 md:w-52"
            style={{ transform: `rotate(${c.rotate}deg)`, marginTop: c.y }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-butter">
              <Image
                src={c.img}
                alt={c.caption}
                fill
                sizes="(min-width: 768px) 208px, 176px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                preload={i < 3}
              />
            </div>
            <figcaption className="px-1 pt-2.5 pb-1 text-center text-xs leading-tight font-semibold">
              {c.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
