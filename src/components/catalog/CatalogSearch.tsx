"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/app";
import { POPULAR_SEARCHES } from "@/lib/mock/extra/catalog";
import { useCatalogQuery } from "./hooks";

/** Scroll the results into view (Lenis honours scroll-margin on [id]). */
export function scrollToResults() {
  const el = document.getElementById("results");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Big hero search. Debounced (250ms) into ?q=; Enter commits at once and jumps
 * to the results. Stays in sync when the URL changes elsewhere (chips, clear all).
 */
export function CatalogSearch() {
  const { query, setQuery } = useCatalogQuery();
  const [text, setText] = useState(query.q);
  const [synced, setSynced] = useState(query.q);
  const input = useRef<HTMLInputElement>(null);
  // Scroll once the URL-driven re-render has landed: the Trending strip unmounts
  // when a search starts, so measuring #results before that overshoots.
  const pendingScroll = useRef(false);
  const commit = (q: string, scroll: boolean) => {
    const changed = q.trim() !== query.q.trim();
    setQuery({ q });
    if (!scroll) return;
    if (changed) pendingScroll.current = true;
    else requestAnimationFrame(scrollToResults);
  };
  useEffect(() => {
    if (!pendingScroll.current) return;
    pendingScroll.current = false;
    const raf = requestAnimationFrame(scrollToResults);
    return () => cancelAnimationFrame(raf);
  }, [query.q]);

  // URL changed from somewhere else (clear filters, header search): mirror it.
  if (query.q !== synced) {
    setSynced(query.q);
    setText(query.q);
  }

  useEffect(() => {
    if (text.trim() === query.q.trim()) return;
    const h = window.setTimeout(() => setQuery({ q: text }), 250);
    return () => window.clearTimeout(h);
  }, [text, query.q, setQuery]);

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
          commit(text, true);
        }}
        className="relative max-w-[40rem]"
      >
        <label htmlFor="catalog-search" className="sr-only">
          Search courses
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-5 size-[22px] -translate-y-1/2 text-ink/50" strokeWidth={2.4} />
        <input
          ref={input}
          id="catalog-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search “money”, “design”…"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          className="h-14 w-full rounded-full bg-white pr-14 pl-14 sm:pr-[7.5rem] text-[16px] font-semibold text-ink shadow-soft transition-shadow duration-200 ease-ui placeholder:font-medium placeholder:text-ink/45 focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-blue md:h-16 md:text-[17px] [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setQuery({ q: "" });
                input.current?.focus();
              }}
              aria-label="Clear search"
              className="grid size-10 place-items-center rounded-full text-ink/55 transition-colors hf:bg-ink/[0.06] hf:text-ink"
            >
              <Icon name="x" className="size-[18px]" strokeWidth={2.4} />
            </button>
          )}
          <button type="submit" className="tap hidden h-10 rounded-full sm:block bg-ink px-4 text-[14px] font-bold text-cream transition-colors hf:bg-ink/85 md:h-12 md:px-5 md:text-[15px]">
            Search
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="t-tag mr-0.5 opacity-70">Try</span>
        {POPULAR_SEARCHES.map((s) => {
          const active = query.q.toLowerCase() === s.toLowerCase();
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setText(active ? "" : s);
                commit(active ? "" : s, !active);
              }}
              className={clsx(
                "tap rounded-full px-3 py-[7px] text-[13px] font-bold transition-colors duration-150",
                active ? "bg-ink text-cream" : "bg-white/70 text-ink hf:bg-white",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
