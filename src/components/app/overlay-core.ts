"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { getLenis } from "@/lib/lenis";
import { pushEscape, pushLayer, topLayer } from "./layers";

/* Shared overlay plumbing for Modal / Drawer (Overlay.tsx) and the bottom sheets
   (Sheet.tsx): client check, scroll lock, initial focus, focus trap + Esc + restore. */

const noopSub = () => () => {};
export function useIsClient() {
  return useSyncExternalStore(noopSub, () => true, () => false);
}

export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let lockCount = 0;
export function lockScroll() {
  lockCount++;
  if (lockCount > 1) return;
  getLenis()?.stop();
  document.documentElement.style.overflow = "hidden";
  // globals.css dims the canvas so the stable scrollbar gutter matches the backdrop.
  document.documentElement.setAttribute("data-scroll-locked", "");
}
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount) return;
  document.documentElement.style.overflow = "";
  document.documentElement.removeAttribute("data-scroll-locked");
  getLenis()?.start();
}

/** Where focus lands when a layer opens: an explicit ref, then [data-autofocus] /
 *  [autofocus] (or a control React's autoFocus already focused), then the first form
 *  field visible in the body (so you can type straight away), then a [data-overlay-safe]
 *  control (ConfirmDialog's Cancel), then the Close button
 *  (safe for read-only drawers: Enter never fires an action), then the footer, then the panel.
 *  `preferTitle` (bottom sheets on touch): skip the auto-focus of the first field so the
 *  keyboard does not jump up over a sheet the person has not read yet; focus the panel. */
export function pickInitialFocus(panel: HTMLElement, initialFocus?: React.RefObject<HTMLElement | null>, preferPanel = false): HTMLElement {
  if (initialFocus?.current) return initialFocus.current;
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== panel && panel.contains(active)) return active;
  const marked = panel.querySelector<HTMLElement>("[data-autofocus],[autofocus]");
  if (marked) return marked;
  if (preferPanel) return panel;
  const body = panel.querySelector<HTMLElement>("[data-overlay-body]");
  if (body) {
    const box = body.getBoundingClientRect();
    const fields = 'input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"]';
    const first = Array.from(body.querySelectorAll<HTMLElement>(fields)).find((n) => {
      if (n.offsetParent === null) return false;
      const r = n.getBoundingClientRect();
      return r.top >= box.top - 1 && r.bottom <= box.bottom + 1; // in view without scrolling
    });
    if (first) return first;
  }
  return (
    // a dialog's safe choice (ConfirmDialog's Cancel): Enter never fires the destructive action
    panel.querySelector<HTMLElement>("[data-overlay-safe]") ??
    panel.querySelector<HTMLElement>("[data-overlay-close]") ??
    panel.querySelector<HTMLElement>(`[data-overlay-footer] :is(${FOCUSABLE})`) ??
    panel.querySelector<HTMLElement>(FOCUSABLE) ??
    panel
  );
}

/** Focus trap + Esc + scroll lock + focus restore for an open layer.
 *  Layers stack: only the top-most open layer reacts to Esc and traps Tab. */
export function useLayer(
  open: boolean,
  onClose: () => void,
  panel: React.RefObject<HTMLElement | null>,
  initialFocus?: React.RefObject<HTMLElement | null>,
  opts: { preferPanel?: boolean } = {},
) {
  const closeRef = useRef(onClose);
  const preferPanel = !!opts.preferPanel;
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    lockScroll();
    // layer stack: the Toaster reads it (toasts move off the footer) and the Tab trap checks it
    let popLayer = panel.current ? pushLayer(panel.current) : null;
    const popEsc = pushEscape(() => closeRef.current());
    const t = window.setTimeout(() => {
      if (!popLayer && panel.current) popLayer = pushLayer(panel.current);
      if (panel.current) pickInitialFocus(panel.current, initialFocus, preferPanel).focus({ preventScroll: true });
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel.current || topLayer() !== panel.current) return;
      const active = document.activeElement as HTMLElement | null;
      // focus is in a portalled menu opened from this panel: let the menu close itself
      if (active?.closest('[role="menu"]')) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === active);
      if (!nodes.length) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!active || !panel.current.contains(active) || active === panel.current) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      popEsc();
      popLayer?.();
      unlockScroll();
      if (prev?.isConnected) prev.focus?.({ preventScroll: true });
    };
  }, [open, panel, initialFocus, preferPanel]);
}
