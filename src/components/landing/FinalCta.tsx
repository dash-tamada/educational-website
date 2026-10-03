import { ArrowButton, LimeBox, Script, Sparkle } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Reveal } from "@/components/motion/Reveal";

/** Big scalloped maroon sign-off (Krackerz "Be the first to krack"). */
export function FinalCta() {
  return (
    <section className="relative mt-16 bg-maroon pt-24 pb-20 text-paper md:pt-28">
      {/* cloud-bump top edge */}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[calc(100%-1px)] h-16 w-full md:h-28"
        aria-hidden
      >
        <path
          d="M0 120 V80 C80 80 90 30 170 30 S270 70 330 60 S420 0 520 10 S640 70 720 50 S830 -10 940 20 S1060 80 1140 50 S1280 0 1360 40 S1420 70 1440 70 V120Z"
          fill="#5c0d14"
        />
      </svg>

      <Sparkle className="absolute top-10 left-[8%] w-10 animate-float" />
      <Sparkle
        className="absolute top-24 right-[12%] w-8 animate-float [animation-delay:1.2s]"
        fill="#ff4fd8"
      />
      <span className="absolute top-[68%] left-[7%] hidden -rotate-12 rounded-full border-[3px] border-ink bg-cyan px-4 py-2 font-heading text-lg font-extrabold text-ink md:block">
        1st video free
      </span>
      <span className="absolute top-[72%] right-[7%] hidden rotate-6 rounded-full border-[3px] border-ink bg-yellow px-4 py-2 font-heading text-lg font-extrabold text-ink md:block">
        +certificate
      </span>

      <Reveal className="relative mx-auto max-w-4xl px-4 text-center">
        <h2 className="font-display text-[clamp(1.7rem,5.4vw,4rem)] leading-[1.35] uppercase">
          Your next skill
          <br />
          starts <Script className="text-[1.25em] text-lime">with</Script>{" "}
          <LimeBox rotate={-4} className="text-ink">
            one video
          </LimeBox>
        </h2>
        <div className="mt-10 flex justify-center">
          <ArrowButton href="/courses">Watch it free</ArrowButton>
        </div>
        <Mascot
          className="mx-auto mt-10 size-20 animate-float [--r:6deg]"
          title=""
        />
      </Reveal>
    </section>
  );
}
