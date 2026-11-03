"use client";

import Image from "next/image";
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
import { LOGO, LOGO_SRC } from "@/lib/brand";
import { AREAS, isActive, navBadgeSr, type AreaKey, type NavBadge, type NavItem } from "./nav";
import { Icon } from "./icons";
import { Avatar } from "./Display";
import { DemoPill } from "./Badge";
import { ConfirmDialog, DropdownMenu, useIsClient } from "./Overlay";
import { toast } from "./Toast";
import { AppDock, AppTopBar } from "./AppChrome";
import { AppClock } from "./Clock";
import { INK_SURFACE } from "./surfaces";
import { useIsShortLandscape, useScrollHide } from "./mobile";

/* =============================================================================
   DashboardShell (design system v2): the editorial workspace for /dashboard, /tutor
   and /admin.
   - Desktop (>= 1024px): a slim INK sidebar flush to the left edge (the theatre):
     light logo, the area slate, an "Index" of numbered nav items (Inter Tight, mono
     index, a red marker on the active one, red mono badges), "Shortcuts", and a
     footer with the live IST timecode, the Demo data slate and the collapse toggle.
     Collapsed (remembered per browser) = a 72px icon rail.
     Tablet (640-1023px): the 72px icon rail, always.
     Phones (< 640px): AppTopBar (area name, search / bell / avatar sheets) + AppDock
     (an ink bar flush to the bottom, 5 slots, More sheet) from AppChrome.tsx.
   - Top bar: hairline-ruled cream bar. Search (Enter goes to the area's search page with
     ?q=, "/" focuses it), demo role switch, notifications (live from the demo store),
     avatar menu (area home, public site, settings, reset demo data, log out).
   - Content: <main id="main"> on the cream canvas, max 1320px, 20/32/40px gutters.
   - Sidebar offset: the width is --sb on the shell wrapper and --app-sb on <html>;
     fixed bars portalled to <body> use left: var(--app-main-left) (0 below lg,
     the sidebar width from lg; see globals.css APP UI).
   Used by the area layouts (they also guard the role): page agents only render
   their page content inside it.
   ============================================================================= */

const COLLAPSE_KEY = "tm-sidebar-collapsed";
const SB_OPEN = 248;
const SB_RAIL = 72;
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

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Red mono count (sidebar, rail, dock). */
function Count({ n, className }: { n: number; className?: string }) {
  return (
    <span className={clsx("app-fade grid h-[18px] min-w-[18px] place-items-center bg-red px-1 font-mono text-[10px] leading-none font-medium text-white tabular-nums", className)}>
      {n}
    </span>
  );
}

function NavLink({
  item,
  index,
  active,
  collapsed,
  badge,
  external,
  onNavigate,
}: {
  item: NavItem;
  index?: number;
  active: boolean;
  collapsed?: boolean;
  badge?: number;
  /** shortcuts: an arrow instead of the index */
  external?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={clsx(
        "group/nav relative flex shrink-0 items-center transition-colors duration-200",
        collapsed ? "mx-auto h-11 w-11 justify-center short:h-10" : "h-10 gap-3.5 pr-4 pl-6 short:h-9",
        active ? "text-cream" : "text-cream/60 hf:text-cream",
        collapsed && (active ? "bg-white/[0.08]" : "hf:bg-white/[0.05]"),
      )}
    >
      {/* the red marker */}
      <span
        aria-hidden
        className={clsx(
          "absolute bg-red transition-[opacity,scale] duration-300 ease-expo",
          collapsed ? "inset-x-2 -bottom-px h-[2px]" : "inset-y-2 left-0 w-[2px]",
          active ? "opacity-100" : "scale-y-50 opacity-0",
        )}
      />
      {collapsed ? (
        <Icon name={item.icon} className="size-[19px]" strokeWidth={1.6} />
      ) : (
        <span aria-hidden className={clsx("w-5 shrink-0 font-mono text-[10.5px] tabular-nums transition-colors", active ? "text-red-lite" : "text-cream/35 group-hover/nav:text-cream/60")}>
          {external ? (
            <Icon name="arrow-right" className="size-3 -rotate-45 transition-transform duration-300 group-hover/nav:rotate-0" strokeWidth={1.8} />
          ) : index !== undefined ? (
            pad2(index)
          ) : null}
        </span>
      )}
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate font-heading text-[15px] font-medium tracking-[-0.015em]"}>{item.label}</span>
      {!!badge && (
        <>
          <Count n={badge} className={collapsed ? "absolute top-0.5 right-0.5" : ""} />
          <span className="sr-only">, {item.badge ? navBadgeSr(item.badge, badge) : badge}</span>
        </>
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

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return <div aria-hidden className="mx-auto my-3 h-px w-6 bg-white/15 short:my-2" />;
  return <p className="px-6 pt-5 pb-2 text-[10px] font-semibold tracking-[0.22em] text-cream/50 uppercase short:pt-3">{children}</p>;
}

function SidebarNav({ area, userId, collapsed, badges, onNavigate }: { area: AreaKey; userId: string; collapsed?: boolean; badges: Partial<Record<NavBadge, number>>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const cfg = AREAS[area];
  const secondary = useSecondaryNav(area, userId);
  return (
    <nav aria-label={`${cfg.name} navigation`} className="flex flex-col">
      <SectionLabel collapsed={collapsed}>Index</SectionLabel>
      <div className={clsx("flex flex-col", collapsed ? "gap-1" : "gap-0.5 short:gap-0")}>
        {cfg.nav.map((item, i) => (
          <NavLink
            key={item.href}
            item={item}
            index={i + 1}
            active={isActive(item, pathname)}
            collapsed={collapsed}
            badge={item.badge ? badges[item.badge] : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {secondary.length > 0 && (
        <>
          <SectionLabel collapsed={collapsed}>Shortcuts</SectionLabel>
          <div className={clsx("flex flex-col", collapsed ? "gap-1" : "gap-0.5 short:gap-0")}>
            {secondary.map((item) => (
              <NavLink key={item.href} item={item} active={false} external collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      )}
    </nav>
  );
}

const topBtn = "tap relative grid size-10 shrink-0 place-items-center text-ink ring-1 ring-ink/15 ring-inset transition-[box-shadow,color,background-color] duration-200 hf:ring-ink";

function RoleSwitcher({ current, compact, userId }: { current: Role; compact?: boolean; userId?: string }) {
  const { loginAs } = useDemoAuth();
  const db = useDb();
  // a non-default account (e.g. student:u_s012, or a tutor approved in the demo) can still switch to its role's default demo
  const own = userId && userId !== DEMO_USERS[current].userId ? getUser(userId, db) : null;
  return (
    <DropdownMenu
      label={`Demo role: ${DEMO_USERS[current].label}. Switch role`}
      width={280}
      triggerClassName="tap inline-flex h-10 items-center gap-2.5 px-3 text-ink ring-1 ring-ink/15 ring-inset transition-shadow duration-200 hf:ring-ink"
      trigger={
        <>
          <Icon name="switch" className="size-4 opacity-70" strokeWidth={1.7} />
          {!compact && (
            <span className="text-[10.5px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase max-md:hidden">
              <span className="text-ink/60">Viewing as </span>
              {DEMO_USERS[current].label}
            </span>
          )}
          <Icon name="chevron-down" className="size-3.5 opacity-55 max-md:hidden" strokeWidth={1.8} />
        </>
      }
      header={
        <div>
          <p className="t-label text-ink">Switch demo role</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
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
      width={360}
      triggerClassName={topBtn}
      trigger={
        <>
          <Icon name="bell" className="size-[18px]" strokeWidth={1.6} />
          {unread > 0 && <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center bg-red px-1 font-mono text-[10px] leading-none font-medium text-white">{unread}</span>}
        </>
      }
      header={
        <div className="flex items-center justify-between gap-2">
          <p className="t-label text-ink">
            Notifications {unread > 0 && <span className="font-mono text-red-deep">· {pad2(unread)}</span>}
          </p>
          {unread > 0 && (
            <button type="button" onClick={() => demo.markNotificationsRead(userId)} className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase hf:text-red">
              Mark all read
            </button>
          )}
        </div>
      }
      items={
        items.length
          ? items.slice(0, 6).map((n) => ({
              label: (
                <span className="block py-1.5 whitespace-normal">
                  <span className="flex items-center gap-2 text-[13.5px] leading-snug font-medium">
                    {!n.read && <span className="size-[6px] shrink-0 bg-red" aria-label="Unread" />}
                    <span className="line-clamp-1">{n.title}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted">{n.body}</span>
                  <span className="mt-1 block font-mono text-[10.5px] tracking-[0.06em] text-ink/50 uppercase">{timeAgo(n.createdAt)}</span>
                </span>
              ),
              onSelect: () => {
                demo.markNotificationsRead(userId, [n.id]);
                if (n.href) router.push(n.href);
              },
            }))
          : [{ label: "You're all caught up.", disabled: true }]
      }
      menuClassName="[&_[role=menuitem]]:h-auto [&_[role=menuitem]]:py-1 [&_[role=menuitem]]:items-start"
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
        width={260}
        triggerClassName="tap grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-transparent ring-offset-2 ring-offset-cream transition-shadow duration-200 hf:ring-ink"
        trigger={<Avatar name={user.name} src={user.avatar} tone={user.tone} size="md" decorative />}
        header={
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatar} tone={user.tone} size="md" decorative />
            <div className="min-w-0">
              <p className="truncate font-heading text-[15px] font-semibold tracking-[-0.015em]">{user.name}</p>
              <p className="truncate text-[12px] text-muted">{user.email}</p>
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
  const input = useRef<HTMLInputElement>(null);
  // the field is narrow between md and lg: use the short placeholder there so it never clips
  const wide = useSyncExternalStore(subscribeLg, () => window.matchMedia(LG).matches, () => false);
  const placeholder = wide || !cfg.short ? cfg.placeholder : cfg.short;
  // "/" focuses the search (unless you're already typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (!input.current || input.current.offsetParent === null) return;
      e.preventDefault();
      input.current.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      role="search"
      className="group/search relative hidden min-w-0 flex-1 md:block md:max-w-[400px]"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `${cfg.href}?q=${encodeURIComponent(v)}` : cfg.href);
      }}
    >
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 z-[1] size-4 -translate-y-1/2 text-ink/50" strokeWidth={1.7} />
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={cfg.placeholder}
        aria-keyshortcuts="/"
        className="peer h-10 w-full rounded-none border-0 border-b border-ink/20 bg-cream-2 pr-10 pl-9 text-[14px] text-ink transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-ink/45 hf:border-ink/50 focus:border-red focus:bg-paper focus:shadow-[inset_0_-1px_0_var(--color-red)] focus:outline-none"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 grid h-5 min-w-5 -translate-y-1/2 place-items-center px-1 font-mono text-[10.5px] text-ink/45 ring-1 ring-ink/15 ring-inset peer-focus:opacity-0"
      >
        /
      </kbd>
    </form>
  );
}

function SidebarLogo({ collapsed, href = "/", label = "Tamada Media home" }: { collapsed?: boolean; href?: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} className={clsx("tap flex items-center", collapsed ? "size-11 justify-center" : "")}>
      {collapsed ? (
        <span aria-hidden className="font-display text-[22px] leading-none tracking-[0.02em] text-cream">
          TM<span className="text-red">.</span>
        </span>
      ) : (
        <Image src={LOGO_SRC.light} alt="Tamada Media" width={LOGO.w} height={LOGO.h} sizes="120px" loading="eager" draggable={false} className="block h-auto w-[120px] select-none" />
      )}
    </Link>
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
  const sb = `${collapsed ? SB_RAIL : SB_OPEN}px`;

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
      <a href="#main" className="sr-only z-[400] bg-ink px-4 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-cream uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      {/* Desktop sidebar: the ink theatre */}
      <aside
        data-field="dark"
        className={clsx(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.07] transition-[width] duration-300 ease-ui lg:flex",
          INK_SURFACE,
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <div className={clsx("flex h-[72px] shrink-0 items-center short:h-16", collapsed ? "justify-center" : "px-6")}>
          <SidebarLogo collapsed={collapsed} />
        </div>
        {/* the area slate */}
        <div className={clsx("shrink-0 border-y border-white/[0.08]", collapsed ? "py-2.5 text-center" : "flex items-center justify-between gap-2 px-6 py-3")}>
          {collapsed ? (
            <span className="block font-mono text-[10px] tracking-[0.1em] text-red-lite uppercase" title={cfg.name}>
              {cfg.short.slice(0, 3)}
            </span>
          ) : (
            <>
              <span className="truncate text-[10.5px] font-semibold tracking-[0.18em] text-cream uppercase">{cfg.name}</span>
              <span aria-hidden className="size-[6px] shrink-0 animate-rec rounded-full bg-red" />
            </>
          )}
        </div>
        <div
          ref={navScrollRef}
          className="scroll-fade min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-color:rgb(253_248_238/0.2)_transparent] [scrollbar-width:thin]"
          data-lenis-prevent=""
        >
          <SidebarNav area={area} userId={userId} collapsed={collapsed} badges={badges} />
        </div>
        <div className={clsx("shrink-0 border-t border-white/[0.08]", collapsed ? "flex flex-col items-center gap-2 py-3" : "px-6 pt-4 pb-4 short:pt-3 short:pb-3")}>
          {!collapsed && (
            <div className="mb-3 flex items-center justify-between gap-2 short:mb-2">
              <AppClock className="text-cream/80" />
            </div>
          )}
          <div className={clsx("flex items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
            {!collapsed && <DemoPill tone="dark" />}
            <button
              type="button"
              onClick={() => writeCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
              className="tap grid size-9 place-items-center text-cream/55 transition-colors hf:text-cream"
            >
              <Icon name="panel-left" className="size-[18px]" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </aside>

      {/* Tablet icon rail (640-1023px): the collapsed sidebar, always on */}
      <aside
        data-field="dark"
        className={clsx("fixed inset-y-0 left-0 z-40 hidden w-[calc(72px+var(--sal))] flex-col border-r border-white/[0.07] pl-[var(--sal)] sm:flex lg:hidden", INK_SURFACE)}
      >
        <div className="flex h-16 shrink-0 items-center justify-center land:h-14">
          <SidebarLogo collapsed href={cfg.home} label={`${cfg.name} home`} />
        </div>
        <div className="shrink-0 border-y border-white/[0.08] py-2.5 text-center">
          <span className="block font-mono text-[10px] tracking-[0.1em] text-red-lite uppercase">{cfg.short.slice(0, 3)}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3 [scrollbar-width:none]" data-lenis-prevent="">
          <SidebarNav area={area} userId={userId} collapsed badges={badges} />
        </div>
      </aside>

      {/* Phones (< 640px): top bar + bottom dock */}
      <AppTopBar area={area} userId={userId} />

      {/* Content column */}
      <div className="transition-[padding] duration-300 ease-ui sm:pl-[calc(72px+var(--sal))] lg:pl-[var(--sb)]">
        <header data-hidden={landHidden || undefined} className="app-topbar sticky top-0 z-30 border-b border-line bg-cream/[0.92] backdrop-blur-md max-sm:hidden">
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-2 px-6 land:h-14 lg:px-10">
            {/* tablet: the sidebar (and its Demo data slate) is hidden, so show it here */}
            <span className="shrink-0 lg:hidden">
              <DemoPill />
            </span>
            <TopSearch area={area} />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <RoleSwitcher current={area} userId={userId} />
              <Notifications userId={userId} />
              <span aria-hidden className="mx-1 h-6 w-px bg-line" />
              <AccountMenu area={area} userId={userId} />
            </div>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] px-5 pt-5 pb-[calc(var(--bottom-ui)+32px)] sm:px-6 sm:pt-8 sm:pb-20 md:pt-10 lg:px-10 lg:pt-12 lg:pb-24 max-sm:pr-[max(20px,var(--sar))] max-sm:pl-[max(20px,var(--sal))]"
        >
          {children}
        </main>
      </div>

      <AppDock area={area} userId={userId} badges={badges} secondary={secondary} />
    </div>
  );
}
