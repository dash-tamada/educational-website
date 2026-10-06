"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Icon, useOverflowFade } from "@/components/app";
import { toneBg, toneText } from "@/lib/landing-data";
import { getCategories, getCategoryCounts, type Db } from "@/lib/mock";

/**
 * Colourful category chips. Below lg a snap scroller that bleeds to the gutter,
 * with an edge fade on whichever side has more chips and the active chip centred;
 * wraps from lg. Acts as the category filter (aria-pressed); "All" clears it.
 */
export function CategoryRail({ db, value, onChange }: { db: Db; value: string; onChange: (slug: string) => void }) {
  const cats = getCategories(db);
  const counts = getCategoryCounts(db);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const chips = [{ slug: "", name: "All courses", icon: "grid", tone: "ink" as const, count: total }, ...cats.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, tone: c.tone, count: counts[c.id] ?? 0 }))];
  const rail = useRef<HTMLDivElement>(null);
  useOverflowFade(rail, chips.length);

  // the active chip slides to the middle of the rail (on load and on change)
  const first = useRef(true);
  useEffect(() => {
    const el = rail.current;
    const chip = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !chip || el.scrollWidth <= el.clientWidth) return;
    const left = chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, left), behavior: first.current || reduce ? "auto" : "smooth" });
    first.current = false;
  }, [value]);

  return (
    <div
      ref={rail}
      role="group"
      aria-label="Filter by category"
      className="-mx-gutter snap-x snap-mandatory scroll-px-gutter overflow-x-auto overscroll-x-contain px-gutter no-scrollbar lg:mx-0 lg:snap-none lg:overflow-visible lg:px-0 lg:[mask-image:none]"
    >
      <ul className="flex w-max gap-2 py-1 lg:w-auto lg:flex-wrap">
        {chips.map((c) => {
          const active = value === c.slug;
          return (
            <li key={c.slug || "all"} className="snap-start">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(active && c.slug ? "" : c.slug)}
                className={clsx(
                  "tap group flex h-12 items-center gap-2.5 rounded-full py-1 pr-4 pl-1 text-[14.5px] font-bold whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-ui",
                  active ? "bg-ink text-cream" : "bg-white text-ink shadow-soft hf:shadow-lift",
                )}
              >
                <span className={clsx("grid size-10 place-items-center rounded-full", active && c.tone === "ink" ? "bg-sun text-ink" : [toneBg[c.tone], toneText[c.tone]])} aria-hidden>
                  <Icon name={c.icon} className="size-[18px]" strokeWidth={2.2} />
                </span>
                {c.name}
                <span className={clsx("text-[12.5px] font-bold tabular-nums", active ? "text-cream/60" : "text-ink/45")}>{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
