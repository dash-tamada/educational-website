"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";
import { Button } from "./Button";
import { pushEscape } from "./layers";
import { useIsClient, useLayer } from "./overlay-core";
import { useIsCoarse, useIsPhone } from "./mobile";
import { ActionSheet, BottomSheet, FullScreenSheet } from "./Sheet";

/* =============================================================================
   Overlays: Modal, Drawer, ConfirmDialog, DropdownMenu, Tooltip.
   Modal/Drawer: portal, focus trap, Esc + overlay click to close, focus returns
   to the trigger, page scroll locked (Lenis stopped), data-lenis-prevent inside.

     const [open, setOpen] = useState(false);
     <Modal open={open} onClose={() => setOpen(false)} title="Send back with note"
       description="Tell the tutor what to fix." footer={<><Button variant="secondary" onClick={…}>Cancel</Button><Button>Send</Button></>}>
       …form…
     </Modal>
     <Drawer open={o} onClose={…} title="Order TM-25073" side="right">…</Drawer>
     <ConfirmDialog open={o} onClose={…} onConfirm={…} title="Refund this order?" tone="danger" confirmLabel="Issue refund" />
     <DropdownMenu label="Row actions" trigger={<Icon name="more" />} items={[{ label: "View", icon: "eye", onSelect }, { divider: true }, { label: "Suspend", danger: true, onSelect }]} />
   ============================================================================= */

export { useIsClient } from "./overlay-core";

/* ----------------------------------------------------------------------------- Modal */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocus,
  hideClose,
  className,
  mobile = "sheet",
  mobileFooter = "fill",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  initialFocus?: React.RefObject<HTMLElement | null>;
  hideClose?: boolean;
  className?: string;
  /** phones (< 640px): "sheet" (default) renders the BottomSheet shell (grabber, drag to
   *  dismiss, safe-area footer); "dialog" keeps the docked dialog */
  mobile?: "sheet" | "dialog";
  /** phone footer layout: "fill" (buttons share the row, wrap when needed) or "stack"
   *  (full-width buttons, first child on top) */
  mobileFooter?: "fill" | "stack";
}) {
  const client = useIsClient();
  const phone = useIsPhone();
  const asSheet = phone && mobile === "sheet";
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useLayer(open && !asSheet, onClose, panel, initialFocus);
  if (asSheet)
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        footer={footer}
        initialFocus={initialFocus}
        hideClose={hideClose}
        footerLayout={mobileFooter === "stack" ? "stack" : "fill"}
      >
        {children}
      </BottomSheet>
    );
  if (!client || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6" data-lenis-prevent="">
      <div className="app-fade absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={clsx(
          "app-enter app-scroll relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card-lg bg-white shadow-lift focus:outline-none sm:rounded-card-lg",
          size === "sm" && "sm:max-w-[420px]",
          size === "md" && "sm:max-w-[560px]",
          size === "lg" && "sm:max-w-[760px]",
          size === "xl" && "sm:max-w-[1000px]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-7 md:pt-7">
          <div className="min-w-0">
            <h2 id={titleId} className="t-app-h2">
              {title}
            </h2>
            {description && (
              <p id={descId} className="t-small mt-1.5 text-ink/65">
                {description}
              </p>
            )}
          </div>
          {!hideClose && <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} className="-mt-1 -mr-2" data-overlay-close="" />}
        </div>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7 md:pb-6" data-lenis-prevent="" data-overlay-body="">
          {children}
        </div>
        {footer && (
          <div data-overlay-footer="" className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/[0.07] bg-cream/50 px-5 py-4 md:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ----------------------------------------------------------------------------- Drawer */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  width = 440,
  initialFocus,
  className,
  bodyClassName,
  mobile = "full",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right";
  width?: number;
  initialFocus?: React.RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  /** phones (< 640px): "full" (default) = FullScreenSheet (detail views, editors);
   *  "sheet" = BottomSheet at the full detent (filters, lists, "Your path");
   *  "side" = keep the side panel */
  mobile?: "full" | "sheet" | "side";
}) {
  const client = useIsClient();
  const phone = useIsPhone();
  const asSheet = phone && mobile !== "side";
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLayer(open && !asSheet, onClose, panel, initialFocus);
  if (asSheet) {
    const Sheet = mobile === "sheet" ? BottomSheet : FullScreenSheet;
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        footer={footer}
        initialFocus={initialFocus}
        detent="full"
        bodyClassName={bodyClassName}
        footerLayout="fill"
      >
        {children}
      </Sheet>
    );
  }
  if (!client || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200]" data-lenis-prevent="">
      <div className="app-fade absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: `min(${width}px, calc(100vw - 32px))` }}
        className={clsx(
          "absolute inset-y-2 flex w-full flex-col overflow-hidden rounded-card-lg bg-white shadow-lift focus:outline-none",
          side === "right" ? "right-2 [animation:drawer-r_.28s_var(--ease-ui)_backwards]" : "left-2 [animation:drawer-l_.28s_var(--ease-ui)_backwards]",
          className,
        )}
      >
        <style>{`@keyframes drawer-r{from{translate:24px 0;opacity:0}}@keyframes drawer-l{from{translate:-24px 0;opacity:0}}`}</style>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="t-app-h2">
              {title}
            </h2>
            {description && <p className="t-small mt-1.5 text-ink/65">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} className="-mt-1 -mr-2" data-overlay-close="" />
        </div>
        <div className={clsx("app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5", bodyClassName)} data-lenis-prevent="" data-overlay-body="">
          {children}
        </div>
        {footer && (
          <div data-overlay-footer="" className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/[0.07] bg-cream/50 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ----------------------------------------------------------------------------- ConfirmDialog */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  children?: React.ReactNode;
}) {
  // phones: full-width stacked buttons, the confirming action on top (MOBILE_SPEC §1.7)
  const phone = useIsPhone();
  const cancel = (
    <Button key="cancel" variant="secondary" onClick={onClose} data-overlay-safe="" className="max-sm:h-12">
      {cancelLabel}
    </Button>
  );
  const confirm = (
    <Button
      key="confirm"
      variant={tone === "danger" ? "danger" : "primary"}
      className="max-sm:h-12"
      onClick={() => {
        onConfirm();
        onClose();
      }}
    >
      {confirmLabel}
    </Button>
  );
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title} description={description} mobileFooter="stack" footer={phone ? [confirm, cancel] : [cancel, confirm]}>
      {children}
    </Modal>
  );
}

/* ----------------------------------------------------------------------------- DropdownMenu */
export type MenuItem =
  | { divider: true }
  | {
      label: React.ReactNode;
      icon?: IconName;
      onSelect?: () => void;
      href?: string;
      danger?: boolean;
      disabled?: boolean;
      /** small right-hand text (shortcut / count) */
      hint?: React.ReactNode;
      divider?: false;
    };

export function DropdownMenu({
  trigger,
  items,
  label,
  align = "end",
  triggerClassName,
  menuClassName,
  header,
  width = 224,
  mobile = "sheet",
}: {
  /** contents of the trigger button (icon or text) */
  trigger: React.ReactNode;
  items: MenuItem[];
  /** accessible name of the trigger */
  label: string;
  align?: "start" | "end";
  triggerClassName?: string;
  menuClassName?: string;
  /** optional non-interactive header (e.g. signed-in user) */
  header?: React.ReactNode;
  width?: number;
  /** phones with a touch screen: "sheet" (default) opens the items as an ActionSheet;
   *  "popover" keeps the anchored menu (2-3 item menus that must stay in place) */
  mobile?: "sheet" | "popover";
}) {
  const [open, setOpen] = useState(false);
  const phone = useIsPhone();
  const coarse = useIsCoarse();
  const asSheet = phone && coarse && mobile === "sheet";
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const client = useIsClient();
  const id = useId();

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const h = menu.current?.offsetHeight ?? 240;
    const up = r.bottom + h + 12 > window.innerHeight && r.top > h + 12;
    let left = align === "end" ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    setPos({ top: up ? r.top - h - 6 : r.bottom + 6, left, up });
  }, [align, width]);

  useLayoutEffect(() => {
    if (!open || asSheet) return;
    place();
    const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    requestAnimationFrame(() => items()[0]?.focus());
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === "Tab") {
        // hand focus back to the trigger first, so Tab continues from there (inside a dialog too)
        btn.current?.focus();
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    // Esc closes only the menu (not a Modal/Drawer it sits in) and returns focus to the trigger
    const popEsc = pushEscape(() => {
      setOpen(false);
      btn.current?.focus();
    });
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      popEsc();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place, asSheet]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={clsx("tap inline-flex items-center justify-center", triggerClassName ?? "size-9 rounded-full text-ink/70 hf:bg-ink/[0.06] hf:text-ink")}
      >
        {trigger}
      </button>
      {asSheet && <ActionSheet open={open} onClose={() => setOpen(false)} items={items} label={label} header={header} />}
      {client &&
        open &&
        !asSheet &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            data-lenis-prevent=""
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
            className={clsx("app-fade fixed z-[310] overflow-hidden rounded-[18px] bg-white p-1.5 shadow-lift ring-1 ring-ink/[0.06]", menuClassName)}
          >
            {header && <div className="border-b border-ink/[0.07] px-3 pt-2 pb-3">{header}</div>}
            {items.map((it, i) =>
              it.divider ? (
                <div key={i} role="separator" className="my-1 h-px bg-ink/[0.07]" />
              ) : it.href ? (
                <a
                  key={i}
                  role="menuitem"
                  href={it.href}
                  tabIndex={-1}
                  aria-disabled={it.disabled || undefined}
                  onClick={() => {
                    it.onSelect?.();
                    setOpen(false);
                  }}
                  className={itemCls(it.danger, it.disabled)}
                >
                  {it.icon && <Icon name={it.icon} className="size-[18px] opacity-80" />}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="text-[12px] font-semibold opacity-70">{it.hint}</span>}
                </a>
              ) : (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={it.disabled || undefined}
                  onClick={() => {
                    if (it.disabled) return;
                    // Park focus on the trigger before the menu unmounts, so a dialog opened by
                    // onSelect captures the trigger (not <body>) as its focus-return target.
                    btn.current?.focus({ preventScroll: true });
                    setOpen(false);
                    it.onSelect?.();
                  }}
                  className={itemCls(it.danger, it.disabled)}
                >
                  {it.icon && <Icon name={it.icon} className="size-[18px] opacity-80" />}
                  <span className="min-w-0 flex-1 truncate text-left">{it.label}</span>
                  {it.hint && <span className="text-[12px] font-semibold opacity-70">{it.hint}</span>}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
const itemCls = (danger?: boolean, disabled?: boolean) =>
  clsx(
    "flex h-10 w-full items-center gap-2.5 rounded-[12px] px-3 text-[14px] font-semibold outline-none",
    danger ? "text-[#c13500] hf:bg-[#ffe1d4] focus-visible:bg-[#ffe1d4]" : "text-ink hf:bg-butter focus-visible:bg-butter",
    disabled && "pointer-events-none opacity-40",
  );

/* ----------------------------------------------------------------------------- Tooltip */
/**
 * Tooltip on hover/focus. Wrap a focusable child. <Tooltip label="Copy code"><button…/></Tooltip>
 * The bubble renders in a portal with fixed positioning measured from the trigger, so a scroll
 * container (DataTable, cards with overflow) never clips it. It shifts to stay inside the viewport
 * and flips to the other side when there's no room. Esc hides it.
 */
export function Tooltip({ label, children, side = "top", className }: { label: string; children: React.ReactNode; side?: "top" | "bottom"; className?: string }) {
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const hovering = useRef(false);
  const focused = useRef(false);
  const sync = () => setOpen(hovering.current || focused.current);

  const place = useCallback(() => {
    const t = wrap.current?.getBoundingClientRect();
    const b = tip.current;
    if (!t || !b) return;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const gap = 6;
    const pad = 8;
    let sd: "top" | "bottom" = side;
    if (sd === "top" && t.top - gap - h < pad && t.bottom + gap + h <= vh - pad) sd = "bottom";
    else if (sd === "bottom" && t.bottom + gap + h > vh - pad && t.top - gap - h >= pad) sd = "top";
    const x = Math.min(Math.max(pad, t.left + t.width / 2 - w / 2), Math.max(pad, vw - pad - w));
    const y = sd === "top" ? t.top - gap - h : t.bottom + gap;
    // positioned straight on the DOM node (no state, no extra render per scroll frame)
    b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    b.style.opacity = "1";
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hovering.current = false;
        focused.current = false;
        setOpen(false);
      }
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  return (
    <span
      ref={wrap}
      className={clsx("relative inline-flex", className)}
      aria-describedby={open ? id : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === "touch") return;
        hovering.current = true;
        sync();
      }}
      onPointerLeave={() => {
        hovering.current = false;
        sync();
      }}
      onFocus={() => {
        focused.current = true;
        sync();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        focused.current = false;
        sync();
      }}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={tip}
            id={id}
            role="tooltip"
            className={clsx(
              "pointer-events-none fixed top-0 left-0 z-[260] max-w-[min(320px,calc(100vw-16px))] rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-cream transition-opacity duration-150",
              "truncate whitespace-nowrap opacity-0",
            )}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
