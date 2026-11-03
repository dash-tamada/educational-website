"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/* =============================================================================
   A running SMPTE-style timecode (HH:MM:SS:FF at 24 fps) for the auth slates,
   the 404 and the certificate page. Writes textContent from one rAF loop (no
   React re-render per frame), pauses itself in background tabs (rAF does), and
   stays still under prefers-reduced-motion. Decorative: aria-hidden.

   <Timecode />                       starts at 00:00:00:00 and runs
   <Timecode start={4 * 60 + 4} />    00:04:04:00 and runs
   <Timecode start={244} still />     a frozen slate
   ============================================================================= */

const FPS = 24;
const pad = (n: number) => String(n).padStart(2, "0");

export function formatTimecode(totalFrames: number) {
  const f = Math.max(0, Math.floor(totalFrames));
  const frames = f % FPS;
  const s = Math.floor(f / FPS);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames)}`;
}

export function Timecode({ start = 0, still, className }: { start?: number; still?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || still || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    let last = "";
    const tick = (t: number) => {
      const v = formatTimecode(start * FPS + ((t - t0) / 1000) * FPS);
      if (v !== last) {
        el.textContent = v;
        last = v;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, still]);
  return (
    <span ref={ref} aria-hidden className={clsx("tabular-nums", className)} suppressHydrationWarning>
      {formatTimecode(start * FPS)}
    </span>
  );
}
