"use client";

import { useId, useState } from "react";

/**
 * FAQ accordion in the editorial language (the home FAQ's rows): hairline rules,
 * Inter Tight questions behind a thin plus that turns into a cross (.faq-plus),
 * answers open through grid rows (.faq-panel). One answer open at a time; closed
 * answers are `inert`, so they can't be tabbed into.
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
    <ul className={["border-t border-line", className].filter(Boolean).join(" ")}>
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `${uid}-a${i}`;
        return (
          <li key={f.q} className="border-b border-line">
            <h3>
              <button
                type="button"
                id={`${id}-q`}
                className="group grid w-full grid-cols-[22px_minmax(0,1fr)] items-start gap-x-4 py-5 text-left sm:gap-x-5"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span aria-hidden className="faq-plus relative mt-[0.4em] block size-4">
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                </span>
                <span className="font-heading text-[clamp(1.0625rem,0.98rem+0.4vw,1.3125rem)] leading-snug font-semibold tracking-[-0.025em] transition-colors duration-300 group-hf:text-red">
                  {f.q}
                </span>
              </button>
            </h3>
            <div id={id} role="region" aria-labelledby={`${id}-q`} inert={!isOpen} className="faq-panel" data-open={isOpen ? "" : undefined}>
              <div>
                <div className="t-body max-w-[40rem] pb-6 pl-[38px] text-muted sm:pl-[42px]">{f.a}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
