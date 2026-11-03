import clsx from "clsx";
import { SiteShell } from "@/components/app";
import { ArrowLink, Eyebrow } from "@/components/editorial";
import { LegalToc } from "./LegalToc";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/* =============================================================================
   LEGAL ARTICLE (Mobius long-form). Cream.
   Header on the editorial grid: the eyebrow in the label column, then a mono
   "Last updated" line, a giant Inter Tight title and the intro at a reading
   measure. Below a hairline: a sticky ruled, numbered table of contents on the
   left (LegalToc: scroll-spy; a Contents bar + sheet below lg) and the body on
   the right: a placeholder-copy notice, then numbered sections (§ 01) with
   Inter Tight titles and 17px / 1.7 body text, lists on red square markers.
   Closes with a big text-arrow to the other policy.
   ============================================================================= */

/** Long-form body type for the section bodies (lists, links, h3, code). */
const BODY = clsx(
  "grid max-w-[58ch] gap-5 text-[16px] leading-[1.7] text-fg/80 md:text-[17px]",
  "[&_strong]:font-semibold [&_strong]:text-fg",
  "[&_a]:text-fg [&_a]:underline [&_a]:decoration-ink/30 [&_a]:decoration-1 [&_a]:underline-offset-[3px] [&_a]:transition-colors [&_a:hover]:decoration-red",
  "[&_h3]:t-label [&_h3]:mt-3 [&_h3]:text-fg",
  "[&_ul]:grid [&_ul]:gap-2.5 [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:top-[0.72em] [&_ul>li]:before:left-0.5 [&_ul>li]:before:size-[6px] [&_ul>li]:before:bg-red [&_ul>li]:before:content-['']",
  "[&_ol]:grid [&_ol]:list-[decimal-leading-zero] [&_ol]:gap-2.5 [&_ol]:pl-9 [&_ol>li]:pl-1 [&_ol>li]:marker:font-mono [&_ol>li]:marker:text-[13px] [&_ol>li]:marker:text-muted",
  "[&_code]:bg-cream-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[14px]",
);

export function LegalPage({
  index,
  eyebrow,
  title,
  intro,
  updated,
  sections,
  other,
}: {
  /** running number in the eyebrow, e.g. "01" */
  index?: string;
  eyebrow: string;
  /** legacy (v1 tone names): ignored */
  eyebrowTone?: string;
  title: string;
  intro: React.ReactNode;
  updated: string;
  sections: LegalSection[];
  other: { label: string; href: string };
}) {
  const minutes = Math.max(4, Math.round(sections.length * 0.9));
  return (
    <SiteShell>
      <div className="ground-cream">
        <header className="container-wide edit-grid gap-y-6 pt-6 pb-14 md:pt-14 md:pb-20 lg:pb-24">
          <div className="col-span-12 lg:col-span-3">
            <Eyebrow index={index}>{eyebrow}</Eyebrow>
          </div>
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <p className="t-timecode flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span>Last updated {updated}</span>
              <span aria-hidden>·</span>
              <span>{minutes} min read</span>
            </p>
            <h1 className="t-headline-xl mt-6 max-w-[13ch] text-balance md:mt-8">{title}</h1>
            <p className="t-body-l mt-8 max-w-[38rem] text-muted md:mt-10">{intro}</p>
          </div>
        </header>

        <div className="container-wide edit-grid gap-y-10 pb-section">
          <aside className="col-span-12 border-t border-fg pt-3 lg:col-span-3 lg:border-t-0 lg:pt-0">
            <div className="lg:sticky lg:top-[calc(var(--header-offset)+24px)]">
              <LegalToc sections={sections.map(({ id, title }) => ({ id, title }))} />
              <div className="mt-10 max-lg:hidden">
                <p className="t-small text-muted">Questions about this page?</p>
                <div className="mt-3">
                  <ArrowLink href="/contact?topic=other">Ask a human</ArrowLink>
                </div>
              </div>
            </div>
          </aside>

          <article className="col-span-12 min-w-0 lg:col-span-8 lg:col-start-5 xl:col-span-7 xl:col-start-5">
            <div role="note" className="flex gap-4 border-y border-line py-5">
              <span aria-hidden className="mt-[5px] size-[7px] shrink-0 bg-red" />
              <div>
                <p className="t-label">Placeholder legal copy</p>
                <p className="t-small mt-2 max-w-[56ch] text-muted">
                  Sample text written for the Tamada Media demo. It is not legal advice and isn&apos;t a binding agreement. Have a qualified lawyer
                  review and replace it before launch.
                </p>
              </div>
            </div>

            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-h`}
                className="scroll-mt-[calc(var(--header-offset)+24px)] border-b border-line py-12 last-of-type:border-b-0 md:grid md:grid-cols-[5.5rem_minmax(0,1fr)] md:py-16"
              >
                <p className="t-timecode pt-2 text-muted" aria-hidden>
                  § {String(i + 1).padStart(2, "0")}
                </p>
                <div className="min-w-0">
                  <h2 id={`${s.id}-h`} tabIndex={-1} className="t-headline-m mt-3 outline-none md:mt-0">
                    {s.title}
                  </h2>
                  <div className={clsx(BODY, "mt-5 md:mt-6")}>{s.body}</div>
                </div>
              </section>
            ))}

            <div className="mt-8 flex flex-col gap-4 border-t border-fg pt-6 sm:flex-row sm:items-end sm:justify-between md:mt-12">
              <p className="t-small text-muted">Looking for the other one?</p>
              <ArrowLink href={other.href} size="xl">
                {other.label}
              </ArrowLink>
            </div>
          </article>
        </div>
      </div>
    </SiteShell>
  );
}
