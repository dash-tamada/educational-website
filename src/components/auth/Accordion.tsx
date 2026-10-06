"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/**
 * FAQ accordion in the landing's language (blue separators, bubblegum plus
 * buttons, answers open via grid rows). Closed answers are `inert`, so they
 * can't be tabbed into.
 */
export function Accordion({
  items,
  defaultOpen = 0,
  className,
}: {
  items: { q: string; a: React.ReactNode }[];
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const uid = useId();
  return (
    <ul className={className}>
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `${uid}-a${i}`;
        return (
          <li key={f.q} className="border-b-2 border-blue/80 last:border-b-0">
            <h3>
              <button
                type="button"
                className="group tap -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-3 rounded-2xl px-3 py-5 text-left transition-[color,background-color,scale] duration-300 ease-ui md:gap-5 hf:bg-cyan/35"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="text-[17px] leading-snug font-semibold tracking-[-0.02em] md:text-[19px]">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className={clsx(
                    "grid size-9 shrink-0 place-items-center rounded-full bg-bubblegum text-ink transition-[rotate,scale,background-color] duration-300 ease-ui",
                    isOpen
                      ? "rotate-45 bg-hotpink text-white"
                      : "group-hf:scale-110 group-hf:rotate-90",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={id}
              role="region"
              inert={!isOpen}
              className={clsx(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-expo",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="max-w-[40rem] pb-6 t-body text-ink/75 md:pr-12">
                  {f.a}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
