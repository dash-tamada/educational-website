import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { SiteShell, Icon } from "@/components/app";
import { Eyebrow, HandNote, HighlightBox } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { ContactForm } from "@/components/auth/ContactForm";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";
import { CONTACT_CHANNELS, CONTACT_QUICK } from "@/lib/mock/extra/auth";
import { toneBg, toneText } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Learner support, tutor support, partnerships or press: send Tamada Media a message and a human replies within one to three working days.",
};

export default async function ContactPage({
  searchParams,
}: PageProps<"/contact">) {
  const sp = await searchParams;
  const topic = typeof sp.topic === "string" ? sp.topic : undefined;
  const ref = typeof sp.ref === "string" ? sp.ref : undefined;
  return (
    <SiteShell>
      {/* phones: heading -> form -> email teams -> quick answers (the form is why you came);
          from 640px the original order: heading, the four team cards, then form + aside */}
      <div className="container-x pb-section max-sm:flex max-sm:flex-col">
        {/* heading */}
        <header className="relative grid gap-8 pt-6 md:pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-[46rem]">
            <div data-reveal="pop">
              <Eyebrow>Contact</Eyebrow>
            </div>
            <h1 className="mt-eyebrow t-display-l">
              <span data-reveal="lines" className="block">
                Say hi.
              </span>
              <span data-reveal="scale" className="inline-block">
                <HighlightBox tone="sun" rotate={-2}>
                  We&apos;re around.
                </HighlightBox>
              </span>
            </h1>
            <p
              data-reveal="rise"
              data-reveal-delay="0.15"
              className="mt-sub max-w-[36rem] t-body-l text-ink/75"
            >
              A stuck lesson, a tutor idea, a partnership, or a very specific
              question? Send it over.
            </p>
            <p className="mt-3 text-[15px] font-semibold text-ink/70 sm:hidden">
              Rather email?{" "}
              <a
                href="#email-teams"
                className="font-bold text-ink underline decoration-blue decoration-2 underline-offset-4"
              >
                Pick a team below
              </a>
            </p>
          </div>
          <div className="hidden items-end gap-4 lg:flex" aria-hidden>
            <HandNote className="mb-16 max-w-[11rem]" rotate={-6} write={false}>
              real humans, mon to sat, 10am to 7pm IST
            </HandNote>
            <div className="w-[130px]">
              <div className="group">
                <Mascot
                  interactive
                  title=""
                  className="w-full"
                  style={{ transform: "rotate(6deg)" }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* channels: colour cards from 640px; on phones compact colour rows where the
            whole row opens the mail app */}
        <section
          id="email-teams"
          aria-labelledby="email-teams-title"
          className="mt-head scroll-mt-24 max-sm:order-2 max-sm:mt-12"
        >
          <h2
            id="email-teams-title"
            className="t-app-h2 sm:sr-only"
          >
            Or email the right team
          </h2>
          <ul
            data-reveal-stagger
            className="grid gap-4 max-sm:mt-4 max-sm:gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {CONTACT_CHANNELS.map((c) => (
              <li
                key={c.title}
                className={clsx(
                  "relative flex flex-col rounded-card-lg p-5 max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-3.5 max-sm:rounded-card max-sm:py-4 max-sm:pr-4 max-sm:pl-4 md:p-6",
                  toneBg[c.tone],
                  toneText[c.tone],
                )}
              >
                <span
                  className="grid size-11 place-items-center rounded-full bg-white max-sm:row-span-3"
                  aria-hidden
                >
                  <Icon name={c.icon} className="size-5" />
                </span>
                <h3 className="mt-5 t-app-h2 max-sm:col-start-2 max-sm:mt-0 max-sm:t-app-h3">
                  {c.title}
                </h3>
                <p className="mt-1.5 flex-1 t-small text-ink/75 max-sm:hidden">
                  {c.body}
                </p>
                {/* phones: the whole row is the mailto target (stretched link) */}
                <a
                  href={`mailto:${c.email}`}
                  className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-white px-3 py-2 text-[14px] font-bold [overflow-wrap:anywhere] transition-colors hf:bg-ink hf:text-cream max-sm:col-start-2 max-sm:mt-0.5 max-sm:bg-transparent max-sm:p-0 max-sm:underline max-sm:decoration-ink/30 max-sm:underline-offset-2 max-sm:after:absolute max-sm:after:inset-0 max-sm:after:rounded-card max-sm:after:content-['']"
                >
                  <Icon name="mail" className="size-4 shrink-0 max-sm:hidden" />{" "}
                  {c.email}
                </a>
                <p className="mt-3 t-micro text-ink/75 max-sm:col-start-2 max-sm:mt-0.5">
                  {c.reply}
                </p>
                <span
                  className="hidden size-9 place-items-center rounded-full bg-white/70 max-sm:col-start-3 max-sm:row-span-3 max-sm:row-start-1 max-sm:grid"
                  aria-hidden
                >
                  <Icon name="mail" className="size-4" strokeWidth={2.2} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* form + side */}
        <div className="mt-12 grid gap-6 max-sm:contents lg:mt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
          <div
            id="message"
            className="grid min-w-0 scroll-mt-24 content-start max-sm:order-1 max-sm:mt-head"
          >
            <DemoSessionSeed value={await getDemoCookieValue()}>
              <ContactForm initialTopic={topic} initialReference={ref} />
            </DemoSessionSeed>
          </div>

          <aside
            className="grid content-start gap-4 max-sm:order-3 max-sm:mt-6"
            aria-label="Before you write"
          >
            <div className="rounded-card-lg bg-white p-6 shadow-soft md:p-8">
              <h2 className="t-app-h2">Quick answers</h2>
              <dl className="mt-4 grid gap-4">
                {CONTACT_QUICK.map((q) => (
                  <div key={q.q}>
                    <dt className="text-[15px] font-bold">{q.q}</dt>
                    <dd className="mt-1 t-small text-ink/70">{q.a}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/#faq"
                className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-blue-deep underline-offset-2 coarse:mt-3 coarse:min-h-11 hf:underline"
              >
                All FAQs <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>
            <div
              className="rounded-card-lg bg-purple p-6 text-white md:p-8"
              data-field="dark"
            >
              <h2 className="t-app-h2">The studio</h2>
              <address className="mt-3 t-small text-white/85 not-italic">
                Tamada Media (sample address)
                <br />
                3rd floor, 8-2-293 Road No. 36
                <br />
                Jubilee Hills, Hyderabad 500033
              </address>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-[14px]">
                <div>
                  <dt className="t-micro text-white/60 uppercase">
                    Support hours
                  </dt>
                  <dd className="mt-1 font-bold">
                    Mon to Sat, 10am to 7pm IST
                  </dd>
                </div>
                <div>
                  <dt className="t-micro text-white/60 uppercase">
                    Typical reply
                  </dt>
                  <dd className="mt-1 font-bold">
                    1 to 3 working days, by topic
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[13px] text-white/65">
                Demo: addresses and emails on this page are placeholders.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
