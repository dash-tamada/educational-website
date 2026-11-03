"use client";

import clsx from "clsx";
import { FILMS_PAGE } from "@/lib/content/films";

export type FilmsView = "canvas" | "grid";

/* Canvas / Grid switch (tiny caps, Mobius). Two toggle buttons in a labelled group;
   the active one carries a red square and aria-pressed. */
export function ViewToggle({ view, onChange, className }: { view: FilmsView; onChange: (v: FilmsView) => void; className?: string }) {
  return (
    <div role="group" aria-label="View" className={clsx("flex items-center gap-1", className)}>
      <span aria-hidden className="t-timecode mr-3 text-ash">
        View
      </span>
      {(["canvas", "grid"] as const).map((v) => {
        const on = view === v;
        return (
          <button
            key={v}
            type="button"
            data-view-btn={v}
            aria-pressed={on}
            onClick={() => onChange(v)}
            className={clsx(
              "t-label tap hit flex h-9 items-center gap-2 border px-3.5 transition-colors duration-300",
              on ? "border-line-strong text-fg" : "border-transparent text-muted hf:text-fg",
            )}
          >
            <span aria-hidden className={clsx("block size-[6px] transition-colors duration-300", on ? "bg-red" : "bg-current opacity-40")} />
            {FILMS_PAGE.views[v]}
          </button>
        );
      })}
    </div>
  );
}
