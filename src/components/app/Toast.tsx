"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";
import { subscribeLayers, topLayer } from "./layers";

/* =============================================================================
   Toasts (design system v2: a square ink bar, a red marker on the left edge, a mono
   tone slate). <Toaster /> is mounted once in the root layout; call toast() anywhere
   on the client (no provider/hook needed):
     toast("Saved just now")
     toast.success("Course sent to the review queue.", { description: "We'll let you know what happens next." })
     toast.error("That code has expired.")
     toast({ title: "Refund issued", description: "TM-25073", tone: "info", action: { label: "Undo", onClick } })
   Announced politely to screen readers; 4s default (errors 6s), at most two on screen.
   The container is a labelled region with a stable [data-toaster] hook (print CSS hides it).

   Fixed bottom bars: the stack sits at bottom 12px (20px from sm) + var(--toast-offset).
   Set --toast-offset on :root (e.g. a <style> in your layout) to lift toasts above a
   bar. Learn item routes get an automatic lift below lg for the lesson bottom bar.

   Open Modal / Drawer: toasts never cover the dialog's footer buttons. If there is
   room beside the panel (desktop drawer / centred modal) the stack moves next to it;
   otherwise (phones, bottom sheets) it moves to the top of the viewport, or just above
   the footer when the focused control sits in that top band: a focused element is
   never hidden behind a toast.
   ============================================================================= */

export type ToastTone = "success" | "error" | "info" | "neutral";
export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms; 0 = sticky */
  duration?: number;
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}

const MAX_VISIBLE = 2;
let items: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());
const EMPTY: ToastItem[] = [];

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}
function push(t: ToastInput) {
  const id = ++seq;
  // at most two on screen: newer toasts push the oldest out, so a burst never builds a wall over the UI
  items = [...items.slice(-(MAX_VISIBLE - 1)), { tone: "neutral", duration: 4000, ...t, id }];
  emit();
  return id;
}

type ToastFn = ((t: ToastInput | string) => number) & {
  success: (title: string, o?: Omit<ToastInput, "title" | "tone">) => number;
  error: (title: string, o?: Omit<ToastInput, "title" | "tone">) => number;
  info: (title: string, o?: Omit<ToastInput, "title" | "tone">) => number;
  dismiss: (id: number) => void;
};
export const toast: ToastFn = Object.assign((t: ToastInput | string) => push(typeof t === "string" ? { title: t } : t), {
  success: (title: string, o?: Omit<ToastInput, "title" | "tone">) => push({ ...o, title, tone: "success" }),
  error: (title: string, o?: Omit<ToastInput, "title" | "tone">) => push({ ...o, title, tone: "error", duration: o?.duration ?? 6000 }),
  info: (title: string, o?: Omit<ToastInput, "title" | "tone">) => push({ ...o, title, tone: "info" }),
  dismiss,
});

const TONE: Record<ToastTone, { icon: IconName; label: string; bar: string; tag: string }> = {
  success: { icon: "check", label: "Done", bar: "bg-red", tag: "text-cream/60" },
  error: { icon: "alert", label: "Error", bar: "bg-red", tag: "text-red-lite" },
  info: { icon: "info", label: "Note", bar: "bg-ash", tag: "text-cream/60" },
  neutral: { icon: "spark", label: "Update", bar: "bg-red", tag: "text-cream/60" },
};

/** Touch: swipe a toast sideways (> 72px or a flick) to dismiss it. */
function useSwipeDismiss(id: number) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let dx = 0;
    let active = false;
    let horizontal: boolean | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("button")) return;
      active = true;
      horizontal = null;
      x0 = e.clientX;
      y0 = e.clientY;
      t0 = performance.now();
      dx = 0;
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      dx = e.clientX - x0;
      if (horizontal === null && (Math.abs(dx) > 8 || Math.abs(e.clientY - y0) > 8)) horizontal = Math.abs(dx) > Math.abs(e.clientY - y0);
      if (!horizontal) return;
      el.style.transition = "none";
      el.style.translate = `${dx}px 0`;
      el.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 240));
    };
    const up = () => {
      if (!active) return;
      active = false;
      if (!horizontal) return;
      const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      el.style.transition = "translate .2s var(--ease-ui), opacity .2s var(--ease-ui)";
      if (Math.abs(dx) > 72 || v > 0.6) {
        el.style.translate = `${dx > 0 ? 120 : -120}% 0`;
        el.style.opacity = "0";
        window.setTimeout(() => dismiss(id), 180);
      } else {
        el.style.translate = "";
        el.style.opacity = "";
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [id]);
  return ref;
}

function ToastView({ t }: { t: ToastItem }) {
  useEffect(() => {
    if (!t.duration) return;
    const h = window.setTimeout(() => dismiss(t.id), t.duration);
    return () => window.clearTimeout(h);
  }, [t.id, t.duration]);
  const swipe = useSwipeDismiss(t.id);
  const tone = TONE[t.tone ?? "neutral"];
  return (
    <li
      ref={swipe}
      data-field="dark"
      className="app-enter pointer-events-auto relative flex w-full touch-pan-y items-start gap-3 overflow-hidden rounded-none bg-ink py-3.5 pr-2 pl-5 text-cream shadow-2xl sm:w-[380px]"
    >
      <span aria-hidden className={clsx("absolute inset-y-0 left-0 w-[3px]", tone.bar)} />
      <div className="min-w-0 flex-1 py-0.5">
        <p className={clsx("mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase", tone.tag)} aria-hidden>
          <Icon name={tone.icon} className="size-3" strokeWidth={2.2} />
          {tone.label}
        </p>
        <p className="text-[14.5px] leading-snug font-medium tracking-[-0.01em]">{t.title}</p>
        {t.description && <p className="mt-1 text-[13px] leading-snug text-cream/65">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
          className="hit mt-1 h-8 shrink-0 rounded-none px-3 text-[11px] font-semibold tracking-[0.14em] uppercase ring-1 ring-white/30 ring-inset hf:bg-cream hf:text-ink"
        >
          {t.action.label}
        </button>
      )}
      <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="hit mt-0.5 grid size-8 shrink-0 place-items-center text-cream/55 hf:text-cream">
        <Icon name="x" className="size-4" strokeWidth={1.7} />
      </button>
    </li>
  );
}

const TOAST_W = 380;
const GAP = 20;
const EDGE = 12;

/** Where the stack goes while a dialog is open (null = default corner).
 *  No room beside the panel (phones, bottom sheets): the stack goes to the TOP of the
 *  viewport, so it never covers the dialog's footer or the last controls of its scroll
 *  body (the usual focus targets after an action). If the focused control sits under
 *  that top band (e.g. the drawer's close button) it drops to just above the footer
 *  instead, so a focused element is never obscured (WCAG 2.4.11). Re-measured on focus
 *  moves, stack changes, resizes and panel resizes. */
function useOverlayPlacement(
  stackRef: React.RefObject<HTMLDivElement | null>,
  count: number,
): React.CSSProperties | null {
  const layer = useSyncExternalStore(subscribeLayers, topLayer, () => null);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!layer) return;
    let raf = 0;
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const r = layer.getBoundingClientRect();
      const need = TOAST_W + GAP * 2;
      if (vw >= 640 && vw - r.right >= need) {
        setStyle(null); // free space on the right: the default corner is clear
        return;
      }
      if (vw >= 640 && r.left >= need) {
        setStyle({ right: vw - r.left + GAP, bottom: GAP }); // beside the panel, on its left
        return;
      }
      const h = stackRef.current?.offsetHeight ?? 0;
      const footer = layer.querySelector<HTMLElement>("[data-overlay-footer]");
      const footTop = footer ? footer.getBoundingClientRect().top : Math.min(vh, r.bottom);
      const bottomPx = Math.max(12, vh - footTop + 12);
      // band each placement would cover, in viewport px
      const topBand: [number, number] = [0, EDGE + h + 8];
      const lowBand: [number, number] = [vh - bottomPx - h - 8, vh - bottomPx];
      const a = document.activeElement;
      // ignore focus inside the stack itself (a toast's own buttons) so the stack never chases itself
      const f =
        a instanceof HTMLElement && a !== document.body && !stackRef.current?.contains(a)
          ? a.getBoundingClientRect()
          : null;
      const hits = (b: [number, number]) => !!f && h > 0 && f.bottom > b[0] && f.top < b[1];
      if (hits(topBand) && !hits(lowBand)) {
        setStyle({ bottom: bottomPx }); // focus is up top (close button…): sit just above the footer
      } else {
        setStyle({ top: `calc(${EDGE}px + env(safe-area-inset-top, 0px))`, bottom: "auto" });
      }
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    place();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(layer);
    if (stackRef.current) ro?.observe(stackRef.current);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    layer.addEventListener("scroll", schedule, true);
    // drawers slide in: measure again once the entrance has settled
    const t = window.setTimeout(place, 320);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      layer.removeEventListener("scroll", schedule, true);
      window.clearTimeout(t);
    };
  }, [layer, stackRef, count]);
  return layer ? style : null;
}

/** Mount once (root layout). */
export function Toaster() {
  const pathname = usePathname() ?? "";
  // /learn/<course>/<item> renders a fixed prev/path/next bar below lg (h-14 at bottom max(12px, safe area)).
  const learnBar = /^\/learn\/[^/]+\/[^/]+/.test(pathname);
  const list = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => items,
    () => EMPTY,
  );
  const stackRef = useRef<HTMLDivElement>(null);
  const overlay = useOverlayPlacement(stackRef, list.length);
  return (
    <div ref={stackRef} data-toaster="" role="region" aria-label="Notifications" aria-live="polite" aria-relevant="additions" style={overlay ?? undefined} className={clsx(
        "pointer-events-none fixed inset-x-3 z-[300] flex justify-center sm:inset-x-auto sm:right-5",
        // above whatever bottom UI is on screen: the dock / sticky action bar (--bottom-ui, incl.
        // its offset), a page's own bar (--toast-offset) or the home indicator (--sab)
        "bottom-[calc(12px+max(var(--bottom-ui,0px),var(--sab,0px),var(--toast-offset,var(--toast-offset-auto,0px))))]",
        "sm:bottom-[calc(20px+max(var(--bottom-ui,0px),var(--sab,0px),var(--toast-offset,var(--toast-offset-auto,0px))))]",
        // keyboard up: toasts move to the top so they never cover the field being typed in
        "kbd:top-[calc(12px+var(--sat,0px))] kbd:bottom-auto",
        learnBar && "max-lg:[--toast-offset-auto:calc(60px+max(12px,env(safe-area-inset-bottom)))]",
      )}>
      <ol className="flex w-full flex-col items-stretch gap-2 sm:items-end">
        {list.map((t) => (
          <ToastView key={t.id} t={t} />
        ))}
      </ol>
    </div>
  );
}
