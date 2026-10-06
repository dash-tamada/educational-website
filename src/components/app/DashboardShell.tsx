"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import type { Role } from "@/lib/mock/types";
import { getNotifications, getPlatformStats, getTutor, getTutorQuestions, getUser, getWishlist, isEnrolled, timeAgo } from "@/lib/mock";
import { useDb, demo, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth, useDemoSession } from "@/lib/demo/session-client";
import { DEMO_USERS } from "@/lib/demo/session";
import { BrandLockup } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import { AREAS, isActive, navBadgeSr, type AreaKey, type NavBadge, type NavItem } from "./nav";
import { Icon } from "./icons";
import { Avatar } from "./Display";
import { DemoPill } from "./Badge";
import { ConfirmDialog, DropdownMenu, useIsClient } from "./Overlay";
import { toast } from "./Toast";
import { AppDock, AppTopBar } from "./AppChrome";
import { useIsShortLandscape, useScrollHide } from "./mobile";

/* =============================================================================
   DashboardShell: the app frame for /dashboard, /tutor and /admin.
   - Desktop: floating white sidebar (collapsible, remembered per browser) with
     the brand lockup, area pill, nav (active = area colour), live badges,
     "Demo data" pill. Tablet (640-1023px): the collapsed sidebar as a 72px icon rail.
     Phones (< 640px): AppTopBar (area mark, search / bell / avatar sheets) + AppDock
     (5-slot bottom nav, More sheet) from AppChrome.tsx; main pads for --bottom-ui.
   - Top bar: search (Enter goes to the area's search page with ?q=), demo role
     switcher, notifications (live from the demo store), avatar menu
     (area home, public site, settings, reset demo data, log out).
   - Content: <main id="main"> on the cream canvas, max 1280px, 16/24/32px gutters.
   - Sidebar offset: the width is --sb on the shell wrapper and --app-sb on <html>;
     fixed bars portalled to <body> use left: var(--app-main-left) (0 below lg,
     the sidebar width from lg; see globals.css APP UI).
   Used by the area layouts (they also guard the role): page agents only render
   their page content inside it.
   ============================================================================= */

const COLLAPSE_KEY = "tm-sidebar-collapsed";
const sidebarSubs = new Set<() => void>();
function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
  } catch {}
  sidebarSubs.forEach((s) => s());
}

/** Live sidebar counts. Empty until the demo overlay has applied, so the server/hydration
    pass never shows a seed count that then jumps (the badges fade in once real). */
function useAreaBadges(area: AreaKey, userId: string): Partial<Record<NavBadge, number>> {
  const db = useDb();
  const hydrated = useStoreHydrated();
  return useMemo(() => {
    if (!hydrated) return {};
    // saved courses still left to buy: same count as the dashboard tab and the wishlist
    // summary (a course bought after saving it stays in the wishlist table)
    if (area === "student") return { wishlist: getWishlist(userId, db).filter((w) => !isEnrolled(userId, w.course.id, db)).length };
    if (area === "tutor")
      return {
        unansweredQuestions: getTutorQuestions(userId, { unansweredOnly: true }, db).length,
        drafts: db.courses.filter((c) => c.tutorId === userId && c.status === "draft").length,
      };
    const s = getPlatformStats(db);
    return { pendingApplications: s.pendingApplications, coursesInReview: s.coursesInReview, refundRequests: s.refundRequests, openReports: s.openReports };
  }, [area, userId, db, hydrated]);
}

function NavLink({ item, active, collapsed, badge, activeClass, onNavigate }: { item: NavItem; active: boolean; collapsed?: boolean; badge?: number; activeClass: string; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={clsx(
        "group/nav relative flex h-11 shrink-0 items-center gap-3 rounded-full short:h-10 text-[15px] font-semibold transition-colors duration-150",
        collapsed ? "w-11 justify-center short:w-10" : "px-3.5",
        active ? activeClass : "text-ink/75 hf:bg-cream hf:text-ink",
      )}
    >
      <Icon name={item.icon} className="size-[19px]" strokeWidth={active ? 2.3 : 2} />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.label}</span>
      {!!badge && (
        <span
          className={clsx(
            "app-fade grid min-w-5 place-items-center rounded-full px-1.5 text-[11.5px] leading-5 font-bold",
            active ? "bg-white text-ink" : "bg-ink text-cream",
            collapsed && "absolute -top-1 -right-1 ring-2 ring-white",
          )}
        >
          <span aria-hidden>{badge}</span>
          <span className="sr-only">, {item.badge ? navBadgeSr(item.badge, badge) : badge}</span>
        </span>
      )}
    </Link>
  );
}

/** Secondary items whose href depends on the signed-in user (e.g. the tutor's own public profile). */
function useSecondaryNav(area: AreaKey, userId: string): NavItem[] {
  const db = useDb();
  return useMemo(
    () =>
      AREAS[area].secondary.flatMap((item) => {
        if (item.resolve !== "tutorProfile") return [item];
        const slug = getTutor(userId, db)?.slug;
        return slug ? [{ ...item, href: `/tutors/${slug}` }] : [];
      }),
    [area, userId, db],
  );
}

/** Toggles data-fade-top / data-fade-bottom on a scroller while content sits past
 *  that edge, so an overflowing sidebar nav shows a soft fade instead of hiding
 *  its last items under the footer with no cue (see .scroll-fade in globals.css). */
function useScrollFade<T extends HTMLElement>(dep?: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      el.toggleAttribute("data-fade-top", max > 1 && el.scrollTop > 1);
      el.toggleAttribute("data-fade-bottom", max > 1 && el.scrollTop < max - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [dep]);
  return ref;
}

function SidebarNav({ area, userId, collapsed, badges, onNavigate }: { area: AreaKey; userId: string; collapsed?: boolean; badges: Partial<Record<NavBadge, number>>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const cfg = AREAS[area];
  const secondary = useSecondaryNav(area, userId);
  return (
    <nav aria-label={`${cfg.name} navigation`} className="flex flex-col gap-1 short:gap-0.5">
      {cfg.nav.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item, pathname)} collapsed={collapsed} badge={item.badge ? badges[item.badge] : undefined} activeClass={cfg.activeClass} onNavigate={onNavigate} />
      ))}
      <div className={clsx("my-3 h-px shrink-0 bg-ink/[0.07] short:my-2", collapsed ? "mx-2" : "mx-3")} />
      {secondary.map((item) => (
        <NavLink key={item.href} item={item} active={false} collapsed={collapsed} activeClass={cfg.activeClass} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function RoleSwitcher({ current, compact, userId }: { current: Role; compact?: boolean; userId?: string }) {
  const { loginAs } = useDemoAuth();
  const db = useDb();
  // a non-default account (e.g. student:u_s012, or a tutor approved in the demo) can still switch to its role's default demo
  const own = userId && userId !== DEMO_USERS[current].userId ? getUser(userId, db) : null;
  return (
    <DropdownMenu
      label={`Demo role: ${DEMO_USERS[current].label}. Switch role`}
      width={260}
      triggerClassName="tap inline-flex h-10 items-center gap-2 rounded-full bg-white pr-1.5 pl-1.5 sm:pr-3 sm:pl-2 text-[14px] font-bold shadow-soft hf:bg-butter"
      trigger={
        <>
          <span className="grid size-7 place-items-center rounded-full bg-butter" aria-hidden>
            <Icon name="switch" className="size-4" strokeWidth={2.4} />
          </span>
          {!compact && (
            <span className="max-sm:hidden">
              <span className="font-semibold text-ink/65">Viewing as </span>
              {DEMO_USERS[current].label}
            </span>
          )}
          <Icon name="chevron-down" className="size-4 opacity-60 max-sm:hidden" />
        </>
      }
      header={
        <div>
          <p className="text-[13px] font-bold">Switch demo role</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink/60">
            {own ? <>You&apos;re signed in as {own.name}. </> : null}Jump between the three demo accounts. No passwords, all sample data.
          </p>
        </div>
      }
      items={(["student", "tutor", "admin"] as Role[]).map((r) => ({
        label: `${DEMO_USERS[r].name} · ${DEMO_USERS[r].label}`,
        icon: r === "student" ? "book" : r === "tutor" ? "layers" : "shield",
        hint: r === current && !own ? "Current" : undefined,
        disabled: r === current && !own,
        onSelect: () => loginAs(r, { redirectTo: "home" }),
      }))}
    />
  );
}

function Notifications({ userId }: { userId: string }) {
  const db = useDb();
  const items = getNotifications(userId, db);
  const unread = items.filter((n) => !n.read).length;
  const router = useTransitionRouter();
  return (
    <DropdownMenu
      label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      width={340}
      triggerClassName="tap relative grid size-10 place-items-center rounded-full bg-white shadow-soft hf:bg-butter"
      trigger={
        <>
          <Icon name="bell" className="size-[19px]" />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-hotpink-deep text-[10px] font-bold text-white ring-2 ring-white">{unread}</span>}
        </>
      }
      header={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-bold">Notifications</p>
          {unread > 0 && (
            <button type="button" onClick={() => demo.markNotificationsRead(userId)} className="text-[12.5px] font-bold text-blue hf:underline">
              Mark all read
            </button>
          )}
        </div>
      }
      items={
        items.length
          ? items.slice(0, 6).map((n) => ({
              label: (
                <span className="block py-1 whitespace-normal">
                  <span className="flex items-center gap-1.5 text-[13.5px] leading-snug font-bold">
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-hotpink" aria-label="Unread" />}
                    <span className="line-clamp-1">{n.title}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug font-medium text-ink/60">{n.body}</span>
                  <span className="mt-0.5 block text-[11.5px] font-semibold text-ink/65">{timeAgo(n.createdAt)}</span>
                </span>
              ),
              onSelect: () => {
                demo.markNotificationsRead(userId, [n.id]);
                if (n.href) router.push(n.href);
              },
            }))
          : [{ label: "You're all caught up.", disabled: true }]
      }
      menuClassName="[&_[role=menuitem]]:h-auto [&_[role=menuitem]]:py-1.5"
    />
  );
}

function AccountMenu({ area, userId }: { area: AreaKey; userId: string }) {
  const db = useDb();
  const user = getUser(userId, db);
  const { logout } = useDemoAuth();
  const cfg = AREAS[area];
  const [resetOpen, setResetOpen] = useState(false);
  if (!user) return null;
  return (
    <>
    <DropdownMenu
      label="Account menu"
      width={250}
      triggerClassName="tap grid size-10 place-items-center rounded-full bg-white shadow-soft hf:ring-2 hf:ring-ink/10"
      trigger={<Avatar name={user.name} src={user.avatar} tone={user.tone} size="sm" decorative eager />}
      header={
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} src={user.avatar} tone={user.tone} size="md" decorative />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{user.name}</p>
            <p className="truncate text-[12px] text-ink/65">{user.email}</p>
          </div>
        </div>
      }
      items={[
        { label: cfg.name, icon: "home", href: cfg.home },
        { label: "Settings", icon: "settings", href: cfg.settingsHref },
        { label: "View the public site", icon: "globe", href: "/" },
        { divider: true },
        {
          label: "Reset demo data",
          icon: "refresh",
          onSelect: () => setResetOpen(true),
        },
        { label: "Log out", icon: "logout", danger: true, onSelect: () => logout({ redirectTo: "/" }) },
      ]}
    />
    <ConfirmDialog
      open={resetOpen}
      onClose={() => setResetOpen(false)}
      onConfirm={() => {
        // demo.reset() also clears the per-browser demo extras (settings, tutor profile, admin notes...)
        demo.reset();
        toast.success("Demo data reset", { description: "Everything is back to the starting sample data." });
      }}
      title="Reset all demo data?"
      description="Purchases, progress, wishlist changes and settings made in this browser go back to the original sample data."
      confirmLabel="Reset demo data"
      tone="danger"
    />
    </>
  );
}

const LG = "(min-width: 1024px)";
function subscribeLg(cb: () => void) {
  const mq = window.matchMedia(LG);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function TopSearch({ area }: { area: AreaKey }) {
  const cfg = AREAS[area].search;
  const router = useTransitionRouter();
  const [q, setQ] = useState("");
  // the field is narrow between md and lg: use the short placeholder there so it never clips
  const wide = useSyncExternalStore(subscribeLg, () => window.matchMedia(LG).matches, () => false);
  const placeholder = wide || !cfg.short ? cfg.placeholder : cfg.short;
  return (
    <form
      role="search"
      className="relative hidden min-w-0 flex-1 md:block md:max-w-[420px]"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `${cfg.href}?q=${encodeURIComponent(v)}` : cfg.href);
      }}
    >
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink/45" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={cfg.placeholder}
        className="h-10 w-full rounded-full bg-white pr-4 pl-10 text-[14px] font-medium shadow-soft placeholder:text-ink/45 focus:ring-2 focus:ring-blue focus:outline-none"
      />
    </form>
  );
}

export function DashboardShell({ area, children }: { area: AreaKey; children: React.ReactNode }) {
  const session = useDemoSession();
  const userId = session?.userId ?? DEMO_USERS[area].userId;
  const cfg = AREAS[area];
  const client = useIsClient();
  const collapsedRaw = useSyncExternalStore(
    (cb) => {
      sidebarSubs.add(cb);
      return () => sidebarSubs.delete(cb);
    },
    readCollapsed,
    () => false,
  );
  const collapsed = client && collapsedRaw;
  const badges = useAreaBadges(area, userId);
  const secondary = useSecondaryNav(area, userId);
  // short landscape phones (812x375 class) use the tablet layout: the top bar auto-hides there
  const land = useIsShortLandscape();
  const landHidden = useScrollHide({ enabled: land });
  const navScrollRef = useScrollFade<HTMLDivElement>(collapsed);
  const sb = collapsed ? "92px" : "272px";

  // Mirror the sidebar width on <html> as --app-sb, so bars portalled to <body> can line up
  // with the content column via var(--app-main-left) (0 below lg) without measuring #main.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-sb", sb);
    // tablets: the 72px icon rail offsets fixed bars too (globals.css: html[data-app-shell])
    root.setAttribute("data-app-shell", "");
    return () => {
      root.style.removeProperty("--app-sb");
      root.removeAttribute("data-app-shell");
    };
  }, [sb]);

  return (
    <div className="min-h-dvh" data-shell="" style={{ "--sb": sb } as React.CSSProperties}>
      <a href="#main" className="sr-only z-[400] rounded-full bg-ink px-4 py-2 font-bold text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-3 left-3 z-40 hidden flex-col rounded-card-lg bg-white shadow-soft transition-[width] duration-300 ease-ui lg:flex",
          collapsed ? "w-[72px] items-center px-3" : "w-[252px] px-4",
        )}
      >
        <div className={clsx("flex h-[72px] shrink-0 items-center short:h-16", collapsed ? "justify-center" : "justify-between px-1")}>
          <Link href="/" aria-label="Tamada Media home" className="group tap flex items-center [--lw:112px]">
            {collapsed ? <Mascot title="" interactive className="w-9" style={{ transform: "rotate(-6deg)" }} /> : <BrandLockup interactive sizes="112px" />}
          </Link>
        </div>
        <div className={clsx("mb-4 shrink-0 short:mb-2", collapsed && "hidden")}>
          <span className={clsx("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold tracking-[0.04em] uppercase", cfg.activeClass)}>{cfg.name}</span>
        </div>
        <div ref={navScrollRef} className="app-scroll scroll-fade -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-3" data-lenis-prevent="">
          <SidebarNav area={area} userId={userId} collapsed={collapsed} badges={badges} />
        </div>
        <div className={clsx("flex shrink-0 items-center gap-2 border-t border-ink/[0.07] py-3 short:py-2", collapsed ? "flex-col" : "justify-between")}>
          {!collapsed && <DemoPill />}
          <button
            type="button"
            onClick={() => writeCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className="tap grid size-9 place-items-center rounded-full text-ink/60 hf:bg-cream hf:text-ink"
          >
            <Icon name="panel-left" className="size-[18px]" />
          </button>
        </div>
      </aside>

      {/* Tablet icon rail (640-1023px): the collapsed sidebar, always on */}
      <aside className="fixed inset-y-3 left-[max(12px,var(--sal))] z-40 hidden w-[72px] flex-col items-center rounded-card-lg bg-white px-3 shadow-soft sm:flex lg:hidden">
        <div className="flex h-[72px] shrink-0 items-center justify-center land:h-14">
          <Link href={cfg.home} aria-label={`${cfg.name} home`} className="group tap grid size-11 place-items-center">
            <Mascot title="" interactive className="w-9" style={{ transform: "rotate(-6deg)" }} />
          </Link>
        </div>
        <div className="app-scroll -mx-1 min-h-0 w-[calc(100%+8px)] flex-1 overflow-y-auto px-1 pb-3" data-lenis-prevent="">
          <SidebarNav area={area} userId={userId} collapsed badges={badges} />
        </div>
      </aside>

      {/* Phones (< 640px): top bar + bottom dock */}
      <AppTopBar area={area} userId={userId} />

      {/* Content column */}
      <div className="transition-[padding] duration-300 ease-ui sm:pl-[calc(92px+var(--sal))] lg:pl-[var(--sb)]">
        <header data-hidden={landHidden || undefined} className="app-topbar sticky top-0 z-30 bg-cream/85 backdrop-blur-md max-sm:hidden">
          <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-1.5 px-4 sm:gap-2 sm:px-6 md:h-[72px] land:h-14 lg:px-8">
            {/* tablet: the sidebar (and its Demo data pill) is hidden, so show it here */}
            <span className="shrink-0 lg:hidden">
              <DemoPill />
            </span>
            <TopSearch area={area} />
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <RoleSwitcher current={area} userId={userId} />
              <Notifications userId={userId} />
              <AccountMenu area={area} userId={userId} />
            </div>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1280px] px-4 pt-3 pb-[calc(var(--bottom-ui)+24px)] sm:px-6 sm:pt-4 sm:pb-16 md:pt-6 lg:px-8 lg:pb-20 max-sm:pr-[max(16px,var(--sar))] max-sm:pl-[max(16px,var(--sal))]"
        >
          {children}
        </main>
      </div>

      <AppDock area={area} userId={userId} badges={badges} secondary={secondary} />
    </div>
  );
}
