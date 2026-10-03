"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import {
  DUR,
  EASE,
  REVEAL_START,
  STAGGER,
  onPageReady,
  prefersReducedMotion,
} from "@/lib/motion";
import { onScrollIdle } from "@/lib/lenis";

/**
 * Scroll reveal recipes (spec V2 §10). All are FOUC-free: the target is hidden by CSS
 * before first paint (html[data-motion="ok"] [data-reveal]) and animated *to* visible,
 * so nothing ever shows, hides and re-appears. They wait for the intro / route
 * curtain (onPageReady), run once, and are static under reduced motion.
 *
 *   rise    y 40 -> 0, fade                        (default; generic blocks)
 *   fade    opacity only
 *   scale   y 20 + scale .92 -> 1                   (panels, images)
 *   pop     scale .5 -> 1, back.out  (R5)           SMALL items only (stickers, tags)
 *   card    y 140 + tilt ±6 -> rest, back.out(1.4)  (R6: course/step/pricing cards)
 *   card-sm y 36 + tilt ±3 -> rest                   (R6 for cards inside horizontal
 *           scrollers: overflow-x:auto clips overflow-y, so big travel gets sliced)
 *   Any recipe that travels (rise, scale, card, card-sm) accepts a custom distance:
 *   data-reveal-y="40" / <Reveal y={40}>.
 *   lines   SplitText line masks, yPercent 110 + rotate 3 -> 0  (R1: display headings)
 *   letters chars scale 0 + random tilt -> 1, elastic  (R3: ONE giant word per page)
 *   write   clip-path wipe left -> right  (R7: hand notes)
 */
export type RevealEffect =
  | "rise"
  | "fade"
  | "scale"
  | "pop"
  | "card"
  | "card-sm"
  | "lines"
  | "letters"
  | "write";

type SetupOpts = {
  effect?: RevealEffect;
  stagger?: boolean;
  delay?: number;
  start?: string;
  /** travel distance in px for rise / scale / card / card-sm */
  y?: number;
};

const noop = () => {};

/**
 * Wires one reveal on `el`. Returns a cleanup that reverts every tween/split it made.
 * Exported so custom components can reuse the recipes imperatively.
 */
export function setupReveal(
  el: HTMLElement,
  { effect = "rise", stagger = false, delay = 0, start = REVEAL_START, y }: SetupOpts = {},
) {
  const markDone = () => el.setAttribute("data-revealed", "");
  if (prefersReducedMotion()) {
    markDone();
    return noop;
  }
  el.setAttribute("data-reveal-armed", "");

  const ctx = gsap.context(() => {});
  let alive = true;
  let cancelRevert = () => {};
  const build = () => {
    if (!alive) return;
    ctx.add(() => {
      // Already scrolled past (deep link / refresh mid-page): show instantly.
      if (el.getBoundingClientRect().bottom < 0) {
        markDone();
        return;
      }
      const targets: HTMLElement[] = stagger
        ? (Array.from(el.children) as HTMLElement[])
        : [el];
      if (!targets.length) {
        markDone();
        return;
      }
      // read once at setup (never during scroll): resting individual transforms?
      const plain = targets.map((t) => {
        const cs = getComputedStyle(t);
        return cs.translate === "none" && cs.rotate === "none" && cs.scale === "none";
      });
      let split: SplitText | null = null;
      const tl = gsap.timeline({
        paused: true,
        delay,
        onComplete: () => {
          markDone();
          if (split) {
            // Reverting re-lays out the heading: do it at scroll idle, never
            // mid-scroll (masks are height-neutral, so nothing moves either way).
            const s = split;
            split = null;
            cancelRevert = onScrollIdle(() => s.revert(), 250);
          }
          if (effect === "write") gsap.set(el, { clearProps: "clipPath" });
          // GSAP leaves inline translate/rotate/scale:none on tweened targets, which
          // would cancel the CSS hover kit (.hover-lift etc.) on this element.
          // Only where the element had no resting CSS translate/rotate/scale of
          // its own (GSAP bakes those into its transform; clearing would double them).
          const clear = targets.filter((_, i) => plain[i]);
          if (clear.length && effect !== "lines" && effect !== "letters" && effect !== "write")
            gsap.set(clear, { clearProps: "translate,rotate,scale" });
        },
      });
      const each = stagger ? STAGGER.items : 0;

      switch (effect) {
        case "fade":
          tl.to(targets, {
            opacity: 1,
            duration: DUR.base,
            ease: "power2.out",
            stagger: each,
          });
          break;
        case "scale":
          tl.to(targets, { opacity: 1, duration: 0.5, ease: "power1.out", stagger: each }, 0);
          tl.from(targets, { y: y ?? 20, scale: 0.92, duration: DUR.reveal, ease: EASE.reveal, stagger: each }, 0);
          break;
        case "pop":
          tl.to(targets, { opacity: 1, duration: 0.25, ease: "power1.out", stagger: STAGGER.pops }, 0);
          tl.from(targets, { scale: 0.5, duration: 0.7, ease: EASE.pop, stagger: STAGGER.pops }, 0);
          break;
        case "card":
        case "card-sm": {
          const small = effect === "card-sm";
          const travel = y ?? (small ? 36 : 140);
          const tilt = small || travel < 80 ? 3 : 6;
          tl.to(targets, { opacity: 1, duration: 0.45, ease: "power1.out", stagger: each }, 0);
          tl.from(
            targets,
            {
              y: travel,
              rotation: (i: number) => (i % 2 ? `+=${tilt}` : `-=${tilt}`),
              duration: DUR.card,
              ease: EASE.card,
              stagger: each,
            },
            0,
          );
          break;
        }
        case "lines": {
          split = SplitText.create(el, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
          split.masks.forEach((m) => (m as HTMLElement).classList.add("split-mask"));
          tl.set(el, { opacity: 1 });
          tl.from(split.lines, {
            yPercent: 110,
            rotate: 3,
            transformOrigin: "0% 100%",
            duration: DUR.reveal,
            ease: EASE.reveal,
            stagger: STAGGER.lines,
          });
          break;
        }
        case "letters": {
          split = SplitText.create(el, { type: "words,chars" });
          tl.set(el, { opacity: 1 });
          tl.from(split.chars, {
            scale: 0,
            rotation: () => gsap.utils.random(-25, 25),
            duration: 1,
            ease: EASE.letters,
            stagger: STAGGER.letters,
          });
          break;
        }
        case "write":
          tl.set(el, { opacity: 1 });
          tl.fromTo(
            el,
            { clipPath: "inset(-30% 100% -30% -10%)" },
            { clipPath: "inset(-30% -10% -30% -10%)", duration: DUR.write, ease: EASE.write },
          );
          break;
        default: // rise
          tl.to(targets, { opacity: 1, duration: 0.6, ease: "power1.out", stagger: each }, 0);
          tl.from(targets, { y: y ?? 40, duration: DUR.base + 0.1, ease: EASE.reveal, stagger: each }, 0);
      }

      ScrollTrigger.create({
        trigger: el,
        start,
        once: true,
        onEnter: () => tl.play(),
      });
    });
  };
  const stopWaiting = onPageReady(() => {
    // Split recipes measure lines/chars: wait for the display font first.
    if ((effect === "lines" || effect === "letters") && document.fonts) {
      document.fonts.ready.then(build);
    } else build();
  });

  return () => {
    alive = false;
    stopWaiting();
    cancelRevert();
    ctx.revert();
  };
}

type Tag =
  | "div"
  | "ul"
  | "ol"
  | "li"
  | "section"
  | "span"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "figure"
  | "blockquote";

type Props = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  children: React.ReactNode;
  /** Animate direct children one after another instead of the wrapper as a whole. */
  stagger?: boolean;
  effect?: RevealEffect;
  as?: Tag;
  /** seconds */
  delay?: number;
  /** ScrollTrigger start, default "top 85%" */
  start?: string;
  /** travel distance in px (rise / scale / card / card-sm) */
  y?: number;
};

/**
 * <Reveal effect="rise|fade|scale|pop|card|card-sm|lines|letters|write" stagger as="ul" y={40}>.
 * Do not combine with another GSAP animation on the same element: wrap instead.
 */
export function Reveal({
  children,
  stagger,
  effect = "rise",
  as = "div",
  delay = 0,
  start,
  y,
  ...rest
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      return setupReveal(ref.current!, { effect, stagger, delay, start, y });
    },
    { dependencies: [effect, stagger, delay, start, y] },
  );

  const El = as as React.ElementType;
  return (
    <El
      ref={ref}
      {...rest}
      data-reveal={stagger ? undefined : effect}
      data-reveal-stagger={stagger ? effect : undefined}
      data-reveal-managed=""
    >
      {children}
    </El>
  );
}

type RecipeProps = Omit<Props, "effect">;
/** R1 line-mask reveal for display headings: <SplitLines as="h2" className="t-display-l">. */
export const SplitLines = ({ as = "h2", ...p }: RecipeProps) => (
  <Reveal effect="lines" as={as} {...p} />
);
/** R3 letter pop: one giant word per page. */
export const LetterPop = ({ as = "span", ...p }: RecipeProps) => (
  <Reveal effect="letters" as={as} {...p} />
);
/** R7 hand-note write-on. */
export const WriteOn = (p: RecipeProps) => <Reveal effect="write" {...p} />;
/** R5 sticker pop (small items). */
export const Pop = (p: RecipeProps) => <Reveal effect="pop" {...p} />;
/** R6 card rise. */
export const Rise = (p: RecipeProps) => <Reveal effect="card" {...p} />;

/**
 * Attribute API for Server Components: any element with
 *   data-reveal="rise|fade|scale|pop|card|lines|letters|write"
 * or data-reveal-stagger="<effect>" (animates its children), optional
 * data-reveal-delay="0.2", data-reveal-start="top 80%", data-reveal-y="40",
 * is wired automatically on every route.
 * Mounted once in the root layout.
 */
export function RevealScanner() {
  const pathname = usePathname();
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-reveal]:not([data-reveal-managed]),[data-reveal-stagger]:not([data-reveal-managed])",
      ),
    );
    const cleanups = els.map((el) => {
      const stagger = el.hasAttribute("data-reveal-stagger");
      const effect = (stagger ? el.dataset.revealStagger : el.dataset.reveal) as
        | RevealEffect
        | undefined;
      return setupReveal(el, {
        effect: effect || "rise",
        stagger,
        delay: Number(el.dataset.revealDelay || 0),
        start: el.dataset.revealStart || undefined,
        y: el.dataset.revealY ? Number(el.dataset.revealY) : undefined,
      });
    });
    return () => cleanups.forEach((c) => c());
  }, [pathname]);
  return null;
}
