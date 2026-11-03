import type { Role } from "@/lib/mock/types";
import type { Tone } from "@/lib/tone";
import type { IconName } from "./icons";

/* Sidebar navigation per app area. `badge` names a live count computed by the
   shell (see DashboardShell: useAreaBadges). */

export type AreaKey = Role; // "student" | "tutor" | "admin"
export type NavBadge = "unansweredQuestions" | "pendingApplications" | "coursesInReview" | "refundRequests" | "openReports" | "wishlist" | "drafts";
/** What a screen reader hears after each badge count ("Wishlist, 4 saved").
 *  Prefer navBadgeSr(badge, n), which pluralises ("1 draft", "4 unanswered questions"). */
export const NAV_BADGE_SR: Record<NavBadge, string> = {
  unansweredQuestions: "unanswered",
  pendingApplications: "pending",
  coursesInReview: "in review",
  refundRequests: "refund requests",
  openReports: "open",
  wishlist: "saved",
  drafts: "drafts",
};

const BADGE_NOUN: Record<NavBadge, [string, string]> = {
  unansweredQuestions: ["unanswered question", "unanswered questions"],
  pendingApplications: ["pending application", "pending applications"],
  coursesInReview: ["course in review", "courses in review"],
  refundRequests: ["refund request", "refund requests"],
  openReports: ["open report", "open reports"],
  wishlist: ["saved course", "saved courses"],
  drafts: ["draft", "drafts"],
};
/** Full screen-reader text for a nav badge: navBadgeSr("drafts", 1) -> "1 draft". */
export function navBadgeSr(badge: NavBadge, n: number) {
  const [one, many] = BADGE_NOUN[badge];
  return `${n} ${n === 1 ? one : many}`;
}

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** exact match only (area home) */
  exact?: boolean;
  badge?: NavBadge;
  /** href depends on the signed-in user; DashboardShell resolves it (or hides the item). */
  resolve?: "tutorProfile";
}

export interface AreaConfig {
  key: AreaKey;
  /** "Student space" / "Tutor studio" / "Admin control room" */
  name: string;
  short: string;
  home: string;
  tone: Tone;
  /** legacy: active nav item colours (the v2 shell marks the active item with a red rule instead) */
  activeClass: string;
  nav: NavItem[];
  secondary: NavItem[];
  /** phones (< 640px): the 4 AppDock slots (the 5th is "More": every other nav + secondary item) */
  dock: NavItem[];
  /** phones: area name in the 56px top bar (short enough for 320px) */
  mobileName: string;
  /** phones: show the search circle in the top bar */
  mobileSearch: boolean;
  /** top-bar search: where Enter goes (?q=) */
  search: { placeholder: string; href: string; /** placeholder below lg, where the field is narrow */ short?: string };
  settingsHref: string;
}

export const AREAS: Record<AreaKey, AreaConfig> = {
  student: {
    key: "student",
    name: "Student space",
    short: "Student",
    home: "/dashboard",
    tone: "hotpink",
    activeClass: "bg-ink text-cream",
    nav: [
      { label: "Dashboard", href: "/dashboard", icon: "home", exact: true },
      { label: "My courses", href: "/dashboard/courses", icon: "book" },
      { label: "Wishlist", href: "/dashboard/wishlist", icon: "heart", badge: "wishlist" },
      { label: "Certificates", href: "/dashboard/certificates", icon: "award" },
      { label: "Orders", href: "/dashboard/orders", icon: "receipt" },
      { label: "Account", href: "/dashboard/settings", icon: "settings" },
    ],
    secondary: [{ label: "Browse courses", href: "/courses", icon: "search" }],
    dock: [
      { label: "Home", href: "/dashboard", icon: "home", exact: true },
      { label: "Courses", href: "/dashboard/courses", icon: "book" },
      { label: "Saved", href: "/dashboard/wishlist", icon: "heart", badge: "wishlist" },
      { label: "Certs", href: "/dashboard/certificates", icon: "award" },
    ],
    mobileName: "Student space",
    mobileSearch: true,
    search: { placeholder: "Search courses…", href: "/courses" },
    settingsHref: "/dashboard/settings",
  },
  tutor: {
    key: "tutor",
    name: "Tutor studio",
    short: "Tutor",
    home: "/tutor",
    tone: "green",
    activeClass: "bg-ink text-cream",
    nav: [
      { label: "Studio", href: "/tutor", icon: "home", exact: true },
      { label: "Courses", href: "/tutor/courses", icon: "layers", badge: "drafts" },
      { label: "Analytics", href: "/tutor/analytics", icon: "chart" },
      { label: "Earnings", href: "/tutor/earnings", icon: "wallet" },
      { label: "Questions", href: "/tutor/questions", icon: "chat", badge: "unansweredQuestions" },
      { label: "Profile", href: "/tutor/settings", icon: "user" },
    ],
    secondary: [
      { label: "New course", href: "/tutor/courses/new", icon: "plus" },
      // href is the SIGNED-IN tutor's /tutors/<slug>; hidden when they have no public profile yet
      { label: "My public profile", href: "/tutors", icon: "external", resolve: "tutorProfile" },
    ],
    dock: [
      { label: "Studio", href: "/tutor", icon: "home", exact: true },
      { label: "Courses", href: "/tutor/courses", icon: "layers", badge: "drafts" },
      { label: "Questions", href: "/tutor/questions", icon: "chat", badge: "unansweredQuestions" },
      { label: "Earnings", href: "/tutor/earnings", icon: "wallet" },
    ],
    mobileName: "Tutor studio",
    mobileSearch: false,
    search: { placeholder: "Search your courses…", href: "/tutor/courses" },
    settingsHref: "/tutor/settings",
  },
  admin: {
    key: "admin",
    name: "Admin control room",
    short: "Admin",
    home: "/admin",
    tone: "purple",
    activeClass: "bg-ink text-cream",
    nav: [
      { label: "Control room", href: "/admin", icon: "home", exact: true },
      { label: "People", href: "/admin/users", icon: "users" },
      { label: "Tutor applications", href: "/admin/tutors", icon: "shield", badge: "pendingApplications" },
      { label: "Courses", href: "/admin/courses", icon: "layers", badge: "coursesInReview" },
      { label: "Categories", href: "/admin/categories", icon: "tag" },
      { label: "Payments", href: "/admin/payments", icon: "chart" },
      { label: "Orders", href: "/admin/orders", icon: "receipt", badge: "refundRequests" },
      { label: "Coupons", href: "/admin/coupons", icon: "ticket" },
      { label: "Payouts", href: "/admin/payouts", icon: "wallet" },
      { label: "Reports", href: "/admin/reports", icon: "flag", badge: "openReports" },
    ],
    secondary: [
      { label: "Settings", href: "/admin/settings", icon: "settings" },
      { label: "View the site", href: "/", icon: "globe" },
    ],
    dock: [
      { label: "Home", href: "/admin", icon: "home", exact: true },
      { label: "People", href: "/admin/users", icon: "users" },
      { label: "Courses", href: "/admin/courses", icon: "layers", badge: "coursesInReview" },
      { label: "Orders", href: "/admin/orders", icon: "receipt", badge: "refundRequests" },
    ],
    mobileName: "Control room",
    mobileSearch: true,
    search: { placeholder: "Search people by name or email…", short: "Search people…", href: "/admin/users" },
    settingsHref: "/admin/settings",
  },
};

/** Which app area a pathname belongs to (null for public/auth pages). Learn is its own area. */
export type SiteArea = "site" | "auth" | "learn" | AreaKey;
export function areaOf(pathname: string): SiteArea {
  if (/^\/dashboard(\/|$)/.test(pathname)) return "student";
  if (/^\/tutor(\/|$)/.test(pathname)) return "tutor";
  if (/^\/admin(\/|$)/.test(pathname)) return "admin";
  if (/^\/learn(\/|$)/.test(pathname)) return "learn";
  if (/^\/(login|signup|become-tutor|forgot-password)(\/|$)/.test(pathname)) return "auth";
  return "site";
}
/** App areas: navigation inside one is instant (no curtain) and Lenis is off. */
export const isAppArea = (a: SiteArea) => a === "student" || a === "tutor" || a === "admin" || a === "learn";

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Phones: nav + secondary items that are NOT in the dock (they live in the More sheet). */
export function moreItems(area: AreaKey, secondary: NavItem[] = AREAS[area].secondary): NavItem[] {
  const cfg = AREAS[area];
  const inDock = new Set(cfg.dock.map((d) => d.href));
  return [...cfg.nav.filter((n) => !inDock.has(n.href)), ...secondary];
}

/** Phones: detail routes get a back button + page title in the top bar instead of the area name.
 *  Returns the parent list to go back to, or null on root pages. */
export function detailParent(pathname: string): string | null {
  if (/^\/admin\/(users|courses)\/[^/]+$/.test(pathname)) return pathname.replace(/\/[^/]+$/, "");
  if (/^\/tutor\/courses\/(new|[^/]+\/builder)$/.test(pathname)) return "/tutor/courses";
  return null;
}
