import clsx from "clsx";
import { whyStickers } from "@/lib/landing-data";
import { Blob, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Reveal } from "@/components/motion/Reveal";

function Emblem() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="h-auto w-[min(80vw,460px)]"
      role="img"
      aria-label="Why Tamada Media?"
    >
      <defs>
        <path id="why-arc" d="M60 200 A140 140 0 0 1 340 200" />
      </defs>
      <text
        className="fill-maroon font-heading font-extrabold"
        fontSize="44"
        letterSpacing="-1"
      >
        <textPath href="#why-arc" startOffset="50%" textAnchor="middle">
          Why Tamada Media?
        </textPath>
      </text>
      <circle
        cx="200"
        cy="245"
        r="118"
        fill="none"
        stroke="#5c0d14"
        strokeWidth="20"
      />
      <circle cx="200" cy="245" r="96" fill="#fff0a8" />
    </svg>
  );
}

/** Aardvark's "Why Aardvark?" emblem with tilted pill stickers popping around it. */
export function WhyStickers() {
  return (
    <section className="px-2 py-4 md:px-4">
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-butter px-4 pt-16 pb-16 md:min-h-[720px] md:pb-0">
        <Blob
          fill="#ffd23f"
          variant={0}
          className="inset-x-0 bottom-0 h-3/4 w-full"
        />
        <Blob
          fill="#ffbf1f"
          variant={1}
          className="inset-x-0 bottom-0 h-1/3 w-full opacity-70"
        />

        <div className="relative mx-auto flex w-fit justify-center md:pt-6">
          <Emblem />
          <Mascot
            className="absolute top-[50%] left-1/2 w-[38%] -translate-x-1/2 animate-float"
            title=""
          />
        </div>

        <Reveal
          as="ul"
          stagger
          effect="pop"
          className="relative mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-3 md:static md:mt-0 md:max-w-none"
        >
          {whyStickers.map((s) => (
            <li key={s.label} className={clsx("md:absolute", s.className)}>
              <Sticker tone={s.tone}>{s.label}</Sticker>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
