/* Demo session: shared (server + client) constants and parsing. No real auth:
   the cookie "tm_demo" just says which demo account you are looking at. */

import type { Role } from "@/lib/mock/types";
import { DEMO_ADMIN_ID, DEMO_STUDENT_ID, DEMO_TUTOR_ID } from "@/lib/mock/seed/people";

export const DEMO_COOKIE = "tm_demo";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface DemoSession {
  role: Role;
  userId: string;
}

/** The three one-click demo accounts. */
export const DEMO_USERS: Record<Role, { userId: string; name: string; label: string; area: string; href: string }> = {
  student: { userId: DEMO_STUDENT_ID, name: "Priya Nair", label: "Student", area: "Student space", href: "/dashboard" },
  tutor: { userId: DEMO_TUTOR_ID, name: "Arjun Rao", label: "Tutor", area: "Tutor studio", href: "/tutor" },
  admin: { userId: DEMO_ADMIN_ID, name: "Admin", label: "Admin", area: "Admin control room", href: "/admin" },
};

const ROLES: Role[] = ["student", "tutor", "admin"];

/**
 * Cookie value: "student" | "tutor" | "admin" (default account for the role)
 * or "<role>:<userId>" (any seeded user, e.g. "student:u_s012").
 */
export function parseDemoCookie(raw: string | null | undefined): DemoSession | null {
  if (!raw) return null;
  const value = decodeURIComponent(raw).trim();
  const [role, userId] = value.split(":") as [Role, string | undefined];
  if (!ROLES.includes(role)) return null;
  return { role, userId: userId || DEMO_USERS[role].userId };
}

export function serializeDemoSession(s: DemoSession): string {
  return s.userId === DEMO_USERS[s.role].userId ? s.role : `${s.role}:${s.userId}`;
}

/**
 * Is a parsed cookie a valid session? The user must exist and hold the cookie's
 * role, either in the seed or in the live demo store (a store promotion, e.g. an
 * admin approving a tutor application, makes `tutor:<thatUserId>` valid on the
 * client; the server only knows the seed, see AreaLayout / getDemoClaim).
 */
export function isValidDemoSession(
  s: DemoSession | null,
  seedUser: { role: Role } | null | undefined,
  liveUser?: { role: Role } | null,
): s is DemoSession {
  if (!s) return false;
  return (!!seedUser && seedUser.role === s.role) || (!!liveUser && liveUser.role === s.role);
}

/** Where each role lands after "logging in". */
export const roleHome = (role: Role) => DEMO_USERS[role].href;
