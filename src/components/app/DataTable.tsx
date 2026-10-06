"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import clsx from "clsx";
import { Icon } from "./icons";
import { SearchInput, Select } from "./Form";
import { DropdownMenu, type MenuItem } from "./Overlay";
import { BottomSheet } from "./Sheet";
import { StickyActionBar } from "./StickyActionBar";
import { Button } from "./Button";
import { Pagination } from "./Navigation";
import { EmptyState, Skeleton } from "./Display";

/* =============================================================================
   DataTable: dense-but-calm table with client-side search, sort, pagination,
   selection + bulk actions, row action menus, loading and empty states. Scrolls
   horizontally on small screens (never the page).

   <DataTable
     caption="Orders"
     rows={orders}
     getRowId={(o) => o.id}
     columns={[
       { key: "number", header: "Order", cell: (o) => <Link href={`/admin/orders?o=${o.id}`}>{o.number}</Link>, sortValue: (o) => o.number, searchValue: (o) => o.number },
       { key: "learner", header: "Learner", cell: (o) => o.user?.name, searchValue: (o) => `${o.user?.name} ${o.user?.email}` },
       { key: "amount", header: "Amount", align: "right", cell: (o) => formatINR(o.amount), sortValue: (o) => o.amount },
       { key: "date", header: "Date", hideBelow: "md", cell: (o) => formatDate(o.createdAt), sortValue: (o) => o.createdAt },
     ]}
     search={{ placeholder: "Search orders" }}
     filters={<Select … />}
     toolbar={<Button size="sm" icon="download">Export</Button>}
     selectable bulkActions={(ids, clear) => <Button size="sm" onClick={…}>Refund {ids.length}</Button>}
     bulkNote={(ids) => noneRefundable(ids) ? "Already refunded" : null}
     rowActions={(o) => [{ label: "View order", icon: "eye", onSelect: () => open(o) }]}
     initialSort={{ key: "date", dir: "desc" }}
     pageSize={10}
     empty={{ title: "No orders yet", body: "They'll show up here." }}
   />

   Responsive columns. Viewport breakpoints (hideBelow) don't know about the
   dashboard sidebar, so a column can also fit the TABLE BOX instead:
   - `minBox: 720` shows that column only once the table's card is 720px wide.
   - `columns` may be a function of the measured box width, for layouts that
     restructure (e.g. a stacked first column on phones):
       columns={(box) => box !== null && box < 600 ? compactCols : fullCols}
   The box is measured before paint on the client; the server render (box =
   null) shows every column, i.e. the desktop layout.

   Bulk bar note. `bulkNote` (node, or a function of the selected ids) prints a
   short muted line on the dark bulk bar, e.g. why an action is disabled. It is
   a polite live region, and its id is handed to bulkActions as the third
   argument so a disabled button can point at it:
     bulkNote={(ids) => payable(ids) === 0 ? "Month still running" : null}
     bulkActions={(ids, clear, { noteId }) =>
       <Button disabled={!payable(ids)} aria-describedby={payable(ids) ? undefined : noteId}>Pay</Button>}

   PHONES (< 640px, MOBILE_SPEC §1.9): no sideways scrolling. The table renders as an
   inset grouped list: one white card, 64px+ rows, [leading] [title + meta] [trailing]
   [… actions]. Column roles (`mobile`) decide where each cell goes:
     mobile: "title" | "meta" | "trailing" | "badge" | "leading" | "hidden"
   When omitted: the first column is the title, the first right-aligned column is
   trailing, hideBelow columns are hidden, the rest join the meta line (" · ").
   `mobileCell` swaps a cell's content on phones; `mobileRow={(row) => …}` replaces a
   whole row's contents (it stays one tap target).
   Row tap = onRowClick / rowHref; rowActions = a 44px "…" button (ActionSheet on touch).
   Sorting: a "Sort" select appears when columns are sortable. Selection: a "Select"
   button toggles selection mode (checkboxes, row tap toggles); bulkActions move into a
   StickyActionBar ("3 selected"). Filters stay inline (they wrap) unless
   mobileFilters="sheet" (a "Filters (n)" button + BottomSheet; pass filterCount).
   Opt out per table with mobile="scroll" (genuine data grids keep the scrolling table).
   ============================================================================= */

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** enables sorting on this column */
  sortValue?: (row: T) => string | number | null | undefined;
  /** text this column contributes to the built-in search */
  searchValue?: (row: T) => string | null | undefined;
  align?: "left" | "right" | "center";
  /** CSS width, e.g. "140px" or "30%" */
  width?: string;
  /** hide below a VIEWPORT breakpoint (header and cells; the table still scrolls horizontally if needed) */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  /** show this column only when the table box (its card) is at least this many px wide.
   *  Container-aware, unlike hideBelow. Every column shows until the box is measured. */
  minBox?: number;
  /** extra classes for this column's header AND body cells (widths, min-widths, visibility) */
  className?: string;
  /** extra classes for this column's header cell only */
  headerClassName?: string;
  /** extra classes for this column's body cells only */
  cellClassName?: string;
  /** phones: where this cell goes in the list row (see header). Auto-mapped when omitted. */
  mobile?: "title" | "meta" | "trailing" | "badge" | "leading" | "hidden";
  /** phones: the cell to render instead of `cell` (e.g. a shorter date) */
  mobileCell?: (row: T) => React.ReactNode;
};

export type SortState = { key: string; dir: "asc" | "desc" };

const HIDE = { sm: "max-sm:hidden", md: "max-md:hidden", lg: "max-lg:hidden", xl: "max-xl:hidden" } as const;
const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function DataTable<T>({
  rows,
  columns: columnsProp,
  getRowId,
  caption,
  search,
  searchValue: searchControlled,
  onSearchChange,
  filters,
  toolbar,
  pageSize = 10,
  selectable,
  selected: selectedControlled,
  onSelectedChange,
  bulkActions,
  bulkNote,
  rowActions,
  rowLabel,
  getRowLabel,
  onRowClick,
  rowHref,
  loading,
  empty,
  initialSort,
  dense,
  stickyHeader,
  minWidth = 640,
  className,
  mobile = "cards",
  mobileRow,
  mobileFilters = "inline",
  filterCount,
}: {
  rows: T[];
  /** column list, or a function of the measured table-box width in px (null before measuring) */
  columns: Column<T>[] | ((boxWidth: number | null) => Column<T>[]);
  getRowId: (row: T) => string;
  /** accessible table caption (visually hidden) */
  caption: string;
  search?: boolean | { placeholder?: string };
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  filters?: React.ReactNode;
  toolbar?: React.ReactNode;
  /** 0 = no pagination */
  pageSize?: number;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  bulkActions?: (ids: string[], clear: () => void, meta: { noteId: string }) => React.ReactNode;
  /** short muted text on the bulk bar (e.g. why an action is disabled); null hides it */
  bulkNote?: React.ReactNode | ((ids: string[]) => React.ReactNode);
  rowActions?: (row: T) => MenuItem[];
  /** short name of a row for screen readers ("TM-25559") used in "Actions for …" / "Select …".
   *  Defaults to the first column's searchValue/sortValue. */
  rowLabel?: (row: T) => string;
  /** alias of rowLabel */
  getRowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  loading?: boolean;
  empty?: { title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode; art?: "tami" | "buddy" | "buddies" | "none" };
  /** starting sort. Changing it (by value) re-applies it; if the sorted column disappears from
   *  the column list the table falls back to this one. minBox-hidden columns keep sorting. */
  initialSort?: SortState;
  dense?: boolean;
  stickyHeader?: boolean;
  /** table min width in px before it scrolls horizontally (default 640) */
  minWidth?: number;
  className?: string;
  /** phones: "cards" (default) = grouped list rows; "scroll" = keep the scrolling table */
  mobile?: "cards" | "scroll";
  /** phones: render a whole row yourself (inside the tappable row shell) */
  mobileRow?: (row: T) => React.ReactNode;
  /** phones: "inline" (default) keeps `filters` in the toolbar; "sheet" moves them into a Filters sheet */
  mobileFilters?: "inline" | "sheet";
  /** phones (mobileFilters="sheet"): number of active filters shown on the button */
  filterCount?: number;
}) {
  const router = useTransitionRouter();

  // Width of the table's card (not the viewport): drives minBox and function columns.
  const box = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      setBoxWidth((p) => (p === w ? p : w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Every column the caller defined for this box (before minBox hides any): sorting reads from
  // this list, so a sorted column hidden by minBox keeps ordering the rows.
  const allColumns = useMemo(
    () => (typeof columnsProp === "function" ? columnsProp(boxWidth) : columnsProp),
    [columnsProp, boxWidth],
  );
  const columns = useMemo(
    () => (boxWidth === null ? allColumns : allColumns.filter((c) => !c.minBox || boxWidth >= c.minBox)),
    [allColumns, boxWidth],
  );
  const [qLocal, setQLocal] = useState("");
  const q = searchControlled ?? qLocal;
  const setQ = (v: string) => {
    onSearchChange?.(v);
    if (searchControlled === undefined) setQLocal(v);
    setPage(1);
  };
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  // Re-pick the sort when the caller's initialSort changes (compared by value, so a fresh object
  // literal each render is fine). Adjusting state during render: no extra effect pass.
  const initialKey = initialSort ? `${initialSort.key}:${initialSort.dir}` : "";
  const [seenInitial, setSeenInitial] = useState(initialKey);
  if (seenInitial !== initialKey) {
    setSeenInitial(initialKey);
    setSort(initialSort ?? null);
  }
  const [page, setPage] = useState(1);
  const [selLocal, setSelLocal] = useState<string[]>([]);
  const selected = selectedControlled ?? selLocal;
  const setSelected = (ids: string[]) => {
    onSelectedChange?.(ids);
    if (selectedControlled === undefined) setSelLocal(ids);
  };
  const bulkNoteId = `${useId()}-bulk-note`;
  const [selectMode, setSelectMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const cards = mobile === "cards";
  const bulkNoteNode = typeof bulkNote === "function" ? bulkNote(selected) : bulkNote;

  const filtered = useMemo(() => {
    if (!search || !q.trim() || onSearchChange) return rows;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      const hay = columns
        .map((c) => (c.searchValue ? c.searchValue(r) : c.sortValue ? String(c.sortValue(r) ?? "") : ""))
        .join(" ")
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, columns, q, search, onSearchChange]);

  // The sort actually applied. A null `sort` means "unsorted" (the user cycled it off). If the
  // sorted column no longer exists (a columns function swapped layouts), fall back to initialSort
  // when that column exists, instead of silently showing raw row order. The user's choice comes
  // back if its column does.
  const activeSort = useMemo<SortState | null>(() => {
    if (!sort) return null;
    const sortable = (key: string) => allColumns.some((c) => c.key === key && c.sortValue);
    if (sortable(sort.key)) return sort;
    return initialSort && sortable(initialSort.key) ? initialSort : null;
    // initialKey stands in for initialSort (compared by value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, allColumns, initialKey]);

  const sorted = useMemo(() => {
    if (!activeSort) return filtered;
    const col = allColumns.find((c) => c.key === activeSort.key);
    if (!col?.sortValue) return filtered;
    const dir = activeSort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "en", { numeric: true })) * dir;
    });
  }, [filtered, activeSort, allColumns]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const cur = Math.min(page, pageCount);
  const visible = pageSize ? sorted.slice((cur - 1) * pageSize, cur * pageSize) : sorted;
  const visibleIds = visible.map(getRowId);
  const allOnPage = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someOnPage = visibleIds.some((id) => selected.includes(id));

  // Cycles from what the header shows (activeSort), so a fallback sort toggles as expected.
  const toggleSort = (key: string) =>
    setSort(activeSort?.key !== key ? { key, dir: "asc" } : activeSort.dir === "asc" ? { key, dir: "desc" } : null);

  const nameOf = (row: T): string => {
    const label = rowLabel ?? getRowLabel;
    if (label) return label(row);
    for (const c of columns) {
      const v = c.searchValue?.(row) ?? c.sortValue?.(row);
      if (v != null && String(v).trim()) return String(v).trim().slice(0, 60);
    }
    return "";
  };

  // Horizontal scroll affordance: fade the hidden edge(s); the actions column stays pinned right.
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 2;
      const end = max - el.scrollLeft > 2;
      setEdges((p) => (p.start === start && p.end === end ? p : { start, end }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, []);
  const stickyCls = clsx("dt-sticky sticky right-0 z-[1]", edges.end && "shadow-[-10px_0_12px_-10px_rgb(22_22_22/0.22)]");

  const clickable = !!(onRowClick || rowHref);
  const onRow = (e: React.MouseEvent, row: T) => {
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=menu]")) return;
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };

  const cellPad = dense ? "px-3 py-2.5" : "px-4 py-3.5";
  const sortIcon = (active: boolean) => (
    <Icon
      name={active ? (activeSort!.dir === "asc" ? "arrow-up" : "arrow-down") : "sort"}
      className={clsx("size-3.5 shrink-0", !active && "opacity-40")}
      strokeWidth={2.6}
    />
  );
  const showToolbar = search || filters || toolbar;

  /* ---- phones: grouped list ------------------------------------------------ */
  const sortOptions = cards
    ? allColumns
        .filter((c) => c.sortValue)
        .flatMap((c) => {
          const name = typeof c.header === "string" ? c.header : c.key;
          const num = c.align === "right";
          return [
            { value: `${c.key}:asc`, label: `${name}: ${num ? "low to high" : "A to Z"}` },
            { value: `${c.key}:desc`, label: `${name}: ${num ? "high to low" : "Z to A"}` },
          ];
        })
    : [];
  type Role = NonNullable<Column<T>["mobile"]>;
  const roles: Role[] = (() => {
    let titleTaken = columns.some((c) => c.mobile === "title");
    let trailTaken = columns.some((c) => c.mobile === "trailing");
    return columns.map((c) => {
      if (c.mobile) return c.mobile;
      if (c.hideBelow) return "hidden";
      if (!titleTaken) {
        titleTaken = true;
        return "title";
      }
      if (!trailTaken && c.align === "right") {
        trailTaken = true;
        return "trailing";
      }
      return "meta";
    });
  })();
  const cellsFor = (row: T, role: Role) =>
    columns
      .map((c, i) => (roles[i] === role ? <span key={c.key}>{(c.mobileCell ?? c.cell)(row)}</span> : null))
      .filter(Boolean);
  const inSelect = selectable && selectMode;
  const toggleRow = (id: string, isSel: boolean) => setSelected(isSel ? selected.filter((x) => x !== id) : [...selected, id]);
  const onCard = (e: React.MouseEvent, row: T, id: string, isSel: boolean) => {
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=menu]")) return;
    if (inSelect) return toggleRow(id, isSel);
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };
  const phoneList = cards ? (
    <div className="rounded-card bg-white shadow-soft sm:hidden">
      <ul aria-label={caption} className="divide-y divide-ink/[0.06]">
        {loading &&
          Array.from({ length: Math.min(pageSize || 6, 6) }, (_, i) => (
            <li key={`sk${i}`} className="flex min-h-16 items-center gap-3 px-4 py-3.5">
              <Skeleton variant="circle" className="size-10" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-[60%] rounded-full" />
                <Skeleton className="mt-2 h-3 w-[40%] rounded-full" />
              </div>
            </li>
          ))}
        {!loading &&
          visible.map((row) => {
            const id = getRowId(row);
            const isSel = selected.includes(id);
            const name = nameOf(row);
            const leading = cellsFor(row, "leading");
            const title = cellsFor(row, "title");
            const meta = cellsFor(row, "meta");
            const trailing = cellsFor(row, "trailing");
            const badge = cellsFor(row, "badge");
            const tappable = inSelect || clickable;
            return (
              <li
                key={id}
                data-selected={isSel || undefined}
                onClick={tappable ? (e) => onCard(e, row, id, isSel) : undefined}
                className={clsx(
                  "relative flex min-h-16 items-center gap-3 py-3 pl-4",
                  rowActions && !inSelect ? "pr-1.5" : "pr-4",
                  isSel && "bg-butter/60",
                  tappable && "tap cursor-pointer active:bg-cream/70",
                )}
              >
                {inSelect && (
                  <label className="-m-2.5 grid size-11 shrink-0 cursor-pointer place-items-center">
                    <input
                      type="checkbox"
                      aria-label={name ? `Select ${name}` : "Select row"}
                      checked={isSel}
                      onChange={() => toggleRow(id, isSel)}
                      className="size-[22px] cursor-pointer accent-ink"
                    />
                  </label>
                )}
                {mobileRow ? (
                  <div className="min-w-0 flex-1">{mobileRow(row)}</div>
                ) : (
                  <>
                    {leading.length > 0 && <div className="flex shrink-0 items-center">{leading}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="min-w-0 text-[15px] leading-snug font-bold [overflow-wrap:anywhere]">{title}</div>
                      {meta.length > 0 && (
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-snug font-medium text-ink/65">
                          {meta.map((m, i) => (
                            <span key={i} className="inline-flex min-w-0 items-center gap-1.5">
                              {i > 0 && (
                                <span aria-hidden className="text-ink/35">
                                  ·
                                </span>
                              )}
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {(trailing.length > 0 || badge.length > 0) && (
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right text-[15px] font-bold tabular-nums">
                        {trailing}
                        {badge.length > 0 && <div className="flex flex-col items-end gap-1 text-[13px] font-semibold">{badge}</div>}
                      </div>
                    )}
                  </>
                )}
                {rowActions && !inSelect && (
                  <DropdownMenu
                    label={name ? `Actions for ${name}` : "Row actions"}
                    trigger={<Icon name="more" className="size-5" />}
                    items={rowActions(row)}
                    triggerClassName="tap grid size-11 shrink-0 place-items-center rounded-full text-ink/70 active:bg-ink/[0.06]"
                  />
                )}
              </li>
            );
          })}
      </ul>
      {!loading && visible.length === 0 && (
        <EmptyState
          compact
          art={empty?.art ?? "buddy"}
          tone="butter"
          title={q && rows.length ? "Nothing matches that search." : (empty?.title ?? "Nothing here yet.")}
          body={q && rows.length ? "Try a different word, or clear the filters." : empty?.body}
          action={q && rows.length ? undefined : empty?.action}
        />
      )}
    </div>
  ) : null;

  return (
    <div className={clsx("min-w-0", className)}>
      {showToolbar && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          {search && (
            <div className="w-full lg:max-w-[320px]">
              <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} placeholder={typeof search === "object" ? search.placeholder : "Search"} />
            </div>
          )}
          {filters && <div className={clsx("flex min-w-0 flex-wrap items-center gap-2", cards && mobileFilters === "sheet" && "max-sm:hidden")}>{filters}</div>}
          {toolbar && <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* phones: filters / sort / select row (list mode) */}
      {cards && ((filters && mobileFilters === "sheet") || sortOptions.length > 0 || selectable) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
          {filters && mobileFilters === "sheet" && (
            <Button variant="secondary" icon="filter" onClick={() => setFiltersOpen(true)} className="h-12">
              Filters{filterCount ? ` (${filterCount})` : ""}
            </Button>
          )}
          {sortOptions.length > 0 && (
            <Select
              aria-label="Sort by"
              value={activeSort ? `${activeSort.key}:${activeSort.dir}` : ""}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(":");
                setSort(key ? { key, dir: dir === "desc" ? "desc" : "asc" } : null);
                setPage(1);
              }}
              placeholder="Sort: default order"
              options={sortOptions}
              className="min-w-0 flex-1"
            />
          )}
          {selectable && (
            <Button
              variant={selectMode ? "primary" : "secondary"}
              onClick={() => {
                if (selectMode) setSelected([]);
                setSelectMode(!selectMode);
              }}
              className="h-12"
              aria-pressed={selectMode}
            >
              {selectMode ? "Done" : "Select"}
            </Button>
          )}
        </div>
      )}
      {cards && filters && mobileFilters === "sheet" && (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
          footer={
            <Button fullWidth className="h-12" onClick={() => setFiltersOpen(false)}>
              Show {sorted.length} result{sorted.length === 1 ? "" : "s"}
            </Button>
          }
        >
          <div className="flex flex-col gap-4 pb-2">{filters}</div>
        </BottomSheet>
      )}
      {cards && inSelect && (
        <StickyActionBar
          show
          title={selected.length ? `${selected.length} selected` : "Tap rows to select"}
          sub={
            <span id={`${bulkNoteId}-m`} aria-live="polite">
              {bulkNoteNode != null && bulkNoteNode !== false && bulkNoteNode !== "" ? bulkNoteNode : allOnPage ? "All on this page" : null}
            </span>
          }
          label="Selection actions"
        >
          {selected.length === 0 || !bulkActions ? (
            <Button variant="secondary" className="h-12" onClick={() => setSelected([...new Set([...selected, ...visibleIds])])}>
              Select all
            </Button>
          ) : (
            <Button className="h-12" iconRight="chevron-down" onClick={() => setBulkOpen(true)}>
              Actions
            </Button>
          )}
        </StickyActionBar>
      )}
      {cards && inSelect && bulkActions && (
        <BottomSheet open={bulkOpen && selected.length > 0} onClose={() => setBulkOpen(false)} title={`${selected.length} selected`} description={bulkNoteNode || undefined}>
          {/* the owner's bulk buttons, stacked full width; tapping one closes the sheet first */}
          <div
            className="flex flex-col gap-2 pb-2 [&_a]:h-12 [&_a]:w-full [&_button]:h-12 [&_button]:w-full"
            onClickCapture={(e) => {
              const b = (e.target as HTMLElement).closest("button,a");
              if (b && !b.hasAttribute("disabled") && b.getAttribute("aria-disabled") !== "true") window.setTimeout(() => setBulkOpen(false), 0);
            }}
          >
            {bulkActions(selected, () => setSelected([]), { noteId: `${bulkNoteId}-m` })}
          </div>
        </BottomSheet>
      )}

      {selectable && selected.length > 0 && (bulkActions || bulkNote != null) && (
        <div className={clsx("app-fade mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[24px] bg-ink py-1.5 pr-1.5 pl-4 text-cream", cards && "max-sm:hidden")}>
          <span className="text-[14px] font-bold">{selected.length} selected</span>
          <button type="button" onClick={() => setSelected([])} className="text-[13px] font-semibold text-cream/70 underline-offset-2 hf:underline">
            Clear
          </button>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-y-1.5">
            {/* always mounted so screen readers hear the note when it appears */}
            <span id={bulkNoteId} aria-live="polite" className="flex min-w-0 items-center">
              {bulkNoteNode != null && bulkNoteNode !== false && bulkNoteNode !== "" && (
                <span className="mr-1.5 flex min-w-0 items-center gap-1.5 px-1 text-[13px] leading-tight font-semibold text-cream/75">
                  <Icon name="info" className="size-4 shrink-0" />
                  <span className="min-w-0">{bulkNoteNode}</span>
                </span>
              )}
            </span>
            {bulkActions && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {bulkActions(selected, () => setSelected([]), { noteId: bulkNoteId })}
              </div>
            )}
          </div>
        </div>
      )}

      {phoneList}
      <div ref={box} className={clsx("relative rounded-card bg-white shadow-soft", cards && "max-sm:hidden")}>
      {edges.start && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-8 rounded-l-card bg-gradient-to-r from-white to-transparent" />}
      {edges.end && !rowActions && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-8 rounded-r-card bg-gradient-to-l from-white to-transparent" />}
      <div ref={scroller} className="app-scroll relative overflow-x-auto rounded-card" data-lenis-prevent="">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className={clsx(stickyHeader && "sticky top-0 z-[1]")}>
            <tr className="bg-cream/70">
              {selectable && (
                <th scope="col" className="w-12 py-3 pl-4">
                  <label className="-m-[3px] inline-grid size-6 cursor-pointer place-items-center align-middle">
                    <input
                      type="checkbox"
                      aria-label={allOnPage ? "Deselect all rows on this page" : "Select all rows on this page"}
                      checked={allOnPage}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPage && !allOnPage;
                      }}
                      onChange={() => setSelected(allOnPage ? selected.filter((id) => !visibleIds.includes(id)) : [...new Set([...selected, ...visibleIds])])}
                      className="size-[18px] cursor-pointer accent-ink"
                    />
                  </label>
                </th>
              )}
              {columns.map((c) => {
                const active = activeSort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (activeSort!.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                    className={clsx(cellPad, "t-micro font-bold whitespace-nowrap text-ink/70 uppercase", ALIGN[c.align ?? "left"], c.hideBelow && HIDE[c.hideBelow], c.className, c.headerClassName)}
                  >
                    {c.sortValue ? (
                      /* Block-level flex (w-fit + auto margins for alignment), not inline-flex: an
                         inline-flex button takes its baseline from its first item, so with the icon
                         first (right-aligned columns) the label sat ~3px higher than its neighbours. */
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={clsx(
                          "-my-1 flex min-h-6 w-fit items-center gap-1 rounded-md uppercase hf:text-ink",
                          active && "text-ink",
                          c.align === "right" && "ml-auto",
                          c.align === "center" && "mx-auto",
                        )}
                      >
                        {c.align === "right" && sortIcon(active)}
                        <span>{c.header}</span>
                        {c.align !== "right" && sortIcon(active)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th scope="col" className={clsx("w-14 bg-[#f8f5eb]", stickyCls)}>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: Math.min(pageSize || 6, 6) }, (_, i) => (
                <tr key={`sk${i}`} className="border-t border-ink/[0.06]">
                  {selectable && <td className="py-3 pl-4" />}
                  {columns.map((c) => (
                    <td key={c.key} className={clsx(cellPad, c.hideBelow && HIDE[c.hideBelow], c.className)}>
                      <Skeleton className="h-3.5 w-[70%] rounded-full" />
                    </td>
                  ))}
                  {rowActions && <td className={clsx("bg-white", stickyCls)} />}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => {
                const id = getRowId(row);
                const isSel = selected.includes(id);
                const name = nameOf(row);
                return (
                  <tr
                    key={id}
                    data-selected={isSel || undefined}
                    onClick={clickable ? (e) => onRow(e, row) : undefined}
                    className={clsx(
                      "dt-row border-t border-ink/[0.06] align-middle transition-colors duration-100",
                      isSel ? "bg-butter/60" : "hf:bg-cream/60",
                      clickable && "cursor-pointer",
                    )}
                  >
                    {selectable && (
                      <td className="py-3 pl-4">
                        <label className="-m-[3px] inline-grid size-6 cursor-pointer place-items-center align-middle">
                          <input
                            type="checkbox"
                            aria-label={name ? `Select ${name}` : "Select row"}
                            checked={isSel}
                            onChange={() => setSelected(isSel ? selected.filter((x) => x !== id) : [...selected, id])}
                            className="size-[18px] cursor-pointer accent-ink"
                          />
                        </label>
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={clsx(cellPad, "text-[14px] font-medium", ALIGN[c.align ?? "left"], c.hideBelow && HIDE[c.hideBelow], c.className, c.cellClassName)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className={clsx("pr-3 pl-1 text-right transition-colors duration-100", isSel ? "bg-[#fff7d4]" : "bg-white", stickyCls)}>
                        <DropdownMenu label={name ? `Actions for ${name}` : "Row actions"} trigger={<Icon name="more" className="size-5" />} items={rowActions(row)} />
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && visible.length === 0 && (
          <EmptyState
            compact
            art={empty?.art ?? "buddy"}
            tone="butter"
            title={q && rows.length ? "Nothing matches that search." : (empty?.title ?? "Nothing here yet.")}
            body={q && rows.length ? "Try a different word, or clear the filters." : empty?.body}
            action={q && rows.length ? undefined : empty?.action}
          />
        )}
      </div>
      </div>

      {pageSize > 0 && !loading && sorted.length > 0 && (
        <Pagination className="mt-4" page={cur} pageCount={pageCount} onChange={setPage} total={sorted.length} pageSize={pageSize} />
      )}
    </div>
  );
}
