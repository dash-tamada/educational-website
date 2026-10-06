"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BottomSheet, Button, Drawer, EmptyState, Icon, Segmented, Select, useIsPhone } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { getCategory, type CourseSort } from "@/lib/mock";
import {
  EMPTY_QUERY,
  LEVELS,
  PRICE_BUCKETS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  getCatalogLanguages,
  searchCatalog,
  serializeCatalogQuery,
  type CatalogQuery,
} from "@/lib/mock/extra/catalog";
import { CatalogCard } from "./CatalogCard";
import { CategoryRail } from "./CategoryRail";
import { FilterPanel } from "./FilterPanel";
import { FitQuiz } from "./FitQuiz";
import { TrendingStrip } from "./TrendingStrip";
import { useCatalogQuery } from "./hooks";
import { PINNED_H, PinnedBar, pinnedTop, useHeaderState, usePersistentChoice } from "./mobile";

/** 6 fills whole rows in both the 2- and 3-column grids (no orphan card). */
const PAGE_SIZE = 6;
const VIEWS = ["list", "grid"] as const;

/** Everything under the catalog hero: categories, trending, filters, results, fit quiz. */
export function CatalogBrowser() {
  const db = useDb();
  const { query, setQuery } = useCatalogQuery();
  const phone = useIsPhone();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // phones: compact rows by default (>= 6 courses per screen), or the big cards; remembered per browser
  const [view, setView] = usePersistentChoice("tm-catalog-view", "list", VIEWS);
  // index of the first card revealed by "Show more": focus moves there so
  // keyboard users keep their place when the button disappears
  const focusFrom = useRef<number | null>(null);
  const grid = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const i = focusFrom.current;
    if (i === null) return;
    focusFrom.current = null;
    // list view renders a phone row and a card per item: focus the copy on screen
    const links = grid.current?.children[i]?.querySelectorAll<HTMLElement>("a[href]") ?? [];
    Array.from(links).find((a) => a.offsetParent !== null)?.focus();
  }, [query.page]);

  // phones/tablets: a pinned [Filters] [Sort] [n results] bar once the toolbar scrolls
  // under the header, until the results end
  const header = useHeaderState();
  const toolbar = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const t = toolbar.current;
      const r = results.current;
      if (!t || !r || window.innerWidth >= 1024) return setPinned(false);
      const top = pinnedTop(header);
      setPinned(t.getBoundingClientRect().bottom < top && r.getBoundingClientRect().bottom > top + PINNED_H + 120);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [header]);

  const result = searchCatalog(query, db, PAGE_SIZE);
  const isDefault = !query.q && activeFilterCount(query) === 0;
  const category = query.category ? getCategory(query.category, db) : null;
  const filterCount = activeFilterCount({ ...query, category: "" });
  const clearFilters = () => setQuery({ levels: [], price: "", langs: [], rating: "" });
  const resultKey = serializeCatalogQuery({ ...query, page: 1 });
  const countLabel = `${result.total} course${result.total === 1 ? "" : "s"}`;
  const list = view === "list";

  const heading = query.q ? (
    <>
      Results for <span className="text-hotpink">&ldquo;{query.q}&rdquo;</span>
    </>
  ) : category ? (
    category.name
  ) : (
    "All courses"
  );

  const chips = activeChips(query, db);
  const filterFooter = (
    <div className="flex w-full items-center gap-2">
      <Button variant="ghost" onClick={clearFilters} disabled={!filterCount} className="shrink-0 max-sm:h-12">
        Clear{filterCount ? ` (${filterCount})` : ""}
      </Button>
      <Button className="min-w-0 flex-1 max-sm:h-12" onClick={() => setFiltersOpen(false)}>
        {result.total === 0 ? "No courses match" : `Show ${countLabel}`}
      </Button>
    </div>
  );

  return (
    <div className="container-x pt-10 pb-section md:pt-14">
      <CategoryRail db={db} value={query.category} onChange={(slug) => setQuery({ category: slug })} />

      {isDefault && (
        <div className="mt-10 md:mt-12">
          <TrendingStrip db={db} />
        </div>
      )}

      <div id="results" className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 md:mt-14 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block" aria-label="Course filters">
          {/* sticky only on screens tall enough to show every option: no hidden inner scroll */}
          <div className="rounded-card bg-white p-5 shadow-soft [@media(min-height:860px)]:sticky [@media(min-height:860px)]:top-[calc(var(--header-offset)+8px)]">
            <FilterPanel db={db} query={query} onChange={(p) => setQuery(p)} />
          </div>
        </aside>

        <div ref={results} className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex w-full min-w-0 items-end justify-between gap-3 sm:w-auto">
              <div className="min-w-0">
                <h2 className="t-chunky-card">{heading}</h2>
                <p className="mt-1.5 text-[14px] font-semibold text-ink/60" aria-live="polite">
                  {result.total === 0 ? "No courses match yet" : countLabel}
                  {category && !query.q ? ` · ${category.description}` : ""}
                </p>
              </div>
              {result.total > 0 && (
                <Segmented
                  label="Layout"
                  value={view}
                  onChange={setView}
                  className="shrink-0 sm:hidden"
                  options={[
                    { value: "list", label: <Icon name="menu" className="size-5" />, ariaLabel: "List view" },
                    { value: "grid", label: <Icon name="grid" className="size-5" />, ariaLabel: "Card view" },
                  ]}
                />
              )}
            </div>
            <div ref={toolbar} className="flex w-full items-center gap-2 sm:w-auto">
              <Button variant="secondary" icon="filter" className="shrink-0 lg:hidden max-sm:h-12" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
                Filters{filterCount ? ` (${filterCount})` : ""}
              </Button>
              <label className="sr-only shrink-0 text-[13px] font-bold whitespace-nowrap text-ink/60 sm:not-sr-only sm:ml-1" htmlFor="catalog-sort">
                Sort by
              </label>
              <Select
                id="catalog-sort"
                className="min-w-0 flex-1 sm:w-[180px] sm:flex-none"
                value={query.sort}
                onChange={(e) => setQuery({ sort: e.target.value as CourseSort })}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => setQuery(c.remove)}
                    className="tap hit inline-flex h-8 items-center gap-1.5 rounded-full bg-ink py-1 pr-2 pl-3 text-[13px] font-bold text-cream transition-colors max-sm:h-9 hf:bg-ink/85"
                    aria-label={`Remove filter: ${c.label}`}
                  >
                    {c.label}
                    <Icon name="x" className="size-3.5" strokeWidth={2.6} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setQuery({ ...EMPTY_QUERY, sort: query.sort })} className="hit rounded-full px-2 py-1 text-[13px] font-bold text-blue underline-offset-4 max-sm:min-h-9 hf:underline">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          <div key={resultKey} className="app-fade mt-6 max-sm:mt-5">
            {result.total === 0 ? (
              <div className="rounded-card-lg bg-white shadow-soft">
                <EmptyState
                  title="No rabbit hole found."
                  body={query.q ? `Nothing matches “${query.q}” with these filters. Try a broader search or browse the fresh drops.` : "Try a broader search or browse the fresh drops."}
                  action={
                    <>
                      <Button onClick={() => setQuery({ ...EMPTY_QUERY })}>Clear search and filters</Button>
                      <Button variant="secondary" onClick={() => setQuery({ ...EMPTY_QUERY, sort: "newest" })}>
                        See fresh drops
                      </Button>
                    </>
                  }
                />
              </div>
            ) : (
              <ul ref={grid} className={clsx("grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-3", list ? "gap-3" : "gap-4")}>
                {result.items.map((c, i) => (
                  <li key={c.id} className={i >= (query.page - 1) * PAGE_SIZE && query.page > 1 ? "app-enter" : undefined}>
                    {list ? (
                      <>
                        {/* phones: compact row; from sm the grid card (CSS, so the server markup never jumps) */}
                        <div className="sm:hidden">
                          <CatalogCard courseId={c.id} compact />
                        </div>
                        <div className="h-full max-sm:hidden">
                          <CatalogCard courseId={c.id} priority={i < 3} />
                        </div>
                      </>
                    ) : (
                      <CatalogCard courseId={c.id} priority={i < 3} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.total > 0 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-[13px] font-semibold text-ink/60">
                Showing {result.shown} of {result.total}
              </p>
              {result.shown < result.total && (
                <Button
                  variant="secondary"
                  size="lg"
                  icon="plus"
                  className="max-sm:w-full"
                  onClick={() => {
                    focusFrom.current = result.shown;
                    setQuery({ page: query.page + 1 });
                  }}
                >
                  Show more courses
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-section">
        <FitQuiz db={db} />
      </div>

      {/* phones/tablets: filters + sort stay one tap away while browsing the results */}
      <PinnedBar show={pinned && !filtersOpen} header={header} label="Filter and sort courses">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className="tap inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-bold text-cream"
        >
          <Icon name="filter" className="size-[18px]" />
          Filters
          {filterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[12px] leading-none text-ink">{filterCount}</span>}
        </button>
        <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-full transition-colors focus-within:bg-ink/[0.05] active:bg-ink/[0.05]">
          <span className="sr-only">Sort courses</span>
          <Icon name="sort" className="pointer-events-none absolute left-3 size-[18px] text-ink/60" />
          <select
            value={query.sort}
            onChange={(e) => setQuery({ sort: e.target.value as CourseSort })}
            className="h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent pr-8 pl-9 text-[16px] font-bold text-ink focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-blue"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute right-3 size-4 text-ink/60" strokeWidth={2.4} />
        </label>
        <span className="shrink-0 pr-3 text-[13px] font-bold whitespace-nowrap text-ink/55 phone-s:hidden" aria-hidden>
          {result.total} result{result.total === 1 ? "" : "s"}
        </span>
      </PinnedBar>

      {phone ? (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filter courses"
          description={result.total === 0 ? "Nothing matches these filters yet." : `${countLabel} match right now.`}
          detent="full"
          footer={filterFooter}
          footerLayout="row"
        >
          <FilterPanel db={db} query={query} onChange={(p) => setQuery(p)} showTitle={false} variant="sheet" />
        </BottomSheet>
      ) : (
        <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter courses" width={400} footer={filterFooter}>
          <FilterPanel db={db} query={query} onChange={(p) => setQuery(p)} showTitle={false} />
        </Drawer>
      )}
    </div>
  );
}

function activeChips(q: CatalogQuery, db: ReturnType<typeof useDb>) {
  const out: { key: string; label: string; remove: Partial<CatalogQuery> }[] = [];
  if (q.q) out.push({ key: "q", label: `“${q.q}”`, remove: { q: "" } });
  if (q.category) out.push({ key: "cat", label: getCategory(q.category, db)?.name ?? q.category, remove: { category: "" } });
  for (const l of q.levels) out.push({ key: `lv-${l}`, label: LEVELS.find((x) => x.value === l)?.label ?? l, remove: { levels: q.levels.filter((x) => x !== l) } });
  if (q.price) out.push({ key: "price", label: PRICE_BUCKETS.find((b) => b.value === q.price)?.label ?? q.price, remove: { price: "" } });
  const langs = getCatalogLanguages(db);
  for (const l of q.langs) out.push({ key: `lg-${l}`, label: langs.find((x) => x.value === l)?.label ?? l, remove: { langs: q.langs.filter((x) => x !== l) } });
  if (q.rating) out.push({ key: "rating", label: `${RATING_OPTIONS.find((r) => r.value === q.rating)?.label ?? q.rating} stars`, remove: { rating: "" } });
  return out;
}
