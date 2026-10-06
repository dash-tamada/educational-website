"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * True while the viewport is at least `px` wide. Server render and hydration
 * use `fallback` (the store-gated pages only mount after hydration anyway).
 */
export function useMinWidth(px: number, fallback = false): boolean {
  const q = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(q);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => fallback,
  );
}

/**
 * Move keyboard focus to `target()` once React has committed the change that
 * triggered it (two frames: the commit, then any overlay restoring focus).
 * Unless `force`, it only acts when focus fell to <body> because the control
 * that had it unmounted (claim buttons, "Rate it", the last wishlist row).
 */
export function rescueFocus(target: () => HTMLElement | null | undefined, { force = false }: { force?: boolean } = {}) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!force && active && active !== document.body && active.isConnected) return;
      target()?.focus({ preventScroll: false });
    }),
  );
}

/** After a failed submit: focus the first control the Field marked invalid (after React renders the errors). */
export function focusFirstInvalid(root: HTMLElement | null) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  });
}

/**
 * True while `ref`'s element is scrolled out of the viewport (false until measured, and when the
 * element is missing). Drives the phone sticky save bars: they only mirror an inline button that
 * the learner can't see.
 */
export function useOutOfView(
  ref: React.RefObject<HTMLElement | null>,
  /** shrink the viewport by the chrome that covers it (phones: top bar + sticky row, dock) */
  rootMargin = "-120px 0px -88px 0px",
) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // "in view" = at least 60% of it clear of the chrome
    const io = new IntersectionObserver(
      ([e]) => setOut(!e.isIntersecting || e.intersectionRatio < 0.6),
      { threshold: [0, 0.6], rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return out;
}
