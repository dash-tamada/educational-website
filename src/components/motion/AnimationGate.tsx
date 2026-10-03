"use client";

import { useEffect } from "react";

/**
 * Pauses decorative infinite CSS animations (Tailwind `animate-*` utilities such as the
 * marquee tapes, floating badges and Tami) while they are off screen. Running animations
 * re-style and re-paint the page every frame even when nobody can see them, which made the
 * page idle at ~50% main-thread load. The CSS in globals.css pauses `[data-offscreen]`.
 */
const SELECTOR = '[class*="animate-"]';

export function AnimationGate() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.removeAttribute("data-offscreen");
          else e.target.setAttribute("data-offscreen", "");
        }
      },
      { rootMargin: "200px 0px" },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();

    // Pick up elements mounted later (route changes, client-only sections).
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = window.setTimeout(() => {
        queued = 0;
        scan();
      }, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (queued) clearTimeout(queued);
    };
  }, []);

  return null;
}
