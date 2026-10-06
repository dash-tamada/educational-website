"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import clsx from "clsx";
import { Icon } from "./icons";
import { useIsClient, useLayer } from "./overlay-core";
import { isCoarse } from "./mobile";
import type { MenuItem } from "./Overlay";

/* =============================================================================
   Bottom sheets (MOBILE_SPEC §1.7): one primitive, three presets.

     <BottomSheet open={o} onClose={…} title="Filter courses" detent="full"
       footer={<><Button variant="ghost">Clear</Button><Button className="flex-1">Show 12 courses</Button></>}>
       …filters…
     </BottomSheet>

     <ActionSheet open={o} onClose={…} title="Web Dev From Zero" items={menuItems} />
       (MenuItem[] from DropdownMenu: 52px rows, danger rows in flame, dividers)

     <FullScreenSheet open={o} onClose={…} title="Edit lesson" footer={<Button fullWidth>Save</Button>}>
       …editor…
     </FullScreenSheet>

   Anatomy: ink/45 scrim (tap closes) -> white panel, 28px top radius, grabber, sticky
   header (title t-app-h2, optional description, 44px close), scrolling body
   (overscroll contained, data-lenis-prevent), sticky footer with the safe-area inset.
   Height: detent "auto" = content height, capped at min(92dvh, --vvh - 8px) so it stays
   above the iOS keyboard; "full" = that cap as a fixed height. FullScreenSheet = full
   height minus the status bar.
   Motion: slide up 360ms ease-ui, close 240ms; drag the grabber / header (or the body
   when it is scrolled to the top) down to dismiss (> 120px or a flick > 0.6px/ms),
   otherwise it springs back. Reduced motion: a short fade.
   A11y: role=dialog + aria-modal, Esc closes, focus trap, focus returns to the trigger,
   page scroll locked. On touch the panel itself takes focus (no keyboard jumping over an
   unread sheet); mark a field data-autofocus to focus it instead.
   On tablets/desktop the panel is centred, max 560px wide (Modal / Drawer switch to these
   on phones automatically; use the sheets directly for phone-only UI).
   ============================================================================= */

export type SheetDetent = "auto" | "full";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  detent?: SheetDetent;
  initialFocus?: React.RefObject<HTMLElement | null>;
  hideClose?: boolean;
  /** visually hide the title (still labels the dialog) */
  hideTitle?: boolean;
  /** extra control in the header row, left of the close button (e.g. "Mark all read") */
  headerAction?: React.ReactNode;
  /** leading header control (e.g. a back button) */
  headerLeading?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** footer layout: "end" (right-aligned, wraps), "fill" (buttons share the row and wrap),
   *  "stack" (full-width buttons, first child on top) or "row" (one row, you size children) */
  footerLayout?: "end" | "fill" | "stack" | "row";
  /** internal: FullScreenSheet sizing */
  fullScreen?: boolean;
  /** aria role of the panel (default dialog) */
  role?: "dialog" | "alertdialog";
}

const CLOSE_MS = 240;

/** Keeps the sheet mounted for its exit animation. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open && !mounted) setMounted(true);
  if (open && closing) setClosing(false);
  if (!open && mounted && !closing) setClosing(true);
  const skipRef = useRef(false);
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(
      () => {
        skipRef.current = false;
        setMounted(false);
        setClosing(false);
      },
      skipRef.current ? 0 : CLOSE_MS,
    );
    return () => window.clearTimeout(t);
  }, [closing]);
  return { mounted, closing, skipExit: () => (skipRef.current = true) };
}

/** Drag-to-dismiss on the grabber/header (pointer) and on the body at scrollTop 0 (touch). */
function useDragDismiss(panel: React.RefObject<HTMLDivElement | null>, scrim: React.RefObject<HTMLDivElement | null>, body: React.RefObject<HTMLDivElement | null>, onDismiss: () => void, active: boolean) {
  const dismissRef = useRef(onDismiss);
  useLayoutEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    const p = panel.current;
    if (!active || !p) return;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    let tracking: "pointer" | "touch" | null = null;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;

    const setY = (y: number) => {
      const t = y > 0 ? y : y * 0.2;
      p.style.translate = `0 ${t}px`;
      if (scrim.current) scrim.current.style.opacity = String(Math.max(0.2, 1 - Math.max(0, t) / Math.max(1, p.offsetHeight)));
    };
    const begin = (y: number) => {
      startY = lastY = y;
      lastT = performance.now();
      dy = 0;
      velocity = 0;
      dragging = false;
    };
    const move = (y: number) => {
      dy = y - startY;
      const now = performance.now();
      if (now > lastT) velocity = (y - lastY) / (now - lastT);
      lastY = y;
      lastT = now;
      if (!dragging) {
        if (Math.abs(dy) < 6) return false;
        dragging = true;
        p.setAttribute("data-dragging", "");
      }
      setY(dy);
      return true;
    };
    const end = () => {
      const was = dragging;
      dragging = false;
      tracking = null;
      if (!was) return;
      p.removeAttribute("data-dragging");
      const flick = velocity > 0.6 && dy > 24;
      if (dy > 120 || flick) {
        p.style.transition = "translate 0.22s cubic-bezier(0.4,0,1,1)";
        p.style.translate = "0 110%";
        if (scrim.current) {
          scrim.current.style.transition = "opacity 0.22s";
          scrim.current.style.opacity = "0";
        }
        window.setTimeout(() => dismissRef.current(), 200);
      } else {
        p.style.transition = "translate 0.26s cubic-bezier(0.34,1.4,0.64,1)";
        p.style.translate = "0 0px";
        if (scrim.current) {
          scrim.current.style.transition = "opacity 0.26s";
          scrim.current.style.opacity = "";
        }
        window.setTimeout(() => {
          p.style.transition = "";
          p.style.translate = "";
          if (scrim.current) scrim.current.style.transition = "";
        }, 280);
      }
    };

    // grabber + header: pointer events (mouse and touch), touch-action none on those zones
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const zone = (e.target as HTMLElement).closest("[data-sheet-drag]");
      if (!zone || (e.target as HTMLElement).closest("button,a,input,select,textarea,[role=switch]")) return;
      tracking = "pointer";
      begin(e.clientY);
      try {
        (zone as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    };
    const onPointerMove = (e: PointerEvent) => {
      if (tracking !== "pointer") return;
      move(e.clientY);
    };
    const onPointerUp = () => {
      if (tracking === "pointer") end();
    };

    // body: touch events, only when scrolled to the top and pulling down
    const b = body.current;
    const onTouchStart = (e: TouchEvent) => {
      if (tracking || e.touches.length !== 1 || !b || b.scrollTop > 0) return;
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true],[data-no-sheet-drag]")) return;
      tracking = "touch";
      begin(e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (tracking !== "touch" || !b) return;
      const y = e.touches[0].clientY;
      if (!dragging && (y - startY < 0 || b.scrollTop > 0)) {
        tracking = null; // scrolling the content up: let it scroll
        return;
      }
      if (move(y) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => {
      if (tracking === "touch") end();
    };

    p.addEventListener("pointerdown", onPointerDown);
    p.addEventListener("pointermove", onPointerMove);
    p.addEventListener("pointerup", onPointerUp);
    p.addEventListener("pointercancel", onPointerUp);
    b?.addEventListener("touchstart", onTouchStart, { passive: true });
    b?.addEventListener("touchmove", onTouchMove, { passive: false });
    b?.addEventListener("touchend", onTouchEnd);
    b?.addEventListener("touchcancel", onTouchEnd);
    return () => {
      p.removeEventListener("pointerdown", onPointerDown);
      p.removeEventListener("pointermove", onPointerMove);
      p.removeEventListener("pointerup", onPointerUp);
      p.removeEventListener("pointercancel", onPointerUp);
      b?.removeEventListener("touchstart", onTouchStart);
      b?.removeEventListener("touchmove", onTouchMove);
      b?.removeEventListener("touchend", onTouchEnd);
      b?.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [panel, scrim, body, active]);
}

/** The shared sheet shell. Prefer the named presets below. */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  detent = "auto",
  initialFocus,
  hideClose,
  hideTitle,
  headerAction,
  headerLeading,
  className,
  bodyClassName,
  footerLayout = "end",
  fullScreen,
  role = "dialog",
}: SheetProps) {
  const client = useIsClient();
  const { mounted, closing, skipExit } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const [coarse] = useState(() => isCoarse());
  useLayer(open, onClose, panel, initialFocus, { preferPanel: coarse });
  const dismiss = useCallback(() => {
    skipExit();
    onClose();
  }, [onClose, skipExit]);
  useDragDismiss(panel, scrim, body, dismiss, open && mounted);

  if (!client || !mounted) return null;
  const full = detent === "full" || fullScreen;
  const cap = fullScreen ? "min(calc(100dvh - 8px - var(--sat)), calc(var(--vvh, 100dvh) - 8px))" : "min(92dvh, calc(var(--vvh, 100dvh) - 8px))";
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center" data-lenis-prevent="" data-sheet="">
      <div
        ref={scrim}
        className="sheet-scrim absolute inset-0 touch-none bg-ink/45"
        data-closing={closing || undefined}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-closing={closing || undefined}
        style={{ maxHeight: cap, height: full ? cap : undefined }}
        className={clsx(
          "sheet-panel relative flex w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift focus:outline-none sm:max-w-[560px]",
          "land:max-w-[min(100%,640px)]",
          className,
        )}
      >
        {/* grabber + header: the drag zone */}
        <div data-sheet-drag="" className="shrink-0 touch-none cursor-grab select-none active:cursor-grabbing">
          <div className="flex justify-center pt-2 pb-1" aria-hidden>
            <span className="h-[5px] w-9 rounded-[3px] bg-ink/15" />
          </div>
          <div className={clsx("flex items-start gap-2 pr-2 pb-3 pl-5", hideTitle && !headerAction && hideClose && "pb-1")}>
            {headerLeading && <div className="-ml-3 shrink-0">{headerLeading}</div>}
            <div className={clsx("min-w-0 flex-1 pt-2", hideTitle && "sr-only")}>
              <h2 id={titleId} className="t-app-h2">
                {title}
              </h2>
              {description && (
                <p id={descId} className="t-small mt-1 text-ink/65">
                  {description}
                </p>
              )}
            </div>
            {hideTitle && <span className="flex-1" />}
            {headerAction && <div className="flex shrink-0 items-center pt-0.5">{headerAction}</div>}
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-overlay-close=""
                className="tap grid size-11 shrink-0 place-items-center rounded-full text-ink/70 hf:bg-ink/[0.06] hf:text-ink"
              >
                <Icon name="x" className="size-5" />
              </button>
            )}
          </div>
        </div>
        <div
          ref={body}
          className={clsx(
            "app-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5",
            // no content (e.g. a ConfirmDialog without body): collapse to a small gap above the footer
            children == null || children === false ? "pb-1" : footer ? "pb-5" : "pb-[max(20px,var(--sab))]",
            bodyClassName,
          )}
          data-lenis-prevent=""
          data-overlay-body=""
        >
          {children}
        </div>
        {footer && (
          <div
            data-overlay-footer=""
            className={clsx(
              "shrink-0 border-t border-ink/[0.07] bg-white px-5 pt-3 pb-[max(16px,var(--sab))]",
              footerLayout === "stack"
                ? "flex flex-col gap-2 [&>*]:w-full"
                : footerLayout === "fill"
                  ? "flex flex-wrap items-center gap-2 [&>*]:flex-[1_1_auto]"
                  : footerLayout === "row"
                  ? "flex items-center gap-2"
                  : "flex flex-wrap items-center justify-end gap-2",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Editors and detail views on phones: full height, sticky header + footer. */
export function FullScreenSheet(props: Omit<SheetProps, "detent" | "fullScreen">) {
  return <BottomSheet {...props} fullScreen detent="full" />;
}

/* ----------------------------------------------------------------------------- ActionSheet */
/** Menus on phones: 52px rows (icon 20px, label 16px/600), danger rows in flame,
 *  dividers as 8px gaps. Tap outside / Esc cancels. Arrow keys move between rows. */
export function ActionSheet({
  open,
  onClose,
  items,
  title,
  description,
  header,
  label,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** optional header line (shown); without it `label` names the sheet for screen readers */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** free-form header block (e.g. a signed-in user, "Mark all read") under the title */
  header?: React.ReactNode;
  /** accessible name when there is no visible title */
  label?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = rows.indexOf(document.activeElement as HTMLElement);
    let n = -1;
    if (e.key === "ArrowDown") n = (i + 1) % rows.length;
    else if (e.key === "ArrowUp") n = (i - 1 + rows.length) % rows.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = rows.length - 1;
    if (n < 0) return;
    e.preventDefault();
    rows[n]?.focus();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={title ?? label ?? "Actions"} hideTitle={!title} description={description} hideClose={!title}>
      {header && <div className="-mt-1 mb-3 border-b border-ink/[0.07] pb-3">{header}</div>}
      <div ref={list} role="menu" aria-label={typeof title === "string" ? title : label} onKeyDown={onKey} className="-mx-2 flex flex-col pb-1">
        {items.map((it, i) =>
          it.divider ? (
            <div key={i} role="separator" className="mx-3 my-1 h-px bg-ink/[0.07]" />
          ) : it.href ? (
            <Link
              key={i}
              role="menuitem"
              href={it.href}
              aria-disabled={it.disabled || undefined}
              onClick={() => {
                it.onSelect?.();
                onClose();
              }}
              className={actionRow(it.danger, it.disabled)}
            >
              {it.icon && <Icon name={it.icon} className="size-5 shrink-0 opacity-80" />}
              <span className="min-w-0 flex-1 text-left">{it.label}</span>
              {it.hint && <span className="shrink-0 text-[13px] font-semibold opacity-70">{it.hint}</span>}
            </Link>
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              aria-disabled={it.disabled || undefined}
              onClick={() => {
                if (it.disabled) return;
                onClose();
                // let the sheet start closing (focus returns to the trigger) before a dialog opens
                window.setTimeout(() => it.onSelect?.(), 0);
              }}
              className={actionRow(it.danger, it.disabled)}
            >
              {it.icon && <Icon name={it.icon} className="size-5 shrink-0 opacity-80" />}
              <span className="min-w-0 flex-1 text-left">{it.label}</span>
              {it.hint && <span className="shrink-0 text-[13px] font-semibold opacity-70">{it.hint}</span>}
            </button>
          ),
        )}
      </div>
    </BottomSheet>
  );
}
const actionRow = (danger?: boolean, disabled?: boolean) =>
  clsx(
    "tap flex min-h-[52px] w-full items-center gap-3.5 rounded-[14px] px-3 py-2 text-[16px] leading-snug font-semibold outline-none",
    danger ? "text-[#c13500] active:bg-[#ffe1d4] focus-visible:bg-[#ffe1d4]" : "text-ink active:bg-butter focus-visible:bg-butter",
    disabled && "pointer-events-none opacity-40",
  );
