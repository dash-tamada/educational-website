"use client";

import Link from "next/link";
import { useRef } from "react";
import clsx from "clsx";
import { heroCards, toneBg, toneText } from "@/lib/landing-data";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import {
  armEnter,
  EASE,
  markEntered,
  onPageReady,
  prefersReducedMotion,
} from "@/lib/motion";
import { Mascot } from "@/components/decor/Mascot";
import {
  ArrowButton,
  BlobSet,
  Eyebrow,
  Script,
  Sparkle,
} from "@/components/decor/Bits";
import { Cloud } from "@/components/decor/Cloud";
import {
  FieldShrink,
  Parallax,
  ParallaxImage,
} from "@/components/motion/Parallax";

/* =============================================================================
   Hero: Aardvark sun field (shrinks into an inset panel on scroll) with Maxima
   display caps, clouds and flat shapes, and a symmetric fan of photo cards.

   FOUC: every entrance target carries data-enter (shared pre-hide in globals.css:
   hidden before first paint when motion is allowed, 4.5s CSS failsafe). The
   timeline arms the root, animates TO visible and marks targets entered.
   Reduced motion: nothing hidden, no entrance, no parallax, no shrink.
   ============================================================================= */

/** Fan geometry, derived from the offset to the centre card (k = -3..3). */
const CENTER = 3;
/** scroll rise per card (px, desktop; Parallax halves it below 768px) */
const RISE = [110, 70, 125, 60, 130, 80, 105];
const fan = heroCards.map((c, i) => {
  const k = i - CENTER;
  const a = Math.abs(k);
  return {
    ...c,
    k,
    rot: k * 3,
    /** parabolic arc in units of the card width */
    arc: 0.045 * k * k,
    z: 10 - a,
    rise: RISE[i] ?? 80,
    /** 3 cards < 640px, 5 cards < 1024px, 7 cards >= 1024px */
    vis: a <= 1 ? "" : a === 2 ? "hidden sm:block" : "hidden lg:block",
    tagRot: k % 2 === 0 ? -3 : 3,
  };
});
/** Tami sits on this card (desktop + tablet; hidden with it on mobile). */
const TAMI_CARD = CENTER + 2;

function PlayGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-[15px]" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="currentColor" opacity=".25" />
      <path d="M6.3 4.8v6.4L11.4 8z" fill="currentColor" />
    </svg>
  );
}

function Triangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 90" className={className} aria-hidden>
      <path
        d="M44 8 Q50 -2 56 8 L96 76 Q101 86 90 86 L10 86 Q-1 86 4 76 Z"
        fill="#2668fd"
      />
    </svg>
  );
}

function Burst({ className }: { className?: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 ? 30 : 48;
    const a = (i / 24) * Math.PI * 2;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon
        points={pts}
        fill="#ff008c"
        strokeLinejoin="round"
        stroke="#ff008c"
        strokeWidth="6"
      />
    </svg>
  );
}

/** Shared scroll range for every hero layer: offset 0 at scrollY 0 (no jump on load). */
const range = { trigger: "#top", start: "top top", end: "bottom top" } as const;

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      const h1 = q(".hero-h1");
      const eyebrow = q(".hero-eyebrow");
      const fades = q(".hero-fade");
      const cards = q(".hero-card");
      const decor = q(".hero-decor");
      const tami = q(".hero-tami");

      gsap.set(eyebrow, { autoAlpha: 0, y: 14 });
      gsap.set(fades, { autoAlpha: 0, y: 24 });
      gsap.set(cards, {
        autoAlpha: 0,
        y: 140,
        rotate: (i: number) => -fan[i].rot,
      });
      gsap.set(decor, { autoAlpha: 0, scale: 0.85 });
      gsap.set(tami, { scale: 0, rotate: -24 });
      armEnter(el);

      let split: SplitText | null = null;
      let alive = true;
      const play = contextSafe!(() => {
        if (!alive) return;
        // R1 line masks on the ACTUAL rendered lines (5 balanced lines on phones,
        // the 3 composed lines from 640px). Reverted after the entrance so the
        // heading reflows naturally on resize.
        split = SplitText.create(h1, {
          type: "lines",
          mask: "lines",
          linesClass: "hero-line",
        });
        // Height-neutral masks (no layout shift): sibling vertical margins would
        // collapse, so only a bottom margin (= both paddings) plus a relative
        // -0.1em offset (system rule, same as .split-mask in globals.css).
        gsap.set(split.masks, {
          position: "relative",
          top: "-0.1em",
          paddingTop: "0.1em",
          paddingBottom: "0.32em",
          marginTop: 0,
          marginBottom: "-0.42em",
          paddingInline: "0.12em",
          marginInline: "-0.12em",
        });
        gsap.set(split.lines, {
          yPercent: 112,
          rotate: 3,
          transformOrigin: "0% 100%",
        });
        gsap.set(h1, { autoAlpha: 1 });
        gsap
          .timeline({
            defaults: { ease: EASE.reveal },
          })
          .to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.7 }, 0)
          .to(
            split.lines,
            { yPercent: 0, rotate: 0, duration: 1, stagger: 0.08 },
            0.06,
          )
          .to(fades, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.34)
          .to(
            cards,
            {
              autoAlpha: 1,
              y: 0,
              rotate: 0,
              duration: 0.85,
              ease: "back.out(1.15)",
              stagger: { each: 0.05, from: "center" },
            },
            0.42,
          )
          .to(
            decor,
            { autoAlpha: 1, scale: 1, duration: 0.9, stagger: 0.06 },
            0.3,
          )
          .to(
            tami,
            { scale: 1, rotate: 0, duration: 0.6, ease: EASE.pop },
            0.95,
          )
          .call(() => markEntered(q("[data-enter]")));
      });

      // The split lines are kept after the entrance (reverting could reflow the heading
      // mid-view); they are reverted to natural text only when the width changes.
      const w0 = window.innerWidth;
      const onResize = () => {
        if (split && window.innerWidth !== w0) {
          split.revert();
          split = null;
        }
      };
      window.addEventListener("resize", onResize);

      // Line splitting measures text: wait for the display font (instant after the intro).
      const stop = onPageReady(() => {
        const fonts = document.fonts;
        if (fonts && fonts.status !== "loaded") fonts.ready.then(play);
        else play();
      });
      return () => {
        alive = false;
        stop();
        window.removeEventListener("resize", onResize);
        split?.revert();
      };
    },
    { scope: root },
  );

  return (
    // The sun field keeps rounded bottom corners even before the shrink starts, so
    // the hero always ends as a styled panel edge above the tapes (no flat seam).
    <FieldShrink
      as="section"
      id="top"
      ref={root}
      aria-labelledby="hero-title"
      bottomRadius="var(--panel-radius)"
      className="field overflow-clip rounded-b-panel bg-sun pt-28 pb-10 md:pt-[128px] md:pb-12"
    >
      {/* Background: wavy blobs lag behind the page (offset 0 at the top). */}
      <Parallax
        className="pointer-events-none absolute inset-0 -z-10"
        yPercent={[0, 6]}
        {...range}
      >
        <BlobSet tone="sun" parallax={false} />
      </Parallax>

      {/* Clouds: far layer, drift down (slower than the page). Kept clear of the
            copy: the left one sits above the headline, the right one beside it (xl). */}
      <Parallax
        className="pointer-events-none absolute top-[92px] left-[3%] -z-[5] hidden md:block lg:top-[100px]"
        y={[0, 110]}
        {...range}
      >
        <div className="hero-decor" data-enter="">
          <Cloud size="m" delay={-6} />
        </div>
      </Parallax>
      <Parallax
        className="pointer-events-none absolute top-[34%] right-[2.5%] -z-[5] hidden xl:block"
        y={[0, 80]}
        {...range}
      >
        <div className="hero-decor" data-enter="">
          <Cloud size="m" delay={-14} flip />
        </div>
      </Parallax>

      {/* Flat shapes + sparkle: near layer, rise faster than the page. */}
      <Parallax
        className="pointer-events-none absolute top-[40%] left-[6%] hidden w-14 lg:block xl:left-[8%]"
        y={[0, -150]}
        rotate={[-8, 10]}
        {...range}
      >
        <div className="hero-decor" data-enter="">
          <Triangle className="w-full" />
        </div>
      </Parallax>
      <Parallax
        className="pointer-events-none absolute top-[17%] right-[10%] hidden w-16 xl:block"
        y={[0, -120]}
        rotate={[0, 40]}
        {...range}
      >
        <div className="hero-decor" data-enter="">
          <Burst className="w-full" />
        </div>
      </Parallax>
      <Parallax
        className="pointer-events-none absolute top-[116px] left-[30%] hidden w-9 xl:block"
        y={[0, -90]}
        rotate={[0, 30]}
        {...range}
      >
        <div className="hero-decor" data-enter="">
          <Sparkle fill="#ffffff" className="w-full animate-float" />
        </div>
      </Parallax>

      {/* Copy: drifts up slightly as the hero scrolls away. */}
      <Parallax className="relative z-20" y={[0, -40]} {...range}>
        <div className="container-x flex flex-col items-center text-center">
          <div className="hero-eyebrow" data-enter="">
            <Eyebrow tone="blue">
              <PlayGlyph />
              First video of every course is free
            </Eyebrow>
          </div>

          <h1
            id="hero-title"
            className="hero-h1 mt-eyebrow t-display-xxl text-ink"
            data-enter=""
          >
            {/* Inline on phones (natural balanced flow), one composed line each from 640px. */}
            <span className="sm:block">Learn the skills</span>{" "}
            <span className="sm:block">
              you{" "}
              <Script className="text-[1.06em] leading-none text-hotpink">
                actually
              </Script>{" "}
              want
            </span>{" "}
            <span className="sm:block">from real tutors</span>
          </h1>

          <p
            className="hero-fade mt-sub max-w-[33rem] t-body-l text-ink/80"
            data-enter=""
          >
            Bite-size video lessons, tests between modules and tutors
            who&apos;ve done the thing. Watch the first video free, then unlock
            the whole course.
          </p>

          <div
            className="hero-fade mt-cta flex flex-wrap items-center justify-center gap-x-7 gap-y-4"
            data-enter=""
          >
            <ArrowButton href="/courses" bubble icon="play">
              Try a free lesson
            </ArrowButton>
            <Link
              href="/#how"
              className="group tap inline-flex items-center gap-1.5 t-hand-lg text-indigo"
              style={{ transform: "rotate(-4deg)" }}
            >
              <span className="link-draw">how does it work?</span>
              <svg
                viewBox="0 0 40 24"
                className="h-[0.8em] w-auto transition-[translate] duration-300 ease-spring group-hf:translate-x-1"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 14 C12 4 24 4 34 12 M27 6 L35 12.5 L26 17"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </Parallax>

      {/* Photo fan: symmetric arc, centre card on top, each card rises at its own speed. */}
      <div className="@container relative z-10 container-x mt-16 md:mt-[72px]">
        <ul
          className="flex items-start justify-center pb-[calc(var(--cw)*0.05+22px)] [--cw:min(150px,calc(100cqw/2.9))] sm:pb-[calc(var(--cw)*0.18+22px)] sm:[--cw:min(190px,calc(100cqw/4.6))] lg:pb-[calc(var(--cw)*0.4+22px)] lg:[--cw:min(200px,calc(100cqw/6.4))]"
          aria-label="What people learn on Tamada"
        >
          {fan.map((c, i) => (
            <Parallax
              as="li"
              key={c.caption}
              className={clsx("group relative shrink-0 hf:z-30!", c.vis)}
              style={
                {
                  zIndex: c.z,
                  width: "var(--cw)",
                  marginInline: "calc(var(--cw) * -0.05)",
                  translate: `0 calc(var(--cw) * ${c.arc})`,
                } as React.CSSProperties
              }
              y={[0, -c.rise]}
              x={[0, c.k * 8]}
              rotate={[0, c.k * 0.7]}
              {...range}
            >
              <div className="hero-card" data-enter="">
                <figure
                  className="hover-zoom-parent relative rounded-[20px] bg-white p-2 shadow-photo transition-[translate,rotate,box-shadow] duration-[400ms] ease-spring group-hf:[translate:0_-12px] group-hf:[rotate:calc(var(--r)*-1deg)] group-hf:shadow-lift"
                  style={
                    {
                      transform: `rotate(${c.rot}deg)`,
                      "--r": c.rot,
                    } as React.CSSProperties
                  }
                >
                  <ParallaxImage
                    src={c.img}
                    alt={c.alt}
                    sizes="(min-width: 1024px) 200px, (min-width: 640px) 190px, 150px"
                    className="aspect-[4/5] rounded-[14px] bg-butter"
                    imgClassName="hover-zoom"
                    amount={6}
                    preload={Math.abs(c.k) <= 1}
                  />
                  <figcaption
                    className={clsx(
                      "absolute -bottom-3 rounded-full px-2.5 py-[6px] t-tag whitespace-nowrap shadow-soft transition-[scale] duration-300 ease-spring group-hf:scale-110",
                      toneBg[c.tone],
                      toneText[c.tone],
                    )}
                    style={{
                      left: c.k < 0 ? "42%" : c.k > 0 ? "58%" : "50%",
                      transform: `translateX(-50%) rotate(${c.tagRot}deg)`,
                    }}
                  >
                    {c.caption}
                  </figcaption>
                  {i === TAMI_CARD && (
                    <span
                      className="pointer-events-auto absolute right-[4%] bottom-[calc(100%-14px)] block w-[42%]"
                      style={{ transform: "rotate(-6deg)" }}
                    >
                      <span className="hero-tami block origin-bottom">
                        <Mascot
                          interactive
                          title=""
                          className="h-auto w-full"
                        />
                      </span>
                    </span>
                  )}
                </figure>
              </div>
            </Parallax>
          ))}
        </ul>
      </div>
    </FieldShrink>
  );
}
