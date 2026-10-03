import { testimonials, toneHex } from "@/lib/landing-data";
import { ArrowButton, Eyebrow, Sparkle } from "@/components/decor/Bits";
import { ScallopBadge, ScallopEdge } from "@/components/decor/Scallop";
import { Cloud } from "@/components/decor/Cloud";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";

/** Resting tilt per badge (inline, never Tailwind rotate classes). */
const TILT = [-8, 5, -3, 7];
/** Scroll drift per badge (px, +n -> -n): alternating speeds give depth. */
const DRIFT = [30, 60, 40, 70];

/** Flat Maxima-style block face used as the reviewer avatar (no photos of real people). */
function Avatar({
  head,
  hair,
  bg,
  variant,
}: {
  head: string;
  hair: string;
  bg: string;
  variant: number;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-11 shrink-0 transition-[scale,rotate] duration-[350ms] ease-spring group-hf:scale-[1.18] group-hf:rotate-[-8deg] md:size-12"
      aria-hidden
    >
      <circle cx="24" cy="24" r="24" fill={bg} />
      {/* shoulders */}
      <path d="M8 48 C9 37 16 33 24 33 C32 33 39 37 40 48 Z" fill="#161616" />
      <circle cx="24" cy="22" r="11" fill={head} />
      {variant % 2 === 0 ? (
        <path d="M12.5 21 C12 12 18 8.5 24 8.5 C31 8.5 36 13 35.5 21 C32 16 27 14.5 21 15.5 C17 16 14 18 12.5 21 Z" fill={hair} />
      ) : (
        <path d="M13 19 C13 12 18 9 24 9 C30 9 35 12 35 19 C30 17 18 17 13 19 Z" fill={hair} />
      )}
      <circle cx="20" cy="23" r="1.4" fill="#161616" />
      <circle cx="28" cy="23" r="1.4" fill="#161616" />
      <path d="M20.5 27.5 q3.5 3 7 0" fill="none" stroke="#161616" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Learner stories on an electric-blue Maxima field: scalloped badges (Krackerz)
 * in sun / bubblegum / white / mint. Mobile = snap scroller, md-lg = 2x2 grid,
 * xl = an overlapping row of four. Badges drift at different speeds on scroll.
 */
export function Testimonials() {
  return (
    <section
      aria-labelledby="stories-title"
      data-field="dark"
      className="field overflow-x-clip bg-blue pt-section pb-[calc(var(--section-y)-var(--scallop)/2)] text-white"
    >
      <ScallopEdge placement="inside-top" color="var(--color-cream)" />

      {/* clouds: kept in the padding zones and beside the heading, never over text */}
      <Parallax y={50} className="pointer-events-none absolute top-[40px] left-[5%] -z-10 md:top-[64px] lg:top-[14%] lg:left-[5%]">
        <Cloud size="m" delay={-6} />
      </Parallax>
      <Parallax y={70} className="pointer-events-none absolute top-[18%] right-[3%] -z-10 hidden md:block lg:top-[20%]">
        <Cloud size="s" delay={-11} flip />
      </Parallax>
      <Parallax y={40} className="pointer-events-none absolute bottom-[28px] left-[8%] -z-10 lg:hidden">
        <Cloud size="s" delay={-15} />
      </Parallax>
      <Parallax y={40} className="pointer-events-none absolute right-[8%] bottom-[7%] -z-10 hidden lg:block">
        <Cloud size="l" delay={-15} flip />
      </Parallax>

      <div className="container-x relative flex flex-col items-center text-center">
        <Eyebrow tone="sun">Learner stories</Eyebrow>
        <h2
          id="stories-title"
          data-reveal="lines"
          className="t-display-l mt-eyebrow max-w-[13ch]"
        >
          You&apos;re <span className="text-bubblegum">not</span> learning alone
        </h2>
        <Parallax
          y={80}
          rotate={8}
          className="pointer-events-none absolute top-[-6px] right-[calc(50%-11rem)] hidden w-9 md:block lg:right-[calc(50%-19rem)] lg:w-11"
        >
          <Sparkle fill="#ffcf3f" />
        </Parallax>
      </div>

      <Reveal
        as="ul"
        stagger
        effect="card"
        aria-label="What learners say"
        className="no-scrollbar mt-head flex snap-x snap-mandatory gap-3 overflow-x-auto px-gutter py-8 [scroll-padding-inline:var(--gutter)] md:mx-auto md:grid md:max-w-[calc(var(--container)+2*var(--gutter))] md:grid-cols-2 md:justify-items-center md:gap-x-6 md:gap-y-2 md:overflow-visible md:py-0 xl:grid-cols-4 xl:gap-x-0"
      >
        {testimonials.map((t, i) => (
          <Parallax
            as="li"
            key={t.name}
            y={DRIFT[i]}
            className={`relative shrink-0 snap-center hover:z-10 ${i % 2 ? "xl:mt-14" : ""}`}
          >
            <ScallopBadge
              fill={toneHex[t.tone]}
              bumps={16}
              className="group size-[272px] text-ink transition-[rotate,scale] duration-[350ms] ease-spring hf:scale-[1.04] hf:[rotate:var(--untilt)] md:size-[312px] xl:size-[318px]"
              style={
                {
                  transform: `rotate(${TILT[i]}deg)`,
                  "--untilt": `${-TILT[i]}deg`,
                } as React.CSSProperties
              }
            >
              <figure className="flex h-full flex-col items-center justify-center px-[19%] text-center">
                <Avatar {...t.avatar} variant={i} />
                <blockquote className="mt-3 line-clamp-5 text-[14.5px] leading-[1.38] font-semibold tracking-[-0.015em] md:text-[15.5px]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 flex flex-col items-center">
                  <span className="font-display text-[20px] leading-none tracking-[0.01em] uppercase">
                    {t.name}
                  </span>
                  <span className="mt-1 text-[12.5px] leading-tight font-semibold opacity-70">
                    {t.role}
                  </span>
                </figcaption>
              </figure>
            </ScallopBadge>
          </Parallax>
        ))}
      </Reveal>

      {/* TODO(before launch): remove this note once real, consented reviews replace the samples. */}
      <p className="container-x mt-4 text-center text-[13px] font-semibold text-white/75">
        Sample reviews shown for preview. Real learner reviews are coming soon.
      </p>

      <div className="container-x mt-cta flex justify-center">
        <ArrowButton href="/signup" variant="paper">
          Join the club
        </ArrowButton>
      </div>
    </section>
  );
}
