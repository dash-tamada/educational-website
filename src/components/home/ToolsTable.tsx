import { TOOLS } from "@/lib/content/home";
import { ArrowLink, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   06 THE STACK YOU'LL MASTER (Mobius "Our Awards" table, repurposed). Night.
   Giant two-line headline + note + link on the left (sticky on desktop); on the
   right a hairline table: tool · what you use it for · module. Rows highlight on
   hover (a red rule draws in, the tool name nudges right). Server component;
   rows reveal through the data-reveal-stagger API.
   ============================================================================= */
export function ToolsTable() {
  return (
    <section aria-labelledby="tools-title" className="theatre-night relative">
      <div className="container-wide edit-grid gap-y-12 py-section">
        <div className="col-span-12 lg:col-span-4">
          <div className="flex flex-col justify-between gap-10 lg:sticky lg:top-[calc(var(--header-offset)+32px)] lg:min-h-[60svh]">
            <div>
              <Eyebrow index="06">Toolkit</Eyebrow>
              <SplitReveal as="h2" id="tools-title" className="t-headline-xl mt-6">
                {TOOLS.titleTop}
                <br />
                {TOOLS.title}
              </SplitReveal>
            </div>
            <div>
              <p className="t-small max-w-[19rem] text-muted">{TOOLS.note}</p>
              <div className="mt-5">
                <ArrowLink href={TOOLS.cta.href} size="lg">
                  {TOOLS.cta.label}
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          <table className="tools-table w-full border-collapse text-left">
            <caption className="sr-only">The AI filmmaking tools taught in the course, what each is used for, and the module that teaches it</caption>
            <thead>
              <tr className="border-b border-line-strong">
                {TOOLS.head.map((h, i) => (
                  <th key={h} scope="col" className={i === 2 ? "t-label py-4 text-right text-muted" : i === 1 ? "t-label py-4 text-muted max-sm:hidden" : "t-label py-4 text-muted"}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody data-reveal-stagger="fade">
              {TOOLS.rows.map((r) => (
                <tr key={r.tool} className="tools-row group border-b border-line">
                  <th scope="row" className="py-5 pr-4 align-top font-normal sm:py-6">
                    <span className="tools-name block font-heading text-[clamp(1.25rem,1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">
                      {r.tool}
                    </span>
                    <span className="t-small mt-1 block text-muted sm:hidden">{r.use}</span>
                  </th>
                  <td className="t-small py-5 pr-4 align-top text-cream/75 max-sm:hidden sm:py-6 sm:pt-[1.85rem]">{r.use}</td>
                  <td className="t-timecode py-5 text-right align-top whitespace-nowrap text-ash sm:py-6 sm:pt-[1.9rem]">M{r.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
