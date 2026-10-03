"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Mascot } from "@/components/decor/Mascot";

const KEY = "tm-intro-seen";

/** Runs `cb` once the intro curtain has finished (or immediately if it was skipped). */
export function onIntroDone(cb: () => void) {
  if (document.documentElement.dataset.intro === "done") {
    cb();
    return () => {};
  }
  window.addEventListener("intro:done", cb, { once: true });
  return () => window.removeEventListener("intro:done", cb);
}

// Runs before hydration so returning visitors never see a flash of the curtain.
const preScript = `try{if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="done"}}catch(e){}`;

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden>
      <g fill="#f7f5ef">
        <circle cx="60" cy="70" r="40" />
        <circle cx="100" cy="50" r="45" />
        <circle cx="145" cy="72" r="38" />
        <circle cx="40" cy="95" r="25" />
        <circle cx="165" cy="98" r="22" />
        <rect x="40" y="80" width="130" height="40" />
      </g>
    </svg>
  );
}

export function IntroCurtain() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const finish = () => {
        document.documentElement.dataset.intro = "done";
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
        el.style.display = "none";
        // Dispatch outside this GSAP context so listeners' selectors aren't scoped to the curtain.
        requestAnimationFrame(() =>
          window.dispatchEvent(new Event("intro:done")),
        );
      };
      if (document.documentElement.dataset.intro === "done") {
        el.style.display = "none";
        return;
      }
      gsap
        .timeline({ onComplete: finish })
        .from(".intro-logo", {
          scale: 0,
          rotate: -40,
          duration: 0.7,
          ease: "elastic.out(1.1,0.55)",
        })
        .from(
          ".intro-word",
          { yPercent: 110, duration: 0.45, ease: "expo.out", stagger: 0.06 },
          "-=0.35",
        )
        .to(
          ".intro-cloud-l",
          { xPercent: -60, duration: 0.8, ease: "power2.in" },
          "+=0.15",
        )
        .to(
          ".intro-cloud-r",
          { xPercent: 60, duration: 0.8, ease: "power2.in" },
          "<",
        )
        .to(
          el,
          { yPercent: -100, duration: 0.75, ease: "expo.inOut" },
          "<0.15",
        );
    },
    { scope: root },
  );

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: preScript }} />
      <div
        ref={root}
        className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-maroon [[data-intro=done]_&]:hidden"
        aria-hidden
      >
        <Cloud className="intro-cloud-r absolute -top-6 -right-10 w-56 md:w-80" />
        <Cloud className="intro-cloud-l absolute -bottom-6 -left-12 w-56 rotate-180 md:w-80" />
        <div className="flex items-center gap-3">
          <Mascot className="intro-logo size-16 md:size-20" title="" />
          <div className="overflow-hidden font-display text-2xl leading-[1.05] text-paper uppercase md:text-4xl">
            <span className="intro-word block">Tamada</span>
            <span className="intro-word block text-lime">Media</span>
          </div>
        </div>
      </div>
    </>
  );
}
