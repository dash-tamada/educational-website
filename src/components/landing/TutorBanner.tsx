import Image from "next/image";
import { cropSrc } from "@/lib/img";
import clsx from "clsx";
import { tutorPhotos } from "@/lib/landing-data";
import { ArrowButton, Eyebrow, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { ScallopBadge, ScallopEdge } from "@/components/decor/Scallop";
import { Parallax } from "@/components/motion/Parallax";

import { BlockBuddy } from "@/components/decor/BlockBuddy";

/** Round tutor photo with a scalloped white rim (Krackerz badge as a frame). */
function TutorPhoto({
  src,
  alt,
  className,
  tilt = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  /** resting tilt (inline transform; the hover lift uses the translate property) */
  tilt?: number;
}) {
  return (
    <ScallopBadge
      fill="#ffffff"
      bumps={18}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={clsx(
        "hover-zoom-parent aspect-square w-full drop-shadow-[0_14px_22px_rgb(22_22_22/0.22)] transition-[translate] duration-[350ms] ease-spring hf:-translate-y-2",
        className,
      )}
    >
      <span className="absolute inset-[13%] overflow-hidden rounded-full">
        <Image src={cropSrc(src, 1)} alt={alt} fill sizes="(min-width: 1024px) 140px, (min-width: 640px) 130px, 76px" className="hover-zoom object-cover" />
      </span>
    </ScallopBadge>
  );
}

/** Cluster geometry in % of the scene box (600 x 500 at most). */
const CLUSTER = [
  { left: "12%", top: "12%", w: "30%", tilt: -6, lift: 6, z: 1 },
  { left: "36%", top: "0%", w: "27%", tilt: 4, lift: 14, z: 2 },
  { left: "58%", top: "14%", w: "29%", tilt: -2, lift: 9, z: 1 },
];

const PHOTO_ALT = [
  "A tutor recording a lesson at her desk",
  "A tutor smiling during a video class",
  "A tutor explaining a lesson on camera",
];

/**
 * Maxima "Next stop" colour field for tutors: green field, mint display caps on
 * the left, a flat scene on the right (hill, Tami, two block buddies) with a
 * cluster of three scallop-rimmed tutor photos held just above the characters.
 * The scene is grounded on the field's bottom edge; cream scallops lead into Pricing.
 */
export function TutorBanner() {
  return (
    <section
      id="tutors"
      aria-labelledby="tutors-title"
      data-field="dark"
      className="field overflow-x-clip bg-green text-white"
    >
      {/* blue (Testimonials) bumps hang into the green field */}
      <ScallopEdge placement="inside-top" color="var(--color-blue)" />

      <Parallax y={50} className="pointer-events-none absolute top-[7%] right-[6%] -z-10 lg:top-[12%] lg:right-[44%]">
        <Cloud size="m" delay={-4} />
      </Parallax>
      <Parallax y={30} className="pointer-events-none absolute top-[5%] right-[-60px] -z-10 hidden lg:block">
        <Cloud size="l" delay={-14} flip />
      </Parallax>

      <div className="container-x relative grid items-end gap-x-12 pt-section lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* copy */}
        <div className="relative flex flex-col items-start lg:self-center lg:pb-[calc(var(--section-y)*0.6)]">
          <Eyebrow tone="white">Teach on Tamada</Eyebrow>
          <h2
            id="tutors-title"
            data-reveal="lines"
            className="t-display-l mt-eyebrow max-w-[11ch] text-mint"
          >
            For tutors, creators &amp; schools
          </h2>
          <p
            data-reveal="rise"
            data-reveal-delay="0.15"
            className="t-body-l mt-sub max-w-[27rem] text-white/90"
          >
            Upload your videos, organise them into modules and drop tests
            between lessons. You get paid every time someone buys your course.
          </p>
          <div data-reveal="rise" data-reveal-delay="0.25" className="mt-cta">
            <ArrowButton href="/become-tutor" variant="forest">
              Become a tutor
            </ArrowButton>
          </div>
        </div>

        {/* flat scene, grounded on the bottom edge */}
        <div className="relative mx-auto mt-head aspect-[6/5] w-full max-w-[600px] lg:mt-0 lg:mr-0">
          {/* hills: rise from the ground on the left, run flat off the right edge */}
          <div aria-hidden className="absolute bottom-0 left-[-14%] h-[40%] w-[114%]">
            <svg viewBox="0 0 600 500" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path d="M0 500 C40 455 85 330 170 255 C250 185 330 172 400 188 C470 204 540 212 600 210 V500 Z" fill="#a7eb98" />
              <path d="M0 500 C60 425 110 330 200 300 C300 268 420 272 480 282 C530 290 570 290 600 290 V500 Z" fill="#009646" />
            </svg>
            <div className="absolute bottom-0 left-[calc(100%-1px)] h-[58%] w-[60vw] bg-mint" />
            <div className="absolute bottom-0 left-[calc(100%-1px)] h-[42%] w-[60vw] bg-[#009646]" />
          </div>

          {/* characters stand on the dark hill (no parallax: they stay grounded) */}
          <div className="group absolute bottom-[14.5%] left-[12%] w-[27%]">
            <Mascot interactive title="" className="w-full" style={{ transform: "rotate(-6deg)" }} />
          </div>
          <BlockBuddy
            body="#2668fd"
            head="#ffcf3f"
            hat="#fd4401"
            wave
            className="absolute bottom-[18%] left-[48%] w-[13%]"
          />
          <BlockBuddy
            body="#fd4401"
            head="#f780d4"
            className="absolute right-[9%] bottom-[17%] w-[15%]"
          />

          {/* tutor photos: one overlapping cluster held just above the characters
              (tilts -6 / 4 / -2deg, the middle one in front). The cluster drifts as
              a unit; each photo adds a little of its own lift for depth. */}
          <Parallax y={20} className="absolute inset-x-0 top-0 h-[46%]">
            {CLUSTER.map((c, i) => (
              <Parallax
                key={i}
                y={c.lift}
                className="absolute"
                style={{ left: c.left, top: c.top, width: c.w, zIndex: c.z }}
              >
                <TutorPhoto src={tutorPhotos[i]} alt={PHOTO_ALT[i]} tilt={c.tilt} />
              </Parallax>
            ))}
            <Parallax y={12} rotate={[-3, 3]} className="absolute top-[75%] left-[26%] z-10">
              <Sticker tone="sun" size="sm" rotate={-6} className="hover-wiggle">
                Earn on every sale
              </Sticker>
            </Parallax>
          </Parallax>
        </div>
      </div>

      <ScallopEdge placement="inside-bottom" color="var(--color-cream)" />
    </section>
  );
}
