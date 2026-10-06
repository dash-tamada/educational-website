"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { Icon, Rating } from "@/components/app";
import type { Db } from "@/lib/mock";
import {
  LEVELS,
  PRICE_BUCKETS,
  RATING_OPTIONS,
  activeFilterCount,
  getCatalogLanguages,
  searchCatalog,
  type CatalogQuery,
} from "@/lib/mock/extra/catalog";

/**
 * Level / price / language / rating filters with live facet counts (how many
 * courses you'd see with that option, given the other filters). Used in the
 * desktop sidebar ("panel") and inside the phone/tablet filter sheet ("sheet"):
 * there each group is an accordion (48px header with the current choice), rows
 * are 48px tall with 22px controls and the counts sit on the right.
 */
export function FilterPanel({
  db,
  query,
  onChange,
  className,
  showTitle = true,
  variant = "panel",
}: {
  db: Db;
  query: CatalogQuery;
  onChange: (patch: Partial<CatalogQuery>) => void;
  className?: string;
  /** the drawer/sheet has its own title */
  showTitle?: boolean;
  variant?: "panel" | "sheet";
}) {
  const uid = useId();
  const sheet = variant === "sheet";
  const count = (patch: Partial<CatalogQuery>) => searchCatalog({ ...query, ...patch, page: 1 }, db).total;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const langs = getCatalogLanguages(db);
  const n = activeFilterCount({ ...query, category: "" });
  // sheet: Level opens by default, plus any group that already has a choice
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(["level", query.price && "price", query.langs.length && "lang", query.rating && "rating"].filter(Boolean) as string[]),
  );
  const flip = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const names = (vals: string[], from: readonly { value: string; label: string }[]) => vals.map((v) => from.find((x) => x.value === v)?.label ?? v).join(", ");
  const groupProps = (key: string, legend: string, summary: string) => ({ legend, sheet, summary, open: open.has(key), onToggle: () => flip(key), id: `${uid}-${key}` });

  return (
    <div className={clsx(sheet ? "-mx-1" : "space-y-5", className)}>
      {/* the drawer has its own title, and its Clear button lives in the footer */}
      {showTitle && !sheet && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="t-app-h3">Filters</h2>
          <button
            type="button"
            onClick={() => onChange({ levels: [], price: "", langs: [], rating: "" })}
            disabled={!n}
            className="rounded-full px-2 py-1 text-[13px] font-bold text-blue underline-offset-4 hf:underline disabled:pointer-events-none disabled:text-ink/35"
          >
            Clear{n ? ` (${n})` : ""}
          </button>
        </div>
      )}

      <Group {...groupProps("level", "Level", query.levels.length ? names(query.levels, LEVELS) : "Any level")}>
        {LEVELS.map((l) => {
          const checked = query.levels.includes(l.value);
          return (
            <CheckRow
              key={l.value}
              sheet={sheet}
              id={`${uid}-lv-${l.value}`}
              label={l.label}
              checked={checked}
              count={checked ? undefined : count({ levels: [l.value] })}
              onChange={() => onChange({ levels: toggle(query.levels, l.value) })}
            />
          );
        })}
      </Group>

      <Group {...groupProps("price", "Price", query.price ? names([query.price], PRICE_BUCKETS) : "Any price")}>
        <RadioRow sheet={sheet} name={`${uid}-price`} label="Any price" checked={!query.price} onChange={() => onChange({ price: "" })} />
        {PRICE_BUCKETS.map((b) => (
          <RadioRow
            key={b.value}
            sheet={sheet}
            name={`${uid}-price`}
            label={b.label}
            checked={query.price === b.value}
            count={count({ price: b.value })}
            onChange={() => onChange({ price: b.value })}
          />
        ))}
      </Group>

      <Group {...groupProps("lang", "Language", query.langs.length ? names(query.langs, langs) : "Any language")}>
        {langs.map((l) => {
          const checked = query.langs.includes(l.value);
          return (
            <CheckRow
              key={l.value}
              sheet={sheet}
              id={`${uid}-lg-${l.value}`}
              label={l.label}
              checked={checked}
              count={checked ? undefined : count({ langs: [l.value] })}
              onChange={() => onChange({ langs: toggle(query.langs, l.value) })}
            />
          );
        })}
      </Group>

      <Group {...groupProps("rating", "Rating", query.rating ? `${RATING_OPTIONS.find((r) => r.value === query.rating)?.label ?? query.rating} stars` : "Any rating")}>
        <RadioRow sheet={sheet} name={`${uid}-rating`} label="Any rating" checked={!query.rating} onChange={() => onChange({ rating: "" })} />
        {RATING_OPTIONS.map((r) => (
          <RadioRow
            key={r.value}
            sheet={sheet}
            name={`${uid}-rating`}
            label={
              <span className="inline-flex items-center gap-2">
                <Rating value={Number(r.value)} size="sm" showValue={false} />
                {r.label}
              </span>
            }
            checked={query.rating === r.value}
            count={count({ rating: r.value })}
            onChange={() => onChange({ rating: r.value })}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  legend,
  children,
  sheet,
  summary,
  open,
  onToggle,
  id,
}: {
  legend: string;
  children: React.ReactNode;
  sheet: boolean;
  summary: string;
  open: boolean;
  onToggle: () => void;
  id: string;
}) {
  if (!sheet) {
    return (
      <fieldset>
        <legend className="t-micro mb-1.5 tracking-[0.06em] text-ink/55 uppercase">{legend}</legend>
        <div>{children}</div>
      </fieldset>
    );
  }
  return (
    <div className="border-b border-ink/[0.07] last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="tap flex min-h-14 w-full items-center gap-3 rounded-tag px-1 text-left focus-visible:outline-offset-[-3px]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] leading-tight font-bold">{legend}</span>
            <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink/55">{summary}</span>
          </span>
          <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] transition-[rotate,background-color] duration-300 ease-ui", open && "rotate-180 bg-sun")} aria-hidden>
            <Icon name="chevron-down" className="size-4" strokeWidth={2.4} />
          </span>
        </button>
      </h3>
      <div id={`${id}-panel`} inert={!open} className={clsx("grid transition-[grid-template-rows] duration-300 ease-ui", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <fieldset className="pb-2">
            <legend className="sr-only">{legend}</legend>
            {children}
          </fieldset>
        </div>
      </div>
    </div>
  );
}

const rowCls = (sheet: boolean) =>
  clsx(
    "group flex cursor-pointer items-center gap-3 rounded-tag px-2 -mx-2 font-semibold transition-colors hf:bg-ink/[0.04]",
    sheet ? "min-h-12 text-[16px] active:bg-ink/[0.04]" : "min-h-10 text-[15px] lg:min-h-9",
  );
const Count = ({ n }: { n?: number }) =>
  n === undefined ? null : <span className={clsx("ml-auto text-[13px] font-bold tabular-nums", n ? "text-ink/45" : "text-ink/25")}>{n}</span>;

function CheckRow({ id, label, checked, count, onChange, sheet }: { id: string; label: React.ReactNode; checked: boolean; count?: number; onChange: () => void; sheet: boolean }) {
  return (
    <label htmlFor={id} className={clsx(rowCls(sheet), count === 0 && !checked && "opacity-55")}>
      <span className={clsx("relative grid shrink-0 place-items-center", sheet ? "size-[22px]" : "size-5")}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={clsx(
            "peer cursor-pointer appearance-none rounded-[6px] bg-white ring-1 ring-ink/25 transition-colors checked:bg-ink checked:ring-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue",
            sheet ? "size-[22px]" : "size-5",
          )}
        />
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute size-3.5 text-cream opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="min-w-0">{label}</span>
      <Count n={count} />
    </label>
  );
}

function RadioRow({ name, label, checked, count, onChange, sheet }: { name: string; label: React.ReactNode; checked: boolean; count?: number; onChange: () => void; sheet: boolean }) {
  return (
    <label className={clsx(rowCls(sheet), count === 0 && !checked && "opacity-55")}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className={clsx(
          "grid shrink-0 cursor-pointer appearance-none place-items-center rounded-full bg-white ring-1 ring-ink/25 transition-all before:size-2.5 before:scale-0 before:rounded-full before:bg-cream before:transition-transform before:content-[''] checked:bg-ink checked:ring-ink checked:before:scale-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue",
          sheet ? "size-[22px]" : "size-5",
        )}
      />
      <span className="min-w-0">{label}</span>
      <Count n={count} />
    </label>
  );
}
