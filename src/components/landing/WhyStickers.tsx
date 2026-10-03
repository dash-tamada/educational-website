import clsx from "clsx";
import { whyStickers } from "@/lib/landing-data";
import { BlobSet, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Parallax } from "@/components/motion/Parallax";

/*
  Emblem geometry, in a 400x400 box: ring centre (200, 232), ring radius 120
  (stroke 24, so outer 132 / inner 108); the arc title runs on a 156 radius from
  14deg above horizontal on the left, over the top, to 14deg on the right. The
  title therefore never comes lower than ~y 205 (51% of the box), and the
  stickers start below that (see TOP below), so they overlap the RING only.
*/
const ARC = "M48.6 193.6 A156 156 0 0 1 351.4 193.6";
const RING_DOTS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { cx: (136 + 120 * Math.cos(a)).toFixed(2), cy: (136 + 120 * Math.sin(a)).toFixed(2) };
});

/** Grid slot per sticker at >=1024 (left column 1, emblem column 2, right column 3). */
const SLOT: { col: number; row: string; top?: number }[] = [
  { col: 1, row: "1", top: 0.56 },
  { col: 3, row: "1", top: 0.63 },
  { col: 1, row: "2" },
  { col: 3, row: "2 / span 2" },
  { col: 1, row: "3" },
];
/** Scroll drift per sticker (px, from below into place): different speeds = depth. */
const DRIFT = [70, 95, 115, 125, 140];

function Emblem() {
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-square w-[var(--em)] lg:absolute lg:top-0 lg:left-1/2 lg:-translate-x-1/2"
    >
      {/* ring: turns slowly with scroll (dots make the rotation readable) */}
      <Parallax rotate={[-30, 30]} className="absolute top-[24%] left-[16%] h-[68%] w-[68%]">
        <svg viewBox="0 0 272 272" className="h-full w-full">
          <circle cx="136" cy="136" r="108" fill="#fff2b7" />
          <circle cx="136" cy="136" r="120" fill="none" stroke="#670a2e" strokeWidth="24" />
          {RING_DOTS.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={i % 2 ? 2.6 : 4.2} fill="#ffcf3f" />
          ))}
        </svg>
      </Parallax>
      {/* arc title (static, so it never drifts into a sticker) */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <path id="why-arc" d={ARC} />
        </defs>
        <text
          className="fill-berry font-heading font-extrabold"
          fontSize="46"
          letterSpacing="-1.2"
        >
          <textPath href="#why-arc" startOffset="50%" textAnchor="middle">
            Why Tamada Media?
          </textPath>
        </text>
      </svg>
      {/* Tami in the ring */}
      <div className="absolute top-[58%] left-1/2 w-[38%] -translate-x-1/2 -translate-y-[52%]">
        <Parallax y={[14, -14]} rotate={[-5, 5]}>
          <Mascot interactive className="w-full animate-float" title="" />
        </Parallax>
      </div>
    </div>
  );
}

/**
 * Aardvark "Why?" panel: sun inset panel with butter/tangerine blobs, a berry
 * arc title round a ring emblem with Tami, and five big flat pill stickers that
 * pop in one after another. >=1024 the stickers flank the emblem and overlap the
 * ring (never the arc title); below that they form a wrapped, tilted cluster
 * under the emblem. Stickers drift up into place with scroll at different speeds.
 */
export function WhyStickers() {
  return (
    <section
      data-why-panel
      aria-labelledby="why-stickers-title"
      className="panel panel-y bg-sun"
    >
      <BlobSet tone="sun" />
      <h2 id="why-stickers-title" className="sr-only">
        Why Tamada Media?
      </h2>

      <div className="container-x relative">
        <div className="relative -mt-[calc(var(--em)*0.08)] [--em:min(82vw,360px)] md:[--em:380px] lg:min-h-[var(--em)] lg:[--em:clamp(360px,34vw,500px)]">
          <Emblem />

          <ul className="relative -mt-[calc(var(--em)*0.06)] flex flex-wrap justify-center gap-x-2 gap-y-3 md:gap-x-3 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_var(--em)_minmax(0,1fr)] lg:items-start lg:gap-x-0 lg:gap-y-3">
            {whyStickers.map((s, i) => {
              const slot = SLOT[i] ?? { col: i % 2 ? 3 : 1, row: "auto" };
              const left = slot.col === 1;
              return (
                <li
                  key={s.label}
                  data-reveal="pop"
                  data-reveal-delay={(i * 0.12).toFixed(2)}
                  data-reveal-start="top 92%"
                  className={clsx(
                    "relative z-10",
                    left
                      ? "lg:mr-[calc(var(--em)*var(--ov)*-1)] lg:justify-self-end"
                      : "lg:ml-[calc(var(--em)*var(--ov)*-1)] lg:justify-self-start",
                    slot.top !== undefined && "lg:mt-[calc(var(--em)*var(--top))]",
                  )}
                  style={
                    {
                      gridColumn: slot.col,
                      gridRow: slot.row,
                      "--ov": s.overlap,
                      "--top": slot.top,
                    } as React.CSSProperties
                  }
                >
                  <Parallax
                    trigger="[data-why-panel]"
                    start="top bottom"
                    end="center center"
                    y={[DRIFT[i] ?? 90, 0]}
                    rotate={[i % 2 ? 5 : -5, 0]}
                  >
                    <Sticker
                      tone={s.tone}
                      rotate={s.rotate}
                      size="lg"
                      lines={s.lines ?? 1}
                      className="hover-wiggle tap text-center lg:text-[clamp(2.25rem,-1rem+5.3vw,4rem)]"
                    >
                      {s.label}
                    </Sticker>
                  </Parallax>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
