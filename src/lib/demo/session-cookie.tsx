"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Role } from "@/lib/mock/types";
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, DEMO_USERS, parseDemoCookie, serializeDemoSession, type DemoSession } from "./session";

/* =============================================================================
   Cookie-only side of the demo session: what the tm_demo cookie claims, with no
   demo data attached. The marketing header reads this, so public pages never ship
   the demo database; session-client.tsx builds the validated hooks on top of it.
   ============================================================================= */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function readSessionCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${DEMO_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  // another tab may log in/out: re-read when this tab regains focus
  window.addEventListener("focus", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("focus", cb);
  };
}

/** Pre-paint hint for CSS (globals.css hides logged-out-only header bits while a session exists). */
export function setSessionHint(role: Role | null) {
  const d = document.documentElement;
  if (role) d.dataset.session = role;
  else delete d.dataset.session;
}

/** Writes the cookie (role's default account, or a specific seeded user id). */
export function writeSessionCookie(role: Role, userId?: string) {
  const value = serializeDemoSession({ role, userId: userId ?? DEMO_USERS[role].userId });
  document.cookie = `${DEMO_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
  setSessionHint(role);
  emit();
}

export function clearSessionCookie() {
  document.cookie = `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  setSessionHint(null);
  emit();
}

const SeedCtx = createContext<string | null | undefined>(undefined);

/**
 * Server layouts that read the cookie pass it here so client hooks render the
 * right session on the very first (SSR + hydration) pass:
 *   <DemoSessionSeed value={await getDemoCookieValue()}>{children}</DemoSessionSeed>
 */
export function DemoSessionSeed({ value, children }: { value: string | null; children: React.ReactNode }) {
  return <SeedCtx.Provider value={value}>{children}</SeedCtx.Provider>;
}

/** The raw cookie value (the seeded value during SSR and hydration, else null). */
export function useSessionCookie(): string | null {
  const seed = useContext(SeedCtx);
  return useSyncExternalStore(subscribeSession, readSessionCookie, () => seed ?? null);
}

/**
 * The session the cookie claims, for the marketing header: shown at once, then checked
 * against the demo data in the background (that code loads only for visitors with a
 * cookie, once the page is idle). A claim for a user that no longer exists (a reset demo
 * store) drops back to logged out, as the validated useDemoSession() would.
 */
export function useClaimedSession(): DemoSession | null {
  const raw = useSessionCookie();
  const claim = useMemo(() => parseDemoCookie(raw), [raw]);
  const [rejected, setRejected] = useState<string | null>(null);
  useEffect(() => {
    if (!raw) {
      setSessionHint(null);
      return;
    }
    let alive = true;
    const check = () =>
      import("./session-client")
        .then((m) => {
          if (alive && !m.syncSessionHint()) setRejected(raw);
        })
        .catch(() => {});
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(check, { timeout: 4000 }) : window.setTimeout(check, 1500);
    return () => {
      alive = false;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [raw]);
  return claim && rejected !== raw ? claim : null;
}
