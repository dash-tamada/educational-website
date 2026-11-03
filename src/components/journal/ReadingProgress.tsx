"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/* A 2px red reading bar pinned to the top edge: scaleX follows the article body
   (scrubbed, transform only). Hidden under reduced motion (no scrubbed motion). */
export function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = bar.current!;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(el, { autoAlpha: 1 });
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: target, start: "top 70%", end: "bottom 60%", scrub: true } });
    });
    return () => mm.revert();
  });
  return <div ref={bar} aria-hidden data-ground-ignore="" className="pointer-events-none invisible fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-red opacity-0" />;
}
