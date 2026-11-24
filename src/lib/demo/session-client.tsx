"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/mock/types";
import { getUser } from "@/lib/mock";
import { getLiveDb, useDb } from "./store";
import { useTransitionRouter, whenNavigationAllowed } from "@/components/transition/RouteTransition";
import { DEMO_USERS, isValidDemoSession, parseDemoCookie, roleHome, type DemoSession } from "./session";
import { clearSessionCookie, readSessionCookie, setSessionHint, useSessionCookie, writeSessionCookie } from "./session-cookie";

export { DemoSessionSeed } from "./session-cookie";

/* =============================================================================
   Client side of the demo session (the cookie plumbing lives in session-cookie.tsx).
   - useDemoSession(): reads the tm_demo cookie (useSyncExternalStore). During SSR
     and hydration it returns the value handed down by <DemoSessionSeed> (app
     layouts pass the server-read cookie), else null, so markup always matches.
   - loginAsDemo(role) / logout(): write the cookie + notify subscribers. Server
     components only see the change after router.refresh() / a navigation, so
     prefer useDemoAuth(), which does that for you.
   ============================================================================= */

/** Re-align the html hint with the (validated) cookie, e.g. a stale cookie for a user that
 *  doesn't exist. Returns false when a cookie is present but not a valid session. */
export function syncSessionHint(): boolean {
  const s = parseDemoCookie(readSessionCookie());
  let live = null;
  try {
    live = s ? getUser(s.userId, getLiveDb()) : null;
  } catch {
    live = null;
  }
  const valid = !!s && isValidDemoSession(s, getUser(s.userId), live);
  setSessionHint(valid ? s.role : null);
  return valid || !s;
}

/**
 * Current demo session (null = logged out). Valid when the user holds the cookie's
 * role in the seed OR in the live demo store, so a store promotion (an approved
 * tutor application, an admin role change, a user created client-side) works
 * after `loginAs(role, { userId })`. SSR and hydration validate against the seed;
 * store-only sessions resolve right after hydration.
 */
export function useDemoSession(): DemoSession | null {
  const raw = useSessionCookie();
  const db = useDb();
  const parsed = useMemo(() => parseDemoCookie(raw), [raw]);
  const live = parsed ? getUser(parsed.userId, db) : null;
  const liveRole = live?.role ?? null;
  return useMemo(() => {
    if (!parsed) return null;
    return isValidDemoSession(parsed, getUser(parsed.userId), liveRole ? { role: liveRole } : null) ? parsed : null;
  }, [parsed, liveRole]);
}

/**
 * Session + the live profile (seed + demo-store edits such as demo.updateProfile) + the demo
 * account meta. SSR and hydration render the seed profile; store edits apply right after.
 */
export function useDemoUser() {
  const session = useDemoSession();
  const db = useDb();
  return useMemo(() => {
    if (!session) return null;
    const profile = getUser(session.userId, db) ?? getUser(session.userId)!;
    // meta: the role's demo-area info, carrying the signed-in user's own name and id
    return { ...session, profile, meta: { ...DEMO_USERS[session.role], name: profile.name, userId: session.userId } };
  }, [session, db]);
}

/** Writes the cookie (role's default account, or a specific seeded user id). */
export const loginAsDemo = (role: Role, userId?: string) => writeSessionCookie(role, userId);

export const logout = () => clearSessionCookie();

/**
 * The hook pages should use:
 *   const { session, loginAs, logout } = useDemoAuth();
 *   loginAs("tutor")                         // stay here, re-render server components
 *   loginAs("student", { redirectTo: "/dashboard" })
 *   loginAs("student", { redirectTo: "home" })   // the role's home (/dashboard, /tutor, /admin)
 *   logout({ redirectTo: "/" })
 */
const hereHref = () => window.location.pathname + window.location.search;

export function useDemoAuth() {
  const session = useDemoSession();
  const router = useRouter();
  const tr = useTransitionRouter();
  const loginAs = useCallback(
    (role: Role, opts: { redirectTo?: string | "home"; userId?: string } = {}) => {
      const to = opts.redirectTo === "home" ? roleHome(role) : opts.redirectTo;
      // Navigation guards (unsaved changes) get a say BEFORE the session flips.
      whenNavigationAllowed(to ?? hereHref(), () => {
        loginAsDemo(role, opts.userId);
        // refresh first: drops router-cache entries rendered for the previous session
        router.refresh();
        if (to) tr.push(to, { skipGuards: true });
      });
    },
    [router, tr],
  );
  const signOut = useCallback(
    (opts: { redirectTo?: string } = {}) => {
      const to = opts.redirectTo;
      whenNavigationAllowed(to ?? hereHref(), () => {
        logout();
        router.refresh();
        if (to) tr.push(to, { skipGuards: true });
      });
    },
    [router, tr],
  );
  return { session, loginAs, logout: signOut };
}
