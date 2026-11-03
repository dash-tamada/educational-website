"use client";

import { useId, useState } from "react";
import { FAQ } from "@/lib/content/home";
import { ArrowLink, Button, Eyebrow } from "@/components/editorial";

/* =============================================================================
   12 FAQ (Mobius "Questions, answered."). Cream.
   Left: the title on top, "About the director →" at the bottom. Right: big
   Inter Tight questions behind plus icons that turn into crosses; one answer
   open at a time (grid-rows transition, no height measuring). "Ask a question"
   closes the list.
   ============================================================================= */
export function FaqList() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="faq" aria-labelledby="faq-title" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-10 py-section">
        <div className="col-span-12 lg:col-span-4">
          <div className="flex flex-col justify-between gap-10 lg:sticky lg:top-[calc(var(--header-offset)+32px)] lg:min-h-[60svh]">
            <div>
              <Eyebrow index="12">FAQ</Eyebrow>
              <h2 id="faq-title" className="t-headline-m mt-6">
                {FAQ.title}
              </h2>
            </div>
            <div className="max-lg:hidden">
              <ArrowLink href={FAQ.about.href} size="lg">
                {FAQ.about.label}
              </ArrowLink>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          <ul className="border-t border-line">
            {FAQ.items.map((f, i) => {
              const isOpen = open === i;
              const id = `${base}-${i}`;
              return (
                <li key={f.q} className="border-b border-line">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${id}-a`}
                      id={`${id}-q`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group grid w-full grid-cols-[28px_1fr] items-start gap-x-4 py-6 text-left sm:grid-cols-[44px_1fr] sm:gap-x-6 md:py-8"
                    >
                      <span aria-hidden className="faq-plus relative mt-[0.45em] block size-[18px] sm:size-[22px]">
                        <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                        <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                      </span>
                      <span className="font-heading text-[clamp(1.375rem,1rem+1.5vw,2.375rem)] leading-[1.08] font-semibold tracking-[-0.035em] transition-colors duration-300 group-hf:text-red">
                        {f.q}
                      </span>
                    </button>
                  </h3>
                  <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="faq-panel" data-open={isOpen ? "" : undefined} inert={!isOpen}>
                    <div>
                      <p className="t-body max-w-[36rem] pb-8 pl-[44px] text-muted sm:pl-[68px]">{f.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:pl-[68px]">
            <p className="t-small max-w-[22rem] text-muted">{FAQ.still}</p>
            <Button href={FAQ.ask.href} variant="ink" arrow>
              {FAQ.ask.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
