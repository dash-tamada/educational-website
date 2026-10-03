import { marqueeItems } from "@/lib/landing-data";
import { Parallax } from "@/components/motion/Parallax";

/**
 * Two Aardvark promo tapes between the hero panel and the course carousel.
 *
 * Geometry (all in CSS vars so it scales with the viewport):
 *   --th   tape height            64 / 84 / 104px
 *   --ov   how far tape B bites into tape A at the RIGHT viewport edge; always
 *          less than tape A's vertical padding, so B only ever covers A's coloured
 *          margin, never its text.
 *   Tape A tilts -1.5deg, tape B -4.5deg (3deg apart). tan(3deg) * 50vw = 2.62vw,
 *   which is why tape B's top is pushed down by 2.62vw: the two tapes then touch
 *   exactly at the right edge and cross only over the last ~25% of the width.
 *
 * Motion: each tape loops with a CSS marquee (opposite directions) and its wrapper
 * drifts along the tape with scroll (Parallax xPercent +-4).
 */

const BLOB_A =
  "M40 100 C60 58 120 30 190 44 C262 58 300 18 360 30 C420 42 448 76 470 100 Z M540 0 C566 34 610 62 676 56 C742 50 776 82 842 74 C902 66 936 30 958 0 Z";
const BLOB_B =
  "M30 0 C52 40 104 66 176 58 C248 50 292 84 356 72 C412 62 440 28 456 0 Z M548 100 C566 64 618 36 690 46 C760 56 800 22 862 34 C918 46 946 76 966 100 Z";

function Tape({
  text,
  fill,
  blob,
  blobFill,
  reverse,
}: {
  text: string;
  fill: string;
  blob: string;
  blobFill: string;
  reverse?: boolean;
}) {
  // One "unit" = the sentence on its own blob pattern. Blobs never touch the unit's
  // left/right edges, so units tile seamlessly. 5 units per half >= 140vw at every width.
  const units = Array.from({ length: 5 });
  return (
    <div className="h-full overflow-hidden" style={{ background: fill }}>
      <div
        className={`flex h-full w-max ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}
        style={{ animationDuration: "60s" }}
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex h-full shrink-0">
            {units.map((_, i) => (
              <span
                key={i}
                className="relative flex h-full shrink-0 items-center px-[0.9em] font-heading text-[length:var(--fs)] leading-[0.9] font-extrabold tracking-[-0.035em] whitespace-nowrap text-berry [font-variation-settings:'opsz'_96]"
              >
                <svg
                  viewBox="0 0 1000 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden
                >
                  <path d={blob} fill={blobFill} />
                </svg>
                <span className="relative">{text}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarqueeTape() {
  const [a, b = a] = marqueeItems;
  return (
    <section
      aria-label="Highlights"
      className="relative overflow-hidden [--fs:26px] [--ov:14px] [--pad:calc(1.6vw+8px)] [--th:64px] md:[--fs:36px] md:[--ov:18px] md:[--th:84px] lg:[--fs:46px] lg:[--ov:22px] lg:[--th:104px]"
      style={{
        height:
          "calc(var(--pad) + var(--th) - var(--ov) + 2.62vw + var(--th) + 3.93vw + 10px)",
      }}
    >
      <p className="sr-only">
        {a}. {b}.
      </p>

      {/* Tape A (back) */}
      <Parallax
        className="absolute left-1/2 w-[140vw]"
        style={{
          top: "var(--pad)",
          height: "var(--th)",
          marginLeft: "-70vw",
          transform: "rotate(-1.5deg)",
        }}
        xPercent={[4, -4]}
      >
        <div aria-hidden className="h-full">
          <Tape text={a} fill="#fd48f2" blob={BLOB_A} blobFill="#ffa3f9" />
        </div>
      </Parallax>

      {/* Tape B (front), crosses A near the right edge only */}
      <Parallax
        className="absolute left-1/2 z-10 w-[140vw]"
        style={{
          top: "calc(var(--pad) + var(--th) - var(--ov) + 2.62vw)",
          height: "var(--th)",
          marginLeft: "-70vw",
          transform: "rotate(-4.5deg)",
        }}
        xPercent={[-4, 4]}
      >
        <div aria-hidden className="h-full">
          <Tape
            text={b}
            fill="#1ce8ed"
            blob={BLOB_B}
            blobFill="#a3f6f6"
            reverse
          />
        </div>
      </Parallax>
    </section>
  );
}
