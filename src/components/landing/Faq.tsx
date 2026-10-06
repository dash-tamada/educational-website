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
const PHONE_ROWS = 4;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  /** phones: the first PHONE_ROWS questions, then "Show all" (Aardvark mobile) */
  const [all, setAll] = useState(false);
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
                <li
                  key={f.q}
                  className={clsx(
                    "border-b-2 border-blue/80 last:border-b-0",
                    !all && i >= PHONE_ROWS && "max-md:hidden",
                    !all && i === PHONE_ROWS - 1 && "max-md:border-b-0",
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      className="group tap flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl py-5 text-left transition-[color,background-color,scale] duration-300 ease-ui hf:bg-cyan/35 md:-mx-3 md:w-[calc(100%+1.5rem)] md:gap-5 md:px-3 md:py-6"
                      aria-expanded={isOpen}
                      id={`${uid}-q${i}`}
                      aria-controls={id}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="min-w-0 text-[17px] leading-snug font-semibold tracking-[-0.02em] break-words md:text-xl">
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
          {!all && faqs.length > PHONE_ROWS && (
            <div className="border-t-2 border-blue/80 pt-4 pb-3 md:hidden">
              <button
                type="button"
                onClick={() => {
                  setAll(true);
                  // keyboard/SR: continue at the first newly shown question
                  requestAnimationFrame(() => document.getElementById(`${uid}-q${PHONE_ROWS}`)?.focus());
                }}
                className="tap flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue text-[15px] font-bold text-white"
              >
                Show all {faqs.length} questions
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
