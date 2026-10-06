"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/* =============================================================================
   ScrollIndicator: the progress cue under a horizontal snap scroller on phones
   (MOBILE_SPEC §1.12). Decorative (aria-hidden): the scroller itself is the
   accessible list, and every item stays reachable by swiping or Tab.

     <ul id="stories-track" className="max-sm:h-scroller …">…</ul>
     <ScrollIndicator target="stories-track" kind="dots" count={4} className="sm:hidden" />

   kind="track": a 64x4px track with an ink thumb sized to the visible fraction.
   kind="dots":  one dot per item, the snapped item is the long one.
   fade: also toggles data-overflow on the scroller (trailing / both-edge mask from
   globals.css) while it actually overflows, so a cut-off card reads as "more".
   Works for Server Component sections: it finds the scroller by id.
   Updates are rAF-throttled DOM writes (no React re-render while swiping).
   ============================================================================= */

type Props = {
  /** id of the scrolling element */
  target: string;
  kind?: "track" | "dots";
  /** number of dots (kind="dots") */
  count?: number;
  tone?: "ink" | "white" | "forest";
  fade?: boolean;
  className?: string;
  style?: React.CSSProperties;
  align?: "center" | "start";
};

const TONES = {
  ink: { track: "bg-ink/12", on: "bg-ink", dot: "data-[active]:bg-ink" },
  white: { track: "bg-white/30", on: "bg-white", dot: "data-[active]:bg-white" },
  forest: { track: "bg-forest/20", on: "bg-forest", dot: "data-[active]:bg-forest" },
} as const;

/** Index of the item snapped to the scroller's start edge (last item at the end). */
export function snappedIndex(el: HTMLElement) {
  const items = Array.from(el.children) as HTMLElement[];
  if (!items.length) return 0;
  const max = el.scrollWidth - el.clientWidth;
  if (max > 0 && el.scrollLeft >= max - 4) return items.length - 1;
  const pad = parseFloat(getComputedStyle(el).scrollPaddingInlineStart) || 0;
  const start = el.getBoundingClientRect().left + pad;
  let best = 0;
  let bestD = Infinity;
  items.forEach((it, i) => {
    const d = Math.abs(it.getBoundingClientRect().left - start);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export function ScrollIndicator({ target, kind = "track", count = 0, tone = "ink", fade = false, className, style, align = "center" }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(target);
    const host = root.current;
    if (!el || !host) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      // only a real scroller counts (a deck/grid with tilted cards also has scrollWidth > clientWidth)
      const overflowing = max > 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowX);
      if (fade) {
        const s = el.scrollLeft > 2;
        const e = max - el.scrollLeft > 2;
        const v = !overflowing ? "" : s && e ? "both" : s ? "start" : e ? "end" : "";
        if (v) el.setAttribute("data-overflow", v);
        else el.removeAttribute("data-overflow");
      }
      host.toggleAttribute("data-idle", !overflowing);
      if (kind === "track") {
        const thumb = host.firstElementChild?.firstElementChild as HTMLElement | null;
        if (!thumb) return;
        const frac = overflowing ? Math.max(0.18, el.clientWidth / el.scrollWidth) : 1;
        const p = overflowing ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0;
        thumb.style.width = `${frac * 100}%`;
        thumb.style.transform = `translateX(${(p * (1 - frac) * 100) / frac}%)`;
      } else {
        const i = snappedIndex(el);
        Array.from(host.children).forEach((d, k) => d.toggleAttribute("data-active", k === i));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", schedule);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (fade) el.removeAttribute("data-overflow");
    };
  }, [target, kind, fade, count]);

  const t = TONES[tone];
  if (kind === "dots") {
    return (
      <div ref={root} aria-hidden style={style} className={clsx("flex items-center gap-2 data-[idle]:invisible", align === "center" ? "justify-center" : "justify-start", className)}>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            data-active={i === 0 ? "" : undefined}
            className={clsx(
              "h-2 w-2 rounded-full transition-[width,background-color] duration-300 ease-ui data-[active]:w-6",
              t.track,
              t.dot,
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div ref={root} aria-hidden style={style} className={clsx("flex data-[idle]:invisible", align === "center" ? "justify-center" : "justify-start", className)}>
      <span className={clsx("block h-1 w-16 overflow-hidden rounded-full", t.track)}>
        <span className={clsx("block h-full w-1/4 rounded-full will-change-transform", t.on)} />
      </span>
    </div>
  );
}
