"use client";

/**
 * Motion design tokens + page-ready gate. Import these instead of hard-coding
 * eases/durations so every section moves the same way.
 */

export const EASE = {
  /** reveals, line masks, slides */
  reveal: "expo.out",
  /** curtains, big covers */
  curtain: "expo.inOut",
  /** small pops (< ~200px): stickers, tags, badges */
  pop: "back.out(1.8)",
  /** springy small elements only (< ~200px) */
  elastic: "elastic.out(1, 0.55)",
  /** big cards: mild elastic at most */
  card: "back.out(1.4)",
  /** letter pop (R3) */
  letters: "elastic.out(1.1, 1)",
  /** hand-note write-on (R7) */
  write: "power1.inOut",
  /** scrubbed parallax */
  scrub: "none",
} as const;

export const DUR = {
  fast: 0.35,
  base: 0.8,
  reveal: 1,
  card: 0.9,
  write: 1.1,
} as const;

export const STAGGER = {
  lines: 0.08,
  items: 0.08,
  pops: 0.12,
  letters: 0.08,
} as const;

/** Default ScrollTrigger start for one-shot reveals. */
export const REVEAL_START = "top 85%";

const html = () => document.documentElement;

/** True once the intro curtain is finished and no route curtain is covering the page. */
export function isPageReady() {
  if (typeof document === "undefined") return false;
  const d = html().dataset;
  return d.intro === "done" && !d.curtain;
}

/**
 * Runs `cb` when the page is visible to the user: after the first-visit intro
 * ("intro:done") and after a route transition reveal ("route:revealed").
 * Runs immediately when already visible. Returns a cleanup function.
 * Wrap `cb` in useGSAP's contextSafe when it creates tweens.
 */
export function onPageReady(cb: () => void, { timeout = 6000 } = {}) {
  if (isPageReady()) {
    cb();
    return () => {};
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    teardown();
    cb();
  };
  const check = () => {
    if (isPageReady()) finish();
  };
  const timer = window.setTimeout(finish, timeout); // never wait forever
  const teardown = () => {
    window.clearTimeout(timer);
    window.removeEventListener("intro:done", check);
    window.removeEventListener("route:revealed", check);
  };
  window.addEventListener("intro:done", check);
  window.addEventListener("route:revealed", check);
  return () => {
    done = true;
    teardown();
  };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Media queries for gsap.matchMedia(): parallax and other decorative motion. */
export const MQ = {
  desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/**
 * Custom entrance hook (pairs with the [data-enter] pre-hide in globals.css).
 * Put data-enter on SSR targets of your own entrance timeline; they are hidden
 * before first paint when motion is allowed. In the timeline:
 *   armEnter(rootEl);                                  // cancel the 4.5s failsafe
 *   tl.fromTo(targets, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0,
 *     onComplete: () => markEntered(targets) });
 * Under reduced motion nothing is hidden, so skip the timeline.
 */
export function armEnter(scope: ParentNode | null | undefined = document) {
  if (!scope) return;
  if (scope instanceof Element && scope.hasAttribute("data-enter"))
    scope.setAttribute("data-enter-armed", "");
  scope
    .querySelectorAll("[data-enter]")
    .forEach((el) => el.setAttribute("data-enter-armed", ""));
}

/** Marks entrance targets as done (the CSS pre-hide no longer applies). */
export function markEntered(targets: Element | Element[] | NodeListOf<Element> | null | undefined) {
  if (!targets) return;
  const list = targets instanceof Element ? [targets] : Array.from(targets);
  for (const el of list) el.setAttribute("data-entered", "");
}
