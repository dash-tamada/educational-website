import { CONTACT, STUDIO } from "@/lib/content/contact";
import { Eyebrow, LiveClock, ParallaxPhoto } from "@/components/editorial";

/* =============================================================================
   CONTACT DETAILS (Mobius "photo + white card"). Cream.
   A wide set photo with a paper card over its right half: email, socials, where the
   studio is, the live local time (LiveClock inline), hours and reply time.
   Map-free on purpose. Phones: the card sits under the photo, overlapping its foot.
   Server component (the clock is a client island).
   ============================================================================= */
export function ContactDetails() {
  const s = STUDIO;
  return (
    <section aria-labelledby="studio-title" className="ground-cream relative">
      <div className="container-wide pb-section">
        <div className="relative">
          <ParallaxPhoto k={s.image} sizes="(min-width: 1792px) 1760px, 100vw" amount={7} className="aspect-[4/3] sm:aspect-[16/10] xl:aspect-[16/8]" />
          <div
            data-reveal="rise"
            className="relative mx-3 -mt-16 border border-line bg-paper p-6 sm:mx-6 sm:-mt-24 sm:p-10 lg:mx-auto lg:max-w-[720px] xl:absolute xl:mx-0 xl:top-[7%] xl:right-[6%] xl:mt-0 xl:w-[min(40%,560px)] xl:p-12"
          >
            <Eyebrow index="02" as="h2">
              <span id="studio-title">{s.label}</span>
            </Eyebrow>
            <dl className="mt-8 grid gap-7 sm:grid-cols-2 sm:gap-x-8">
              <div className="sm:col-span-2">
                <dt className="t-label text-muted">Email</dt>
                <dd className="mt-2">
                  <a href={`mailto:${CONTACT.email}`} className="link-draw font-heading text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)] leading-tight font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]">
                    {CONTACT.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="t-label text-muted">Studio</dt>
                <dd className="mt-2 font-heading text-[clamp(1.25rem,1rem+0.7vw,1.625rem)] leading-tight font-semibold tracking-[-0.03em]">
                  {s.city}
                  <span className="t-small mt-1 block font-sans font-normal tracking-normal text-muted">Remote-first, cohorts online</span>
                </dd>
              </div>
              <div>
                <dt className="t-label text-muted">Local time</dt>
                <dd className="mt-3">
                  <LiveClock inline className="text-fg" />
                </dd>
              </div>
              <div>
                <dt className="t-label text-muted">Hours</dt>
                <dd className="t-small mt-2">{s.hours}</dd>
              </div>
              <div>
                <dt className="t-label text-muted">Replies</dt>
                <dd className="t-small mt-2">{s.reply}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="t-label text-muted">Follow</dt>
                <dd className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {s.socials.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-draw font-heading text-[clamp(1.25rem,1rem+0.7vw,1.625rem)] font-semibold tracking-[-0.03em]"
                    >
                      {l.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <p className="t-timecode mt-4 max-w-[34rem] text-muted xl:mt-5">{s.caption}</p>
      </div>
    </section>
  );
}
