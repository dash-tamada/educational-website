import Link from "next/link";
import { SiteShell, Icon } from "@/components/app";
import { Eyebrow } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import type { Tone } from "@/lib/landing-data";
import { LegalToc } from "./LegalToc";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Well-typeset legal page: header, a clear "placeholder copy" notice, a sticky
 * table of contents (scroll-spy) and the sections in a white reading card.
 */
export function LegalPage({
  eyebrow,
  eyebrowTone = "blue",
  title,
  intro,
  updated,
  sections,
  other,
}: {
  eyebrow: string;
  eyebrowTone?: Tone;
  title: string;
  intro: React.ReactNode;
  updated: string;
  sections: LegalSection[];
  other: { label: string; href: string };
}) {
  return (
    <SiteShell>
      <div className="container-x pb-section">
        <header className="pt-6 md:pt-10">
          <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
          <h1 className="mt-eyebrow max-w-[16ch] t-display-l">{title}</h1>
          <p className="mt-sub max-w-[40rem] t-body-l text-ink/75">{intro}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 t-small font-semibold text-ink/70">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="size-4" /> Last updated {updated}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="size-4" /> About{" "}
              {Math.max(4, Math.round(sections.length * 0.9))} min read
            </span>
          </p>
        </header>

        <div
          role="note"
          className="mt-8 flex gap-4 rounded-card-lg bg-butter p-5 md:p-6"
        >
          <span
            className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-white"
            aria-hidden
          >
            <Icon name="alert" className="size-5 text-[#8a5300]" />
          </span>
          <div>
            <p className="t-app-h3">Placeholder legal copy</p>
            <p className="mt-1 t-small text-ink/75">
              This is sample text written for the Tamada Media demo. It is not
              legal advice and isn&apos;t a binding agreement. Have a qualified
              lawyer review and replace it before launch.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:mt-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside className="min-w-0 lg:sticky lg:top-[calc(var(--header-offset)+16px)] lg:self-start">
            <LegalToc
              sections={sections.map(({ id, title }) => ({ id, title }))}
            />
            <div className="mt-4 hidden rounded-card-lg bg-white p-5 shadow-soft lg:block">
              <div className="flex items-center gap-3">
                <Mascot
                  title=""
                  className="w-10 shrink-0"
                  style={{ transform: "rotate(-6deg)" }}
                />
                <p className="t-small font-semibold">
                  Questions about this page?
                </p>
              </div>
              <Link
                href="/contact?topic=other"
                className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-blue-deep underline-offset-2 hf:underline"
              >
                Ask a human <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>
          </aside>

          <article className="legal-prose min-w-0 rounded-card-lg bg-white p-6 shadow-soft sm:p-8 md:p-12">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-h`}
                className="border-b border-ink/[0.07] pb-8 not-first:pt-8 last:border-b-0 last:pb-0"
              >
                <h2
                  id={`${s.id}-h`}
                  tabIndex={-1}
                  className="flex items-baseline gap-3 t-app-h2 outline-none"
                >
                  <span className="shrink-0 rounded-full bg-cream px-2 py-1 t-micro text-ink/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <div className="mt-4 grid max-w-[68ch] gap-4 text-[16px] leading-[1.65] text-ink/80 [&_a]:font-semibold [&_a]:text-blue-deep [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-2 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:text-ink [&_li]:pl-1 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-2 [&_ol]:pl-5 [&_strong]:font-bold [&_strong]:text-ink [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:marker:text-hotpink">
                  {s.body}
                </div>
              </section>
            ))}
            <p className="mt-10 rounded-tag bg-cream px-4 py-3 t-small text-ink/65">
              Looking for the other one? Read our{" "}
              <Link
                href={other.href}
                className="font-bold text-blue-deep underline underline-offset-2"
              >
                {other.label}
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </SiteShell>
  );
}
