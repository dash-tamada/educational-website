"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerNavigationGuard,
  type NavigationAttempt,
  type NavigationGuard,
} from "@/components/transition/RouteTransition";
import { ConfirmDialog } from "./Overlay";

/* =============================================================================
   Unsaved-changes guards for app pages.

   Drop-in (most pages):
     <UnsavedChangesGuard when={dirty} />
   While `when` is true, every in-app navigation (sidebar, breadcrumbs, top-bar
   search, role switcher, notifications, links, useTransitionRouter) opens a
   "Leave without saving?" confirm, and reload / tab close gets the browser's
   own prompt. Copy and behaviour are overridable:
     <UnsavedChangesGuard when={dirty} title="Discard this draft?"
       confirmLabel="Discard draft" onLeave={() => reset()} ignoreSearchChanges />

   After saving, navigate with useTransitionRouter().push(href, { skipGuards: true })
   (the `dirty` state may not have re-rendered yet).

   Low level:
     useNavigationGuard((to) => dirty ? askSomehow() : true)   // or null to disarm
     useBeforeUnload(dirty)
   Browser back/forward cannot be vetoed in the App Router (see RouteTransition).
   ============================================================================= */

/** Register `guard` while it is a function; pass null/false to disarm. Always calls the latest closure. */
export function useNavigationGuard(guard: NavigationGuard | null | false | undefined) {
  const ref = useRef(guard);
  useEffect(() => {
    ref.current = guard;
  });
  const armed = !!guard;
  useEffect(() => {
    if (!armed) return;
    return registerNavigationGuard((to) => {
      const g = ref.current;
      return g ? g(to) : true;
    });
  }, [armed]);
}

/** Ask the browser to confirm reload / tab close / external navigation while `when` is true. */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers need returnValue set to show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [when]);
}

export function UnsavedChangesGuard({
  when,
  title = "Leave without saving?",
  description = "You've made changes on this page that aren't saved yet. Leave now and they're gone.",
  confirmLabel = "Leave without saving",
  cancelLabel = "Keep editing",
  onLeave,
  ignoreSearchChanges = false,
  beforeUnload = true,
  shouldBlock,
}: {
  /** arm the guard (usually your form's dirty flag) */
  when: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** runs after the user confirms, just before the navigation (e.g. reset the form) */
  onLeave?: (to: NavigationAttempt) => void;
  /** let query-only changes (?tab=, ?page=) through without asking */
  ignoreSearchChanges?: boolean;
  /** also prompt on reload / tab close (default true) */
  beforeUnload?: boolean;
  /** fine-grained filter: return false to let a particular navigation through silently */
  shouldBlock?: (to: NavigationAttempt) => boolean;
}) {
  const [pending, setPending] = useState<NavigationAttempt | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    setPending(null);
    r?.(ok);
  }, []);

  // If the guard disarms (saved elsewhere) or unmounts while asking, let the navigation through.
  useEffect(() => {
    if (!when && resolver.current) settle(true);
  }, [when, settle]);
  useEffect(() => () => resolver.current?.(true), []);

  useNavigationGuard(
    when &&
      ((to) => {
        if (ignoreSearchChanges && to.url.pathname === window.location.pathname) return true;
        if (shouldBlock && !shouldBlock(to)) return true;
        return new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setPending(to);
        });
      }),
  );
  useBeforeUnload(when && beforeUnload);

  return (
    <ConfirmDialog
      open={pending !== null}
      onClose={() => settle(false)}
      onConfirm={() => {
        if (pending) onLeave?.(pending);
        settle(true);
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone="danger"
    />
  );
}

export {
  registerNavigationGuard,
  whenNavigationAllowed,
  confirmNavigation,
  type NavigationAttempt,
  type NavigationGuard,
} from "@/components/transition/RouteTransition";
