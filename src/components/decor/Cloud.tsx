"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/**
 * Maxima-style flat scalloped cloud (no outline). Sizes at 1440: S 90x40,
 * M 160x70, L 260x110 (pass a width class to override). The inner SVG sways
 * horizontally on a slow CSS loop (S 18s, M 24s, L 30s), paused while offscreen
 * and under reduced motion. Position it with `className` (absolute ...).
 * For scroll depth wrap it: <Parallax y={50}><Cloud size="m" /></Parallax>.
 * Never place a cloud over text.
 */
export type CloudSize = "s" | "m" | "l";

const SHAPES: Record<CloudSize, { vb: string; w: string; d: React.ReactNode }> = {
  s: {
    vb: "0 0 90 40",
    w: "w-[54px] md:w-[90px]",
    d: (
      <>
        <circle cx="24" cy="22" r="13" />
        <circle cx="44" cy="15" r="15" />
        <circle cx="65" cy="22" r="13" />
        <rect x="11" y="20" width="68" height="17" rx="8.5" />
      </>
    ),
  },
  m: {
    vb: "0 0 160 70",
    w: "w-[96px] md:w-[160px]",
    d: (
      <>
        <circle cx="36" cy="40" r="22" />
        <circle cx="66" cy="27" r="26" />
        <circle cx="100" cy="25" r="23" />
        <circle cx="127" cy="40" r="20" />
        <circle cx="52" cy="50" r="16" />
        <circle cx="108" cy="50" r="16" />
        <rect x="14" y="38" width="133" height="28" rx="14" />
      </>
    ),
  },
  l: {
    vb: "0 0 260 110",
    w: "w-[156px] md:w-[260px]",
    d: (
      <>
        <circle cx="52" cy="64" r="34" />
        <circle cx="98" cy="44" r="42" />
        <circle cx="152" cy="40" r="38" />
        <circle cx="200" cy="58" r="32" />
        <circle cx="80" cy="80" r="24" />
        <circle cx="172" cy="80" r="24" />
        <rect x="18" y="62" width="226" height="42" rx="21" />
      </>
    ),
  },
};

const DUR: Record<CloudSize, number> = { s: 18, m: 24, l: 30 };

let io: IntersectionObserver | null = null;
function observe(el: Element) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.removeAttribute("data-offscreen");
        else e.target.setAttribute("data-offscreen", "");
      }
    },
    { rootMargin: "120px" },
  );
  io.observe(el);
  return () => io?.unobserve(el);
}

export function Cloud({
  size = "m",
  className,
  color = "#ffffff",
  drift = true,
  /** seconds for one sway leg; defaults by size */
  duration,
  /** negative delay desyncs neighbouring clouds, e.g. -8 */
  delay = 0,
  /** sway distance each way (CSS length), default 3vw */
  sway = "3vw",
  flip,
}: {
  size?: CloudSize;
  className?: string;
  color?: string;
  drift?: boolean;
  duration?: number;
  delay?: number;
  sway?: string;
  flip?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => (drift && ref.current ? observe(ref.current) : undefined), [drift]);
  const s = SHAPES[size];
  return (
    <span
      ref={ref}
      aria-hidden
      className={clsx("pointer-events-none block", s.w, className)}
    >
      <svg
        viewBox={s.vb}
        className={clsx("block h-auto w-full", drift && "cloud-drift")}
        style={
          {
            "--cloud-dur": `${duration ?? DUR[size]}s`,
            "--cloud-delay": `${delay}s`,
            "--cloud-from": sway,
            "--cloud-to": `calc(${sway} * -1)`,
            transform: flip ? "scaleX(-1)" : undefined,
          } as React.CSSProperties
        }
      >
        <g fill={color}>{s.d}</g>
      </svg>
    </span>
  );
}
