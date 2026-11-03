import { BTS_BREAK } from "@/lib/content/home";
import { ParallaxPhoto } from "@/components/editorial";

/* =============================================================================
   08 FULL-BLEED BTS BREAK. A full-viewport set photo drifting slowly behind a
   single line and a slate (label + timecode). data-ground="dark" so the header
   and the clock read cream over it. Server component.
   ============================================================================= */
export function BtsBreak() {
  return (
    <section aria-label={BTS_BREAK.label} data-ground="dark" className="relative isolate h-[88svh] min-h-[520px] overflow-hidden bg-ink text-cream md:h-[100svh]">
      <ParallaxPhoto k={BTS_BREAK.image} sizes="100vw" amount={10} className="absolute! inset-0" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_11/0.75),transparent_45%),linear-gradient(to_bottom,rgb(11_11_11/0.45),transparent_30%)]" />
      <div className="container-wide relative flex h-full flex-col justify-end pb-[max(28px,var(--sab))]">
        <div className="flex flex-wrap items-end justify-between gap-6 sm:pr-[220px]">
          <p data-reveal="lines" className="t-display-xl max-w-[12ch]">
            {BTS_BREAK.line}
          </p>
          <p className="t-label flex items-center gap-3 text-cream/80">
            <span aria-hidden className="block size-[7px] bg-red" />
            {BTS_BREAK.label}
            <span className="t-timecode text-cream/60">{BTS_BREAK.timecode}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
