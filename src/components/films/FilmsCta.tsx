import { FILM_TOOLS, FILMS, FILMS_PAGE, averageRuntime } from "@/lib/content/films";
import { ArrowLink, Button, Eyebrow, RedWords, SplitReveal } from "@/components/editorial";

/* =============================================================================
   /films closing band (cream): "Every film here started as one logline." + the
   course CTAs, and four numbers about the showcase in Anton (the last one is the
   punchline: cameras used, zero). Server component.
   ============================================================================= */
export function FilmsCta() {
  const c = FILMS_PAGE.cta;
  const stats = [
    { value: String(FILMS.length), label: "Films on this page" },
    { value: averageRuntime(), label: "Average runtime" },
    { value: String(FILM_TOOLS.length), label: "Tools across the stack" },
    { value: "0", label: "Cameras used" },
  ];
  return (
    <section aria-labelledby="films-cta-title" className="ground-cream relative">
      <div className="container-wide py-section">
        <div className="edit-grid gap-y-10">
          <div className="col-span-12 lg:col-span-3">
            <Eyebrow>{c.label}</Eyebrow>
          </div>
          <div className="col-span-12 lg:col-span-8 lg:col-start-4">
            <SplitReveal as="h2" id="films-cta-title" className="t-statement-xl max-w-[16ch]">
              <RedWords text={c.title} red={c.red} />
            </SplitReveal>
            <p data-reveal="rise" className="t-body-l mt-8 max-w-[36rem] text-muted">
              {c.body}
            </p>
            <div data-reveal="rise" data-reveal-delay="0.08" className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <Button href={c.primary.href} size="lg" arrow>
                {c.primary.label}
              </Button>
              <ArrowLink href={c.secondary.href} size="lg">
                {c.secondary.label}
              </ArrowLink>
            </div>
          </div>
        </div>

        <dl data-reveal-stagger="rise" className="mt-[clamp(64px,9vw,140px)] grid grid-cols-2 gap-y-10 border-t border-line lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={i % 2 === 1 ? "border-l border-line pt-6 pl-5 sm:pl-8" : i === 2 ? "pt-6 lg:border-l lg:border-line lg:pl-8" : "pt-6"}>
              <dt className="t-label text-muted">{s.label}</dt>
              <dd className="mt-4 font-display text-[clamp(3.5rem,2rem+5vw,7.5rem)] leading-[0.85]">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="t-caption mt-10 max-w-[34rem]">{FILMS_PAGE.sample}</p>
      </div>
    </section>
  );
}
