import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/app";
import { ArrowLink, Eyebrow } from "@/components/editorial";
import { CertificateLookup } from "@/components/auth/CertificateView";
import { CertificateSheet } from "@/components/auth/CertificateSheet";
import { getCertificateByCode } from "@/lib/mock";
import { FLAGSHIP } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: `Check a Tamada Media ${FLAGSHIP.certificateTitle} certificate code against our records. Every certificate is issued automatically when a learner finishes the course.`,
};

const SAMPLE_CODES = ["TM-7QK4-M2XD", "TM-3HNP-8RVA"];

const STEPS = [
  { title: "Find the code", body: "It's printed top right on every certificate and looks like TM-7QK4-M2XD." },
  { title: "Enter it above", body: "Dashes and capitals are optional. We tidy it up for you." },
  { title: "See the record", body: "Learner, course, director's signature and issue date, straight from our records." },
];

const EARNED = [
  "Watch at least 90% of every lesson in the course",
  "Pass every required checkpoint (the ones that unlock the next lesson)",
  "Finish the 60-second capstone film",
  "That's it. The certificate is issued automatically, with a unique code",
];

/* =============================================================================
   /certificates: the verification desk (dark theatre, like the record pages).
   The lookup + two sample codes on the left, a sample certificate on the
   right, then how checking works and how a certificate is earned, ruled.
   ============================================================================= */
export default function CertificatesIndexPage() {
  const sample = getCertificateByCode(SAMPLE_CODES[0]);
  return (
    <SiteShell flush headerLight>
      <div className="theatre relative isolate pt-[calc(var(--header-offset)+var(--sat)+28px)] pb-section md:pt-[calc(var(--header-offset)+var(--sat)+48px)]">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Eyebrow index="09" className="text-cream">
              Certificate check
            </Eyebrow>
            <p className="t-timecode text-ash">Verification desk</p>
          </div>

          <div className="edit-grid mt-12 items-center gap-y-14 md:mt-16">
            <div className="col-span-12 lg:col-span-5">
              <h1 className="t-headline-xl max-w-[9ch]">Verify a certificate.</h1>
              <p className="t-body-l mt-6 max-w-[32rem] text-cream/80">
                Hiring someone, or proud of a friend? Every {FLAGSHIP.certificateTitle} certificate has a unique code. Enter it and we&apos;ll
                check it against our records.
              </p>
              <div className="mt-10 max-w-[30rem]">
                <CertificateLookup label="Certificate code" size="lg" />
              </div>
              <div className="mt-8 max-w-[30rem]">
                <p className="t-label text-ash">Try a sample</p>
                <ul className="mt-3 border-t border-line">
                  {SAMPLE_CODES.map((c) => (
                    <li key={c} className="border-b border-line">
                      <Link href={`/certificates/${c}`} className="group flex min-h-12 items-center justify-between gap-4 py-2 font-mono text-[14px] tracking-[0.06em] transition-colors hf:text-red-lite">
                        {c}
                        <span className="t-label text-ash transition-colors group-hf:text-red-lite">Verify →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {sample && (
              <figure className="col-span-12 lg:col-span-7 lg:col-start-6">
                <div className="pointer-events-none" aria-hidden>
                  <CertificateSheet
                    data={{
                      code: sample.certificate.code,
                      learner: sample.user.name,
                      course: sample.course.title,
                      tutor: sample.tutor?.name ?? FLAGSHIP.director,
                      issuedAt: sample.certificate.issuedAt,
                      hours: sample.certificate.hours,
                    }}
                  />
                </div>
                <figcaption className="t-timecode mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 text-ash">
                  <span>Sample · {sample.certificate.code}</span>
                  <span>The code lives top right</span>
                </figcaption>
              </figure>
            )}
          </div>

          {/* how checking works */}
          <section aria-labelledby="cert-how" className="mt-24 md:mt-32">
            <Eyebrow as="h2" className="text-cream">
              <span id="cert-how">How checking works</span>
            </Eyebrow>
            <ol className="mt-8 grid border-t border-line md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-b border-line py-6 md:border-b-0 md:py-8 md:pr-10 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-8">
                  <span className="t-timecode text-ash" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="t-small mt-2 max-w-[30ch] text-cream/75">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* how a certificate is earned */}
          <section aria-labelledby="cert-earned" className="edit-grid mt-20 gap-y-10 md:mt-28">
            <div className="col-span-12 lg:col-span-6">
              <Eyebrow as="h2" className="text-cream">
                <span id="cert-earned">How a certificate is earned</span>
              </Eyebrow>
              <ul className="mt-8 border-t border-line">
                {EARNED.map((t) => (
                  <li key={t} className="flex gap-3 border-b border-line py-3.5 text-[15px] leading-snug">
                    <span aria-hidden className="mt-[7px] size-[6px] shrink-0 bg-red" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="t-small mt-6 max-w-[48ch] text-ash">
                Nobody at Tamada hand-issues or sells certificates. If a code doesn&apos;t verify here, it isn&apos;t one of ours.
              </p>
            </div>
            <div className="col-span-12 flex flex-col justify-end lg:col-span-4 lg:col-start-9">
              <p className="t-small max-w-[30ch] text-cream/75">Got a certificate of your own? Share links and PDF downloads live in your student space.</p>
              <div className="mt-5">
                <ArrowLink href="/dashboard/certificates" size="lg">
                  My certificates
                </ArrowLink>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
