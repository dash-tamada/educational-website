import type { Metadata } from "next";
import Image from "next/image";
import clsx from "clsx";
import { SiteShell, DemoPill } from "@/components/app";
import {
  ArrowButton,
  BlobSet,
  Eyebrow,
  HandNote,
  HighlightBox,
  SectionHead,
  Sparkle,
  Sticker,
} from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { ScallopEdge } from "@/components/decor/Scallop";
import { Parallax } from "@/components/motion/Parallax";
import {
  ABOUT_TEAM,
  ABOUT_TIMELINE,
  ABOUT_VALUES,
} from "@/lib/mock/extra/auth";
import { toneBg, toneText } from "@/lib/landing-data";
import { formatCompact, getCategories, getPlatformStats } from "@/lib/mock";
import { cropSrc } from "@/lib/img";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Tamada Media exists: short video lessons from real tutors, tiny tests and visible progress. One useful idea, one generous teacher, one small win at a time.",
};

const U = (id: string) => `https://images.unsplash.com/${id}`;

export default function AboutPage() {
  const stats = getPlatformStats();
  const categories = getCategories().length;
  const numbers = [
    {
      value: formatCompact(stats.totalLearners),
      label: "curious humans learning",
      tone: "sun" as const,
    },
    {
      value: String(stats.activeTutors),
      label: "tutors who've done the thing",
      tone: "cyan" as const,
    },
    {
      value: String(stats.publishedCourses),
      label: "courses live right now",
      tone: "blush" as const,
    },
    {
      value: String(categories),
      label: "rabbit holes (categories)",
      tone: "mint" as const,
    },
  ];

  return (
    <SiteShell flush headerLight>
      {/* ================================================================= hero */}
      <section
        aria-labelledby="about-title"
        data-field="dark"
        className="field overflow-clip bg-flame text-white"
      >
        <BlobSet tone="flame" />
        <Parallax
          y={40}
          className="pointer-events-none absolute top-[20%] left-[3%] -z-10 hidden md:block"
        >
          <Cloud size="m" delay={-6} />
        </Parallax>
        <Parallax
          y={60}
          className="pointer-events-none absolute top-[30%] right-[4%] -z-10 hidden sm:block"
        >
          <Cloud size="s" delay={-2} flip />
        </Parallax>

        <div className="relative container-narrow flex flex-col items-center pt-[calc(var(--header-offset)+56px)] pb-[calc(var(--section-y)*0.6)] text-center lg:pt-[calc(var(--header-offset)+88px)]">
          <div data-reveal="pop">
            <Eyebrow tone="white">Why Tamada exists</Eyebrow>
          </div>
          <h1 id="about-title" className="mt-eyebrow t-display-xxl text-butter">
            <span data-reveal="lines" className="block">
              Learning got
            </span>
            <span data-reveal="scale" className="inline-block">
              <HighlightBox tone="sun" rotate={-3}>
                too serious.
              </HighlightBox>
            </span>
          </h1>
          <p
            data-reveal="rise"
            data-reveal-delay="0.15"
            className="mt-sub max-w-[36rem] t-body-l text-ink"
          >
            Somewhere between school and the internet, learning became a
            performance. Tamada brings it back to curiosity: one useful idea,
            one generous teacher, one small win at a time.
          </p>

          <div
            className="relative mt-10 h-[150px] w-full max-w-[560px] md:mt-14 md:h-[210px]"
            aria-hidden
          >
            <div className="absolute bottom-0 left-1/2 w-[120px] -translate-x-1/2 md:w-[170px]">
              <div className="group">
                <Mascot interactive title="" className="w-full" />
              </div>
            </div>
            <div className="absolute bottom-0 left-[10%] w-[48px] md:left-[16%] md:w-[64px]">
              <BlockBuddy
                body="#2668fd"
                head="#ffcf3f"
                hat="#ff008c"
                className="w-full"
              />
            </div>
            <div className="absolute right-[10%] bottom-0 w-[44px] md:right-[16%] md:w-[58px]">
              <BlockBuddy
                body="#3b308f"
                head="#f780d4"
                wave
                className="w-full"
              />
            </div>
            <div
              className="absolute top-[4%] left-0 hidden sm:block"
              data-reveal="pop"
            >
              <Sticker tone="sun" size="sm" rotate={-8}>
                no boring bits
              </Sticker>
            </div>
            <div
              className="absolute top-[18%] right-0 hidden sm:block"
              data-reveal="pop"
            >
              <Sticker tone="white" size="sm" rotate={7}>
                learn something weird
              </Sticker>
            </div>
          </div>
        </div>
        <ScallopEdge placement="inside-bottom" />
      </section>

      {/* ================================================================= story */}
      <section aria-labelledby="about-story" className="section-y">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead
              id="about-story"
              eyebrow="Our story"
              kind="chunky"
              align="left"
              title="It started in a group chat."
              titleClassName="max-w-[12ch]"
            />
            <div
              data-reveal="rise"
              className="mt-sub grid max-w-[34rem] gap-4 t-body-l text-ink/80"
            >
              <p>
                Twelve friends, one WhatsApp group, a lot of voice notes.
                Someone taught Excel shortcuts, someone else explained mutual
                funds without the jargon, and one very patient person taught
                three of us our first guitar chords.
              </p>
              <p>
                None of it felt like school. It felt like a friend showing you
                the thing they&apos;re good at. Short, useful, a little funny.
                That&apos;s the feeling we built Tamada around.
              </p>
              <p>
                So every course here is made of bite-size videos, tiny tests
                between them, and a free first video so you can check the vibe
                before you pay a rupee.
              </p>
            </div>
          </div>
          <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
            <div data-reveal="scale" className="absolute top-0 left-0 w-[64%]">
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-card-lg shadow-photo"
                style={{ transform: "rotate(-3deg)" }}
              >
                <Image
                  src={cropSrc(U("photo-1522202176988-66273c2fd55f"), 0.75)}
                  alt="Friends learning together around a laptop"
                  fill
                  sizes="(min-width: 1024px) 360px, 60vw"
                  className="object-cover"
                  loading="eager"
                />
              </div>
            </div>
            <div
              data-reveal="scale"
              data-reveal-delay="0.1"
              className="absolute right-0 bottom-0 w-[58%]"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-card-lg shadow-photo"
                style={{ transform: "rotate(3deg)" }}
              >
                <Image
                  src={cropSrc(U("photo-1510915361894-db8b60106cb1"), 0.75)}
                  alt="Someone practising guitar chords"
                  fill
                  sizes="(min-width: 1024px) 330px, 55vw"
                  className="object-cover"
                />
              </div>
            </div>
            <HandNote
              className="absolute bottom-[6%] left-[2%] max-w-[11rem]"
              rotate={-8}
            >
              the first ever course was filmed on a phone propped on books
            </HandNote>
            <Sparkle
              className="absolute top-[42%] right-[8%] w-8"
              fill="#ff008c"
            />
          </div>
        </div>
      </section>

      {/* ================================================================= numbers */}
      <section aria-labelledby="about-numbers" className="pb-section">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="about-numbers" className="t-app-h2">
              Tamada, by the numbers
            </h2>
            <DemoPill />
          </div>
          <ul
            data-reveal-stagger
            className="mt-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
          >
            {numbers.map((n) => (
              <li
                key={n.label}
                className={clsx(
                  "rounded-card-lg p-5 md:p-7",
                  toneBg[n.tone],
                  toneText[n.tone],
                )}
              >
                <p className="t-display-l">{n.value}</p>
                <p className="mt-2 t-small font-semibold text-ink/75 md:text-[15px]">
                  {n.label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================================================================= values */}
      <section
        aria-labelledby="about-values"
        className="panel bg-blue panel-y text-white"
        data-field="dark"
      >
        <BlobSet tone="blue" flip />
        <div className="relative container-x">
          <SectionHead
            id="about-values"
            eyebrow="What we believe"
            eyebrowTone="sun"
            title="Four rules we actually follow."
            body="Stuck on the wall of our tiny office, and in every course review."
          />
          <ul className="mt-head grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {ABOUT_VALUES.map((v, i) => (
              <li key={v.title} data-reveal="card">
                <div
                  className={clsx(
                    "hover-lift flex h-full flex-col rounded-card-lg p-6 md:p-7",
                    toneBg[v.tone],
                    toneText[v.tone],
                  )}
                  style={{ transform: `rotate(${v.rotate}deg)` }}
                >
                  {/* decorative step number drawn as ::before content, so it is not read as low-contrast text */}
                  <span
                    className="t-display-m opacity-30 before:content-[attr(data-n)]"
                    data-n={`0${i + 1}`}
                    aria-hidden
                  />
                  <h3 className="mt-6 t-chunky-card">{v.title}</h3>
                  <p className="mt-3 t-body text-ink/75">{v.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================================================================= timeline */}
      <section aria-labelledby="about-timeline" className="section-y">
        <div className="container-x">
          <SectionHead
            id="about-timeline"
            eyebrow="How we got here"
            kind="chunky"
            title="Small steps, on purpose."
          />
          <ol className="mt-head grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ABOUT_TIMELINE.map((t, i) => (
              <li
                key={t.when}
                data-reveal="rise"
                data-reveal-delay={String(i * 0.08)}
                className="relative rounded-card-lg bg-white p-6 shadow-soft"
              >
                <span className="inline-flex rounded-full bg-ink px-3 py-[7px] t-eyebrow text-cream">
                  {t.when}
                </span>
                <h3 className="mt-5 t-app-h2">{t.title}</h3>
                <p className="mt-2 t-small text-ink/70">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================= team */}
      <section aria-labelledby="about-team" className="panel bg-butter panel-y">
        <BlobSet tone="butter" />
        <div className="relative container-x">
          <SectionHead
            id="about-team"
            eyebrow="The team"
            kind="chunky"
            title="The people behind the pixels."
            body="Small team, many cities, one shared dislike of boring lessons."
          />
          <div className="mt-6 flex justify-center">
            <DemoPill className="bg-white!" />
          </div>
          <ul
            data-reveal-stagger
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
          >
            {ABOUT_TEAM.map((m) => (
              <li
                key={m.name}
                className="hover-lift flex items-start gap-4 rounded-card-lg bg-white p-5 shadow-soft md:p-6"
              >
                <span
                  className={clsx(
                    "grid size-20 shrink-0 place-items-end justify-center overflow-hidden rounded-full pt-2",
                    toneBg[m.tone],
                  )}
                  aria-hidden
                >
                  <BlockBuddy
                    body={m.buddy.body}
                    head={m.buddy.head}
                    hat={m.buddy.hat}
                    wave={m.buddy.wave}
                    className="w-10 translate-y-2"
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="t-app-h2">{m.name}</h3>
                  <p className="mt-0.5 t-small font-semibold text-ink/70">
                    {m.role} · {m.city}
                  </p>
                  <p className="mt-2 t-small text-ink/65">{m.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================================================================= CTA */}
      <section aria-labelledby="about-cta" className="section-y">
        <div className="container-narrow flex flex-col items-center text-center">
          <div className="w-[96px] md:w-[120px]">
            <div className="group">
              <Mascot
                interactive
                title=""
                className="w-full animate-float"
                style={{ transform: "rotate(-6deg)" }}
              />
            </div>
          </div>
          <h2
            id="about-cta"
            data-reveal="lines"
            className="mt-8 max-w-[14ch] t-display-l"
          >
            Come learn with us.
          </h2>
          <p
            data-reveal="rise"
            className="mt-sub max-w-[32rem] t-body-l text-ink/75"
          >
            Watch the first video of any course free. If it clicks, unlock the
            rest. If you know something worth teaching, we&apos;d love to meet
            you.
          </p>
          <div
            data-reveal="rise"
            data-reveal-delay="0.1"
            className="mt-cta flex flex-wrap justify-center gap-3"
          >
            <ArrowButton href="/courses" icon="play">
              Try a free lesson
            </ArrowButton>
            <ArrowButton href="/become-tutor" variant="paper">
              Apply to teach
            </ArrowButton>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
