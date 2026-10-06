"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/* =============================================================================
   Mobile foundation hooks (.qa/mobile/MOBILE_SPEC.md §1.1, §1.8, §1.16).

     const phone = useIsPhone();          // max-width 639.98px (false on the server)
     const coarse = useIsCoarse();        // (pointer: coarse)
     const land = useIsShortLandscape();  // landscape phones, height <= 500px
     const up = useMediaQuery("(min-width: 1024px)");

     const hidden = useScrollHide();      // true while scrolling DOWN past 56px (auto-hiding bars)

     useBottomUi("my-bar", ref, visible, { action: true });
       // Registers a fixed bottom bar: writes --bottom-ui on <html> (the tallest bar
       // incl. its bottom offset) so main padding, toasts and scroll-padding clear it.
       // `action: true` marks a sticky ACTION bar: the AppDock hides while one is
       // registered (one bottom bar at a time; the action bar wins).

     useKeyboardOpen();                   // true while html[data-kbd] is set
   <KeyboardInset/> (mounted once in the root layout) keeps html[data-kbd], --kb and
   --vvh in sync with the on-screen keyboard (visualViewport + focused text field).
   ============================================================================= */

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const PHONE_QUERY = "(max-width: 639.98px)";
export const COARSE_QUERY = "(pointer: coarse)";
export const LAND_QUERY = "(orientation: landscape) and (max-height: 500px)";

export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
export const useIsCoarse = () => useMediaQuery(COARSE_QUERY);
export const useIsShortLandscape = () => useMediaQuery(LAND_QUERY);

/** Synchronous check for event handlers / effects (false on the server). */
export function isPhone() {
  return typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
}
export function isCoarse() {
  return typeof window !== "undefined" && window.matchMedia(COARSE_QUERY).matches;
}

/* ----------------------------------------------------------------------------- scroll hide */
/** Auto-hide for bars: true after the page scrolled down past `after` px by more than
 *  `delta` px; false again on any upward scroll of `delta` px or near the top. */
export function useScrollHide({ after = 56, delta = 8, enabled = true }: { after?: number; delta?: number; enabled?: boolean } = {}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      if (y < after) {
        setHidden(false);
        last = y;
        return;
      }
      if (Math.abs(y - last) < delta) return;
      setHidden(y > last);
      last = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [after, delta, enabled]);
  return enabled && hidden;
}

/** True once the page has scrolled more than `px` (hairline shadows under sticky bars). */
export function useScrolledPast(px = 4) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setPast(window.scrollY > px);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [px]);
  return past;
}

/* ----------------------------------------------------------------------------- bottom UI registry */
type Bar = { px: number; action: boolean };
const bars = new Map<string, Bar>();
const barSubs = new Set<() => void>();
let actionCount = 0;

function applyBars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  let max = 0;
  let actions = 0;
  for (const b of bars.values()) {
    if (b.px > max) max = b.px;
    if (b.action) actions++;
  }
  if (max > 0) root.style.setProperty("--bottom-ui", `${Math.round(max)}px`);
  else root.style.removeProperty("--bottom-ui");
  root.toggleAttribute("data-action-bar", actions > 0);
  if (actions !== actionCount) {
    actionCount = actions;
    barSubs.forEach((s) => s());
  }
}

/** Register / update / remove a fixed bottom bar (px = height + bottom offset; null removes). */
export function setBottomUi(id: string, px: number | null, opts: { action?: boolean } = {}) {
  if (px === null || px <= 0) bars.delete(id);
  else bars.set(id, { px, action: !!opts.action });
  applyBars();
}

/** Is a sticky action bar on screen? (the AppDock steps aside while it is) */
export function useActionBarPresent() {
  return useSyncExternalStore(
    (cb) => {
      barSubs.add(cb);
      return () => barSubs.delete(cb);
    },
    () => actionCount > 0,
    () => false,
  );
}

/**
 * Measure `ref` while `visible` and publish its footprint as --bottom-ui:
 * height + the gap between its bottom edge and the viewport bottom.
 */
export function useBottomUi(id: string, ref: React.RefObject<HTMLElement | null>, visible: boolean, opts: { action?: boolean } = {}) {
  const action = !!opts.action;
  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) {
      setBottomUi(id, null);
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.height) return setBottomUi(id, null);
      // footprint from the bar's top edge (at rest, ignoring the hide translate) to the viewport bottom
      const cs = getComputedStyle(el);
      const bottom = parseFloat(cs.bottom) || 0;
      setBottomUi(id, r.height + bottom, { action });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      setBottomUi(id, null);
    };
  }, [id, ref, visible, action]);
}

/* ----------------------------------------------------------------------------- keyboard */
const kbdSubs = new Set<() => void>();
let kbdOpen = false;

export function useKeyboardOpen() {
  return useSyncExternalStore(
    (cb) => {
      kbdSubs.add(cb);
      return () => kbdSubs.delete(cb);
    },
    () => kbdOpen,
    () => false,
  );
}

const isEditable = (el: Element | null) =>
  !!el &&
  ((el instanceof HTMLInputElement && !/^(checkbox|radio|button|submit|reset|range|color|file|image|hidden)$/i.test(el.type)) ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable));

/**
 * Keeps html[data-kbd], --kb and --vvh in sync with the on-screen keyboard.
 * iOS: the visual viewport shrinks (kb = innerHeight - vv.height - vv.offsetTop).
 * Android (interactive-widget=resizes-content): the layout viewport itself shrinks, so
 * the hook also treats "a text field is focused on a coarse pointer and the window lost
 * > 120px of its tallest height for this orientation" as keyboard-open.
 * Mount once: <KeyboardInset/> in the root layout. Exported as a hook for tests/islands.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const coarse = window.matchMedia(COARSE_QUERY);
    const tallest: Record<string, number> = {};
    let raf = 0;
    const update = () => {
      raf = 0;
      const orient = window.innerWidth > window.innerHeight ? "l" : "p";
      tallest[orient] = Math.max(tallest[orient] ?? 0, window.innerHeight);
      const vh = vv ? vv.height : window.innerHeight;
      const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      const focusedField = isEditable(document.activeElement);
      const shrunk = tallest[orient] - window.innerHeight > 120;
      const open = coarse.matches && focusedField && (kb > 120 || shrunk);
      root.style.setProperty("--vvh", `${Math.round(vh)}px`);
      if (open && kb > 0) root.style.setProperty("--kb", `${Math.round(kb)}px`);
      else root.style.removeProperty("--kb");
      root.toggleAttribute("data-kbd", open);
      if (open !== kbdOpen) {
        kbdOpen = open;
        kbdSubs.forEach((s) => s());
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // focus changes settle before the keyboard animates: re-check a little later too
    const onFocus = () => {
      schedule();
      window.setTimeout(schedule, 350);
    };
    update();
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-kbd");
      root.style.removeProperty("--kb");
      root.style.removeProperty("--vvh");
    };
  }, []);
}

/** Mount once in the root layout. */
export function KeyboardInset() {
  useKeyboardInset();
  return null;
}

