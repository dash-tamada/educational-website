"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { areaOf, isAppArea } from "@/components/app/nav";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { onScrollIdle, setLenis } from "@/lib/lenis";

/** Set for the rest of the visit once this machine proved too slow for Lenis. */
const NATIVE_KEY = "tm-native-scroll";
const nativeForced = () => {
  try {
    return sessionStorage.getItem(NATIVE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Lenis smooth scroll driven by GSAP's ticker and synced with ScrollTrigger.
 * Off under prefers-reduced-motion. Also keeps ScrollTrigger positions fresh
 * after fonts / images load and whenever the document height changes, always
 * as ONE deferred refresh at scroll idle (never inside a scroll).
 * Slow machines: Lenis moves the page from the main thread, so there every busy frame
 * is a scroll stutter, while native scrolling runs on the compositor and never stutters.
 * When smooth-scrolled frames keep running long (a third of 90 frames over 25ms), Lenis
 * steps aside and the page scrolls natively for the rest of the visit.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // App areas (/dashboard, /tutor, /admin, /learn) scroll natively: Lenis is torn
  // down there and comes back on the marketing pages.
  const pathname = usePathname();
  const native = isAppArea(areaOf(pathname));
  const nativeRef = useRef(native);
  const ctl = useRef<{ start: () => void; stop: () => void } | null>(null);
  useEffect(() => {
    nativeRef.current = native;
    if (native) ctl.current?.stop();
    else ctl.current?.start();
  }, [native]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;

    const start = () => {
      if (lenis || reduced.matches || nativeRef.current || nativeForced()) return;
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        // hash links are handled by the route transition system (lenis.scrollTo)
        anchors: false,
        autoRaf: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      // frame budget while Lenis is gliding (ignoring the first 1.5s: hydration, image decodes)
      const armed = performance.now() + 1500;
      let last = 0;
      let frames = 0;
      let slow = 0;
      tick = (time: number) => {
        lenis?.raf(time * 1000);
        const now = time * 1000;
        const dt = now - last;
        last = now;
        if (lenis?.isScrolling !== "smooth" || now < armed || dt > 250 || document.hidden) return;
        frames++;
        if (dt > 25) slow++;
        if (frames < 90) return;
        if (slow * 3 > frames) {
          try {
            sessionStorage.setItem(NATIVE_KEY, "1");
          } catch {}
          // not from inside the ticker callback that is being removed
          window.setTimeout(stop, 0);
        }
        frames = slow = 0;
      };
      // prioritized: Lenis scrolls (and ScrollTrigger reads the new position) BEFORE GSAP
      // renders this frame's tweens. Added last, its window.scrollTo ran right after the
      // tweens' style writes and forced an extra synchronous style + layout every frame.
      gsap.ticker.add(tick, false, true);
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
    ctl.current = { start, stop };
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
      ctl.current = null;
      stop();
    };
  }, []);

  return <>{children}</>;
}
