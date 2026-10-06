import type { Metadata } from "next";
import Image from "next/image";
import clsx from "clsx";
import { SiteShell, Icon } from "@/components/app";
import {
  ArrowButton,
  BlobSet,
  Eyebrow,
  HandNote,
  HighlightBox,
  SectionHead,
  Sticker,
} from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { ScallopEdge } from "@/components/decor/Scallop";
import { Parallax } from "@/components/motion/Parallax";
import { TutorApplication } from "@/components/auth/TutorApplication";
import { Accordion } from "@/components/auth/Accordion";
import {
  TUTOR_BENEFITS,
  TUTOR_FAQ,
  TUTOR_PROCESS,
} from "@/lib/mock/extra/auth";
import { tutorPhotos, toneBg, toneText } from "@/lib/landing-data";
import { formatINR } from "@/lib/mock";
import { cropSrc } from "@/lib/img";

export const metadata: Metadata = {
  title: "Become a tutor",
  description:
    "Turn what you know into a video course. Apply to teach on Tamada Media, keep 70% of every sale and get reviewed by a real human.",
};

/** Example maths for the sidebar: GST-inclusive price -> tutor share. */
function exampleEarnings(price: number, sales: number) {
  const exGst = price / 1.18;
  const afterFees = exGst * 0.98;
  return Math.round((afterFees * 0.7 * sales) / 100) * 100;
}

/** "What reviewers look for" + example maths, beside the form (desktop) or after it (phones). */
function ApplyAside() {
  return (
    <div className="grid gap-4 lg:mt-8">
      <div className="rounded-card-lg bg-white p-6 shadow-soft">
        <h3 className="t-app-h3">What reviewers look for</h3>
        <ul className="mt-4 grid gap-3">
          {[
            "A practical skill you've actually used, not just read about",
            "A sample where you explain something clearly",
            "A first course with a clear promise and 3 to 6 modules",
            "Original content you own the rights to",
          ].map((t) => (
            <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
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
      </div>
      <div className="rounded-card-lg bg-blue p-6 text-white" data-field="dark">
        <p className="t-micro text-white uppercase">
          Example maths, not a promise
        </p>
        <p className="mt-2 t-display-m">
          {formatINR(exampleEarnings(1499, 100))}
        </p>
        <p className="mt-2 t-small text-white">
          a month to you from 100 sales of a {formatINR(1499)} course, after
          GST, payment fees and our 30%.
        </p>
      </div>
    </div>
  );
}

const PHOTO_ALT = [
  "A tutor recording a lesson at her desk",
  "A tutor smiling during a video class",
  "A tutor explaining a lesson on camera",
];

export default function BecomeTutorPage() {
  return (
    <SiteShell flush headerLight>
      {/* ================================================================= hero */}
      <section
        aria-labelledby="bt-title"
        data-field="dark"
        className="field overflow-clip bg-green text-white"
      >
        <BlobSet tone="green" />
        <Parallax
          y={40}
          className="pointer-events-none absolute top-[18%] right-[4%] -z-10 hidden lg:block"
        >
          <Cloud size="m" delay={-5} />
        </Parallax>
        <Parallax
          y={24}
          className="pointer-events-none absolute top-[46%] left-[2.5%] -z-10 hidden 2xl:block"
        >
          <Cloud size="s" delay={-11} />
        </Parallax>

        <div className="relative container-x grid items-center gap-12 pt-[calc(var(--header-offset)+48px)] pb-[calc(var(--section-y)*0.6+24px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-[calc(var(--header-offset)+72px)]">
          <div className="flex flex-col items-start">
            <div data-reveal="pop">
              <Eyebrow tone="white">For big brains</Eyebrow>
            </div>
            <h1 id="bt-title" className="mt-eyebrow t-display-xxl text-mint">
              <span data-reveal="lines" className="block">
                Turn your thing into
              </span>
              <span data-reveal="scale" className="inline-block">
                <HighlightBox tone="lime" rotate={-3}>
                  a course.
                </HighlightBox>
              </span>
            </h1>
            <p
              data-reveal="rise"
              data-reveal-delay="0.15"
              className="mt-sub max-w-[34rem] t-body-l text-white/90"
            >
              You know the shortcut, the weird detail, or the lesson you wish
              someone had taught you. Package it into short videos people can
              actually finish.
            </p>
            <div
              data-reveal="rise"
              data-reveal-delay="0.25"
              className="mt-cta flex flex-wrap items-center gap-3"
            >
              <ArrowButton href="#apply" variant="paper" bubble>
                Apply to teach
              </ArrowButton>
              <a
                href="#process"
                className="tap inline-flex h-12 items-center gap-2 rounded-full bg-forest px-5 text-[16px] font-bold text-white shadow-soft transition-colors md:h-[52px] md:px-6 hf:bg-ink"
              >
                How it works
                <Icon name="arrow-down" className="size-4" strokeWidth={2.6} />
              </a>
            </div>
            <ul data-reveal-stagger className="mt-10 flex flex-wrap gap-2">
              {[
                "Keep 70% of every sale",
                "Your first video is the free trailer",
                "Reviewed by a human in 5 days",
              ].map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 t-tag text-forest shadow-soft"
                >
                  <Icon name="check" className="size-3.5" strokeWidth={3} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* scene: three tutor photos, Tami and a buddy */}
          <div
            className="relative mx-auto aspect-[6/5] w-full max-w-[520px]"
            aria-hidden
          >
            {[
              { left: "4%", top: "6%", w: "44%", tilt: -6 },
              { left: "46%", top: "0%", w: "42%", tilt: 5 },
              { left: "26%", top: "40%", w: "40%", tilt: -2 },
            ].map((p, i) => (
              <div
                key={i}
                data-reveal="card"
                className="absolute"
                style={{ left: p.left, top: p.top, width: p.w }}
              >
                <div
                  className="relative aspect-[4/5] overflow-hidden rounded-card bg-white p-2 shadow-photo"
                  style={{ transform: `rotate(${p.tilt}deg)` }}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-img">
                    <Image
                      src={cropSrc(tutorPhotos[i], 1.25)}
                      alt={PHOTO_ALT[i]}
                      fill
                      sizes="(min-width: 1024px) 230px, 40vw"
                      className="object-cover"
                      preload={i === 0}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Parallax
              y={40}
              rotate={[-4, 4]}
              className="absolute right-[2%] bottom-[2%] w-[26%]"
            >
              <div className="group">
                <Mascot interactive title="" className="w-full" />
              </div>
            </Parallax>
            <div className="absolute bottom-[4%] left-[6%] w-[12%]">
              <BlockBuddy
                body="#3b308f"
                head="#ffcf3f"
                hat="#ff008c"
                wave
                className="w-full"
              />
            </div>
            <div
              className="absolute top-[52%] right-[-2%] hidden sm:block"
              data-reveal="pop"
            >
              <Sticker tone="sun" size="sm" rotate={8}>
                you, but on video
              </Sticker>
            </div>
          </div>
        </div>
        <ScallopEdge placement="inside-bottom" />
      </section>

      {/* ================================================================= benefits */}
      <section aria-labelledby="bt-why" className="section-y">
        <div className="container-x">
          <SectionHead
            id="bt-why"
            eyebrow="Why teach here"
            kind="chunky"
            title="Your niche deserves a home."
            body="Short videos, tiny tests and real data. We handle hosting, payments, refunds and certificates, you handle the good bit."
          />
          <ul
            data-reveal-stagger
            className="mt-head grid gap-4 md:grid-cols-3 md:gap-5"
          >
            {TUTOR_BENEFITS.map((b, i) => (
              <li
                key={b.title}
                className={clsx(
                  "hover-lift flex flex-col rounded-card-lg p-6 md:p-8",
                  toneBg[b.tone],
                  toneText[b.tone],
                )}
              >
                <span
                  className="grid size-12 place-items-center rounded-full bg-white"
                  aria-hidden
                >
                  <Icon name={b.icon} className="size-6" />
                </span>
                <p className="mt-8 t-micro text-ink/70">0{i + 1}</p>
                <h3 className="mt-2 t-chunky-card">{b.title}</h3>
                <p className="mt-3 t-body text-ink/75">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================================================================= process */}
      <section
        id="process"
        aria-labelledby="bt-process"
        className="panel bg-sun panel-y"
      >
        <BlobSet tone="sun" flip />
        <div className="relative container-x">
          <SectionHead
            id="bt-process"
            eyebrow="The process"
            kind="display"
            title="From idea to income."
            body="Four steps, no gatekeeping. Most tutors publish their first course within a month."
          />
          <ol
            data-reveal-stagger
            className="mt-head grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {TUTOR_PROCESS.map((s, i) => (
              <li
                key={s.title}
                className="relative flex flex-col rounded-card-lg bg-white p-6 shadow-soft"
              >
                <span className="t-display-m text-blue" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 t-app-h2">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 t-small text-ink/70">{s.body}</p>
                <p className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-butter px-2.5 py-1.5 t-micro text-ink/75">
                  <Icon name="clock" className="size-3.5" /> {s.when}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================= apply */}
      <section id="apply" aria-labelledby="bt-apply" className="section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="lg:sticky lg:top-[calc(var(--header-offset)+16px)] lg:self-start">
            <SectionHead
              id="bt-apply"
              eyebrow="Apply"
              kind="chunky"
              align="left"
              title="Send us your idea."
              body="Takes about ten minutes. Your draft saves as you type, so you can come back to it."
              titleClassName="max-w-[12ch]"
            />
            <div className="hidden lg:block">
              <ApplyAside />
            </div>
            <HandNote
              className="mt-8 hidden max-w-[16rem] lg:block"
              rotate={-5}
            >
              psst: we&apos;d rather ask for changes than say no
            </HandNote>
          </div>
          <div className="min-w-0">
            <TutorApplication />
          </div>
          {/* phones / tablets: the helpers follow the form, so the form (or its status) is what you see first */}
          <div className="lg:hidden">
            <ApplyAside />
          </div>
        </div>
      </section>

      {/* ================================================================= FAQ */}
      <section aria-labelledby="bt-faq" className="panel bg-cyan panel-y">
        <BlobSet tone="cyan" />
        <div className="relative container-x grid gap-head lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="relative flex flex-col items-start">
            <SectionHead
              id="bt-faq"
              eyebrow="Tutor FAQ"
              kind="chunky"
              align="left"
              title="Before you apply"
              titleClassName="max-w-[9ch]"
            />
            <div className="pointer-events-none hidden lg:mt-12 lg:block lg:w-[140px]">
              <Mascot
                title=""
                className="w-full"
                style={{ transform: "rotate(8deg)" }}
              />
            </div>
          </div>
          <div className="panel-content shadow-soft max-md:px-4 max-md:py-2 md:px-10 md:py-6">
            <Accordion items={TUTOR_FAQ} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
