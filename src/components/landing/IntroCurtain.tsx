"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { onPageReady } from "@/lib/motion";
import { CurtainArt } from "@/components/transition/CurtainArt";
import { BrandLockup } from "./Header";

const KEY = "tm-intro-seen";

/**
 * Runs `cb` once the page is visible: after the intro curtain AND after a route
 * transition reveal. Kept for existing callers; new code imports onPageReady
 * from "@/lib/motion".
 */
export const onIntroDone = onPageReady;

// Runs before hydration so returning visitors never see a flash of the curtain.
const preScript = `try{if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="done"}}catch(e){}`;

/**
 * First-visit intro (once per session, home only). Same visual language as the
 * route curtain (CurtainArt): cream sheet + clouds, Tami pops, the official
 * Tamada Media logo rises in, then the identical reveal (sheet up, expo.inOut).
 * ~1.8s, skippable with a click or key press.
 */
export function IntroCurtain() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      if (document.documentElement.dataset.intro === "done") {
        el.style.display = "none";
        return;
      }
      // Inline display keeps the curtain up after data-intro flips to "done" (1.45s)
      // while the sheet is still clearing; the CSS rule only hides it on load.
      el.style.display = "block";
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.documentElement.dataset.intro = "done";
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
        el.style.display = "none";
        // Dispatch outside this GSAP context so listeners' selectors aren't scoped to the curtain.
        requestAnimationFrame(() => window.dispatchEvent(new Event("intro:done")));
      };
      const tl = gsap
        .timeline({ onComplete: finish, delay: 0.1 })
        // The official logo is never rotated or distorted: it rises and settles as one piece.
        .fromTo(
          ".intro-logo",
          { y: 40, scale: 0.94, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.85, ease: "back.out(1.4)" },
          0,
        )
        // Tami pops in beside it (its resting -6deg tilt lives on an outer box).
        .fromTo(
          ".intro-tami",
          { scale: 0, rotate: -30, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: "back.out(2)" },
          0.28,
        )
        // The logo rides up with the sheet and fades on the way: never a blank frame.
        .to(".intro-center", { y: -60, autoAlpha: 0, duration: 0.42, ease: "power2.in" }, 1.18)
        .to("[data-curtain-sheet]", { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, 1.1)
        .to("[data-curtain-cloud]", { y: "-24vh", duration: 0.7, ease: "expo.inOut", stagger: 0.02 }, 1.1);
      // Mark the page visible as the sheet starts to clear so the hero entrance overlaps it.
      tl.call(
        () => {
          document.documentElement.dataset.intro = "done";
          window.dispatchEvent(new Event("intro:done"));
        },
        [],
        1.45,
      );

      const skip = () => tl.progress() < 0.75 && tl.seek(1.1);
      window.addEventListener("pointerdown", skip, { once: true });
      window.addEventListener("keydown", skip, { once: true });
      return () => {
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
      };
    },
    { scope: root },
  );

  return (
    <>
      {/* text/plain on the client: the script only needs to run on a hard load
          (React warns about executable <script> tags rendered on the client). */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: preScript }}
      />
      <noscript>
        <style>{"[data-intro-curtain]{display:none!important}"}</style>
      </noscript>
      <div
        ref={root}
        data-intro-curtain=""
        className="fixed inset-0 z-[100] overflow-hidden [[data-intro=done]_&]:hidden"
        aria-hidden
      >
        <CurtainArt>
          {/* The same brand lockup as the header (Tami left of the logo), larger. */}
          <div className="intro-center [--lw:200px] sm:[--lw:300px] md:[--lw:380px]">
            <BrandLockup
              sizes="(min-width: 768px) 380px, (min-width: 640px) 300px, 200px"
              preload
              tamiClassName="intro-tami origin-bottom opacity-0"
              logoClassName="intro-logo opacity-0"
            />
          </div>
        </CurtainArt>
      </div>
    </>
  );
}
