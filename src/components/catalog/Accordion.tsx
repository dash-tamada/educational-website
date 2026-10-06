"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/** Simple FAQ accordion in a white card (one open at a time). */
export function Accordion({ items, defaultOpen = 0, className }: { items: { q: string; a: React.ReactNode }[]; defaultOpen?: number | null; className?: string }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const uid = useId();
  return (
    <ul className={clsx("rounded-card-lg bg-white px-5 shadow-soft md:px-7", className)}>
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `${uid}-a${i}`;
        return (
          <li key={f.q} className="border-b border-ink/[0.08] last:border-b-0">
            <h3>
              <button
                type="button"
                id={`${id}-btn`}
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left md:py-5"
              >
                <span className="text-[16px] leading-snug font-bold tracking-[-0.015em] md:text-[17px]">{f.q}</span>
                <span
                  aria-hidden
                  className={clsx(
                    "grid size-8 shrink-0 place-items-center rounded-full transition-[rotate,background-color,color] duration-300 ease-ui",
                    isOpen ? "rotate-45 bg-hotpink text-white" : "bg-bubblegum text-ink group-hf:rotate-90",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div id={id} role="region" aria-labelledby={`${id}-btn`} inert={!isOpen} className={clsx("grid transition-[grid-template-rows,opacity] duration-500 ease-expo", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <p className="t-body max-w-[40rem] pb-5 text-ink/75">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
