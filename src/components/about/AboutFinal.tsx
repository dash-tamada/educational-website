import { ABOUT } from "@/lib/content/team";
import { Button, ParallaxPhoto, RedWords, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 08 FINAL BAND (Marlowe). Ink over a dim projector-beam photo: a two-line
   Anton statement with one red word, a line of copy and the two CTAs. A hairline
   separates it from the (also ink) footer. Server component.
   ============================================================================= */
export function AboutFinal() {
  const f = ABOUT.final;
  return (
    <section aria-labelledby="final-title" className="theatre relative isolate overflow-hidden border-b border-line">
      <ParallaxPhoto k={f.image} alt="" sizes="100vw" amount={10} className="absolute! inset-0 -z-10" imgClassName="opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/55 to-ink/70" />
      <div className="container-wide flex min-h-[86svh] flex-col justify-end pt-section pb-[clamp(56px,9vw,128px)]">
        <h2 id="final-title" className="font-display text-[clamp(3.5rem,1.4rem+8.4vw,12rem)] leading-[0.84] uppercase">
          <SplitReveal as="span" className="block">
            {f.lineA}
          </SplitReveal>
          <SplitReveal as="span" delay={0.12} className="block lg:ml-[25%]">
            <RedWords text={f.lineB} red={f.red} />
          </SplitReveal>
        </h2>
        <div className="mt-10 flex flex-col gap-8 lg:ml-[25%] lg:flex-row lg:items-end lg:justify-between">
          <p data-reveal="rise" className="t-body-l max-w-[28rem] text-cream/85">
            {f.body}
          </p>
          <div data-reveal="rise" data-reveal-delay="0.08" className="flex flex-wrap gap-3">
            <Button href={f.primary.href} size="lg" arrow>
              {f.primary.label}
            </Button>
            <Button href={f.secondary.href} variant="outline" size="lg">
              {f.secondary.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
