import clsx from "clsx";
import { pricing } from "@/lib/landing-data";
import { ArrowButton, HighlightBox, SectionHead, Sparkle } from "@/components/decor/Bits";
import { ScallopBadge } from "@/components/decor/Scallop";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";

/** Bump diameter of the featured card's scalloped edge (px). */
const BUMP = 28;

/**
 * Krackerz scalloped edge for the featured plan, as pure CSS: a flame base inset by
 * half a bump plus four strips of circles. `round` repeat fits a whole number of
 * bumps on every side, so the corners always meet cleanly. The frame starts at the
 * card's top (same top as the side cards) and only spills out sideways/below.
 */
function ScallopFrame() {
  const h = BUMP / 2;
  const dot = `radial-gradient(circle closest-side, var(--color-flame) 97%, transparent 100%)`;
  const strip = (s: React.CSSProperties, repeat: string): React.CSSProperties => ({
    position: "absolute",
    backgroundImage: dot,
    backgroundSize: `${BUMP}px ${BUMP}px`,
    backgroundRepeat: repeat,
    ...s,
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -z-10"
      style={{ top: 0, left: -h, right: -h, bottom: -h }}
    >
      <div className="absolute bg-flame" style={{ inset: h, borderRadius: h }} />
      <div style={strip({ top: 0, left: h, right: h, height: BUMP }, "round no-repeat")} />
      <div style={strip({ bottom: 0, left: h, right: h, height: BUMP }, "round no-repeat")} />
      <div style={strip({ left: 0, top: h, bottom: h, width: BUMP }, "no-repeat round")} />
      <div style={strip({ right: 0, top: h, bottom: h, width: BUMP }, "no-repeat round")} />
    </div>
  );
}

function Check({ featured }: { featured?: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid size-6 shrink-0 place-items-center rounded-full",
        featured ? "bg-sun text-ink" : "bg-cyan text-ink",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none">
        <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Perks({ perks, featured, className }: { perks: string[]; featured?: boolean; className?: string }) {
  return (
    <ul
      className={clsx(
        "grid gap-3 text-[15px] font-medium",
        featured ? "md:max-lg:grid-cols-2 md:max-lg:gap-x-8" : "",
        className,
      )}
    >
      {perks.map((perk) => (
        <li key={perk} className="flex items-center gap-3">
          <Check featured={featured} />
          <span>{perk}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Three top-aligned, equal-width plans on the cream canvas. Side cards are white
 * (radius 32, soft shadow, lift on hover); the featured plan is a flame scalloped
 * card with butter text and a sun "Popular" scallop badge that spins on hover.
 * Every card has the same row structure so names, prices and buttons line up.
 * md: featured spans both columns on top; lg: 1-2-3 with the featured in the middle.
 * Phones: the featured plan first and in full; the two side plans keep name, price
 * and CTA, with their perks behind a native "What's included" disclosure.
 */
export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="section-y relative overflow-x-clip">
      <div className="container-x relative">
        <SectionHead
          eyebrow="Pricing"
          title={
            <span id="pricing-title">
              Simple, fair &amp;{" "}
              <br />
              <HighlightBox tone="blue" rotate={-3}>
                no subs
              </HighlightBox>
            </span>
          }
          body="Pay once per course and keep it. No monthly fees, no surprise renewals."
        />

        {/* decor drifts beside the heading, outside the text column */}
        <Parallax y={70} rotate={10} className="pointer-events-none absolute top-[4%] left-[calc(50%-17rem)] hidden w-10 md:block lg:left-[calc(50%-24rem)] lg:w-12">
          <Sparkle fill="#ff008c" />
        </Parallax>
        <Parallax y={90} rotate={-8} className="pointer-events-none absolute top-[38%] right-[calc(50%-17rem)] hidden w-7 md:block lg:right-[calc(50%-23rem)] lg:w-9">
          <Sparkle fill="#2668fd" />
        </Parallax>

        <Reveal
          as="ul"
          stagger
          effect="card"
          className="mt-head grid items-stretch gap-x-6 gap-y-6 sm:gap-y-10 md:grid-cols-2 md:gap-y-12 lg:grid-cols-3 lg:gap-x-9"
        >
          {pricing.map((p) => {
            const f = !!p.featured;
            return (
              <li
                key={p.name}
                className={clsx(
                  "group relative isolate flex flex-col rounded-[2rem] px-6 pt-9 md:px-8",
                  f ? "pb-8" : "pb-3 sm:pb-8",
                  f
                    ? "order-first mx-[14px] mb-4 text-butter sm:mb-0 transition-[translate] duration-[350ms] ease-spring hf:-translate-y-2 md:col-span-2 lg:order-none lg:col-span-1 lg:mx-0"
                    : "hover-lift bg-white text-ink shadow-soft",
                )}
              >
                {f && <ScallopFrame />}
                {f && (
                  <Parallax
                    rotate={[-8, 8]}
                    y={14}
                    className="absolute -top-7 right-3 z-10 w-[84px] md:-top-8 md:right-5 md:w-[96px]"
                  >
                    <ScallopBadge
                      fill="#ffcf3f"
                      bumps={12}
                      className="aspect-square w-full text-ink transition-[rotate] duration-[450ms] ease-spring group-hf:rotate-[20deg]"
                      style={{ transform: "rotate(12deg)" }}
                    >
                      <span className="grid h-full place-items-center text-center font-display text-[17px] leading-[0.95] uppercase md:text-[19px]">
                        Most
                        <br />
                        popular
                      </span>
                    </ScallopBadge>
                  </Parallax>
                )}

                <h3 className="t-eyebrow text-[15px] md:text-base">{p.name}</h3>
                <p className={clsx("mt-2 text-[15px] font-medium", f ? "text-butter/80" : "text-ink/60")}>
                  {p.note}
                </p>

                <p className="mt-6 flex items-baseline gap-2 whitespace-nowrap">
                  <span className="t-display-m leading-none">{p.price}</span>
                  <span className={clsx("font-display text-xl uppercase md:text-2xl", f ? "text-butter/80" : "text-ink/55")}>
                    {p.per}
                  </span>
                </p>

                <ArrowButton
                  href={p.href}
                  variant={f ? "paper" : "ink"}
                  fullWidth
                  className="mt-7"
                >
                  {p.cta}
                </ArrowButton>

                {f ? (
                  <Perks perks={p.perks} featured className="mt-7 border-t-2 border-butter/25 pt-6" />
                ) : (
                  <>
                    <Perks perks={p.perks} className="mt-7 border-t-2 border-ink/8 pt-6 max-sm:hidden" />
                    {/* phones: perks fold away (native, no JS); 48px summary row */}
                    <details className="group/inc mt-5 border-t-2 border-ink/8 sm:hidden">
                      <summary className="tap flex h-12 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                        What&apos;s included
                        <span
                          aria-hidden
                          className="grid size-8 place-items-center rounded-full bg-cyan text-ink transition-[rotate] duration-300 ease-ui group-open/inc:rotate-45"
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                          </svg>
                        </span>
                      </summary>
                      <Perks perks={p.perks} className="pt-1 pb-5" />
                    </details>
                  </>
                )}
              </li>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
