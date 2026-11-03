"use client";

import Image from "next/image";
import { useRef } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { MQ } from "@/lib/motion";
import { cropSrc, ratioFromClass } from "@/lib/img";

/**
 * Scroll-linked parallax primitives (spec V2 §9). Transform-only, scrubbed by
 * ScrollTrigger (driven by Lenis), 50% amplitude below 768px, OFF under reduced
 * motion, will-change only while the layer is in range.
 *
 * Range values: a single number n means "+n -> -n" across the trigger range, so the
 * layer sits at its layout position when the trigger is centred in the viewport
 * (nothing collides at rest). Positive y = rises faster than the page (foreground),
 * negative y = lags behind (background). A tuple [from, to] is explicit; strings
 * with units ("3vw") are allowed in tuples.
 */
type Val = number | string;
export type Range = number | [Val, Val];

const PROPS = ["x", "y", "xPercent", "yPercent", "rotate", "scale"] as const;
type Prop = (typeof PROPS)[number];

type MotionProps = Partial<Record<Prop, Range>> & {
  /** shorthand: y amplitude = speed * 100px (e.g. 0.6 -> y 60 -> -60) */
  speed?: number;
  /** element that defines the scroll range: "self" (default, the static outer box),
   *  "parent", or a CSS selector. A selector resolves to the NEAREST match: an
   *  ancestor (closest()), else the first match inside the nearest ancestor that
   *  contains one.
   *  STICKY CAVEAT: ScrollTrigger mis-measures a trigger that is (or sits inside)
   *  a position:sticky element. Put an in-flow marker element next to the sticky
   *  one (e.g. <div data-feat-marker aria-hidden />) and pass its selector here:
   *  trigger="[data-feat-marker]". */
  trigger?: "self" | "parent" | string;
  start?: string;
  end?: string;
  /** true (default) follows Lenis 1:1; a number adds lag in seconds */
  scrub?: boolean | number;
  /** amplitude factor below 768px (default 0.5; 0 disables on mobile) */
  mobile?: number;
};

const scaleVal = (v: Val, f: number, prop: Prop): Val => {
  if (prop === "scale") {
    const n = typeof v === "number" ? v : parseFloat(v);
    return 1 + (n - 1) * f;
  }
  if (typeof v === "number") return v * f;
  const m = /^(-?[\d.]+)(.*)$/.exec(v.trim());
  return m ? `${parseFloat(m[1]) * f}${m[2]}` : v;
};

const toPair = (r: Range, prop: Prop): [Val, Val] => {
  if (Array.isArray(r)) return r;
  if (prop === "scale") return [1 - r, 1 + r];
  return [r, -r];
};

function resolveTrigger(el: HTMLElement, trigger: MotionProps["trigger"]) {
  if (!trigger || trigger === "self") return el;
  if (trigger === "parent") return el.parentElement ?? el;
  try {
    const up = el.closest<HTMLElement>(trigger);
    if (up) return up;
    for (let a = el.parentElement; a; a = a.parentElement) {
      const hit = a.querySelector<HTMLElement>(trigger);
      if (hit) return hit;
    }
  } catch {
    return el;
  }
  return el;
}

/** Hook form: animates `moverRef`, measuring scroll range on `triggerRef` (or the mover's parent). */
export function useParallax(
  moverRef: React.RefObject<HTMLElement | null>,
  opts: MotionProps & { triggerRef?: React.RefObject<HTMLElement | null> },
) {
  const {
    speed,
    trigger,
    start = "top bottom",
    end = "bottom top",
    scrub = true,
    mobile = 0.5,
    triggerRef,
  } = opts;
  const ranges: Partial<Record<Prop, Range>> = {};
  for (const p of PROPS) if (opts[p] !== undefined) ranges[p] = opts[p];
  if (speed !== undefined && ranges.y === undefined) ranges.y = speed * 100;
  const key = JSON.stringify([ranges, trigger, start, end, scrub, mobile]);

  useGSAP(
    () => {
      const mover = moverRef.current;
      if (!mover) return;
      const mm = gsap.matchMedia();
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, (ctx) => {
        const f = ctx.conditions?.desktop ? 1 : mobile;
        if (!f) return;
        const from: gsap.TweenVars = {};
        const to: gsap.TweenVars = {};
        let unit = false; // "3vw"-style values must be re-resolved on refresh
        for (const p of PROPS) {
          const r = ranges[p];
          if (r === undefined) continue;
          const [a, b] = toPair(r, p);
          from[p] = scaleVal(a, f, p);
          to[p] = scaleVal(b, f, p);
          if (typeof a === "string" || typeof b === "string") unit = true;
        }
        const trig =
          triggerRef?.current ??
          (trigger ? resolveTrigger(mover, trigger) : mover.parentElement ?? mover);
        gsap.fromTo(mover, from, {
          ...to,
          ease: "none",
          scrollTrigger: {
            trigger: trig,
            start,
            end,
            scrub,
            // plain px/% ranges need no re-recording on refresh (cheaper refresh)
            invalidateOnRefresh: unit,
            onToggle: (self) => {
              mover.style.willChange = self.isActive ? "transform" : "";
            },
          },
        });
        return () => {
          mover.style.willChange = "";
        };
      });
      return () => mm.revert();
    },
    { dependencies: [key] },
  );
}

type ParallaxProps = MotionProps &
  Omit<React.HTMLAttributes<HTMLElement>, "children" | "className" | "style"> & {
  children?: React.ReactNode;
  /** classes for the OUTER (static, positioned) box: position, size, z-index */
  className?: string;
  /** classes for the INNER moving layer */
  innerClassName?: string;
  style?: React.CSSProperties;
  as?: "div" | "span" | "li" | "figure";
};

/**
 * <Parallax y={60}> wraps any content (Server Components welcome). Extra HTML
 * attributes (data-*, aria-*, id, role...) go on the OUTER box, so entrance hooks
 * (data-reveal, data-enter) belong on the wrapper. The outer box
 * stays put and defines the scroll range; the inner layer moves. Put positioning
 * classes on `className`. Never put this ON a sticky/pinned element or one with
 * Tailwind rotate/translate classes: wrap it (this component is that wrapper).
 *
 *   <Parallax y={-40}>background blobs</Parallax>          lags behind
 *   <Parallax y={90} rotate={6}>sticker</Parallax>         drifts faster + tilts
 *   <Parallax x={["3vw", "-3vw"]}>category row</Parallax>  horizontal drift
 */
export function Parallax({
  children,
  className,
  innerClassName,
  style,
  as = "div",
  trigger = "self",
  x,
  y,
  xPercent,
  yPercent,
  rotate,
  scale,
  speed,
  start,
  end,
  scrub,
  mobile,
  ...attrs
}: ParallaxProps) {
  const outer = useRef<HTMLElement>(null);
  const inner = useRef<HTMLElement>(null);
  useParallax(inner, {
    x,
    y,
    xPercent,
    yPercent,
    rotate,
    scale,
    speed,
    start,
    end,
    scrub,
    mobile,
    trigger: trigger === "self" ? undefined : trigger,
    triggerRef: trigger === "self" ? outer : undefined,
  });
  const Outer = as as React.ElementType;
  const Inner = (as === "span" ? "span" : "div") as React.ElementType;
  return (
    <Outer {...attrs} ref={outer} className={className} style={style}>
      <Inner
        ref={inner}
        className={clsx(as === "span" ? "inline-block" : "block", "h-full w-full", innerClassName)}
      >
        {children}
      </Inner>
    </Outer>
  );
}

type ParallaxImageProps = {
  src?: string;
  alt?: string;
  sizes?: string;
  /** frame classes: size/aspect/radius. Gets overflow-hidden (+relative unless positioned). */
  className?: string;
  imgClassName?: string;
  /** max shift each way, in % of the frame height (default 7). The inner layer is
   *  oversized so an edge is never revealed. */
  amount?: number;
  preload?: boolean;
  quality?: number;
  /** frame HEIGHT / WIDTH. Read automatically from an unprefixed aspect-[w/h] /
   *  aspect-square / aspect-video class; pass it for frames sized another way.
   *  Used to request an aspect-correct crop (incl. the parallax overscan), so
   *  `sizes` only has to describe the frame WIDTH and nothing is upscaled. */
  ratio?: number;
  /** with src: overlays drawn above the image inside the frame (badges, hover
   *  pills; position them absolute). Without src: the content that drifts. */
  children?: React.ReactNode;
  start?: string;
  end?: string;
  /** CSS object-position of the image (e.g. media(key).pos) */
  pos?: string;
};

/**
 * Image that drifts inside its frame (spec: inner image ~116% tall, ±7%).
 * Hover zoom: pass imgClassName="hover-zoom" and put "hover-zoom-parent" on a parent.
 */
export function ParallaxImage({
  src,
  alt = "",
  sizes = "100vw",
  className,
  imgClassName,
  amount = 7,
  preload,
  quality,
  ratio,
  children,
  start,
  end,
  pos,
}: ParallaxImageProps) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const pad = amount + 1; // 1% safety margin each side
  const k = (amount / (100 + 2 * pad)) * 100; // shift in % of the inner layer
  useParallax(inner, { yPercent: [-k, k], triggerRef: frame, start, end });
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? "");
  const frameRatio = ratio ?? ratioFromClass(className);
  const layerRatio = frameRatio ? frameRatio * ((100 + 2 * pad) / 100) : undefined;
  return (
    <div
      ref={frame}
      className={clsx(!positioned && "relative", "overflow-hidden", className)}
    >
      <div
        ref={inner}
        className="absolute inset-x-0"
        style={{ top: `-${pad}%`, height: `${100 + 2 * pad}%` }}
      >
        {src ? (
          <Image
            src={cropSrc(src, layerRatio)}
            alt={alt}
            fill
            sizes={sizes}
            preload={preload}
            quality={quality}
            className={clsx("object-cover", imgClassName)}
            style={pos ? { objectPosition: pos } : undefined}
          />
        ) : (
          children
        )}
      </div>
      {src ? children : null}
    </div>
  );
}
