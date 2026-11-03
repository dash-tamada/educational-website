"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { BrandMark } from "./BrandMark";

/* =============================================================================
   First-visit intro (home only, once per session): a black frame, the logo, a
   timecode counting one second of film (24 fps) and a red line running under it,
   then the frame wipes up into the hero. ~1.1s + 0.8s wipe. Skippable (any click
   or key). Reduced motion / returning visitors: never shown (html[data-intro=done]
   is set before paint by PrePaint + the inline script below).
   Fires "intro:done" (onPageReady listeners) as the wipe starts, so the hero
   entrance overlaps it.
   ============================================================================= */

const KEY = "tm-intro-seen";
const preScript = `try{if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="done"}}catch(e){}`;

const tc = (frames: number) => {
  const f = Math.floor(frames % 24);
  const s = Math.floor(frames / 24);
  return `00:00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

export function CinematicIntro() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const html = document.documentElement;
      if (html.dataset.intro === "done") {
        el.style.display = "none";
        return;
      }
      el.style.display = "block";
      const code = el.querySelector<HTMLElement>("[data-intro-tc]");
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        html.dataset.intro = "done";
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
        window.dispatchEvent(new Event("intro:done"));
      };
      const counter = { f: 0 };
      const tl = gsap
        .timeline({ delay: 0.05, onComplete: () => (el.style.display = "none") })
        .fromTo("[data-intro-logo]", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, 0)
        .fromTo("[data-intro-meta]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power1.out", stagger: 0.04 }, 0.05)
        .fromTo("[data-intro-line]", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power2.inOut" }, 0.05)
        .to(counter, { f: 24, duration: 1, ease: "none", onUpdate: () => code && (code.textContent = tc(counter.f)) }, 0.05)
        .to("[data-intro-center]", { y: -40, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, 1.08)
        .to("[data-intro-sheet]", { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 1.1)
        .call(release, [], 1.2);

      const skip = () => {
        if (tl.time() < 1.08) tl.seek(1.08);
      };
      window.addEventListener("pointerdown", skip, { once: true });
      window.addEventListener("keydown", skip, { once: true });
      return () => {
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
        // a real unmount mid-intro (navigating away) must never leave the page gated;
        // Strict Mode's simulated unmount keeps the node connected, so it replays instead
        window.setTimeout(() => {
          if (!el.isConnected) release();
        }, 0);
      };
    },
    { scope: root },
  );

  return (
    <>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: preScript }}
      />
      <noscript>
        <style>{"[data-intro-root]{display:none!important}"}</style>
      </noscript>
      <div ref={root} data-intro-root="" aria-hidden className="fixed inset-0 z-[100] overflow-hidden [[data-intro=done]_&]:hidden">
        <div data-intro-sheet="" className="theatre absolute inset-0 will-change-transform">
          <div className="container-wide relative flex h-full flex-col justify-between py-[max(24px,var(--sat))]">
            <div className="flex items-start justify-between">
              <p data-intro-meta="" className="t-label text-muted">
                Reel 01
              </p>
              <p data-intro-meta="" className="t-label text-muted">
                Prompt to Premiere
              </p>
            </div>
            <div data-intro-center="" className="flex flex-col items-center">
              <div data-intro-logo="" className="w-[180px] opacity-0 sm:w-[240px] md:w-[300px]">
                <BrandMark tone="light" lazy sizes="(min-width: 768px) 300px, (min-width: 640px) 240px, 180px" />
              </div>
              <div className="mt-8 w-[180px] sm:w-[240px] md:w-[300px]">
                <span data-intro-line="" className="block h-px w-full origin-left scale-x-0 bg-red" />
                <p className="t-timecode mt-3 flex justify-between text-ash">
                  <span>TC</span>
                  <span data-intro-tc="">00:00:00:00</span>
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p data-intro-meta="" className="t-label text-muted">
                © 2026
              </p>
              <p data-intro-meta="" className="t-label text-muted">
                India · IST
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
