import { ABOUT } from "@/lib/content/team";
import { ArrowLink, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 04 APPROACH (Mobius "Our Principles"). Cream.
   Left (sticky on desktop): the small title on top, a note + "See the curriculum →"
   at the bottom. Right: three big Inter Tight statements, each behind a huge ghost
   index (01/ 02/ 03/) in the left gutter, with its name in tiny caps and a short
   paragraph. Server component.
   ============================================================================= */
export function AboutApproach() {
  const a = ABOUT.approach;
  return (
    <section aria-labelledby="approach-title" className="ground-cream relative border-t border-line">
      <div className="container-wide edit-grid gap-y-14 py-section">
        <div className="col-span-12 lg:col-span-4">
          <div className="flex flex-col justify-between gap-10 lg:sticky lg:top-[calc(var(--header-offset)+32px)] lg:min-h-[64svh]">
            <div>
              <Eyebrow index="04">{a.label}</Eyebrow>
              <h2 id="approach-title" className="t-headline-m mt-6">
                {a.title}
              </h2>
            </div>
            <div>
              <p className="t-small max-w-[18rem] text-muted">{a.note}</p>
              <div className="mt-5">
                <ArrowLink href={a.cta.href} size="lg">
                  {a.cta.label}
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        <ol className="col-span-12 grid gap-[clamp(72px,10vw,160px)] lg:col-span-8 lg:col-start-5">
          {a.items.map((it, i) => (
            <li key={it.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[clamp(16px,2.4vw,40px)]">
              <span aria-hidden className="font-heading text-[clamp(2.75rem,1.6rem+3.6vw,6rem)] leading-[0.9] font-bold tracking-[-0.05em] text-ink/[0.09] select-none">
                {String(i + 1).padStart(2, "0")}/
              </span>
              <div>
                <h3 className="t-label flex items-center gap-3">
                  <span aria-hidden className="block size-[7px] bg-red" />
                  {it.title}
                </h3>
                <SplitReveal as="p" className="t-statement-xl mt-5">
                  {it.statement}
                </SplitReveal>
                <p data-reveal="rise" className="t-body mt-6 max-w-[34rem] text-muted">
                  {it.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
