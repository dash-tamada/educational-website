import Image from "next/image";
import clsx from "clsx";
import { features } from "@/lib/landing-data";
import {
  ArrowButton,
  Eyebrow,
  LimeBox,
  Sparkle,
} from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Reveal } from "@/components/motion/Reveal";

const bodies = ["bg-tomato", "bg-brick", "bg-wine", "bg-maroon"];

/**
 * Krackerz-style sticky stack: every panel sticks a little lower than the one
 * before, and each panel's folder tab sits further right, so the tabs of the
 * covered panels stay visible side by side.
 */
export function FeatureStack() {
  return (
    <section className="bg-dots relative py-24 md:py-32">
      <Reveal className="mx-auto max-w-5xl px-4 text-center">
        <Eyebrow>Core features</Eyebrow>
        <h2 className="mt-5 font-display text-[clamp(1.6rem,5vw,3.6rem)] leading-[1.25] tracking-tight uppercase">
          Built to make <br className="sm:hidden" />
          it <LimeBox rotate={-4}>click</LimeBox>
        </h2>
      </Reveal>

      <div className="mx-auto mt-14 max-w-6xl px-3 [--tab-step:14px] [--tab-x:0px] md:px-4 md:[--tab-step:24px] md:[--tab-x:min(22%,210px)]">
        {features.map((f, i) => (
          <div
            key={f.tab}
            className="sticky mb-10 md:mb-20"
            style={
              {
                top: `calc(84px + ${i} * var(--tab-step))`,
              } as React.CSSProperties
            }
          >
            {/* tab row: transparent except this panel's own tab */}
            <div
              className="flex h-9 md:h-10"
              style={{ paddingLeft: `calc(${i} * var(--tab-x))` }}
            >
              <span
                className={clsx(
                  "flex items-center gap-2 rounded-t-2xl px-4 pt-1 text-[12px] font-semibold text-paper md:px-5 md:text-sm",
                  bodies[i],
                )}
              >
                <Sparkle className="size-3.5" fill="#fffdf8" />
                {f.tab}
              </span>
            </div>
            <article
              className={clsx(
                "grid gap-6 rounded-[1.75rem] rounded-tl-none p-6 text-paper shadow-[0_-12px_30px_-12px_rgba(0,0,0,.35)] md:min-h-[min(68vh,560px)] md:grid-cols-[1fr_1.15fr] md:gap-10 md:p-10",
                bodies[i],
                i > 0 && "md:rounded-tl-[1.75rem]",
              )}
            >
              <div className="flex flex-col">
                <h3 className="font-display text-[clamp(1.5rem,3.2vw,2.6rem)] leading-[1.25] uppercase">
                  {f.title}
                </h3>
                <ul className="mt-6 space-y-3 text-base font-medium md:text-lg">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span aria-hidden className="text-lime">
                        ✱
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                {i === features.length - 1 && (
                  <ArrowButton
                    href="/courses"
                    className="mt-8 self-start md:mt-auto"
                  >
                    Browse courses
                  </ArrowButton>
                )}
              </div>
              <div className="relative">
                <div className="relative aspect-[4/3] h-full overflow-hidden rounded-2xl border-[6px] border-paper bg-ink md:aspect-auto md:min-h-[320px]">
                  <Image
                    src={f.img}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 560px, 92vw"
                    className="object-cover"
                  />
                </div>
                <span className="absolute -top-4 -right-3 grid size-16 rotate-12 place-items-center rounded-full border-[3px] border-ink bg-lime md:size-20">
                  {i === 3 ? (
                    <Mascot className="size-10 md:size-12" title="" />
                  ) : (
                    <span className="font-display text-lg md:text-2xl">
                      0{i + 1}
                    </span>
                  )}
                </span>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
