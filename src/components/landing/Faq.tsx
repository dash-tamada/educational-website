"use client";

import { useState } from "react";
import clsx from "clsx";
import { faqs } from "@/lib/landing-data";
import { Eyebrow, HandNote } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-paper py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-[1fr_1.3fr]">
        <div className="relative">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(1.8rem,4.6vw,3.4rem)] leading-[1.2] tracking-tight uppercase">
            Before
            <br />
            you ask
          </h2>
          <HandNote className="mt-6 w-56" rotate={-4}>
            still stuck? message us from the contact page and a real human
            replies
          </HandNote>
          <Mascot className="mt-8 hidden size-28 rotate-6 md:block" title="" />
        </div>

        <ul className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li
                key={f.q}
                className="rounded-2xl border-2 border-ink bg-cyan/30"
              >
                <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold md:text-lg"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {f.q}
                    <span
                      className={clsx(
                        "grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime text-xl leading-none transition-transform duration-500 ease-[var(--ease-elastic)]",
                        isOpen && "rotate-45",
                      )}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-${i}`}
                  role="region"
                  className={clsx(
                    "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[15px] leading-relaxed font-medium text-ink/75">
                      {f.a}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
