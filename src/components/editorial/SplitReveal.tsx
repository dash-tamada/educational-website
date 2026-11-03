"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { onPageReady, prefersReducedMotion, REVEAL_START } from "@/lib/motion";
import { onScrollIdle } from "@/lib/lenis";

/* =============================================================================
   <SplitReveal>: editorial line / word reveal on scroll (GSAP SplitText masks).
   Lines (or words) rise out of a hairline mask, once, when the block enters.
   FOUC-free: it carries data-reveal (pre-hidden by globals.css only when JS +
   motion are on) and data-reveal-managed (the RevealScanner leaves it alone).
   Reduced motion: static. Phones (< 640px): one block rise, no splitting.

   <SplitReveal as="h2" className="t-display-xl">Prompt to premiere</SplitReveal>
   <SplitReveal type="words" stagger={0.03} className="t-statement-l">…</SplitReveal>
   <SplitReveal immediate delay={0.4}>…</SplitReveal>   plays on page ready (heroes)
   ============================================================================= */

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span" | "blockquote";

export function SplitReveal({
  as = "div",
  type = "lines",
  delay = 0,
  stagger,
  duration = 1.1,
  start = REVEAL_START,
  immediate,
  className,
  children,
  id,
}: {
  as?: Tag;
  type?: "lines" | "words";
  delay?: number;
  /** seconds between lines / words (default .09 lines, .025 words) */
  stagger?: number;
  duration?: number;
  /** ScrollTrigger start (default "top 85%") */
  start?: string;
  /** play as soon as the page is ready instead of on scroll */
  immediate?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const done = () => el.setAttribute("data-revealed", "");
      if (prefersReducedMotion()) {
        done();
        return;
      }
      el.setAttribute("data-reveal-armed", "");
      const phone = window.matchMedia("(max-width: 639.98px)").matches;
      let split: SplitText | null = null;
      let cancelRevert = () => {};
      let alive = true;
      const ctx = gsap.context(() => {});

      const build = () => {
        if (!alive) return;
        ctx.add(() => {
          if (el.getBoundingClientRect().bottom < 0) {
            done();
            return;
          }
          const tl = gsap.timeline({
            paused: true,
            delay,
            onComplete: () => {
              done();
              if (split) {
                const s = split;
                split = null;
                cancelRevert = onScrollIdle(() => s.revert(), 250);
              }
            },
          });
          if (phone) {
            tl.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", clearProps: "transform" });
          } else {
            split = SplitText.create(el, {
              type: type === "words" ? "lines,words" : "lines",
              mask: type,
              linesClass: "split-line",
            });
            split.masks.forEach((m) => (m as HTMLElement).classList.add("split-mask"));
            const targets = type === "words" ? split.words : split.lines;
            tl.set(el, { opacity: 1 });
            tl.from(targets, {
              yPercent: 112,
              duration,
              ease: "expo.out",
              stagger: stagger ?? (type === "words" ? 0.025 : 0.09),
            });
          }
          if (immediate || el.getBoundingClientRect().top < window.innerHeight * 0.92) {
            tl.play();
            return;
          }
          ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => tl.play() });
        });
      };

      const stop = onPageReady(() => {
        if (!phone && document.fonts) document.fonts.ready.then(build);
        else build();
      });
      return () => {
        alive = false;
        stop();
        cancelRevert();
        ctx.revert();
      };
    },
    { dependencies: [] },
  );

  const El = as as React.ElementType;
  return (
    <El ref={ref} id={id} className={className} data-reveal={type === "words" ? "words" : "lines"} data-reveal-managed="">
      {children}
    </El>
  );
}
