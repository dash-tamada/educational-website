"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { faqs } from "@/lib/landing-data";
import { BlobSet, HandNote, SectionHead } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Parallax } from "@/components/motion/Parallax";

/**
 * Maxima-style FAQ: a cyan Aardvark panel with turquoise blobs; chunky heading,
 * hand note and Tami on the left; a white content panel of questions on the right
 * (2px blue separators, bubblegum plus buttons, answers open via grid rows).
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <section id="faq" aria-labelledby={`${uid}-title`} className="panel panel-y bg-cyan">
      <BlobSet tone="cyan" flip />

      <div className="container-x relative grid gap-head lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="relative flex flex-col items-start">
          <SectionHead
            eyebrow="FAQ"
            kind="chunky"
            align="left"
            title={<span id={`${uid}-title`}>Before you ask</span>}
            titleClassName="max-w-[8ch]"
          />
          <HandNote className="mt-6 max-w-[15rem] md:max-w-[17rem]" rotate={-6}>
            still stuck? message us from the contact page and a real human replies
          </HandNote>
          <Parallax
            y={60}
            rotate={[-6, 6]}
            mobile={0.2}
            className="pointer-events-none absolute right-0 bottom-[-8px] w-[76px] sm:right-[8%] md:w-[110px] lg:pointer-events-auto lg:static lg:mt-12 lg:w-[150px]"
          >
            <div className="group">
              <Mascot interactive title="" className="w-full" style={{ transform: "rotate(8deg)" }} />
            </div>
          </Parallax>
        </div>

        <div className="panel-content shadow-soft max-md:px-4 max-md:py-2 md:px-10 md:py-6 lg:px-12 lg:py-8">
          <ul>
            {faqs.map((f, i) => {
              const isOpen = open === i;
              const id = `${uid}-a${i}`;
              return (
                <li key={f.q} className="border-b-2 border-blue/80 last:border-b-0">
                  <h3>
                    <button
                      type="button"
                      className="group tap -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-3 rounded-2xl px-3 py-5 md:gap-5 text-left transition-[color,background-color,scale] duration-300 ease-ui hf:bg-cyan/35 md:py-6"
                      aria-expanded={isOpen}
                      aria-controls={id}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="text-[17px] leading-snug font-semibold tracking-[-0.02em] md:text-xl">
                        {f.q}
                      </span>
                      <span
                        aria-hidden
                        className={clsx(
                          "grid size-9 shrink-0 place-items-center md:size-10 rounded-full bg-bubblegum text-ink transition-[rotate,scale,background-color] duration-300 ease-ui",
                          isOpen
                            ? "rotate-45 bg-hotpink text-white"
                            : "group-hf:scale-110 group-hf:rotate-90",
                        )}
                      >
                        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <div
                    id={id}
                    role="region"
                    aria-hidden={!isOpen}
                    className={clsx(
                      "grid transition-[grid-template-rows,opacity] duration-[600ms] ease-expo",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="t-body max-w-[38rem] pb-6 text-ink/75 md:pr-12">{f.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
