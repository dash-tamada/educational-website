"use client";

import { useId, useState } from "react";
import { ABOUT } from "@/lib/content/team";
import { ArrowLink, Button, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 07 WORK WITH US (Mobius "Careers": big rows behind plus icons). Cream.
   Giant title, then four expandable rows (workshops, commissions, mentoring, press)
   in large Inter Tight; each opens a short paragraph and a link into the contact
   form with that topic preselected. One open at a time. FAQ hooks (.faq-plus /
   .faq-panel) from the design system.
   ============================================================================= */
export function AboutWork() {
  const w = ABOUT.work;
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <section aria-labelledby="work-title" className="ground-cream relative">
      <div className="container-wide py-section">
        <div className="edit-grid gap-y-8">
          <div className="col-span-12 lg:col-span-3">
            <Eyebrow index="07">{w.label}</Eyebrow>
            <p className="t-small mt-6 max-w-[16rem] text-muted">{w.note}</p>
          </div>
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <SplitReveal as="h2" id="work-title" className="font-heading text-[clamp(3.25rem,1.2rem+7vw,9rem)] leading-[0.9] font-bold tracking-[-0.055em]">
              {w.title}
            </SplitReveal>

            <ul className="mt-[clamp(40px,5vw,72px)] border-t border-line">
              {w.rows.map((r, i) => {
                const isOpen = open === i;
                const id = `${base}-${i}`;
                return (
                  <li key={r.title} className="border-b border-line">
                    <h3>
                      <button
                        type="button"
                        id={`${id}-q`}
                        aria-expanded={isOpen}
                        aria-controls={`${id}-a`}
                        onClick={() => setOpen(isOpen ? null : i)}
                        className="group grid w-full grid-cols-[28px_1fr] items-start gap-x-4 py-6 text-left sm:grid-cols-[44px_1fr] sm:gap-x-6 md:py-8"
                      >
                        <span aria-hidden className="faq-plus relative mt-[0.5em] block size-[18px] sm:size-[24px]">
                          <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                          <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                        </span>
                        <span className="font-heading text-[clamp(1.625rem,1.1rem+1.9vw,3rem)] leading-[1.04] font-semibold tracking-[-0.04em] transition-colors duration-300 group-hf:text-red">
                          {r.title}
                        </span>
                      </button>
                    </h3>
                    <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="faq-panel" data-open={isOpen ? "" : undefined} inert={!isOpen}>
                      <div>
                        <div className="flex flex-col gap-5 pb-8 pl-[44px] sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:pl-[68px]">
                          <p className="t-body max-w-[34rem] text-muted">{r.body}</p>
                          <ArrowLink href={r.cta.href} className="shrink-0">
                            {r.cta.label}
                          </ArrowLink>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:pl-[68px]">
              <p className="t-small text-muted">{w.still}</p>
              <Button href={w.stillCta.href} variant="ink" arrow>
                {w.stillCta.label}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
