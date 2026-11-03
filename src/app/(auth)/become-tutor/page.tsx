import type { Metadata } from "next";
import { AuthSplit, AuthSwitch } from "@/components/auth/AuthSplit";
import { TutorApplication } from "@/components/auth/TutorApplication";
import { Accordion } from "@/components/auth/Accordion";
import { TUTOR_FAQ, TUTOR_PROCESS } from "@/lib/mock/extra/auth";
import { formatINR } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Teach with us",
  description:
    "Working filmmakers, editors and sound designers teach one part of the Tamada Media pipeline. Apply to teach; a human reviews every application.",
  // understated on purpose: reachable from the signup flow, not linked in the public nav
  robots: { index: false },
};

/** Example maths: GST-inclusive price -> the instructor's share. */
function exampleEarnings(price: number, sales: number) {
  const exGst = price / 1.18;
  const afterFees = exGst * 0.98;
  return Math.round((afterFees * 0.7 * sales) / 100) * 100;
}

const LOOK_FOR = [
  "A practical skill you've used on real work, not just read about",
  "A sample where you explain something clearly",
  "A tight lesson plan with a clear promise, 3 to 6 parts",
  "Original work you own the rights to",
];

/* =============================================================================
   /become-tutor: understated (not linked publicly). The auth split with a wide
   form column: the four-step process as a ruled index, the stepped application
   (TutorApplication), what reviewers look for + example maths, and the FAQ.
   ============================================================================= */
export default function BecomeTutorPage() {
  return (
    <AuthSplit
      scene="tutor"
      eyebrow="Teach with us"
      title="Teach one part of the pipeline."
      intro="We bring in working filmmakers, editors, colourists and sound designers to teach what they do every day. A human reviews every application."
      back={{ href: "/", label: "to site" }}
      topAction={<AuthSwitch prompt="Here to learn?" label="Free lesson" href="/learn/ai-filmmaking/af-1-1" />}
      wide
    >
      {/* the process */}
      <section aria-labelledby="bt-process">
        <div className="flex items-baseline justify-between gap-3 border-b border-fg pb-3">
          <h2 id="bt-process" className="t-label">
            How it works
          </h2>
          <a href="#apply" className="t-label link-draw text-muted transition-colors hf:text-fg">
            Skip to the form
          </a>
        </div>
        <ol>
          {TUTOR_PROCESS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-5">
              <span className="t-timecode pt-[3px] text-muted" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-[15.5px] font-semibold tracking-[-0.01em]">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="t-small mt-0.5 text-muted">{s.body}</p>
              </div>
              <p className="t-timecode col-start-2 mt-2 text-muted sm:col-start-3 sm:mt-0 sm:pt-[3px] sm:text-right">{s.when}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* the application */}
      <section id="apply" aria-labelledby="bt-apply" className="mt-16 scroll-mt-8 sm:mt-20">
        <h2 id="bt-apply" className="font-heading text-[clamp(1.75rem,1.4rem+1.3vw,2.5rem)] leading-[1] font-bold tracking-[-0.045em]">
          The application.
        </h2>
        <p className="t-small mt-3 max-w-[44ch] text-muted">About ten minutes, saved in this browser as you type. Already applied? Your status shows here.</p>
        <div className="mt-8">
          <TutorApplication />
        </div>
      </section>

      {/* what reviewers look for + the maths */}
      <section aria-labelledby="bt-look" className="mt-16 grid gap-10 sm:mt-20 sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] sm:gap-8">
        <div>
          <h2 id="bt-look" className="t-label border-b border-fg pb-3">
            What reviewers look for
          </h2>
          <ul>
            {LOOK_FOR.map((t) => (
              <li key={t} className="flex gap-3 border-b border-line py-3 text-[14.5px] leading-snug">
                <span aria-hidden className="mt-[7px] size-[6px] shrink-0 bg-red" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="theatre self-start p-6">
          <p className="t-label text-ash">Example maths, not a promise</p>
          <p className="mt-4 font-display text-[clamp(2.5rem,2rem+2vw,3.5rem)] leading-[0.9]">{formatINR(exampleEarnings(1499, 100))}</p>
          <p className="t-small mt-3 text-cream/80">
            a month to you from 100 sales at {formatINR(1499)}, after GST, payment fees and our 30%.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="bt-faq" className="mt-16 sm:mt-20">
        <h2 id="bt-faq" className="font-heading text-[clamp(1.75rem,1.4rem+1.3vw,2.5rem)] leading-[1] font-bold tracking-[-0.045em]">
          Before you apply.
        </h2>
        <Accordion items={TUTOR_FAQ} className="mt-8" />
      </section>
    </AuthSplit>
  );
}
