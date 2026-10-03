"use client";

import type Lenis from "lenis";

let instance: Lenis | null = null;

/** The page's Lenis instance (null under reduced motion or before mount). */
export const getLenis = () => instance;
export const setLenis = (l: Lenis | null) => {
  instance = l;
};

/* ---------------------------------------------------------------------------
   Scroll-idle helpers (shared by hover-follow effects, the cursor and the
   refresh scheduler). One passive scroll listener for the whole page; works with
   and without Lenis (reduced motion).
--------------------------------------------------------------------------- */
let lastScroll = -Infinity;
let idleWaiters: { ms: number; cb: () => void }[] = [];
let idleTimer = 0;
const flushIdle = () => {
  idleTimer = 0;
  const now = performance.now();
  const ready = idleWaiters.filter((w) => now - lastScroll >= w.ms);
  idleWaiters = idleWaiters.filter((w) => now - lastScroll < w.ms);
  for (const w of ready) w.cb();
  if (idleWaiters.length) armIdle();
};
const armIdle = () => {
  if (idleTimer || !idleWaiters.length) return;
  const wait = Math.max(16, Math.min(...idleWaiters.map((w) => w.ms)) - (performance.now() - lastScroll));
  idleTimer = window.setTimeout(flushIdle, wait);
};
if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      lastScroll = performance.now();
    },
    { passive: true, capture: true },
  );
}

/** True while the page scrolled within the last `ms` (default 140ms). Cheap: no layout reads. */
export const isScrolling = (ms = 140) => performance.now() - lastScroll < ms;

/** Runs `cb` once the page has not scrolled for `ms` (immediately if already idle). Returns a cancel fn. */
export function onScrollIdle(cb: () => void, ms = 140) {
  if (!isScrolling(ms)) {
    cb();
    return () => {};
  }
  const w = { ms, cb };
  idleWaiters.push(w);
  armIdle();
  return () => {
    idleWaiters = idleWaiters.filter((x) => x !== w);
  };
}

const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Smooth-scrolls to an element, selector, hash or Y offset. Honours each
 * target's scroll-margin-top (globals.css gives every [id] the header offset).
 * Falls back to a native jump when Lenis is off (reduced motion).
 */
export function scrollToTarget(
  target: string | HTMLElement | number,
  { immediate = false, duration = 1.2 }: { immediate?: boolean; duration?: number } = {},
) {
  let el: HTMLElement | number | null = null;
  if (typeof target === "number") el = target;
  else if (typeof target === "string") {
    const sel = target.startsWith("#") ? target : `#${target}`;
    try {
      el =
        sel === "#" || sel === "#top"
          ? (document.getElementById("top") ?? 0)
          : document.querySelector<HTMLElement>(
              `#${CSS.escape(decodeURIComponent(sel.slice(1)))}`,
            );
    } catch {
      el = null;
    }
  } else el = target;
  if (el === null) return false;

  const lenis = instance;
  if (lenis) {
    lenis.scrollTo(el, { duration, easing: expoOut, immediate, force: true });
    return true;
  }
  if (typeof el === "number") window.scrollTo({ top: el, behavior: "auto" });
  else el.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}
