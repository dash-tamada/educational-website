"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Animate direct children one after another instead of the wrapper as a whole. */
  stagger?: boolean;
  /** "pop" = elastic scale-in for stickers / cards; "rise" = slide up. */
  effect?: "rise" | "pop";
  as?: "div" | "ul";
};

export function Reveal({
  children,
  className,
  stagger,
  effect = "rise",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLDivElement & HTMLUListElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = ref.current!;
      const targets = stagger ? Array.from(el.children) : el;
      const from =
        effect === "pop"
          ? {
              scale: 0.4,
              autoAlpha: 0,
              duration: 0.9,
              ease: "elastic.out(1,0.55)",
            }
          : { y: 60, autoAlpha: 0, duration: 1, ease: "expo.out" };
      gsap.from(targets, {
        ...from,
        stagger: stagger ? 0.09 : 0,
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
