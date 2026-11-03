"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { media } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { MOTION_STILL } from "@/lib/content/home";

/* =============================================================================
   03 FULL-BLEED STILL (Mobius "Ideas in motion"). Ink.
   A sticky stage: a cinematic still grows from a centred frame to full bleed
   while two rows of giant Anton words travel across it in opposite directions,
   one BEHIND the picture (solid cream) and one IN FRONT (outlined). Scrubbed,
   transform-only. Reduced motion: the still sits full-bleed with the words
   static across it.
   ============================================================================= */

const repeat = (s: string, n = 3) => Array.from({ length: n }, () => s).join("  ");

export function MotionStill() {
  const root = useRef<HTMLElement>(null);
  const still = media(MOTION_STILL.image);

  useGSAP(
    () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const phone = !!ctx.conditions?.phone;
          const st = { trigger: el.querySelector("[data-track]"), start: "top bottom", end: "bottom bottom", scrub: 0.6 };
          const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: st });
          tl.fromTo(q("[data-still-frame]"), { scale: phone ? 0.78 : 0.52 }, { scale: 1, duration: 1, ease: "power1.inOut" }, 0.15)
            .fromTo(q("[data-still-img]"), { scale: 1.25 }, { scale: 1, duration: 1.15 }, 0)
            .fromTo(q("[data-row-a]"), { xPercent: 4 }, { xPercent: -38, duration: 1.15 }, 0)
            .fromTo(q("[data-row-b]"), { xPercent: -42 }, { xPercent: 2, duration: 1.15 }, 0)
            .fromTo(q("[data-still-meta]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.9);
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label={`${MOTION_STILL.rowA} ${MOTION_STILL.rowB}`} className="theatre relative">
      <div data-track="" className="relative motion-ok:h-[190vh] md:motion-ok:h-[240vh]">
        <div className="relative h-[100svh] overflow-hidden motion-ok:sticky motion-ok:top-0">
          {/* Row A: behind the picture */}
          <p aria-hidden className="still-row absolute inset-x-0 top-[24%] z-0 md:top-[30%]">
            <span data-row-a="" className="block whitespace-nowrap">
              {repeat(MOTION_STILL.rowA)}
            </span>
          </p>

          {/* The still */}
          <div data-still-frame="" className="absolute inset-0 z-10 overflow-hidden">
            <div data-still-img="" className="absolute inset-0">
              <Image
                src={cropSrc(still.src, 0.625)}
                alt={still.alt}
                fill
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: still.pos }}
              />
            </div>
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(11_11_11/0.55))]" />
          </div>

          {/* Row B: in front, outlined */}
          <p aria-hidden className="still-row still-row-outline absolute inset-x-0 top-[56%] z-20 md:top-[52%]">
            <span data-row-b="" className="block whitespace-nowrap">
              {repeat(MOTION_STILL.rowB)}
            </span>
          </p>

          <div data-still-meta="" className="container-wide absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-6 pb-[max(22px,var(--sab))] text-cream">
            <p className="t-small max-w-[22rem] text-cream/85">{MOTION_STILL.caption}</p>
            <p className="t-timecode hidden text-cream/70 sm:block sm:pr-[220px]">TC {MOTION_STILL.timecode}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
