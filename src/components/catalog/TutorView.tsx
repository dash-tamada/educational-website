"use client";

import Image from "next/image";
import clsx from "clsx";
import { Icon } from "@/components/app";
import { ArrowButton, Eyebrow, HandNote, Sparkle, Tag } from "@/components/decor/Bits";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { Mascot } from "@/components/decor/Mascot";
import { cropSrc } from "@/lib/img";
import { toneBg, toneHex, type Tone } from "@/lib/landing-data";
import { useDb } from "@/lib/demo/store";
import { formatDate, formatNumber, getTutor, type Tutor } from "@/lib/mock";
import { TUTOR_NOTES, firstName } from "@/lib/mock/extra/catalog";
import { TutorCourseCount, TutorCourseLabel, TutorLessonCount, TutorTeachLine } from "./LiveCounts";
import { TutorCourses } from "./TutorCourses";
import { TutorReviews } from "./TutorReviews";
import { DARK_TONES, heroText } from "./ui";

/**
 * /tutors/[slug] body. A client component reading the live demo store, so profile
 * edits made in the tutor studio (city, headline, bio, expertise, languages,
 * links) and live ratings show here. Server render + hydration use the seed.
 */
export function TutorView({ tutor: initial }: { tutor: Tutor }) {
  const db = useDb();
  const tutor = getTutor(initial.userId, db) ?? initial;
  const first = firstName(tutor.name);
  const tone = tutor.tone === "white" || tutor.tone === "ink" ? "sun" : tutor.tone;
  const dark = DARK_TONES.has(tone);
  const note = TUTOR_NOTES[tutor.slug];
  const tileTones = statTones(tone);
  const stats = [
    { key: "rating", label: "Tutor rating", value: tutor.reviewCount ? tutor.rating.toFixed(1) : "New" },
    { key: "learners", label: "Learners", value: formatNumber(tutor.learners) },
    // live: the admin demo can publish one of this tutor's courses
    { key: "courses", label: <TutorCourseLabel tutorId={tutor.userId} />, value: <TutorCourseCount tutorId={tutor.userId} /> },
    { key: "years", label: tutor.yearsTeaching === 1 ? "Year teaching" : "Years teaching", value: String(tutor.yearsTeaching) },
  ];
  // photo-less tutors get a playful frame in a contrasting tone instead of a black block
  const frameTone = tone === "sun" || tone === "butter" ? "blue" : "sun";

  return (
    <>
      <section aria-labelledby="tutor-name" data-field={dark ? "dark" : undefined} className={clsx("panel py-10 md:py-14 lg:py-16", toneBg[tone], heroText(tone))}>
        <Sparkle fill={dark ? "#ffcf3f" : "#ffffff"} className="pointer-events-none absolute top-10 right-[8%] hidden size-10 md:block" />
        <div className="container-x relative grid items-center gap-8 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-14">
          <div className="relative mx-auto w-full max-w-[260px] md:max-w-[320px]">
            <div className={clsx("relative aspect-[4/5] overflow-hidden rounded-card-lg shadow-photo", tutor.avatar ? "bg-ink" : toneBg[frameTone])} style={{ transform: "rotate(-2deg)" }}>
              {tutor.avatar ? (
                <Image src={cropSrc(tutor.avatar, 5 / 4)} alt={`Portrait of ${tutor.name}`} fill sizes="(min-width: 1024px) 320px, 280px" preload className="object-cover" />
              ) : (
                <div className={clsx("relative grid h-full place-items-center", heroText(frameTone))} role="img" aria-label={`${tutor.name} (no photo yet)`}>
                  <span className="font-display text-[clamp(6rem,4rem+8vw,9rem)] leading-none font-black tracking-[0.02em]" aria-hidden>
                    {tutor.name
                      .replace(/^Dr\.\s*/, "")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <Mascot title="" className="absolute right-4 bottom-4 w-16" style={{ transform: "rotate(10deg)" }} />
                  <Sparkle fill={toneHex[tone] ?? "#ffffff"} className="absolute top-5 left-5 size-8" />
                </div>
              )}
            </div>
            {note && (
              <HandNote write={false} rotate={-6} className={clsx("mt-5 text-center", dark ? "text-white" : "text-ink")}>
                {note}
              </HandNote>
            )}
          </div>
          <div className="min-w-0">
            <Eyebrow tone={dark ? "sun" : "blue"}>
              <Icon name="globe" className="size-3.5" strokeWidth={2.4} />
              {tutor.city ? `Tutor · ${tutor.city}` : "Tutor"}
            </Eyebrow>
            <h1 id="tutor-name" className="t-display-l mt-eyebrow">
              {tutor.name}
            </h1>
            <p className="t-body-l mt-sub max-w-[34rem]">{tutor.headline}</p>
            {/* 2 x 2 until the hero column is wide enough for four ~140px tiles */}
            <dl className="mt-8 grid max-w-[40rem] grid-cols-2 gap-2.5 xl:grid-cols-4">
              {stats.map((s, i) => (
                <div key={s.key} className={clsx("flex min-w-0 flex-col-reverse justify-end rounded-card px-4 py-3.5 text-ink", toneBg[tileTones[i]], tileTones[i] === "white" && "shadow-soft")}>
                  <dt className="mt-1.5 text-[12.5px] font-bold text-ink/75">{s.label}</dt>
                  <dd className="t-stat">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] font-semibold">Sample figures for the demo.</p>
          </div>
        </div>
      </section>

      <div className="container-x space-y-14 pt-10 pb-section md:space-y-20 md:pt-14">
        <section aria-labelledby="about-tutor" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-card-lg bg-white p-5 shadow-soft md:p-8">
            <h2 id="about-tutor" className="t-app-h2">
              About {first}
            </h2>
            <p className="t-body mt-3 whitespace-pre-line text-ink/80">{tutor.bio}</p>
            {tutor.expertise.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tutor.expertise.map((e) => (
                  <Tag key={e} tone="butter">
                    {e}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <dl className="rounded-card-lg bg-cyan p-5 md:p-6">
              <dt className="t-app-h3">Teaches in</dt>
              <dd className="mt-1.5 text-[15px] font-semibold">{tutor.languages.join(", ") || "English"}</dd>
              <dt className="t-app-h3 mt-4">On the platform since</dt>
              <dd className="mt-1.5 text-[15px] font-semibold">{formatDate(tutor.joinedAt, "long")}</dd>
              <dt className="t-app-h3 mt-4">Lessons published</dt>
              <dd className="mt-1.5 text-[15px] font-semibold">
                <TutorLessonCount tutorId={tutor.userId} />
              </dd>
            </dl>
            {tutor.socials.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={`${first} elsewhere`}>
                {tutor.socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-bold shadow-soft hf:bg-butter">
                      {s.label}
                      <Icon name="external" className="size-3.5" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <TutorCourses tutorId={tutor.userId} firstName={first} />

        <TutorReviews tutorId={tutor.userId} firstName={first} />

        <section aria-labelledby="teach-cta" className="relative overflow-hidden rounded-card-lg bg-forest px-6 py-10 text-mint md:px-12 md:py-14" data-field="dark">
          <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 id="teach-cta" className="t-chunky-xl max-w-[14ch]">
                Got a thing worth teaching?
              </h2>
              <p className="t-body-l mt-sub max-w-[30rem] text-white">
                <TutorTeachLine tutorId={tutor.userId} first={first} />
              </p>
              <div className="mt-8">
                <ArrowButton href="/become-tutor" variant="paper">
                  Apply to teach
                </ArrowButton>
              </div>
            </div>
            <div className="hidden items-end gap-3 md:flex" aria-hidden>
              <BlockBuddy body="#ffcf3f" head="#ff008c" wave className="w-20" />
              <BlockBuddy body="#a3f6f6" head="#ffcf3f" hat="#2668fd" className="w-[4.5rem]" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/** Light tile tones that clear ink text; never the hero's own colour (a tile would vanish). */
const TILE_TONES: Tone[] = ["sun", "blush", "cyan", "mint"];
const SPARE_TONES: Tone[] = ["butter", "white"];
function statTones(hero: string): Tone[] {
  const heroHex = toneHex[hero as Tone];
  return TILE_TONES.map((t) => (toneHex[t] !== heroHex ? t : (SPARE_TONES.find((x) => toneHex[x] !== heroHex) ?? "white")));
}
