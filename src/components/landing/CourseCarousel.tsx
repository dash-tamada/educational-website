"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { courses, toneBg, type Tone } from "@/lib/landing-data";
import { ArrowDot, HandNote, Sparkle, Tag } from "@/components/decor/Bits";
import { Parallax, ParallaxImage } from "@/components/motion/Parallax";

/* =============================================================================
   "Fresh this month": Aardvark colour-card carousel on the cream canvas.
   - Header row on .container-x: chunky heading + hand note left, arrows right.
   - The track starts on the container's left edge and bleeds right.
   - Cards: flat colour frame (radius 24, padding 12/12/18), image in frame drifts
     (ParallaxImage), per-card depth drift (Parallax), rise reveal, H5 hover.
   ============================================================================= */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Card text colour: ink on every light Aardvark frame, white on the dark ones. */
const darkFrames = new Set<Tone>([
  "blue",
  "green",
  "purple",
  "indigo",
  "flame",
  "hotpink",
  "forest",
]);
const badgeTone: Record<string, Tone> = {
  BESTSELLER: "hotpink",
  NEW: "green",
  "JUST DROPPED": "blue",
};
/** Resting tilts (inline, so GSAP reveals and hover `rotate` compose with them). */
const tilt = [-1.25, 1, -0.5, 1.25, -1, 0.75, -1.25];
/** Depth drift per card (px, +n -> -n across the section): alternating speeds. */
const depth = [10, 22, 14, 26, 12, 24, 16];

/* Track inset: the first card sits on the .container-x column. 100% = section width. */
const TRACK_INSET = "max(var(--gutter), (100% - var(--container)) / 2)";
/* Room above/below the cards inside the scroller (hover lift, doodle, depth drift). */
const TRACK_PAD = 48;

function ArrowGlyph({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={clsx(
        "size-5 transition-[translate] duration-200 ease-spring",
        dir === "prev"
          ? "group-hf:-translate-x-[3px]"
          : "group-hf:translate-x-[3px]",
      )}
    >
      <path
        d={
          dir === "prev"
            ? "M19.5 12h-14M11 6l-6 6 6 6"
            : "M4.5 12h14M13 6l6 6-6 6"
        }
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous courses" : "Next courses"}
      className={clsx(
        "group tap grid size-12 place-items-center rounded-full transition-[scale,background-color,color] duration-200 ease-spring md:size-[54px]",
        disabled
          ? "cursor-default bg-ink/10 text-ink/35"
          : "bg-ink text-cream hf:scale-[1.08]",
      )}
    >
      <ArrowGlyph dir={dir} />
    </button>
  );
}

function CourseCard({ c, i }: { c: (typeof courses)[number]; i: number }) {
  const dark = darkFrames.has(c.tone);
  return (
    <Parallax
      as="li"
      y={depth[i % depth.length]}
      mobile={0.4}
      className="w-[min(78vw,300px)] shrink-0 snap-start"
    >
      {/* Tilt + hover layer (H5). GSAP never animates it: a GSAP transform tween
          writes inline `rotate/scale/translate: none` on its target, which would
          cancel the hover's independent rotate/translate. */}
      <div
        className="group hover-tilt hover-zoom-parent h-full"
        style={{ transform: `rotate(${tilt[i % tilt.length]}deg)` }}
      >
        {/* Reveal on the card itself; the Parallax layer above it moves separately. */}
        <article
          data-reveal="rise"
          data-reveal-delay={String(Math.min(i, 4) * 0.07)}
          className={clsx(
            "relative h-full rounded-card p-3 pb-[18px] transition-shadow duration-[350ms] ease-ui group-hf:shadow-lift",
            toneBg[c.tone],
            dark ? "text-white" : "text-ink",
          )}
        >
          {/* H5 doodle: pops above the top-right corner on hover */}
          <Sparkle
            fill="#FF008C"
            className="pointer-events-none absolute -top-4 -right-3 z-10 size-9 scale-0 transition-[scale] duration-[450ms] ease-spring group-hf:scale-100"
          />
          <Link
            href={`/courses/${c.slug}`}
            draggable={false}
            className="block rounded-[1.1rem] focus-visible:outline-offset-[6px]"
          >
            <div className="relative overflow-hidden rounded-img bg-ink">
              <ParallaxImage
                src={c.img}
                alt=""
                sizes="300px"
                amount={6}
                className="aspect-[5/6]"
                imgClassName="hover-zoom"
              />
              <Tag
                tone={badgeTone[c.badge] ?? "white"}
                className="absolute top-3 left-3 tracking-[0.04em] uppercase"
              >
                {c.badge}
              </Tag>
              {/* "Watch free" split pill: always visible on touch / reduced motion,
                slides up from the frame bottom on hover for fine pointers. */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-3 flex justify-center gap-1 transition-[translate] duration-[450ms] ease-spring group-hf:translate-y-0! [@media(hover:hover)_and_(pointer:fine)_and_(prefers-reduced-motion:no-preference)]:translate-y-[160%]"
              >
                <span className="grid h-9 place-items-center rounded-full bg-hotpink px-4 t-tag text-[13px] text-white">
                  Watch 1st video free
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-hotpink text-white">
                  <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                  </svg>
                </span>
              </span>
            </div>

            <div className="px-1.5 pt-3.5">
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t, j) => (
                  <span
                    key={t}
                    className="inline-flex transition-[scale] duration-[450ms] ease-spring group-hf:scale-[1.08]"
                    style={{ transitionDelay: `${j * 60}ms` }}
                  >
                    <Tag
                      tone={
                        j === 0
                          ? dark
                            ? "white"
                            : "ink"
                          : dark
                            ? "ink"
                            : "white"
                      }
                    >
                      {t}
                    </Tag>
                  </span>
                ))}
              </div>
              <h3 className="mt-3 t-chunky-card">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.35] font-medium opacity-80">
                {c.blurb}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0 text-[13px] leading-[1.3] font-semibold">
                  <div className="truncate">{c.tutor}</div>
                  <div className="opacity-70">
                    {c.modules} modules · {c.lessons} lessons
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 pt-[7px] pb-[6px] font-heading text-[17px] leading-none font-extrabold tracking-[-0.02em] text-ink">
                  {inr.format(c.price)}
                </span>
              </div>
            </div>
          </Link>
        </article>
      </div>
    </Parallax>
  );
}

export function CourseCarousel() {
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [edge, setEdge] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft >= max - 4;
    setEdge((p) => (p.start === start && p.end === end ? p : { start, end }));
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const step = card.getBoundingClientRect().width + 20;
    const visible = Math.max(1, Math.floor((el.clientWidth * 0.9) / step) - 1);
    el.scrollBy({ left: dir * step * visible, behavior: "smooth" });
  };

  // Mouse drag-to-scroll (touch already scrolls natively). Snap is paused while
  // dragging so the track follows the pointer 1:1, then snaps on release.
  const onPointerDown = (e: React.PointerEvent) => {
    const el = track.current;
    if (e.pointerType !== "mouse" || e.button !== 0 || !el) return;
    drag.current = {
      down: true,
      x: e.clientX,
      left: el.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = track.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      el.style.scrollSnapType = "none";
      el.setAttribute("data-cursor", "grabbing");
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const el = track.current;
    if (!drag.current.down || !el) return;
    drag.current.down = false;
    el.setAttribute("data-cursor", "grab");
    if (drag.current.moved) {
      // Restore snapping and settle on the nearest card smoothly.
      const step =
        (el.querySelector("li")?.getBoundingClientRect().width ?? 300) + 20;
      const target = Math.round(el.scrollLeft / step) * step;
      el.style.scrollSnapType = "";
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  };

  return (
    <section
      id="courses"
      aria-labelledby="courses-title"
      className="relative pt-section"
      style={{
        paddingBottom: `max(24px, calc(var(--section-y) - ${TRACK_PAD}px))`,
      }}
    >
      <div className="relative z-10 container-x">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <h2
                id="courses-title"
                data-reveal="lines"
                className="t-chunky-xl"
              >
                Fresh this month
              </h2>
              <Parallax
                y={36}
                rotate={[3, -3]}
                className="hidden w-[13.5rem] pb-1 lg:block"
              >
                <HandNote rotate={-7}>
                  Hand-picked new courses, every single month
                </HandNote>
              </Parallax>
            </div>
            <p
              data-reveal="rise"
              data-reveal-delay="0.15"
              className="mt-sub max-w-[40rem] t-body-l text-ink/75"
            >
              New courses land on the 1st. The first video of every one is on
              us.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Arrow
              dir="prev"
              disabled={edge.start}
              onClick={() => scrollByCards(-1)}
            />
            <Arrow
              dir="next"
              disabled={edge.end}
              onClick={() => scrollByCards(1)}
            />
          </div>
        </div>
      </div>

      <ul
        ref={track}
        data-cursor="grab"
        aria-label="New courses"
        className="relative no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain select-none"
        style={{
          paddingInline: TRACK_INSET,
          scrollPaddingInline: TRACK_INSET,
          paddingBlock: TRACK_PAD,
          marginTop: `calc(var(--gap-block) - ${TRACK_PAD}px)`,
        }}
        onScroll={updateEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {courses.map((c, i) => (
          <CourseCard key={c.slug} c={c} i={i} />
        ))}
        <li className="w-[min(60vw,240px)] shrink-0 snap-start">
          <Link
            href="/courses"
            draggable={false}
            className="group hover-lift flex h-full flex-col items-center justify-center gap-5 rounded-card bg-white p-6 text-center shadow-soft"
          >
            <span className="t-chunky-card">
              See all
              <br />
              courses
            </span>
            <ArrowDot
              tone="hotpink"
              className="size-14 transition-[rotate] duration-300 ease-spring group-hf:-rotate-45"
            />
          </Link>
        </li>
      </ul>
    </section>
  );
}
