"use client";

import Image from "next/image";
import { cropSrc } from "@/lib/img";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { categories } from "@/lib/landing-data";
import { gsap, useGSAP } from "@/lib/gsap";
import { BlobSet, HandNote } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Parallax } from "@/components/motion/Parallax";

/** Corner slots for the hover covers (H8): position + resting tilt. */
const SLOTS = [
  { pos: "left-[5%] top-[14%]", rotate: -8 },
  { pos: "right-[5%] top-[9%]", rotate: 6 },
  { pos: "left-[8%] bottom-[12%]", rotate: 7 },
  { pos: "right-[7%] bottom-[24%]", rotate: -6 },
] as const;

const rowClass = "t-chunky-list inline-block leading-[0.9]!";

/** Fine pointer only: touch never gets the hover swap or the covers. */
const FINE = "(hover: hover) and (pointer: fine)";
/** Hover is ignored for this long after the last scroll event (no flicker while scrolling). */
const SCROLL_IDLE = 140;

/**
 * One list row: chunky name that swaps to the handwritten face (H8). The swap is
 * driven by `on` (not :hover) and is strictly out-then-in: the outgoing face is
 * gone (110ms) before the incoming one starts, so two faces never overlap.
 */
function Row({
  href,
  label,
  index,
  on,
  onFocus,
  white,
}: {
  href: string;
  label: string;
  index: number;
  on: boolean;
  onFocus: () => void;
  white?: boolean;
}) {
  return (
    <Link
      href={href}
      data-cat-row={index}
      data-on={on ? "" : undefined}
      onFocus={onFocus}
      className={clsx(
        rowClass,
        "group tap relative rounded-[0.2em] px-[0.1em] focus-visible:outline-offset-[-0.05em]",
        white ? "text-white" : "text-ink",
      )}
    >
      <span className="inline-block opacity-100 transition-opacity delay-[110ms] duration-150 ease-out group-data-on:opacity-0 group-data-on:delay-0 group-data-on:duration-[110ms]">
        {label}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[0.06em] font-hand text-[1.08em] leading-none font-bold tracking-normal whitespace-nowrap text-white opacity-0 transition-opacity delay-0 duration-[110ms] ease-out [font-variation-settings:normal] group-data-on:opacity-100 group-data-on:delay-[110ms] group-data-on:duration-200"
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * Aardvark genre list as course categories, on a magenta inset panel with
 * lighter-magenta blobs. Alternate rows drift left/right with scroll; hovering a
 * row swaps it to the handwritten face and pops four course covers into the
 * panel corners (fine pointer only). Tami peeks from the bottom edge.
 */
export function CategoryList() {
  const root = useRef<HTMLElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const scrolledAt = useRef(0);

  // While the page scrolls (Lenis or native), rows passing under a resting cursor
  // must not trigger the hover: clear it and ignore pointer input until idle.
  useEffect(() => {
    const fine = window.matchMedia(FINE);
    if (!fine.matches) return;
    const onScroll = () => {
      scrolledAt.current = performance.now();
      setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onListMove = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "touch") return;
    // synthetic moves (content scrolled under the cursor) have no movement
    if (e.movementX === 0 && e.movementY === 0) return;
    if (performance.now() - scrolledAt.current < SCROLL_IDLE) return;
    const row = (e.target as Element).closest<HTMLElement>("[data-cat-row]");
    const idx = row ? Number(row.dataset.catRow) : null;
    setActive((a) => (a === idx ? a : idx));
  };

  // Covers drift a little toward the pointer (fine pointer + motion only).
  useGSAP(
    () => {
      const el = root.current!;
      const layer = thumbs.current!;
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const qx = gsap.quickTo(layer, "x", { duration: 0.6, ease: "power3" });
          const qy = gsap.quickTo(layer, "y", { duration: 0.6, ease: "power3" });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            qx(((e.clientX - r.left) / r.width - 0.5) * 32);
            qy(((e.clientY - r.top) / r.height - 0.5) * 32);
          };
          el.addEventListener("pointermove", move);
          return () => el.removeEventListener("pointermove", move);
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-cat-panel
      data-hovering={active !== null ? "" : undefined}
      aria-labelledby="categories-title"
      className="panel panel-y bg-magenta"
    >
      <BlobSet tone="magenta" flip />

      {/* hover covers: desktop + fine pointer only (display:none elsewhere, so
          the lazy images never download on touch devices) */}
      <div
        ref={thumbs}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 hidden [@media(hover:hover)_and_(pointer:fine)]:lg:block"
      >
        {SLOTS.map((slot, s) => (
          <div
            key={s}
            className={clsx("absolute h-[186px] w-[140px] xl:h-[226px] xl:w-[170px]", slot.pos)}
            style={{ transform: `rotate(${slot.rotate}deg)` }}
          >
            {categories.map((c, i) => (
              <div
                key={c.name}
                data-active={active === i ? "" : undefined}
                className="absolute inset-0 scale-[.4] overflow-hidden rounded-img bg-white p-1.5 opacity-0 shadow-photo transition-[scale,opacity,rotate] duration-150 ease-ui data-active:scale-100 data-active:opacity-100 data-active:duration-[450ms] data-active:ease-spring motion-safe:rotate-[10deg] motion-safe:data-active:rotate-0"
                style={{ transitionDelay: active === i ? `${90 + s * 40}ms` : "0ms" }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[10px]">
                  <Image src={cropSrc(c.thumbs[s], 186 / 140)} alt="" fill sizes="(min-width: 1280px) 170px, 140px" className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="container-x relative text-center">
        {/* the note only ever rises, so it never drifts onto the label below it */}
        <Parallax
          y={[0, -60]}
          rotate={[0, 5]}
          className="mx-auto mb-6 w-fit transition-opacity duration-300 lg:absolute lg:top-0 lg:left-[var(--gutter)] lg:mb-0 [[data-cat-panel][data-hovering]_&]:opacity-0"
        >
          <HandNote rotate={-6} className="max-w-[13rem] text-center lg:text-left">
            There&apos;s a course for every kind of curious
          </HandNote>
        </Parallax>

        <h2
          id="categories-title"
          className="font-heading text-[clamp(1.25rem,1.05rem+0.6vw,1.5rem)] leading-none font-extrabold tracking-[-0.02em]"
        >
          Choose from
        </h2>

        <ul
          data-cursor="grab"
          data-reveal-stagger="rise"
          className="mt-sub flex flex-col items-center"
          onPointerMove={onListMove}
          onPointerLeave={() => setActive(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
          }}
        >
          {categories.map((c, i) => (
            <Parallax
              key={c.name}
              as="li"
              trigger="[data-cat-panel]"
              x={i % 2 ? ["-2.4vw", "2.4vw"] : ["2.4vw", "-2.4vw"]}
              className="w-fit"
            >
              <Row
                href={`/courses?category=${encodeURIComponent(c.name.toLowerCase())}`}
                label={c.name}
                index={i}
                on={active === i}
                onFocus={() => setActive(i)}
              />
            </Parallax>
          ))}
          <Parallax
            as="li"
            trigger="[data-cat-panel]"
            x={categories.length % 2 ? ["-2.4vw", "2.4vw"] : ["2.4vw", "-2.4vw"]}
            className="w-fit"
          >
            <Row
              href="/courses"
              label="and more!"
              index={categories.length}
              on={active === categories.length}
              onFocus={() => setActive(categories.length)}
              white
            />
          </Parallax>
        </ul>
      </div>

      {/* Tami peeks up from the bottom edge */}
      <Parallax
        y={[36, -16]}
        rotate={[-4, 4]}
        className="absolute right-[8%] -bottom-6 z-0 w-[72px] md:-bottom-8 md:w-[110px] lg:right-[10%] lg:w-[140px]"
      >
        <Mascot interactive className="w-full" title="" style={{ transform: "rotate(-10deg)" }} />
      </Parallax>
    </section>
  );
}
