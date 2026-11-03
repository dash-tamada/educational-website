import { ABOUT, TEAM } from "@/lib/content/team";
import { Eyebrow, Photo, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 05 THE CREW (Mobius team cards). Cream-2.
   Square portraits with the name + role set over the photo (Mobius); on hover the
   photo eases in, the shade deepens and what they teach + a one-line bio fade up
   at the top of the card (opacity / translate only). Touch screens have no hover:
   the bio sits under the card instead (one copy per pointer type, the other is
   display:none, so it is never read twice). Server component.
   ============================================================================= */
export function AboutTeam() {
  const t = ABOUT.team;
  return (
    <section aria-labelledby="team-title" className="ground-cream-2 relative">
      <div className="container-wide py-section">
        <div className="edit-grid gap-y-8">
          <div className="col-span-12 lg:col-span-3">
            <Eyebrow index="05">{t.label}</Eyebrow>
          </div>
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <SplitReveal as="h2" id="team-title" className="t-headline-xl max-w-[14ch]">
              {t.title}
            </SplitReveal>
            <p data-reveal="rise" className="t-small mt-6 max-w-[30rem] text-muted">
              {t.note}
            </p>
          </div>
        </div>

        <ul data-reveal-stagger="rise" className="mt-[clamp(48px,7vw,104px)] grid gap-x-grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <li key={m.id} className="group">
              <article aria-labelledby={`team-${m.id}`}>
                <Photo
                  k={m.photo}
                  ratio={1}
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
                  className="aspect-square"
                  imgClassName="transition-[scale] duration-[1.1s] ease-expo group-hf:scale-[1.05]"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/80 via-ink/15 to-transparent transition-opacity duration-500" />
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-ink/55 opacity-0 transition-opacity duration-500 ease-ui group-hf:opacity-100" />
                  <span className="t-timecode absolute top-4 left-4 text-cream/80 sm:top-5 sm:left-6">({String(i + 1).padStart(2, "0")})</span>
                  <div className="absolute inset-x-0 top-12 translate-y-3 px-5 text-cream opacity-0 transition-[opacity,translate] duration-500 ease-expo coarse:hidden group-hf:translate-y-0 group-hf:opacity-100 sm:top-14 sm:px-6">
                    <p className="t-label flex items-center gap-2">
                      <span aria-hidden className="block size-[6px] bg-red" />
                      {m.focus}
                    </p>
                    <p className="t-small mt-3 max-w-[22rem] text-cream/90">{m.bio}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-6">
                    <h3 id={`team-${m.id}`} className="font-heading text-[clamp(1.5rem,1.15rem+1vw,2.125rem)] leading-[1.02] font-bold tracking-[-0.04em]">
                      {m.name}
                    </h3>
                    <p className="t-small mt-1.5 text-cream/85">
                      {m.role} · {m.city}
                    </p>
                  </div>
                </Photo>
                <div className="mt-4 hidden coarse:block">
                  <p className="t-label flex items-center gap-2">
                    <span aria-hidden className="block size-[6px] bg-red" />
                    {m.focus}
                  </p>
                  <p className="t-small mt-2 text-muted">{m.bio}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
