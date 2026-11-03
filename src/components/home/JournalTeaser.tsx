import Link from "next/link";
import { JOURNAL_TEASER, fmtDate } from "@/lib/content/journal";
import { ArrowLink, Eyebrow, Photo, SplitReveal } from "@/components/editorial";

/* =============================================================================
   11 JOURNAL TEASER (Mobius "Studio Notes"). Ink.
   Giant headline, a small note + "Read all →" on the left, three post cards
   (cover, date, title, excerpt) linking to /journal/<slug>. Phones: a swipe row.
   Server component; cards rise in through the data-reveal-stagger API.
   ============================================================================= */

export function JournalTeaser() {
  const j = JOURNAL_TEASER;
  return (
    <section aria-labelledby="journal-title" className="theatre relative">
      <div className="container-wide py-section">
        <div className="edit-grid gap-y-6">
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <Eyebrow index="11">{j.label}</Eyebrow>
            <SplitReveal as="h2" id="journal-title" className="t-headline-xl mt-6">
              {j.title}
            </SplitReveal>
          </div>
        </div>

        <div className="edit-grid mt-[clamp(40px,5vw,80px)] gap-y-10">
          <div className="col-span-12 flex flex-col justify-end lg:col-span-3">
            <p className="t-small max-w-[17rem] text-muted">{j.note}</p>
            <div className="mt-5">
              <ArrowLink href={j.cta.href} size="lg">
                {j.cta.label}
              </ArrowLink>
            </div>
          </div>
          <ul data-reveal-stagger="rise" className="h-scroller col-span-12 [--gutter:var(--edge)] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-grid sm:overflow-visible sm:px-0 lg:col-span-9 lg:grid-cols-3">
            {j.posts.map((p) => (
              <li key={p.slug} className="w-[78vw] max-w-[340px] sm:w-auto sm:max-w-none">
                <Link href={`/journal/${p.slug}`} className="hover-zoom-parent group block">
                  <Photo k={p.cover} ratio={5 / 4} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 78vw" className="aspect-[4/5]" imgClassName="hover-zoom" />
                  <p className="t-label mt-5 text-muted">
                    <time dateTime={p.date}>{fmtDate(p.date)}</time> · {p.read}
                  </p>
                  <h3 className="t-headline-m mt-3 transition-colors duration-300 group-hf:text-red-lite">{p.title}</h3>
                  <p className="t-small mt-3 text-cream/70">{p.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
