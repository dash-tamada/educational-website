"use client";

import { useRef } from "react";
import clsx from "clsx";
import { steps, toneBg } from "@/lib/landing-data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { ArrowButton, Blob, HandNote } from "@/components/decor/Bits";

const rot = [-6, 4, -3, 6];

function StepIcon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "#161616",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-24 w-24 md:h-28 md:w-28"
      aria-hidden
    >
      {name === "search" && (
        <>
          <circle cx="42" cy="42" r="26" {...common} fill="#fffdf8" />
          <path d="M61 61 L84 84" {...common} strokeWidth={10} />
          <path d="M30 36 q6 -10 16 -8" {...common} strokeWidth={4} />
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
            {...common}
            fill="#fffdf8"
          />
          <path
            d="M42 36 L62 49 L42 62 Z"
            {...common}
            fill="#e2482b"
            strokeWidth={4}
          />
          <path d="M34 90 H66" {...common} />
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
            {...common}
            fill="#fffdf8"
          />
          <path d="M30 34 l6 6 l10 -12" {...common} strokeWidth={4} />
          <path d="M54 35 H70" {...common} strokeWidth={4} />
          <path d="M30 58 l6 6 l10 -12" {...common} strokeWidth={4} />
          <path d="M54 59 H70" {...common} strokeWidth={4} />
        </>
      )}
      {name === "badge" && (
        <>
          <path
            d="M34 58 L26 92 L40 84 L48 96 L52 62"
            {...common}
            fill="#ff1f8e"
            strokeWidth={4}
          />
          <path
            d="M66 58 L74 92 L60 84 L52 96 L48 62"
            {...common}
            fill="#ff1f8e"
            strokeWidth={4}
          />
          <circle cx="50" cy="40" r="28" {...common} fill="#ffd23f" />
          <path
            d="M50 26 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z"
            {...common}
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
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        // Cards start stacked in the middle, then fan out as you scroll in.
        gsap.from(".step-card", {
          x: (i: number) => (1.5 - i) * 260,
          y: 60,
          rotate: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".step-row",
            start: "top 90%",
            end: "top 35%",
            scrub: 0.7,
          },
        });
      });
      mm.add("(max-width: 1023px)", () => {
        // Full-width cards look drunk at desktop tilt angles; soften them.
        gsap.set(".step-card", { rotate: (i: number) => rot[i] * 0.35 });
        gsap.from(".step-card", {
          y: 80,
          autoAlpha: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".step-row", start: "top 80%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="how" className="scroll-mt-20 px-2 md:px-4">
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-blush px-4 pt-16 pb-20 md:px-10 md:pt-20 md:pb-28">
        <Blob
          fill="#ffbdf0"
          variant={2}
          className="inset-x-0 bottom-0 h-2/3 w-full"
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-6">
            <h2 className="font-heading text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
              How it works
            </h2>
            <HandNote className="mb-2 hidden w-40 md:block">
              Think of us as your personal course curator
            </HandNote>
          </div>
          <ArrowButton href="/signup" variant="pink">
            Start learning
          </ArrowButton>
        </div>

        <ol className="step-row relative mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:mt-20 lg:flex lg:justify-center lg:gap-0">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={clsx(
                "step-card shadow-hard relative flex flex-col rounded-[1.75rem] border-2 border-ink p-6 transition-[translate] duration-300 hover:z-10 hover:-translate-y-3 lg:-mx-3 lg:min-h-[400px] lg:w-[290px]",
                toneBg[s.tone],
                i === 3 && "text-ink",
              )}
              style={{
                transform: `rotate(${rot[i]}deg)`,
                marginTop: i % 2 ? 36 : 0,
              }}
            >
              <p className="text-center font-hand text-3xl font-bold">
                Step #{i + 1}
              </p>
              <div className="my-4 flex justify-center">
                <StepIcon name={s.icon} />
              </div>
              <h3 className="mt-auto font-heading text-[1.7rem] leading-[1] font-extrabold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-3 text-[15px] leading-snug font-medium">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
