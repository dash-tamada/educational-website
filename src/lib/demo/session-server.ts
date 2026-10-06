import { cookies } from "next/headers";
import { getUser } from "@/lib/mock";
import type { Profile } from "@/lib/mock/types";
import { DEMO_COOKIE, parseDemoCookie, type DemoSession } from "./session";

/**
 * Server components / route handlers: the current demo session (or null when
 * logged out). Reading cookies makes the route dynamic, which is what we want
 * for session-aware pages.
 *
 *   const session = await getDemoSession();
 *   if (session?.role !== "student") ...
 */
export async function getDemoSession(): Promise<DemoSession | null> {
  const store = await cookies();
  const s = parseDemoCookie(store.get(DEMO_COOKIE)?.value);
  if (!s) return null;
  // a cookie pointing at a user that doesn't exist (or has another role) is ignored
  const u = getUser(s.userId);
  if (!u || u.role !== s.role) return null;
  return s;
}

/** The session's seeded profile (null when logged out). */
export async function getDemoUser(): Promise<(Profile & { session: DemoSession }) | null> {
  const s = await getDemoSession();
  if (!s) return null;
  const u = getUser(s.userId);
  return u ? { ...u, session: s } : null;
}

/**
 * The cookie's claim, validated against the seed only for "does this look like a
 * session": { role, userId, verified } where verified = the seed user holds that
 * role (same as getDemoSession). An unverified claim is a role the demo store may
 * have granted on the client (e.g. `tutor:u_s046` after an admin approved Bhavya's
 * application, or a user created client-side). Only AreaLayout should act on
 * unverified claims (it lets the client store decide); pages should keep using
 * getDemoSession().
 */
export async function getDemoClaim(): Promise<(DemoSession & { verified: boolean }) | null> {
  const store = await cookies();
  const s = parseDemoCookie(store.get(DEMO_COOKIE)?.value);
  if (!s) return null;
  const u = getUser(s.userId);
  return { ...s, verified: !!u && u.role === s.role };
}

/** Raw cookie value, to hand to <DemoSessionSeed value={...}> so client hooks hydrate without a flash. */
export async function getDemoCookieValue(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value ?? null;
}
