import { DIRECTOR } from "@/lib/content/director";
import { ABOUT } from "@/lib/content/team";
import { ArrowLink, Eyebrow, ParallaxPhoto, RedWords, SplitReveal } from "@/components/editorial";

/* =============================================================================
   ABOUT 03 THE DIRECTOR (Marlowe). Night.
   Portrait (black and white, drifting) left; ARJUN / RAO in giant Anton right with
   the role, bio and three facts. Then the Marlowe quote: huge condensed caps, the
   second sentence stepped in, one red word. Then the credits as a hairline table
   (year · title · kind · role / note); rows nudge on hover (.tools-row hooks).
   Server component.
   ============================================================================= */

/** Splits a quote after its first sentence: Marlowe sets the turn on its own indented line. */
function splitQuote(text: string): [string, string] {
  const m = /^(.+?[.!?])\s+(.+)$/.exec(text);
  return m ? [m[1], m[2]] : [text, ""];
}

export function AboutDirector() {
  const d = DIRECTOR;
  const a = ABOUT.director;
  const [qa, qb] = splitQuote(a.quote.text);
  return (
    <section aria-labelledby="director-name" className="theatre-night relative overflow-hidden">
      <div className="container-wide py-section">
        <Eyebrow index="03">{a.label}</Eyebrow>

        <div className="edit-grid mt-[clamp(40px,6vw,88px)] gap-y-12">
          <ParallaxPhoto
            k={d.portraitAlt}
            sizes="(min-width: 1024px) 40vw, 100vw"
            amount={7}
            className="col-span-12 aspect-[4/5] sm:col-span-8 lg:col-span-5"
            imgClassName="grayscale contrast-[1.06]"
          />
          <div className="col-span-12 flex flex-col lg:col-span-6 lg:col-start-7">
            <SplitReveal as="h2" id="director-name" className="font-display text-[clamp(4.5rem,2rem+8vw,11rem)] leading-[0.82] uppercase">
              {d.firstName}
              <br />
              <span className="text-red">{d.lastName}</span>
            </SplitReveal>
            <p data-reveal="fade" className="t-label mt-6 text-ash">
              {d.role} · {d.city}
            </p>
            <div data-reveal="rise" className="mt-8 mb-12 grid max-w-[34rem] gap-4">
              {d.bio.map((p) => (
                <p key={p.slice(0, 24)} className="t-body text-cream/80">
                  {p}
                </p>
              ))}
            </div>
            <dl data-reveal-stagger="rise" className="mt-12 grid grid-cols-3 border-t border-line lg:mt-auto">
              {d.facts.map((f, i) => (
                <div key={f.label} className={i ? "border-l border-line pt-5 pl-4 sm:pl-6" : "pt-5"}>
                  <dt className="t-label text-ash">{f.label}</dt>
                  <dd className="mt-3 font-display text-[clamp(2.5rem,1.6rem+2.6vw,4.5rem)] leading-[0.85]">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* The quote */}
        <figure className="mt-[clamp(96px,12vw,200px)]">
          <blockquote className="director-quote font-display uppercase">
            <SplitReveal as="p" className="lg:ml-[25%] lg:max-w-[56%]">
              &ldquo;{qa}
            </SplitReveal>
            {qb && (
              <SplitReveal as="p" delay={0.15} className="mt-[0.12em] ml-[10%] lg:ml-[42%] lg:max-w-[50%]">
                <RedWords text={qb} red={a.quote.red ? [a.quote.red] : []} />
                &rdquo;
              </SplitReveal>
            )}
          </blockquote>
          <figcaption className="mt-6 ml-[10%] flex flex-col gap-1 lg:ml-[42%]">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">&mdash; {d.name}</span>
            {a.quote.context && <span className="t-timecode text-ash">{a.quote.context}</span>}
          </figcaption>
        </figure>

        {/* Credits */}
        <div className="edit-grid mt-[clamp(96px,12vw,200px)] gap-y-10">
          <div className="col-span-12 lg:col-span-3">
            <h3 className="t-headline-m">{a.creditsTitle}</h3>
            <p className="t-small mt-4 max-w-[16rem] text-ash">{a.creditsNote}</p>
            <div className="mt-8 max-lg:hidden">
              <ArrowLink href={a.cta.href}>{a.cta.label}</ArrowLink>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Selected credits of {d.name}: year, title, kind of work and role</caption>
              <thead>
                <tr className="border-b border-line-strong">
                  <th scope="col" className="t-label w-[18%] py-4 text-ash sm:w-[12%]">
                    Year
                  </th>
                  <th scope="col" className="t-label py-4 text-ash">
                    Title
                  </th>
                  <th scope="col" className="t-label py-4 text-ash max-md:hidden">
                    Kind
                  </th>
                  <th scope="col" className="t-label py-4 text-right text-ash max-sm:hidden">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody data-reveal-stagger="fade">
                {d.credits.map((c) => (
                  <tr key={c.title} className="tools-row border-b border-line">
                    <td className="t-timecode py-5 pr-4 align-top text-ash sm:py-6 sm:pt-[1.7rem]">{c.year}</td>
                    <th scope="row" className="py-5 pr-4 align-top font-normal sm:py-6">
                      <span className="tools-name block font-heading text-[clamp(1.25rem,1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">
                        {c.title}
                      </span>
                      {c.note && <span className="t-small mt-1 block text-ash">{c.note}</span>}
                      <span className="t-small mt-1 block text-cream/70 md:hidden">
                        {c.kind}
                        <span className="sm:hidden"> · {c.role}</span>
                      </span>
                    </th>
                    <td className="t-small py-5 pr-4 align-top text-cream/75 max-md:hidden sm:py-6 sm:pt-[1.75rem]">{c.kind}</td>
                    <td className="t-small py-5 text-right align-top text-cream/75 max-sm:hidden sm:py-6 sm:pt-[1.75rem]">{c.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-8 lg:hidden">
              <ArrowLink href={a.cta.href}>{a.cta.label}</ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
