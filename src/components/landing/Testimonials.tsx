import Image from "next/image";
import { testimonialBg, testimonials } from "@/lib/landing-data";
import { ArrowButton, Script } from "@/components/decor/Bits";
import { ScallopBadge, ScallopEdge } from "@/components/decor/Scallop";
import { Reveal } from "@/components/motion/Reveal";

const fills = ["#e2482b", "#b8321c", "#7a1620", "#5c0d14"];
const tilt = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6"];

/** Krackerz's scalloped quote badges over a dark photo. */
export function Testimonials() {
  return (
    <section className="relative isolate mt-24 py-24 text-paper md:py-32">
      <ScallopEdge
        side="top"
        color="var(--color-cream)"
        className="top-0 !bottom-auto rotate-180"
      />
      <Image
        src={testimonialBg}
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-ink/65" />

      <h2 className="mx-auto max-w-4xl px-4 text-center font-display text-[clamp(1.6rem,5vw,3.6rem)] leading-[1.25] text-paper/90 uppercase">
        You&apos;re <Script className="text-[1.2em] text-lime">not</Script>{" "}
        learning alone
      </h2>

      <Reveal
        stagger
        effect="pop"
        className="no-scrollbar mx-auto mt-12 flex max-w-7xl snap-x gap-2 overflow-x-auto px-6 py-8 md:justify-center md:overflow-visible"
      >
        {testimonials.map((t, i) => (
          <div key={i} className="shrink-0 snap-center">
            <ScallopBadge
              fill={fills[i]}
              className={`size-[270px] md:-mx-3 md:size-[300px] ${tilt[i]}`}
            >
              <figure className="flex h-full flex-col justify-center px-14 text-left md:px-16">
                <span className="font-display text-3xl leading-none text-paper/70">
                  &ldquo;
                </span>
                <blockquote className="text-[15px] leading-snug font-medium md:text-base">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-3">
                  <span className="block font-display text-[10px] uppercase">
                    {t.name}
                  </span>
                  <span className="text-[11px] text-paper/70">{t.role}</span>
                </figcaption>
              </figure>
            </ScallopBadge>
          </div>
        ))}
      </Reveal>

      <div className="mt-6 flex justify-center">
        <ArrowButton href="/signup">Join the club</ArrowButton>
      </div>
      <ScallopEdge
        side="bottom"
        color="var(--color-cream)"
        className="!top-auto bottom-0 rotate-180"
      />
    </section>
  );
}
