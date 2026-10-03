import { ArrowButton, HighlightBox, Script, Sparkle, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { Parallax } from "@/components/motion/Parallax";
import { LetterPop, Reveal } from "@/components/motion/Reveal";
import { BlockBuddy } from "@/components/decor/BlockBuddy";

/**
 * Puffy white cloud band that sits across the cream -> flame boundary (Maxima).
 * viewBox 1440x200, sliced so bumps keep their shape at every width. The flame
 * fill of the section starts at y=120 (inside the band's solid core 90..130), so
 * the boundary itself is never visible.
 */
function CloudBand() {
  // Top puffs every 110 units (radii/heights vary) overlap enough to hide the core's
  // top edge (y=104); small bottom puffs break up its lower edge (y=124).
  const R = [70, 56, 64, 52, 74, 58, 66];
  const Y = [98, 112, 104, 114, 96, 110, 102];
  const top = Array.from({ length: 14 }, (_, i) => [i * 110 + 5, Y[i % 7], R[i % 7]] as const);
  const bottom = Array.from({ length: 13 }, (_, i) => [i * 110 + 60, 128 + (i % 2) * 4, 34 + (i % 3) * 4] as const);
  return (
    <svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-x-0 top-0 h-[var(--band)] w-full"
      aria-hidden
    >
      <g fill="#ffffff">
        <rect x="-20" y="104" width="1480" height="22" />
        {[...top, ...bottom].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The finale: a full-bleed flame field entered through a white cloud band, a giant
 * butter Display XXL heading with "ONE VIDEO" letter-popping in a sun box, the
 * bubble CTA, and a small scene (big Tami rising on scroll, block buddies, stickers).
 * Flame scallops then hang into the purple footer (owned by <Footer>).
 */
export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-title"
      data-field="dark"
      className="field overflow-x-clip text-butter [--band:clamp(112px,14vw,260px)]"
    >
      {/* flame starts inside the cloud band's core */}
      <div aria-hidden className="absolute inset-x-0 top-[calc(var(--band)*0.6)] bottom-0 -z-10 bg-flame" />
      <CloudBand />

      {/* clouds sit beside the heading on wide screens only (never over text) */}
      <Parallax y={40} className="pointer-events-none absolute top-[calc(var(--band)+8%)] left-[4%] -z-10 hidden xl:block">
        <Cloud size="m" delay={-9} />
      </Parallax>
      <Parallax y={60} className="pointer-events-none absolute top-[calc(var(--band)+20%)] right-[3%] -z-10 hidden xl:block">
        <Cloud size="s" delay={-3} flip />
      </Parallax>
      {/* phones: the scene has no block buddies, so this lane beside Tami is clear.
          768-1279: the cloud rides the top lane just under the band, clear of the
          heading (which starts below) and of the scene characters. */}
      <Parallax y={40} className="pointer-events-none absolute bottom-[14%] left-[6%] -z-10 md:hidden">
        <Cloud size="s" delay={-7} />
      </Parallax>
      <Parallax y={24} className="pointer-events-none absolute top-[calc(var(--band)-4px)] right-[4%] -z-10 hidden md:block xl:hidden">
        <Cloud size="s" delay={-7} flip />
      </Parallax>

      <div className="container-x relative flex flex-col items-center pt-[calc(var(--band)+var(--section-y)*0.45)] text-center">
        <h2 id="final-cta-title" className="t-display-xxl">
          <span data-reveal="lines" className="block">
            <span className="block">Your next skill</span>{" "}
            <span className="block">
              starts <Script className="text-[0.9em] leading-none text-sun">with</Script>
            </span>
          </span>{" "}
          <Reveal as="span" effect="scale" className="mt-[0.16em] inline-block">
            <HighlightBox tone="sun" rotate={-3} className="px-[0.24em] pt-[0.1em] pb-[0.04em]">
              <LetterPop delay={0.12}>One video</LetterPop>
            </HighlightBox>
          </Reveal>
        </h2>

        <div data-reveal="rise" data-reveal-delay="0.2" className="mt-cta">
          <ArrowButton href="/courses" variant="paper" size="lg" bubble icon="play">
            Watch it free
          </ArrowButton>
        </div>

        {/* scene: Tami rises faster than the page; buddies and stickers drift */}
        <div className="relative mt-10 h-[190px] w-full max-w-[880px] md:mt-16 md:h-[280px]">
          <Parallax y={60} rotate={[-4, 4]} className="absolute bottom-0 left-1/2 w-[150px] -ml-[75px] md:w-[230px] md:-ml-[115px]">
            <div className="group">
              <Mascot interactive title="" className="w-full" />
            </div>
          </Parallax>

          <Parallax y={30} className="absolute bottom-[4%] left-[4%] hidden w-[70px] md:block lg:left-[10%] lg:w-[84px]">
            <BlockBuddy body="#2668fd" head="#f780d4" hat="#ffcf3f" wave className="w-full" />
          </Parallax>
          <Parallax y={40} className="absolute right-[5%] bottom-[2%] hidden w-[62px] md:block lg:right-[11%] lg:w-[74px]">
            <BlockBuddy body="#3b308f" head="#ffcf3f" className="w-full" />
          </Parallax>

          <Parallax y={80} rotate={6} className="absolute top-[6%] left-[14%] hidden md:block lg:left-[20%]">
            <Sticker tone="sun" size="sm" rotate={-9} className="hover-wiggle">
              1st video free
            </Sticker>
          </Parallax>
          <Parallax y={70} rotate={-6} className="absolute top-[24%] right-[13%] hidden md:block lg:right-[19%]">
            <Sticker tone="bubblegum" size="sm" rotate={7} className="hover-wiggle">
              + certificate
            </Sticker>
          </Parallax>

          <Parallax y={90} rotate={10} className="absolute top-[8%] left-[6%] w-7 md:hidden">
            <Sparkle fill="#ffcf3f" />
          </Parallax>
          <Parallax y={70} rotate={-10} className="absolute top-[30%] right-[8%] w-6 md:top-[2%] md:right-[34%] md:w-8">
            <Sparkle fill="#fff2b7" />
          </Parallax>
        </div>
      </div>
      {/* bottom breathing room above the footer's flame scallops */}
      <div aria-hidden className="h-[calc(var(--section-y)*0.35)]" />
    </section>
  );
}
