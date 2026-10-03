"use client";

import { useRef } from "react";
import clsx from "clsx";
import { steps, toneBg } from "@/lib/landing-data";
import { gsap, useGSAP } from "@/lib/gsap";
import { ArrowButton, BlobSet, HandNote } from "@/components/decor/Bits";
import { Parallax } from "@/components/motion/Parallax";

/* =============================================================================
   How it works: Aardvark blush panel with 4 flat, tilted step cards.
   Overlap rule (>= 1280px): cards touch at their nominal edges and the tilts are
   chosen so neighbours only cross at the text-free TOP corners (Step label and
   icon are centred) or by < 18px at the bottom corners, inside the 24px padding.
   So no title or body line is ever under a neighbour at rest.
   Motion: scrubbed fan-out from the centre (xl), per-card depth drift + a shared
   rotation drift (relative tilts never change, so overlaps stay constant), R6
   card reveal, floating icons. Hover H6: to the front, straighten, scale 1.04.
   ============================================================================= */

/** Resting tilts (deg), measured against the overlap rule above. */
const tilt = [-1.5, 3, -1, 4];
/** Vertical stagger of the cards at xl (px). */
const drop = [12, 44, 0, 30];
/** Depth: per-card y drift amplitude (px). */
const depth = [18, 34, 24, 40];

const ink = "#161616";

function StepIcon({ name }: { name: string }) {
  const s = {
    fill: "none",
    stroke: ink,
    strokeWidth: 4.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-24 sm:size-28 xl:size-32"
      aria-hidden
    >
      {name === "search" && (
        <>
          <circle cx="42" cy="42" r="26" {...s} fill="#fffdf8" />
          <path d="M61 61 L84 84" {...s} strokeWidth={10} />
          <path d="M30 36 q6 -10 16 -8" {...s} strokeWidth={4} />
          <circle cx="80" cy="18" r="6" fill="#FF008C" />
        </>
      )}
      {name === "play" && (
        <>
          <rect
            x="10"
            y="20"
            width="80"
            height="58"
            rx="12"
            {...s}
            fill="#fffdf8"
          />
          <path
            d="M42 36 L62 49 L42 62 Z"
            {...s}
            fill="#FD4401"
            strokeWidth={4}
          />
          <path d="M34 90 H66" {...s} />
        </>
      )}
      {name === "check" && (
        <>
          <rect
            x="18"
            y="10"
            width="64"
            height="80"
            rx="10"
            {...s}
            fill="#fffdf8"
          />
          <path d="M30 34 l6 6 l10 -12" {...s} strokeWidth={4} />
          <path d="M54 35 H70" {...s} strokeWidth={4} />
          <path d="M30 58 l6 6 l10 -12" {...s} strokeWidth={4} />
          <path d="M54 59 H70" {...s} strokeWidth={4} />
          <circle cx="84" cy="84" r="9" fill="#2668FD" />
        </>
      )}
      {name === "badge" && (
        <>
          <path
            d="M34 58 L26 92 L40 84 L48 96 L52 62"
            {...s}
            fill="#FF008C"
            strokeWidth={4}
          />
          <path
            d="M66 58 L74 92 L60 84 L52 96 L48 62"
            {...s}
            fill="#FF008C"
            strokeWidth={4}
          />
          <circle cx="50" cy="40" r="28" {...s} fill="#FFCF3F" />
          <path
            d="M50 26 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z"
            {...s}
            fill="#fffdf8"
            strokeWidth={3}
          />
        </>
      )}
    </svg>
  );
}

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1280px) and (prefers-reduced-motion: no-preference)",
        () => {
          // Cards start gathered towards the centre and fan out to rest. The fan
          // finishes while only the cards' top (label + icon) is on screen, so the
          // text is already clear by the time it scrolls into view.
          gsap.fromTo(
            ".step-fan",
            {
              x: (i: number) => (1.5 - i) * 100,
              rotate: (i: number) => -tilt[i] * 0.8,
            },
            {
              x: 0,
              rotate: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: ".step-row",
                start: "top 92%",
                end: "top 55%",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="how"
      aria-labelledby="how-title"
      className="panel bg-blush panel-y"
    >
      <BlobSet tone="blush" />

      <div className="relative container-x">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <h2 id="how-title" data-reveal="lines" className="t-chunky-xl">
              How it works
            </h2>
            <Parallax
              y={36}
              rotate={[3, -3]}
              className="hidden w-[12.5rem] pb-2 md:block"
            >
              <HandNote rotate={-7}>
                Think of us as your personal course curator
              </HandNote>
            </Parallax>
          </div>
          <div data-reveal="rise" data-reveal-delay="0.2" className="pb-1">
            <ArrowButton href="/signup" variant="pink">
              Start learning
            </ArrowButton>
          </div>
        </div>

        <ol
          className={clsx(
            "step-row relative mt-head grid gap-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8",
            "xl:flex xl:justify-center xl:gap-0",
          )}
        >
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={clsx(
                "relative z-0 xl:[margin-top:var(--drop)] xl:w-1/4 xl:max-w-[310px]",
                // H6: the hovered card comes to the front at once and only drops
                // back after its 350ms settle, so it never slides under a
                // neighbour while still scaled up.
                "[transition:z-index_0s_linear_350ms] hf:z-10 hf:[transition-delay:0s]",
              )}
              style={{ "--drop": `${drop[i]}px` } as React.CSSProperties}
            >
              {/* fan layer (GSAP x/rotate, xl only) */}
              <div className="step-fan h-full">
                {/* depth layer: per-card speed + a shared tilt drift */}
                <Parallax
                  y={depth[i]}
                  rotate={[1.5, -1.5]}
                  mobile={0.4}
                  className="h-full"
                >
                  {/* tilt + hover layer. GSAP never touches it: a GSAP transform tween
                      writes inline `rotate/scale/translate: none`, which would kill the
                      hover's independent rotate/scale on the animated element. */}
                  <div
                    className="group h-full transition-[rotate,scale] duration-[350ms] ease-spring hf:scale-[1.04] hf:[rotate:var(--untilt)]"
                    style={
                      {
                        transform: `rotate(${tilt[i]}deg)`,
                        "--untilt": `${-tilt[i]}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <article
                      data-reveal="card"
                      data-reveal-delay={String(i * 0.08)}
                      className={clsx(
                        "relative flex h-full flex-col rounded-card px-6 pt-7 pb-6 text-ink xl:min-h-[400px]",
                        "transition-shadow duration-[350ms] ease-ui group-hf:shadow-lift",
                        toneBg[s.tone],
                      )}
                    >
                      <p className="text-center t-hand-lg">Step #{i + 1}</p>
                      <div className="my-5 flex justify-center xl:my-6">
                        <div
                          className="motion-safe:animate-float"
                          style={{ animationDelay: `${-i * 1.3}s` }}
                        >
                          <StepIcon name={s.icon} />
                        </div>
                      </div>
                      <h3 className="mt-auto t-chunky-card">{s.title}</h3>
                      <p className="mt-3 text-[15px] leading-[1.38] font-medium text-ink/85">
                        {s.body}
                      </p>
                    </article>
                  </div>
                </Parallax>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
