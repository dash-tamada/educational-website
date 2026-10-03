import clsx from "clsx";
import { marqueeItems } from "@/lib/landing-data";

function Band({
  className,
  reverse,
}: {
  className: string;
  reverse?: boolean;
}) {
  const row = [...marqueeItems, ...marqueeItems];
  return (
    <div
      className={clsx(
        "absolute left-1/2 w-[120vw] -translate-x-1/2 overflow-hidden border-y-[3px] border-ink py-3",
        className,
      )}
    >
      <div
        className={clsx(
          "flex w-max",
          reverse ? "animate-marquee-rev" : "animate-marquee",
        )}
      >
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0" aria-hidden={k === 1}>
            {row.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-6 pr-6 font-heading text-2xl font-extrabold tracking-tight md:text-4xl"
              >
                {t}
                <span className="text-xl">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two crossing promo tapes (Aardvark's "1st book only $4" banner). */
export function MarqueeTape() {
  return (
    <div
      className="relative h-40 overflow-hidden md:h-48"
      role="marquee"
      aria-label={marqueeItems.join(", ")}
    >
      <Band
        className="top-10 rotate-[3deg] bg-blush text-ink md:top-12"
        reverse
      />
      <Band className="top-12 -rotate-[2.5deg] bg-cyan text-ink md:top-16" />
    </div>
  );
}
