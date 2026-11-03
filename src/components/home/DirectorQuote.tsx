import { DIRECTOR_BLOCK } from "@/lib/content/home";
import { ArrowLink, Eyebrow, ParallaxPhoto, RedWords, SplitReveal } from "@/components/editorial";

/* =============================================================================
   07 DIRECTOR (Marlowe screenshot 4). Cream.
   A huge condensed quote with one red word, its second sentence stepped in to
   the right, the attribution under it; then an editorial photo layout: one large
   set photo, one small black-and-white detail, and the bio as a small caption
   bottom-left with "Meet your director →". Server component.
   ============================================================================= */
export function DirectorQuote() {
  const b = DIRECTOR_BLOCK;
  return (
    <section aria-labelledby="director-title" className="ground-cream relative overflow-hidden">
      <div className="container-wide pt-section pb-section">
        <Eyebrow index="07" as="h2">
          <span id="director-title">{b.label}</span>
        </Eyebrow>

        <figure className="mt-[clamp(40px,6vw,88px)]">
          <blockquote className="director-quote font-display uppercase">
            <SplitReveal as="p" className="lg:ml-[25%] lg:max-w-[52%]">
              &ldquo;{b.quoteA}
            </SplitReveal>
            <SplitReveal as="p" delay={0.15} className="mt-[0.12em] ml-[12%] lg:ml-[46%] lg:max-w-[42%]">
              <RedWords text={b.quoteB} red={[b.red]} />
              &rdquo;
            </SplitReveal>
          </blockquote>
          <figcaption className="mt-6 ml-[12%] text-[15px] font-semibold tracking-[-0.01em] lg:ml-[46%]">&mdash; {b.by}</figcaption>
        </figure>

        <div className="edit-grid mt-[clamp(48px,6vw,96px)] items-start gap-y-8">
          <div className="col-span-12 self-end max-lg:order-3 sm:col-span-8 lg:col-span-3">
            <p className="t-small max-w-[22rem]">{b.bio}</p>
            <div className="mt-5">
              <ArrowLink href={b.cta.href}>{b.cta.label}</ArrowLink>
            </div>
          </div>
          <ParallaxPhoto
            k={b.large}
            sizes="(min-width: 1024px) 50vw, 100vw"
            amount={8}
            className="col-span-12 aspect-[4/3] lg:col-span-6 lg:col-start-4"
          />
          <ParallaxPhoto
            k={b.small}
            sizes="(min-width: 1024px) 24vw, 50vw"
            amount={10}
            imgClassName="grayscale contrast-[1.08]"
            className="col-span-7 aspect-[4/3] sm:col-span-5 lg:col-span-3 lg:col-start-10"
          />
        </div>
      </div>
    </section>
  );
}
