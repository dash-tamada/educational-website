"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

if (typeof window !== "undefined") {
  // Mobile URL-bar show/hide resizes the viewport: don't recompute every trigger
  // for that (it caused jumps). Real resizes still refresh.
  // (No limitCallbacks: one-shot reveals rely on onEnter firing even when a fast
  // scroll or a #hash jump passes the whole trigger in one update.)
  // autoRefreshEvents: no built-in "load" refresh; SmoothScroll
  // runs ONE refresh after load/fonts at scroll idle instead (a refresh is a
  // long task and must never land mid-scroll).
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,resize",
  });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
export { prefersReducedMotion } from "./motion";
