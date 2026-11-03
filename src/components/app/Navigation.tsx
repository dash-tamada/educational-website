"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./icons";

/* =============================================================================
   Tabs (state or URL driven) and Pagination, design system v2.
   Tabs default to the editorial UNDERLINE row: Inter labels on a hairline, the active
   tab in ink with a 2px red rule under it, counts in mono. variant="pill" gives Mobius
   chips (outlined pills, the active one filled ink) for filter rows.

     const [tab, setTab] = useState("progress");
     <Tabs label="Your courses" value={tab} onChange={setTab}
       items={[{ id: "progress", label: "In progress", count: 3 }, { id: "done", label: "Completed", count: 2 }]} />
     <TabPanel id="progress" active={tab}>…</TabPanel>

     URL tabs (each tab is a link; instant inside app areas):
     <Tabs label="Status" value={status} items={[{ id: "all", label: "All", href: "/tutor/courses" }, …]} />

     <Pagination page={page} pageCount={pageCount} onChange={setPage} />
     <Pagination page={page} pageCount={n} hrefFor={(p) => `/admin/orders?page=${p}`} />
   ============================================================================= */

/**
 * Fade whichever edge of a horizontally scrollable row hides content, so the row
 * reads as "scroll for more". Sets data-overflow="start|end|both" on the element
 * (styled in globals.css, [data-overflow]); removes it when nothing is hidden.
 * Tabs uses it internally; use it for any custom pill row or chip strip:
 *
 *   const nav = useRef<HTMLElement>(null);
 *   useOverflowFade(nav);
 *   <nav ref={nav} className="no-scrollbar flex overflow-x-auto">…</nav>
 *
 * `key` re-attaches the listeners when the row's content changes (e.g. items.length).
 * The fade is a mask-image on the element itself, so its own background fades too:
 * put the ref on the scrolling row, not on a padded card around it.
 */
export function useOverflowFade(ref: React.RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 2;
      const end = max - el.scrollLeft > 2;
      const v = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (v) el.setAttribute("data-overflow", v);
      else el.removeAttribute("data-overflow");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", schedule, { passive: true });
    // observe the row and its children: a label/count change can alter scrollWidth without resizing the row
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (ro) {
      ro.observe(el);
      for (const child of Array.from(el.children)) ro.observe(child);
    }
    return () => {
      el.removeEventListener("scroll", schedule);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      el.removeAttribute("data-overflow");
    };
  }, [ref, key]);
}

/**
 * Scroll a horizontally scrollable container just enough to show `child`
 * (with a 24px breathing margin). No-op when the row does not overflow or the
 * child is already fully visible. Smooth unless the viewer prefers reduced motion.
 */
export function scrollIntoViewX(container: HTMLElement, child: HTMLElement, margin = 24) {
  if (container.scrollWidth <= container.clientWidth) return;
  const c = container.getBoundingClientRect();
  const r = child.getBoundingClientRect();
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  if (r.left < c.left + margin) container.scrollBy({ left: r.left - c.left - margin, behavior });
  else if (r.right > c.right - margin) container.scrollBy({ left: r.right - c.right + margin, behavior });
}

export type TabItem = { id: string; label: React.ReactNode; count?: number; href?: string; disabled?: boolean };

export function Tabs({
  items,
  value,
  onChange,
  label,
  variant = "underline",
  size = "md",
  className,
  idBase,
  layout = "scroll",
}: {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  /** accessible name of the tab list */
  label: string;
  /** underline (default): text tabs on a hairline, red rule under the active one.
   *  pill: Mobius chips (outlined pills, active filled ink). */
  variant?: "pill" | "underline";
  size?: "sm" | "md";
  className?: string;
  /** id prefix shared with TabPanel (defaults to an auto id; pass one if you use TabPanel) */
  idBase?: string;
  /**
   * scroll (default): one row that scrolls sideways, fading the edge with hidden tabs.
   * wrap: tabs wrap onto extra rows instead of scrolling (every tab always visible).
   * grid-sm: below 640px the tabs sit in a full-width 2-column grid (an odd last tab spans both); one row above.
   */
  layout?: "scroll" | "wrap" | "grid-sm";
}) {
  const auto = useId();
  const base = idBase ?? auto;
  const refs = useRef<(HTMLElement | null)[]>([]);
  const row = useRef<HTMLDivElement>(null);
  const isLinks = items.some((i) => i.href);
  // Scrollable row: fade the side(s) with hidden tabs, and keep the active tab in view.
  useOverflowFade(row, items.length);
  useEffect(() => {
    const el = row.current;
    const tab = el?.children[items.findIndex((t) => t.id === value)];
    if (el && tab instanceof HTMLElement) scrollIntoViewX(el, tab);
  }, [value, items]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (isLinks) return;
    const enabled = items.map((t, j) => (t.disabled ? -1 : j)).filter((j) => j >= 0);
    const pos = enabled.indexOf(i);
    let next = -1;
    if (e.key === "ArrowRight") next = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange?.(items[next].id);
  };
  return (
    <div
      ref={row}
      role={isLinks ? undefined : "tablist"}
      aria-label={label}
      data-layout={layout}
      className={clsx(
        "flex max-w-full",
        layout === "wrap" ? "flex-wrap" : "no-scrollbar overflow-x-auto overscroll-x-contain max-sm:snap-x max-sm:snap-proximity",
        variant === "pill" ? "w-fit gap-1.5" : "gap-x-6 border-b border-line md:gap-x-8",
        layout === "wrap" && variant === "pill" && "gap-y-1.5",
        layout === "grid-sm" &&
          (variant === "pill"
            ? "max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:[&>*]:justify-center max-sm:[&>*:last-child:nth-child(odd)]:col-span-2"
            : "max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2"),
        className,
      )}
      data-lenis-prevent=""
    >
      {items.map((t, i) => {
        const active = t.id === value;
        const cls = clsx(
          "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors duration-200 disabled:opacity-40 max-sm:snap-start",
          variant === "pill"
            ? [
                // phones: 44px chips (thumb targets), desktop keeps 32/36px
                size === "sm" ? "h-11 px-3.5 text-[13.5px] sm:h-8 sm:px-3.5 sm:text-[13px]" : "h-11 px-4 text-[14px] sm:h-9",
                "rounded-full font-medium ring-1 ring-inset",
                active ? "bg-fg text-surface ring-fg" : "text-fg ring-line-strong hf:ring-fg",
              ]
            : [
                size === "sm" ? "h-11 text-[14px] sm:h-10" : "h-11 text-[15px] sm:h-12",
                "font-medium tracking-[-0.01em]",
                active ? "text-fg" : "text-muted hf:text-fg",
              ],
        );
        const inner = (
          <>
            {t.label}
            {t.count !== undefined && (
              <span
                className={clsx(
                  "font-mono text-[11px] font-medium tabular-nums",
                  variant === "pill" ? (active ? "opacity-70" : "text-muted") : active ? "text-red-deep on-dark:text-red-lite" : "opacity-70",
                )}
              >
                {variant === "underline" ? String(t.count).padStart(2, "0") : t.count}
              </span>
            )}
            {variant === "underline" && active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-red" />}
          </>
        );
        if (t.href)
          return (
            <Link key={t.id} href={t.href} aria-current={active ? "page" : undefined} className={cls} scroll={false}>
              {inner}
            </Link>
          );
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange?.(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cls}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, idBase, children, className }: { id: string; active: string; idBase: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // APG: the panel is a Tab stop only when it has nothing focusable inside; when it is, it shows the ring.
  const [hasFocusable, setHasFocusable] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setHasFocusable(!!el.querySelector('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'));
    check();
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [id, active]);
  if (id !== active) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={hasFocusable ? -1 : 0}
      className={clsx("app-fade focus-visible:outline-offset-4", className)}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------- Pagination */
function pages(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < count - 1) out.push("…");
  out.push(count);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  hrefFor,
  total,
  pageSize,
  className,
}: {
  page: number;
  pageCount: number;
  onChange?: (p: number) => void;
  hrefFor?: (p: number) => string;
  /** shows "Showing 21–40 of 123" */
  total?: number;
  pageSize?: number;
  className?: string;
}) {
  if (pageCount <= 1 && total === undefined) return null;
  const btn = (p: number, label: React.ReactNode, opts: { current?: boolean; disabled?: boolean; aria?: string } = {}) => {
    const cls = clsx(
      "grid h-11 min-w-11 place-items-center px-2 font-mono text-[12.5px] font-medium tabular-nums transition-colors sm:h-9 sm:min-w-9",
      opts.current ? "bg-fg text-surface" : "text-fg/75 hf:text-red",
      opts.disabled && "pointer-events-none opacity-30",
    );
    if (hrefFor && !opts.disabled)
      return (
        <Link href={hrefFor(p)} aria-label={opts.aria} aria-current={opts.current ? "page" : undefined} className={cls} scroll={false}>
          {label}
        </Link>
      );
    return (
      <button type="button" onClick={() => onChange?.(p)} disabled={opts.disabled} aria-label={opts.aria} aria-current={opts.current ? "page" : undefined} className={cls}>
        {label}
      </button>
    );
  };
  return (
    <nav aria-label="Pagination" className={clsx("flex flex-wrap items-center justify-between gap-3", className)}>
      {total !== undefined && pageSize ? (
        <p className="font-mono text-[11px] font-medium tracking-[0.06em] text-muted uppercase tabular-nums">
          {total === 0 ? "No results" : `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total}`}
        </p>
      ) : (
        <span />
      )}
      {pageCount > 1 && (
        <div className="flex items-center gap-1 max-sm:ml-auto">
          {btn(page - 1, <Icon name="arrow-left" className="size-4" strokeWidth={1.7} />, { disabled: page <= 1, aria: "Previous page" })}
          {/* phones: "Page 2 of 6" between 44px arrows (the numbered strip overflows at 320) */}
          <span className="px-2 font-mono text-[12px] font-medium whitespace-nowrap text-fg/80 uppercase sm:hidden">
            Page {page} / {pageCount}
          </span>
          {pages(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 font-mono text-muted max-sm:hidden" aria-hidden>
                …
              </span>
            ) : (
              <span key={p} className="max-sm:hidden">
                {btn(p, p, { current: p === page, aria: `Page ${p}` })}
              </span>
            ),
          )}
          {btn(page + 1, <Icon name="arrow-right" className="size-4" strokeWidth={1.7} />, { disabled: page >= pageCount, aria: "Next page" })}
        </div>
      )}
    </nav>
  );
}
