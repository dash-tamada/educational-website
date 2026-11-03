import { JOURNAL } from "@/lib/content/journal";
import { FLAGSHIP } from "@/lib/content/site";
import { inr } from "@/lib/content/home";
import { ArrowLink, Button, Eyebrow, Photo, RedWords } from "@/components/editorial";

/* =============================================================================
   Journal course CTA. A compact ink band: course poster, the line "Every note here
   is a lesson, unabridged.", the facts, price and the two CTAs. Used under the
   feed and inside every article. Server component.
   ============================================================================= */
export function CourseCta({ className }: { className?: string }) {
  const c = JOURNAL.cta;
  return (
    <aside aria-labelledby="course-cta-title" className={className}>
      <div className="theatre-night grid overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Photo k="course-flagship" ratio={10 / 16} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[16/10] md:aspect-auto md:h-full" />
        <div className="flex flex-col p-6 sm:p-10 lg:p-14">
          <Eyebrow>{c.label}</Eyebrow>
          <h2 id="course-cta-title" className="t-statement-l mt-6 max-w-[18ch]">
            <RedWords text={c.title} red={c.red} redClass="text-red-lite" />
          </h2>
          <p className="t-small mt-5 max-w-[30rem] text-cream/75">{c.body}</p>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="font-heading text-[clamp(2rem,1.4rem+1.6vw,3rem)] leading-none font-bold tracking-[-0.04em]">{inr(FLAGSHIP.price)}</span>
            <span className="t-small text-ash line-through">{inr(FLAGSHIP.compareAtPrice)}</span>
            <span className="t-timecode text-ash">· or 3 EMIs</span>
          </p>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Button href={c.primary.href} arrow>
              {c.primary.label}
            </Button>
            <ArrowLink href={c.secondary.href}>{c.secondary.label}</ArrowLink>
          </div>
        </div>
      </div>
    </aside>
  );
}
