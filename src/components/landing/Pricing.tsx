import clsx from "clsx";
import { pricing } from "@/lib/landing-data";
import { ArrowButton, Eyebrow, LimeBox } from "@/components/decor/Bits";
import { Reveal } from "@/components/motion/Reveal";

/** Wavy-edged card background for the featured plan (Krackerz's scalloped middle card). */
function WavyCard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className={clsx("absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <path
        d={(() => {
          // a rounded-ish rectangle whose edges are rows of small outward bumps,
          // inset by the bump height so nothing is clipped by the viewBox
          const [x0, y0, w, h, a] = [4, 4, 92, 132, 4];
          const n = 8;
          const m = 12;
          let d = `M${x0} ${y0}`;
          for (let i = 0; i < n; i++) d += ` q${w / n / 2} -${a} ${w / n} 0`;
          for (let i = 0; i < m; i++) d += ` q${a} ${h / m / 2} 0 ${h / m}`;
          for (let i = 0; i < n; i++) d += ` q-${w / n / 2} ${a} -${w / n} 0`;
          for (let i = 0; i < m; i++) d += ` q-${a} -${h / m / 2} 0 -${h / m}`;
          return d + "Z";
        })()}
        fill="#7a1620"
      />
    </svg>
  );
}

export function Pricing() {
  return (
    <section className="bg-dots py-24 md:py-32" id="pricing">
      <Reveal className="px-4 text-center">
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="mt-5 font-display text-[clamp(1.6rem,5vw,3.6rem)] leading-[1.3] tracking-tight uppercase">
          Simple, fair &amp;
          <br />
          <LimeBox rotate={-3}>no subs</LimeBox>
        </h2>
        <p className="mx-auto mt-5 max-w-md font-medium text-ink/70">
          Pay once per course and keep it. No monthly fees, no surprise
          renewals.
        </p>
      </Reveal>

      <Reveal
        stagger
        className="mx-auto mt-14 grid max-w-6xl items-center gap-6 px-4 md:grid-cols-3 md:gap-4"
      >
        {pricing.map((p) => (
          <article
            key={p.name}
            className={clsx(
              "relative flex flex-col rounded-[1.5rem] p-6 md:p-7",
              p.featured
                ? "z-10 py-10 text-paper md:-my-6 md:py-12"
                : "border-2 border-ink/10 bg-paper",
            )}
          >
            {p.featured && <WavyCard />}
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-[13px] uppercase">{p.name}</h3>
                <p
                  className={clsx(
                    "mt-1 text-sm",
                    p.featured ? "text-paper/75" : "text-ink/60",
                  )}
                >
                  {p.note}
                </p>
              </div>
              {p.featured && (
                <span className="rounded-md bg-hotpink px-2 py-1 text-[11px] font-bold">
                  Popular
                </span>
              )}
            </div>
            <p className="relative mt-6 flex items-baseline gap-2">
              <span className="font-display text-4xl leading-none md:text-5xl">
                {p.price}
              </span>
              {p.per && (
                <span className="font-display text-xs uppercase opacity-80">
                  {p.per}
                </span>
              )}
            </p>
            <ArrowButton
              href={p.href}
              variant={p.featured ? "lime" : "paper"}
              className="relative mt-6 w-full justify-between !shadow-none"
            >
              {p.cta}
            </ArrowButton>
            <ul className="relative mt-6 space-y-3 text-sm font-medium">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px]",
                      p.featured ? "bg-lime text-ink" : "bg-ink/10",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
