"use client";

import { useRef } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { BlobSet, Eyebrow } from "@/components/decor/Bits";
import { Cloud } from "@/components/decor/Cloud";

/* =============================================================================
   WhyCards: Maxima service cards on a mint inset panel.
   >= 1024px with motion: an elastic card STACK (R4). The panel is tall, its stage
   is CSS-sticky (no GSAP pin, so no pin-spacer shifts other sections' triggers),
   and scrolling flings the top card up-left while the next one settles.
   Below 1024px / reduced motion: the three cards sit in a zigzag column / row and
   rise in with the shared R6 card reveal. Hover H7 everywhere (fine pointer).
   ============================================================================= */

type Card = {
  title: string;
  body: string;
  bg: string;
  titleColor: string;
  bodyColor: string;
  tilt: number;
  icon: "pace" | "tests" | "free";
};

const cards: Card[] = [
  {
    title: "Learn at your own pace",
    body: "Short videos grouped into modules. Pause, rewind, speed up. Your progress saves itself and waits for you.",
    bg: "bg-blue",
    titleColor: "text-sun",
    bodyColor: "text-white",
    tilt: -4,
    icon: "pace",
  },
  {
    title: "Tests that make it stick",
    body: "Tutors drop quick tests between lessons. Pass to unlock the next part, and see why each answer is right.",
    bg: "bg-sun",
    titleColor: "text-blue",
    bodyColor: "text-ink",
    tilt: 5,
    icon: "tests",
  },
  {
    title: "The first video is on us",
    body: "Try any course before you pay. If the tutor clicks, one price unlocks every module for good.",
    bg: "bg-flame",
    titleColor: "text-butter",
    bodyColor: "text-white",
    tilt: -3,
    icon: "free",
  },
];

/** 120px flat geometric icons (no outlines), Maxima style. */
function ServiceIcon({ name }: { name: Card["icon"] }) {
  return (
    <svg viewBox="0 0 120 120" className="size-24 md:size-[120px]" aria-hidden>
      {name === "pace" && (
        <>
          <circle cx="60" cy="62" r="44" fill="#FFCF3F" />
          <path d="M60 18 a44 44 0 0 1 44 44 H60 Z" fill="#FFF2B7" />
          <path d="M50 44 L78 62 L50 80 Z" fill="#FD4401" />
          <circle cx="98" cy="22" r="9" fill="#F780D4" />
        </>
      )}
      {name === "tests" && (
        <>
          <rect x="18" y="16" width="70" height="88" rx="16" fill="#2668FD" />
          <path
            d="M34 46 l8 8 l14 -16 M34 76 l8 8 l14 -16"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="94" cy="88" r="16" fill="#FD4401" />
          <path
            d="M94 76 l3.5 7.5 l8 1 l-6 5.5 l1.6 8 l-7.1 -4 l-7.1 4 l1.6 -8 l-6 -5.5 l8 -1 z"
            fill="#FFF2B7"
          />
        </>
      )}
      {name === "free" && (
        <>
          <rect x="20" y="56" width="80" height="50" rx="10" fill="#FFCF3F" />
          <rect x="14" y="40" width="92" height="22" rx="9" fill="#FFF2B7" />
          <rect x="52" y="40" width="16" height="66" fill="#2668FD" />
          <circle cx="46" cy="30" r="13" fill="#2668FD" />
          <circle cx="74" cy="30" r="13" fill="#2668FD" />
          <circle cx="60" cy="36" r="7" fill="#F780D4" />
        </>
      )}
    </svg>
  );
}

export function WhyCards() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          const layers = gsap.utils.toArray<HTMLElement>(".why-layer");
          if (layers.length < 2) return;
          const contents = layers.map((l) =>
            l.querySelector<HTMLElement>(".why-content"),
          );
          // Deck (R1-05): every card has the same size and centre. Cards behind the
          // top one differ only by a small extra tilt and a <= 20px drop, and their
          // content is hidden, so they read as clean coloured rims, never as a
          // half-covered title or a stray icon.
          const deckRot = [0, 4, -5];
          const deck = (i: number) => ({
            rotate: deckRot[i] ?? 0,
            scale: 1,
            x: 0,
            y: Math.min(i, 2) * 10,
          });
          layers.forEach((el, i) => gsap.set(el, deck(i)));
          contents.forEach(
            (c, i) => c && gsap.set(c, { autoAlpha: i === 0 ? 1 : 0 }),
          );
          const dots = gsap.utils.toArray<HTMLElement>(".why-dot");
          const setActive = (n: number) =>
            dots.forEach((d, k) => d.toggleAttribute("data-active", k === n));
          setActive(0);

          const settles: number[] = [];
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: ".why-track",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                // Active card = the last one whose settle has started.
                const t = self.progress * (self.animation?.duration() ?? 0);
                setActive(settles.filter((s) => t >= s).length);
              },
            },
          });
          const seg = 1;
          const lead = 0.3; // hold on the first card
          const gap = 0.6; // hold on each settled card (clean resting state)
          tl.to({}, { duration: lead });
          layers.slice(0, -1).forEach((el, i) => {
            const at = lead + i * (seg + gap);
            const next = layers[i + 1];
            // Fling the top card up and to the left, off the stage.
            tl.to(
              el,
              {
                x: () => -window.innerWidth * 0.32,
                y: () => -window.innerHeight * 1.15,
                rotate: -18,
                ease: "power1.in",
                duration: seg,
              },
              at,
            );
            settles.push(at + seg * 0.45);
            // The next card straightens with a springy settle...
            tl.to(
              next,
              {
                rotate: 0,
                scale: 1,
                y: 0,
                ease: "back.out(2.2)",
                duration: seg * 0.8,
              },
              at + seg * 0.3,
            );
            // ...and shows its content only once the flung card has cleared its top
            // half (the flung card is ~520px up and 230px left by then).
            const c = contents[i + 1];
            if (c) {
              tl.fromTo(
                c,
                { autoAlpha: 0, y: 14 },
                {
                  autoAlpha: 1,
                  y: 0,
                  ease: "power2.out",
                  duration: seg * 0.35,
                  immediateRender: false,
                },
                at + seg * 0.5,
              );
            }
            // Cards further back shuffle one step forward.
            layers.slice(i + 2).forEach((back, k) => {
              tl.to(
                back,
                { ...deck(k + 1), ease: "power2.out", duration: seg * 0.8 },
                at + seg * 0.3,
              );
            });
          });
          tl.to({}, { duration: 0.5 }); // hold on the last card
          // Background blobs drift slower than the cards (depth while stuck).
          tl.fromTo(
            ".why-blob",
            { yPercent: 4 },
            { yPercent: -4, duration: tl.duration() },
            0,
          );
          return () => {
            gsap.set(layers, { clearProps: "transform" });
            gsap.set(contents.filter(Boolean) as HTMLElement[], {
              clearProps: "opacity,visibility,transform",
            });
            setActive(-1);
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="why-title"
      className="panel bg-mint panel-y text-forest lg:motion-safe:py-0"
    >
      {/* Flow layouts: panel blobs with scroll parallax. Stack mode: blobs live in
          the sticky stage (below) so their shapes match the visible window. */}
      <BlobSet tone="mint" flip className="lg:motion-safe:hidden" />

      {/* Tall track: in stack mode the stage sticks for (track - 100vh) of scroll. */}
      <div className={clsx("why-track relative", "lg:motion-safe:h-[280vh]")}>
        <div
          className={clsx(
            "relative",
            "lg:motion-safe:sticky lg:motion-safe:top-0 lg:motion-safe:flex lg:motion-safe:h-screen lg:motion-safe:items-center",
          )}
        >
          <BlobSet
            tone="mint"
            flip
            parallax={false}
            className="why-blob hidden lg:motion-safe:block"
          />
          {/* Clouds sit in the stage's empty corners, never over text. */}
          <Cloud
            size="m"
            delay={-6}
            className="absolute -top-12 right-[6%] md:-top-14 lg:motion-safe:top-[9%]"
          />
          <Cloud
            size="s"
            delay={-14}
            className="absolute -top-10 left-[5%] md:-top-12 lg:motion-safe:top-[14%] lg:motion-safe:left-[38%]"
          />
          <Cloud
            size="l"
            delay={-3}
            flip
            className="absolute bottom-[6%] left-[3%] hidden lg:motion-safe:block"
          />

          <div
            className={clsx(
              "relative container-x grid gap-head",
              "lg:motion-safe:grid-cols-[minmax(0,1fr)_400px] lg:motion-safe:items-center lg:motion-safe:gap-16",
            )}
          >
            <div
              className={clsx(
                "flex flex-col items-center text-center",
                "lg:motion-safe:items-start lg:motion-safe:pb-16 lg:motion-safe:text-left",
              )}
            >
              <Eyebrow tone="forest">Why Tamada</Eyebrow>
              <h2
                id="why-title"
                data-reveal="lines"
                className="mt-eyebrow max-w-[12ch] t-display-l"
              >
                Small videos. Big progress.
              </h2>
              <p
                data-reveal="rise"
                data-reveal-delay="0.15"
                className="mt-sub max-w-[30rem] t-body-l text-forest/80"
              >
                Built so you actually finish what you start, one bite‑size
                lesson at a time.
              </p>
              <div
                aria-hidden
                className="mt-cta hidden gap-2 lg:motion-safe:flex"
              >
                {cards.map((c) => (
                  <span
                    key={c.title}
                    className="why-dot size-3 rounded-full bg-forest/20 transition-[background-color,scale] duration-300 ease-spring data-[active]:scale-125 data-[active]:bg-forest"
                  />
                ))}
              </div>
            </div>

            <ul
              className={clsx(
                "relative mx-auto grid w-full max-w-[400px] gap-8 md:max-w-[640px] lg:max-w-none lg:grid-cols-3 lg:gap-6",
                "lg:motion-safe:mx-0 lg:motion-safe:block lg:motion-safe:h-[440px] lg:motion-safe:w-[400px]",
              )}
            >
              {cards.map((c, i) => (
                <li
                  key={c.title}
                  className={clsx(
                    "why-layer relative md:w-[440px] lg:w-auto",
                    i === 1 ? "md:justify-self-end" : "md:justify-self-start",
                    "lg:motion-safe:absolute lg:motion-safe:inset-0",
                  )}
                  style={{ zIndex: cards.length - i }}
                >
                  {/* Tilt + hover layer (H7). GSAP never animates it (a GSAP transform
                      tween writes inline rotate/translate: none on its target, which
                      would cancel these hover properties). */}
                  <div
                    className="group h-full transition-[translate,rotate] duration-[400ms] ease-spring hf:-translate-y-2 hf:[rotate:var(--untilt)]"
                    style={
                      {
                        transform: `rotate(${c.tilt}deg)`,
                        "--untilt": `${-c.tilt}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <article
                      data-reveal="card"
                      data-reveal-delay={String(i * 0.08)}
                      className={clsx(
                        "relative flex h-full flex-col items-center rounded-card-lg px-8 pt-11 pb-10 text-center",
                        "transition-shadow duration-[400ms] ease-ui group-hf:shadow-lift",
                        "lg:motion-safe:justify-center lg:motion-safe:rounded-[36px]",
                        c.bg,
                      )}
                    >
                      <div className="why-content flex flex-col items-center">
                        <h3
                          className={clsx(
                            "max-w-[12ch] t-service",
                            c.titleColor,
                          )}
                        >
                          {c.title}
                        </h3>
                        <div className="my-6 group-hf:animate-wiggle">
                          <ServiceIcon name={c.icon} />
                        </div>
                        <p
                          className={clsx(
                            "max-w-[30ch] text-[17px] leading-[1.38] font-medium",
                            c.bodyColor,
                          )}
                        >
                          {c.body}
                        </p>
                      </div>
                    </article>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
