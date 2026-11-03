import { ABOUT } from "@/lib/content/team";
import { Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 06 IN NUMBERS. Ink.
   Title on the left, four giant Anton figures in hairline columns (2 x 2 on
   phones), each with a label and a short line. Server component.
   ============================================================================= */
export function AboutNumbers() {
  const n = ABOUT.numbers;
  return (
    <section aria-labelledby="numbers-title" className="theatre relative">
      <div className="container-wide py-section">
        <div className="edit-grid items-end gap-y-6">
          <div className="col-span-12 lg:col-span-3">
            <Eyebrow index="06">{n.label}</Eyebrow>
          </div>
          <SplitReveal as="h2" id="numbers-title" className="t-headline-xl col-span-12 lg:col-span-9 lg:col-start-4">
            {n.title}
          </SplitReveal>
        </div>
        <dl data-reveal-stagger="rise" className="mt-[clamp(48px,7vw,112px)] grid grid-cols-2 gap-y-14 border-t border-line lg:grid-cols-4">
          {n.items.map((it, i) => (
            <div key={it.label} className={i % 2 ? "border-l border-line pt-6 pl-5 sm:pl-8" : i ? "pt-6 lg:border-l lg:border-line lg:pl-8" : "pt-6"}>
              <dt className="t-label text-ash">{it.label}</dt>
              <dd className="mt-5">
                <span className="block font-display text-[clamp(4rem,2rem+6vw,9rem)] leading-[0.82]">{it.value}</span>
                <span className="t-small mt-5 block max-w-[15rem] text-cream/70">{it.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
