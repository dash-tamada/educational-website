"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useIsClient } from "@/components/app";
import { getLenis } from "@/lib/lenis";

/* =============================================================================
   Catalog phone chrome (MOBILE_SPEC C-05, C-06, C-07).

     const header = useHeaderState();               // {hidden, height} of the marketing header
     <PinnedBar show={past} header={header} label="Course sections">…</PinnedBar>
                                                    // fixed pill bar under the header (below lg),
                                                    // slides up to the top while the header hides
     <ScrollTrack target={scrollerRef} />           // 64px progress track for a horizontal scroller
     scrollToSection(el, header)                    // jump to a section, clearing header + bar

   The marketing header (src/components/landing/Header.tsx) hides on scroll down and
   comes back on scroll up. Its hidden state is read from the header element itself
   (data-hidden, or its hidden translate class) so the bar always follows it exactly.
   ============================================================================= */

export type HeaderState = { hidden: boolean; height: number };

/** Gap between the header (or the top edge) and a pinned bar. */
const GAP = 6;
/** Height of a pinned bar (52px pill). */
export const PINNED_H = 52;

function findHeader() {
  return document.querySelector<HTMLElement>("body > header") ?? document.querySelector<HTMLElement>("header.fixed");
}
function headerHidden(h: HTMLElement) {
  return h.hasAttribute("data-hidden") || /(^|\s)-translate-y-\[140%\](\s|$)/.test(h.className);
}

/** Live state of the fixed marketing header: hidden while the visitor scrolls down. */
export function useHeaderState(): HeaderState {
  const [state, setState] = useState<HeaderState>({ hidden: false, height: 72 });
  useEffect(() => {
    const h = findHeader();
    if (!h) return;
    const read = () => {
      const next = { hidden: headerHidden(h), height: h.offsetHeight };
      setState((s) => (s.hidden === next.hidden && s.height === next.height ? s : next));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(h, { attributes: true, attributeFilter: ["class", "data-hidden"] });
    window.addEventListener("resize", read);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);
  return state;
}

/** Where a pinned bar's top edge sits for this header state (px from the viewport top). */
export function pinnedTop(header: HeaderState) {
  return header.hidden ? GAP + 2 : header.height + GAP;
}

/**
 * A white 52px pill pinned under the marketing header, phones and tablets only
 * (lg:hidden). Portalled to <body>; slides with the header (500ms ease-ui, like the
 * header itself) and fades out when `show` is false. z-30: under the header (z-50)
 * and its menu sheet (z-40), over page content.
 */
export function PinnedBar({
  show,
  header,
  label,
  children,
  className,
}: {
  show: boolean;
  header: HeaderState;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const client = useIsClient();
  if (!client) return null;
  const top = header.hidden ? `max(${GAP + 2}px, var(--sat))` : `${header.height + GAP}px`;
  return createPortal(
    <div
      role="region"
      aria-label={label}
      aria-hidden={!show || undefined}
      inert={!show}
      data-kbd-hide=""
      className="pointer-events-none fixed inset-x-0 top-0 z-30 lg:hidden"
      style={{
        translate: show ? `0 ${top}` : "0 -110%",
        opacity: show ? 1 : 0,
        transition: "translate 0.5s var(--ease-ui), opacity 0.25s var(--ease-ui)",
      }}
    >
      <div className="container-x">
        <div className={clsx("pointer-events-auto flex h-[52px] items-center gap-1.5 rounded-full bg-white p-1 shadow-lift", className)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Smooth-scrolls to a section so its top lands just under the pinned bar. Scrolling
 * down hides the header (bar at the top edge); scrolling up brings it back.
 */
export function scrollToSection(el: HTMLElement, header: HeaderState) {
  const y = el.getBoundingClientRect().top + window.scrollY;
  const down = y > window.scrollY;
  const barBottom = (down ? GAP + 2 : header.height + GAP) + PINNED_H;
  const target = Math.max(0, y - barBottom - 16);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(target, { duration: reduce ? 0 : 0.8 });
  else window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
}

/**
 * Progress track under a horizontal scroller (MOBILE_SPEC §1.12): 64x4px, ink/15
 * track with a thumb sized to the visible fraction. Hidden when nothing overflows.
 * Decorative (the scroller itself is the accessible thing).
 */
export function ScrollTrack({ target, className, tone = "ink" }: { target: React.RefObject<HTMLElement | null>; className?: string; tone?: "ink" | "white" }) {
  const thumb = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      setVisible(max > 2);
      if (max <= 2 || !thumb.current) return;
      const w = Math.max(14, (el.clientWidth / el.scrollWidth) * 64);
      thumb.current.style.width = `${w}px`;
      thumb.current.style.translate = `${(Math.min(1, Math.max(0, el.scrollLeft / max)) * (64 - w)).toFixed(1)}px 0`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", schedule);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
  return (
    <div aria-hidden className={clsx("relative h-1 w-16 overflow-hidden rounded-full", tone === "white" ? "bg-white/25" : "bg-ink/10", !visible && "invisible", className)}>
      <span ref={thumb} className={clsx("absolute inset-y-0 left-0 w-4 rounded-full", tone === "white" ? "bg-white" : "bg-ink")} />
    </div>
  );
}

/** Per-viewer convenience in localStorage (never throws; private windows, blocked storage). */
export function usePersistentChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key) as T | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount (SSR renders the fallback)
      if (v && allowed.includes(v)) setValue(v);
    } catch {
      /* storage blocked: keep the fallback */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  };
  return [value, set] as const;
}
