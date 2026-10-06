"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useIsClient } from "./overlay-core";
import { useBottomUi, useIsPhone } from "./mobile";

/* =============================================================================
   StickyActionBar (MOBILE_SPEC §1.8): the phone home of a page's primary action.
   One per page, phones only by default, never together with the AppDock (the dock
   steps aside while this bar is on screen).

     // 1) mirror an inline button: the bar shows once that button scrolls out of view
     const payRef = useRef<HTMLButtonElement>(null);
     <Button ref={payRef} …>Pay ₹1,599</Button>
     <StickyActionBar watch={payRef} money="₹1,599" sub="incl. GST">
       <Button variant="accent" icon="lock" className="h-12">Pay ₹1,599</Button>
     </StickyActionBar>

     // 2) explicit: a dirty form
     <StickyActionBar show={dirty} title="Unsaved changes" sub="2 fields edited">
       <Button variant="ghost" onClick={discard}>Discard</Button>
       <Button className="h-12" onClick={save}>Save</Button>
     </StickyActionBar>

   Props
   - show?: boolean            explicit visibility (wins over `watch`)
   - watch?: RefObject         element whose visibility hides the bar (visible = it is off screen)
   - title / sub / money       left context: 15px bold title + 13px sub, or Londrina 26px money
   - context?: ReactNode       custom left side (instead of title/sub/money)
   - children                  actions (right). Primary: h-12 accent/ink pill; secondary: 44px.
   - avoidFooter = true        hides while a page <footer> is on screen
   - keyboard = "ride"         iOS: rides above the keyboard (--kb); "hide" = hides while typing
   - phoneOnly = true          false: also renders from 640px (centred, max 720px, beside the sidebar)
   - label                     accessible name of the region (default "Page actions")
   Layout contract: while visible it publishes --bottom-ui (main padding, toasts and
   scroll-padding clear it) and html[data-action-bar].
   ============================================================================= */

export function StickyActionBar({
  show,
  watch,
  title,
  sub,
  money,
  context,
  children,
  avoidFooter = true,
  keyboard = "ride",
  phoneOnly = true,
  label = "Page actions",
  className,
}: {
  show?: boolean;
  watch?: React.RefObject<HTMLElement | null>;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  money?: React.ReactNode;
  context?: React.ReactNode;
  children: React.ReactNode;
  avoidFooter?: boolean;
  keyboard?: "ride" | "hide";
  phoneOnly?: boolean;
  label?: string;
  className?: string;
}) {
  const client = useIsClient();
  const phone = useIsPhone();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [watchedOut, setWatchedOut] = useState(false);
  const [footerIn, setFooterIn] = useState(false);

  // watched inline button: visible <=> the button is out of the viewport
  useEffect(() => {
    const el = watch?.current;
    if (show !== undefined || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setWatchedOut(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch, show]);

  // page footer on screen: step aside so it never covers the legal row / links
  useEffect(() => {
    if (!avoidFooter || typeof IntersectionObserver === "undefined") return;
    const footer = document.querySelector("body footer");
    if (!footer) return;
    const io = new IntersectionObserver(([e]) => setFooterIn(e.isIntersecting), { threshold: 0 });
    io.observe(footer);
    return () => io.disconnect();
  }, [avoidFooter]);

  const wanted = show ?? (watch ? watchedOut : true);
  const active = phoneOnly ? phone : true;
  const visible = client && active && wanted && !footerIn;
  useBottomUi(`action-bar${id}`, ref, visible, { action: true });

  if (!client || !active) return null;
  return createPortal(
    <div
      ref={ref}
      role="region"
      aria-label={label}
      aria-hidden={!visible || undefined}
      inert={!visible}
      data-hidden={!visible || undefined}
      data-kbd-hide={keyboard === "hide" ? "" : undefined}
      className={clsx(
        "bottom-bar fixed z-40 flex min-h-16 items-center gap-3 rounded-card bg-white py-2.5 pr-2.5 pl-4 shadow-lift",
        "right-[max(12px,var(--sar))] bottom-[calc(max(12px,var(--sab))+var(--kb,0px))] left-[max(12px,var(--sal))]",
        "kbd:bottom-[calc(8px+var(--kb,0px))]",
        !phoneOnly && "sm:right-6 sm:left-[calc(var(--app-main-left)+24px)] sm:mx-auto sm:max-w-[720px]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {context ??
          (money !== undefined ? (
            <>
              <p className="font-display text-[26px] leading-none font-black tracking-[0.01em]">{money}</p>
              {sub && <p className="mt-1 truncate text-[13px] leading-tight font-semibold text-ink/60">{sub}</p>}
            </>
          ) : (
            <>
              {title && <p className="line-clamp-2 text-[15px] leading-tight font-bold">{title}</p>}
              {sub && <p className="mt-0.5 truncate text-[13px] leading-tight font-semibold text-ink/60">{sub}</p>}
            </>
          ))}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>,
    document.body,
  );
}
