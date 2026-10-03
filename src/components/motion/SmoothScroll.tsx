"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { onScrollIdle, setLenis } from "@/lib/lenis";

/**
 * Lenis smooth scroll driven by GSAP's ticker and synced with ScrollTrigger.
 * Off under prefers-reduced-motion. Also keeps ScrollTrigger positions fresh
 * after fonts / images load and whenever the document height changes, always
 * as ONE deferred refresh at scroll idle (never inside a scroll).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;

    const start = () => {
      if (lenis || reduced.matches) return;
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        // hash links are handled by the route transition system (lenis.scrollTo)
        anchors: false,
        autoRaf: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setLenis(lenis);
    };
    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      tick = null;
      setLenis(null);
    };
    start();
    const onPref = () => (reduced.matches ? stop() : start());
    reduced.addEventListener("change", onPref);

    // ---- keep trigger positions correct -------------------------------------
    // ScrollTrigger.refresh() re-measures EVERY trigger (a 400-800ms long task on
    // a throttled CPU), so it never runs mid-scroll: every request is collapsed
    // into ONE refresh that waits for 400ms of scroll idle, then a frame.
    let raf = 0;
    let cancelIdle = () => {};
    let lastH = document.documentElement.scrollHeight;
    const doRefresh = () => {
      lastH = document.documentElement.scrollHeight;
      lenis?.resize();
      ScrollTrigger.refresh();
    };
    const refresh = () => {
      cancelAnimationFrame(raf);
      cancelIdle();
      cancelIdle = onScrollIdle(() => {
        raf = requestAnimationFrame(doRefresh);
      }, 400);
    };
    let alive = true;
    document.fonts?.ready.then(() => alive && refresh());
    const onLoad = () => refresh();
    if (document.readyState === "complete") refresh();
    else window.addEventListener("load", onLoad, { once: true });

    // Real content growth (late images without a reserved box, accordions...):
    // refresh once the height settles. Sub-8px wobble is ignored.
    let t = 0;
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) < 8) return;
      window.clearTimeout(t);
      t = window.setTimeout(refresh, 250);
    });
    ro.observe(document.body);

    return () => {
      alive = false;
      reduced.removeEventListener("change", onPref);
      window.removeEventListener("load", onLoad);
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      cancelIdle();
      ro.disconnect();
      stop();
    };
  }, []);

  return <>{children}</>;
}
