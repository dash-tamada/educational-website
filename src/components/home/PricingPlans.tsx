"use client";

import { useState } from "react";
import clsx from "clsx";
import { PRICING, inr, type Plan } from "@/lib/content/home";
import { ArrowLink, Button, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   10 PRICING (Mobius). Cream.
   Left: giant "Pricing" + the One-time / 3 EMIs toggle + body, "Let's talk →"
   at the bottom (sticky on desktop). Right: the plans stacked on hairlines:
   name, who it's for, a two-column checklist, STARTING FROM, the price (with the
   old price struck through, or the EMI per month) and the red CTA.
   ============================================================================= */

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[3px] size-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <circle cx="8" cy="8" r="7" />
      <path d="m5 8.2 2 2 4-4.2" strokeLinecap="square" />
    </svg>
  );
}

function PlanBlock({ plan, emi, first }: { plan: Plan; emi: boolean; first: boolean }) {
  return (
    <article aria-labelledby={`plan-${plan.id}`} className={clsx("py-[clamp(40px,6vw,80px)]", !first && "border-t border-line")}>
      <h3 id={`plan-${plan.id}`} className="t-headline-l">
        {plan.name}
      </h3>
      <p className="t-small mt-3 text-muted">{plan.for}</p>
      <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {plan.features.map((f) => (
          <li key={f} className="t-small flex gap-3">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <p className="t-label mt-10 text-muted">{PRICING.startingFrom}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
        <p className="font-heading text-[clamp(2.5rem,1.6rem+3vw,4.25rem)] leading-none font-bold tracking-[-0.05em]">
          {emi ? inr(plan.emi) : inr(plan.price)}
          <span className="ml-1 font-heading text-[0.62em] font-semibold tracking-[-0.04em] text-ink/20">{emi ? "/mo × 3" : "/once"}</span>
        </p>
        {emi ? (
          <p className="t-small text-muted">No-cost EMI on {inr(plan.price)}</p>
        ) : (
          <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink/50 line-through decoration-1">
            <span className="sr-only">was </span>
            {inr(plan.was)}
          </p>
        )}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button href={plan.cta.href} arrow>
          {plan.cta.label}
        </Button>
        {plan.note && <p className="t-small text-muted">{plan.note}</p>}
      </div>
    </article>
  );
}

export function PricingPlans() {
  const [emi, setEmi] = useState(false);
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="ground-cream relative">
      <div className="container-wide edit-grid pt-section pb-[calc(var(--section-y)*0.7)]">
        <div className="col-span-12 lg:col-span-5">
          <div className="flex flex-col justify-between gap-10 lg:sticky lg:top-[calc(var(--header-offset)+32px)] lg:min-h-[calc(100svh-var(--header-offset)-96px)]">
            <div>
              <Eyebrow index="10">Enroll</Eyebrow>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                <SplitReveal as="h2" id="pricing-title" className="t-headline-xl">
                  {PRICING.title}
                </SplitReveal>
                <div role="group" aria-label="Payment" className="flex border border-line-strong p-1">
                  {[
                    { on: false, label: PRICING.toggle.once },
                    { on: true, label: PRICING.toggle.emi },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={emi === o.on}
                      onClick={() => setEmi(o.on)}
                      className="t-label h-9 px-4 transition-colors duration-300 aria-pressed:bg-ink aria-pressed:text-cream"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="t-body mt-6 max-w-[26rem] text-muted">{PRICING.body}</p>
            </div>
            <div className="max-lg:hidden">
              <p className="t-small max-w-[18rem] text-muted">{PRICING.talk.note}</p>
              <div className="mt-5">
                <ArrowLink href={PRICING.talk.href} size="lg">
                  {PRICING.talk.label}
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 mt-6 lg:col-span-6 lg:col-start-7 lg:mt-0">
          {PRICING.plans.map((p, i) => (
            <PlanBlock key={p.id} plan={p} emi={emi} first={i === 0} />
          ))}
          <div className="border-t border-line pt-8 lg:hidden">
            <p className="t-small max-w-[22rem] text-muted">{PRICING.talk.note}</p>
            <div className="mt-4">
              <ArrowLink href={PRICING.talk.href} size="lg">
                {PRICING.talk.label}
              </ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
