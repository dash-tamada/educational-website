"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * lg+ only: sticks below the fixed header, but only while the whole child fits
 * in the viewport, so nothing at its bottom ever becomes unreachable.
 *
 * Content growing inside the card (a coupon form opening, an error line) must
 * never flip it from sticky to static: that would snap the card thousands of
 * pixels up the page and drop the reader's place. So:
 *  - the fit is measured against the card's TALLEST state: its height plus
 *    `reserve` (room for UI that can still open), and never less than the
 *    tallest height seen at this window width;
 *  - once sticky, content changes alone never unstick it unless the card is
 *    really cut off at the bottom, and never while keyboard focus is inside it
 *    (re-measured when focus leaves). Only a window resize re-decides freely.
 * Re-measures on window resize. Server render and first paint are non-sticky
 * (top of page, so there is no visible difference).
 */
export function StickyWhenFits({ children, className, reserve = 0 }: { children: React.ReactNode; className?: string; reserve?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(false);
  const fitsRef = useRef(false);
  const reserveRef = useRef(reserve);
  const measureRef = useRef<() => void>(() => {});

  useEffect(() => {
    reserveRef.current = reserve;
    measureRef.current();
  }, [reserve]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    let tallest = 0;
    let width = window.innerWidth;
    let lastW = 0;
    let lastH = 0;
    const measure = () => {
      if (window.innerWidth !== width) {
        // a new width can reflow the card: forget heights seen at the old one
        width = window.innerWidth;
        tallest = 0;
      }
      const h = el.offsetHeight;
      tallest = Math.max(tallest, h);
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 96;
      const resized = window.innerWidth !== lastW || window.innerHeight !== lastH;
      lastW = window.innerWidth;
      lastH = window.innerHeight;
      let next: boolean;
      if (!mq.matches) next = false;
      else if (fitsRef.current && !resized) {
        // already sticky and only the content changed: stay sticky unless the card is
        // now actually cut off at the bottom (and focus isn't inside it). Snapping a
        // stuck card back to its place in the page loses the reader's position.
        next = h + offset + 8 <= window.innerHeight || el.contains(document.activeElement);
      } else {
        // 8px gap above + 16px breathing room below, measured against the tallest state
        next = Math.max(h + reserveRef.current, tallest) + offset + 24 <= window.innerHeight;
      }
      fitsRef.current = next;
      setFits(next);
    };
    measureRef.current = measure;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onFocusOut = () => requestAnimationFrame(measure);
    el.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      el.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
      measureRef.current = () => {};
    };
  }, []);

  return (
    <div ref={ref} data-sticky={fits || undefined} className={clsx(fits && "sticky top-[calc(var(--header-offset)+8px)]", className)}>
      {children}
    </div>
  );
}
