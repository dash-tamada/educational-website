"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import clsx from "clsx";
import { courses, toneBg } from "@/lib/landing-data";
import { HandNote } from "@/components/decor/Bits";
import { Reveal } from "@/components/motion/Reveal";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Arrow({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous courses" : "Next courses"}
      className={clsx(
        "grid size-12 place-items-center rounded-full border-2 border-ink transition-transform hover:scale-110 active:scale-95",
        dir === "prev" ? "bg-paper" : "bg-ink text-paper",
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className={clsx("size-4", dir === "prev" && "rotate-180")}
        aria-hidden
      >
        <path
          d="M2 8 H13 M9 4 L13 8 L9 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function CourseCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("article");
    el.scrollBy({
      left: dir * ((card?.clientWidth ?? 320) + 20) * 2,
      behavior: "smooth",
    });
  };

  // Mouse drag-to-scroll (touch already scrolls natively).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = {
      down: true,
      x: e.clientX,
      left: track.current.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down || !track.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };

  return (
    <section
      id="courses"
      className="relative scroll-mt-24 bg-paper py-20 md:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <HandNote className="absolute top-0 left-4 hidden w-44 text-left md:block">
          Hand-picked new courses, every single month
        </HandNote>
        <Reveal>
          <h2 className="font-heading text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
            Fresh this month
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg font-medium text-ink/75">
            New courses land on the 1st. The first video of each one is on us.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl justify-end gap-2 px-4 md:px-8">
        <Arrow dir="prev" onClick={() => scrollBy(-1)} />
        <Arrow dir="next" onClick={() => scrollBy(1)} />
      </div>

      <div
        ref={track}
        className="no-scrollbar mt-6 flex cursor-grab snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pt-4 pb-10 active:cursor-grabbing md:scroll-px-8 md:px-8 xl:scroll-px-[calc(50vw-38rem)] xl:px-[calc(50vw-38rem)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {courses.map((c, i) => (
          <article
            key={c.slug}
            className={clsx(
              "group shadow-hard w-[78vw] max-w-[300px] shrink-0 snap-start rounded-[1.75rem] border-2 border-ink p-2.5 transition-transform duration-300 hover:-translate-y-2",
              toneBg[c.tone],
              i % 2 ? "md:rotate-1" : "md:-rotate-1",
            )}
          >
            <Link
              href={`/courses/${c.slug}`}
              draggable={false}
              className="block"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border-2 border-ink bg-ink">
                <Image
                  src={c.img}
                  alt=""
                  fill
                  draggable={false}
                  sizes="300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-2.5 left-2.5 rounded-md border-2 border-ink bg-lime px-2 pt-1 pb-0.5 font-display text-[8px] uppercase">
                  {c.badge}
                </span>
                <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-2.5 py-1 text-[11px] font-bold">
                  <span className="text-[8px]">▶</span> Free preview
                </span>
              </div>
              <div className="px-2 pt-4 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((t, j) => (
                    <span
                      key={t}
                      className={clsx(
                        "rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold",
                        j === 0 ? "bg-ink text-paper" : "bg-paper",
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 font-heading text-2xl leading-[1.05] font-extrabold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm font-medium text-ink/80">
                  {c.blurb}
                </p>
                <div className="mt-4 flex items-end justify-between gap-2 border-t-2 border-dashed border-ink/30 pt-3">
                  <div className="text-xs leading-snug font-semibold">
                    <div>{c.tutor}</div>
                    <div className="text-ink/65">
                      {c.modules} modules · {c.lessons} lessons
                    </div>
                  </div>
                  <span className="rounded-lg border-2 border-ink bg-paper px-2 py-1 font-heading text-lg leading-none font-extrabold">
                    {inr.format(c.price)}
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ))}
        <Link
          href="/courses"
          className="group grid w-[60vw] max-w-[240px] shrink-0 snap-start place-items-center rounded-[1.75rem] border-2 border-dashed border-ink p-6 text-center"
        >
          <span>
            <span className="block font-heading text-3xl leading-none font-extrabold tracking-tight">
              See all courses
            </span>
            <span className="mt-4 inline-grid size-14 place-items-center rounded-full border-2 border-ink bg-lime text-2xl transition-transform group-hover:rotate-45">
              ↗
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
