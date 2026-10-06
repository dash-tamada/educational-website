import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { SiteShell, Icon, DemoPill } from "@/components/app";
import { Eyebrow, HandNote, HighlightBox } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { CertificateLookup } from "@/components/auth/CertificateView";
import { CertificateSheet } from "@/components/auth/CertificateSheet";
import { getCertificateByCode } from "@/lib/mock";
import { toneBg, toneText, type Tone } from "@/lib/landing-data";
import type { IconName } from "@/components/app/icons";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description:
    "Check a Tamada Media certificate code against our records. Every certificate is issued automatically when a learner finishes every lesson and test.",
};

const SAMPLE_CODES = ["TM-7QK4-M2XD", "TM-3HNP-8RVA"];

const STEPS: { title: string; body: string; icon: IconName; tone: Tone }[] = [
  {
    title: "Find the code",
    body: "It's printed top right on every certificate and looks like TM-7QK4-M2XD.",
    icon: "search",
    tone: "sun",
  },
  {
    title: "Pop it in above",
    body: "Dashes and capitals are optional. We tidy it up for you.",
    icon: "edit",
    tone: "cyan",
  },
  {
    title: "See the record",
    body: "Learner, course, tutor and issue date, straight from our records.",
    icon: "check-circle",
    tone: "mint",
  },
];

const EARNED: string[] = [
  "Watch at least 90% of every video in the course",
  "Pass every required test (the ones that unlock the next lesson)",
  "That's it. The certificate is issued automatically, with a unique code",
];

/** Landing for /certificates: lookup form, a sample sheet and how verification works. */
export default function CertificatesIndexPage() {
  const sample = getCertificateByCode(SAMPLE_CODES[0]);
  return (
    <SiteShell>
      <div className="container-x pb-section">
        {/* heading + lookup */}
        <div className="grid gap-10 pt-6 md:pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14">
          <div className="flex flex-col items-start">
            <Eyebrow tone="purple">Certificate check</Eyebrow>
            <h1 className="mt-eyebrow t-display-l">
              Verify a{" "}
              <HighlightBox tone="sun" rotate={-2}>
                certificate.
              </HighlightBox>
            </h1>
            <p className="mt-sub max-w-[32rem] t-body-l text-ink/75">
              Hiring someone, or proud of a friend? Every Tamada Media
              certificate has a unique code. Pop it in and we&apos;ll check it
              against our records.
            </p>
            <div className="mt-cta w-full max-w-[30rem] rounded-card-lg bg-white p-5 shadow-soft md:p-6">
              <CertificateLookup compact label="Certificate code" size="lg" />
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/[0.07] pt-4">
                <span className="text-[13px] font-bold text-ink/70">
                  Try a sample:
                </span>
                {SAMPLE_CODES.map((c) => (
                  <Link
                    key={c}
                    href={`/certificates/${c}`}
                    className="tap inline-flex items-center rounded-full bg-cream px-3 py-1.5 font-mono text-[13px] font-bold transition-colors coarse:min-h-11 coarse:px-4 hf:bg-ink hf:text-cream"
                  >
                    {c}
                  </Link>
                ))}
                <DemoPill className="ml-auto" />
              </div>
            </div>
          </div>

          {sample && (
            <div className="relative">
              <div
                className="pointer-events-none"
                aria-hidden
                style={{ transform: "rotate(1.5deg)" }}
              >
                <CertificateSheet
                  data={{
                    code: sample.certificate.code,
                    learner: sample.user.name,
                    course: sample.course.title,
                    tutor: sample.tutor?.name ?? "the Tamada team",
                    issuedAt: sample.certificate.issuedAt,
                    hours: sample.certificate.hours,
                  }}
                />
              </div>
              <span className="absolute -top-3 left-4 rounded-full bg-ink px-3 py-1.5 t-tag text-cream shadow-soft">
                Sample certificate
              </span>
              <div
                className="absolute -top-12 right-6 hidden md:block"
                aria-hidden
              >
                <HandNote rotate={-3} write={false}>
                  the code lives here ↘
                </HandNote>
              </div>
            </div>
          )}
        </div>

        {/* how it works */}
        <section aria-labelledby="cert-how" className="mt-20 md:mt-28">
          <h2 id="cert-how" className="t-chunky-card">
            How checking works
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={clsx(
                  "flex flex-col rounded-card-lg p-6",
                  toneBg[s.tone],
                  toneText[s.tone],
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-11 place-items-center rounded-full bg-white"
                    aria-hidden
                  >
                    <Icon name={s.icon} className="size-5" />
                  </span>
                  {/* decorative step number drawn as ::before content, so it is not read as low-contrast text */}
                  <span
                    className="t-display-m opacity-30 before:content-[attr(data-n)]"
                    data-n={`0${i + 1}`}
                    aria-hidden
                  />
                </div>
                <h3 className="mt-6 t-app-h2">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-1.5 t-small text-ink/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* how earned */}
        <section
          aria-labelledby="cert-earned"
          className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <div className="rounded-card-lg bg-white p-6 shadow-soft md:p-8">
            <h2 id="cert-earned" className="t-app-h2">
              How a certificate is earned
            </h2>
            <ul className="mt-5 grid gap-3">
              {EARNED.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-snug">
                  <span
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint text-forest"
                    aria-hidden
                  >
                    <Icon name="check" className="size-3" strokeWidth={3.2} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-tag bg-cream px-4 py-3 t-small text-ink/70">
              Nobody at Tamada hand-issues or sells certificates. If a code
              doesn&apos;t verify here, it isn&apos;t one of ours.
            </p>
          </div>
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-card-lg bg-purple p-6 text-white md:p-8"
            data-field="dark"
          >
            <div>
              <h2 className="t-app-h2">Got a certificate of your own?</h2>
              <p className="mt-2 max-w-[30ch] t-small text-white/85">
                Find all of yours, with share links and PDF downloads, in your
                student space.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <Link
                href="/dashboard/certificates"
                className="tap inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-bold text-ink transition-colors hf:bg-butter"
              >
                My certificates{" "}
                <Icon name="arrow-right" className="size-4" strokeWidth={2.4} />
              </Link>
              <Mascot
                title=""
                className="w-[72px] shrink-0"
                style={{ transform: "rotate(8deg)" }}
              />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
