"use client";

import { useEffect, useState } from "react";

/* =============================================================================
   useGround(): which ground (dark / light) sits under a horizontal line of the
   viewport, e.g. under the fixed header (top: 40) or the live clock (bottom: 28).
   No scroll handler: one IntersectionObserver whose root is a 1px strip at that
   line watches every ground element. Grounds:
     dark  = .theatre, .theatre-night, [data-field="dark"], [data-ground="dark"]
     light = .ground-cream, .ground-cream-2, [data-ground="light"]
   The innermost / last ground wins (a cream block inside a theatre reads light). Grounds
   narrower than `minWidth` x viewport (cards, photos) are ignored, unless `x` is
   given: then a ground counts when it covers that x (px from the left; negative =
   from the right). Nothing under the line = the cream page canvas ("light").
   Fixed overlays (route curtain, intro, menu, [data-ground-ignore]) are skipped.
   ============================================================================= */

export type Ground = "dark" | "light";

const DARK = '.theatre, .theatre-night, [data-field="dark"], [data-ground="dark"]';
const ANY = `${DARK}, .ground-cream, .ground-cream-2, [data-ground="light"]`;
/** Fixed overlays that are not page grounds (route curtain, intro, menu): never counted. */
const IGNORE = '.route-curtain, [data-intro-root], #site-menu, [data-ground-ignore]';
const grounds = () => Array.from(document.querySelectorAll(ANY)).filter((el) => !el.closest(IGNORE));

export function useGround({
  top,
  bottom,
  x,
  minWidth = 0.6,
  initial = "light",
  disabled = false,
}: {
  /** line position from the viewport top (px) */
  top?: number;
  /** line position from the viewport bottom (px) */
  bottom?: number;
  /** only grounds covering this x count (px; negative = from the right edge) */
  x?: number;
  /** min ground width as a fraction of the viewport (ignored when `x` is set) */
  minWidth?: number;
  /** SSR / first paint value */
  initial?: Ground;
  disabled?: boolean;
}): Ground {
  const [ground, setGround] = useState<Ground>(initial);

  useEffect(() => {
    if (disabled || typeof IntersectionObserver === "undefined") return;
    const hits = new Set<Element>();
    const seen = new WeakSet<Element>();
    let io: IntersectionObserver | null = null;

    const decide = () => {
      const W = window.innerWidth;
      const px = x === undefined ? undefined : x < 0 ? W + x : x;
      let best: Element | null = null;
      for (const el of hits) {
        if (!el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (px !== undefined ? r.left > px || r.right < px : r.width < W * minWidth) continue;
        // the LAST ground in document order wins: a nested ground follows its ancestor, and
        // an overlapping later sibling (a card pulled up over the section above) paints on top
        if (!best || best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = el;
      }
      setGround(best ? (best.matches(DARK) ? "dark" : "light") : "light");
    };

    const observeAll = () => {
      if (!io) return;
      grounds().forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io!.observe(el);
      });
    };

    const build = () => {
      io?.disconnect();
      hits.clear();
      const H = window.innerHeight;
      const line = Math.round(top !== undefined ? top : H - (bottom ?? 0));
      const y = Math.min(Math.max(line, 0), H - 1);
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) hits.add(e.target);
            else hits.delete(e.target);
          }
          decide();
        },
        { rootMargin: `${-y}px 0px ${-(H - y - 1)}px 0px`, threshold: 0 },
      );
      for (const el of grounds()) {
        io.observe(el);
        seen.add(el);
      }
    };
    build();

    // grounds mounted later (client sections, route changes inside a layout)
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = window.setTimeout(() => {
        queued = 0;
        observeAll();
      }, 200);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      io?.disconnect();
      mo.disconnect();
      window.clearTimeout(queued);
      window.clearTimeout(rt);
      window.removeEventListener("resize", onResize);
    };
  }, [top, bottom, x, minWidth, disabled]);

  return ground;
}
