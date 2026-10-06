"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Role } from "@/lib/mock/types";
import { getNotifications, getUser, timeAgo } from "@/lib/mock";
import { useDb, demo } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import { DEMO_USERS } from "@/lib/demo/session";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { Mascot } from "@/components/decor/Mascot";
import { AREAS, detailParent, isActive, moreItems, navBadgeSr, type AreaKey, type NavBadge, type NavItem } from "./nav";
import { Icon } from "./icons";
import { Avatar } from "./Display";
import { DemoPill } from "./Badge";
import { Segmented } from "./Form";
import { ConfirmDialog } from "./Overlay";
import { BottomSheet } from "./Sheet";
import { toast } from "./Toast";
import { useActionBarPresent, useBottomUi, useKeyboardOpen, useScrollHide, useScrolledPast } from "./mobile";

/* =============================================================================
   Phone chrome for the DashboardShell (MOBILE_SPEC §1.5), rendered below 640px only:
   - AppTopBar: 56px (+ safe area), area mark + name (or back + page title on detail
     routes), up to three 44px circles: Search (student/admin), Notifications, Avatar.
     Hides on scroll down, returns on scroll up and whenever one of its sheets opens.
   - AppDock: floating white pill at the bottom, 5 slots (4 area destinations + More),
     live badges, area-colour active pill. Publishes --bottom-ui. Steps aside while the
     keyboard is up or a StickyActionBar is on screen (one bottom bar at a time).
   - Sheets: More (rest of the nav + demo controls), Account, Notifications, Search.
   ============================================================================= */

type Badges = Partial<Record<NavBadge, number>>;

const circle = "tap relative grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-soft";

/* ----------------------------------------------------------------------------- page title (detail routes) */
/** The current document title without the " · Area | Tamada Media" suffix. */
function usePageTitle(enabled: boolean) {
  const [title, setTitle] = useState("");
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled) return;
    const read = () => setTitle(document.title.split(/ · | \| /)[0]?.trim() ?? "");
    read();
    const el = document.querySelector("title");
    const mo = new MutationObserver(read);
    if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
    mo.observe(document.head, { childList: true });
    return () => mo.disconnect();
  }, [enabled, pathname]);
  return title;
}

/* ----------------------------------------------------------------------------- demo role segmented */
function RoleSegmented({ area, userId }: { area: AreaKey; userId: string }) {
  const { loginAs } = useDemoAuth();
  const db = useDb();
  const own = userId !== DEMO_USERS[area].userId ? getUser(userId, db) : null;
  return (
    <div>
      <Segmented<Role>
        label="Switch demo role"
        value={area}
        onChange={(r) => {
          if (r !== area || own) loginAs(r, { redirectTo: "home" });
        }}
        className="flex w-full [&>*]:flex-1"
        options={(["student", "tutor", "admin"] as Role[]).map((r) => ({ value: r, label: DEMO_USERS[r].label }))}
      />
      <p className="mt-2 text-[13px] leading-snug text-ink/60">
        {own ? <>Signed in as {own.name}. </> : null}Jump between the three demo accounts. No passwords, all sample data.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------------- sheet rows */
function SheetRow({
  href,
  icon,
  label,
  count,
  countLabel,
  active,
  onClick,
  danger,
}: {
  href?: string;
  icon: NavItem["icon"];
  label: React.ReactNode;
  count?: number;
  countLabel?: string;
  active?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  const cls = clsx(
    "tap flex min-h-[52px] w-full items-center gap-3.5 rounded-[14px] px-3 text-left text-[16px] font-semibold outline-none focus-visible:bg-butter",
    danger ? "text-[#c13500] active:bg-[#ffe1d4]" : active ? "bg-cream text-ink" : "text-ink active:bg-butter",
  );
  const inner = (
    <>
      <Icon name={icon} className="size-5 shrink-0 opacity-80" strokeWidth={active ? 2.3 : 2} />
      <span className="min-w-0 flex-1">{label}</span>
      {!!count && (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-hotpink-deep px-2 text-[12px] font-bold text-white">
          <span aria-hidden>{count}</span>
          <span className="sr-only">, {countLabel ?? count}</span>
        </span>
      )}
      {href && !count && <Icon name="chevron-right" className="size-4 shrink-0 opacity-40" />}
    </>
  );
  if (href)
    return (
      <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cls}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function SheetGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      {title && <p className="t-micro mb-1.5 px-3 text-ink/55 uppercase">{title}</p>}
      <div className="-mx-2 flex flex-col">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- demo actions (shared by More + Account) */
function DemoActions({ area, userId, onDone }: { area: AreaKey; userId: string; onDone: () => void }) {
  const { logout } = useDemoAuth();
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <SheetGroup title="Demo">
        <div className="px-2 pt-1 pb-3">
          <RoleSegmented area={area} userId={userId} />
        </div>
        <SheetRow icon="refresh" label="Reset demo data" onClick={() => setResetOpen(true)} />
        <SheetRow icon="globe" label="View the public site" href="/" onClick={onDone} />
        <SheetRow
          icon="logout"
          label="Log out"
          danger
          onClick={() => {
            onDone();
            logout({ redirectTo: "/" });
          }}
        />
      </SheetGroup>
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          demo.reset();
          onDone();
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

/* ----------------------------------------------------------------------------- More sheet */
export function MoreSheet({ open, onClose, area, userId, badges, secondary }: { open: boolean; onClose: () => void; area: AreaKey; userId: string; badges: Badges; secondary: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const cfg = AREAS[area];
  const items = moreItems(area, secondary);
  const primary = items.filter((i) => cfg.nav.includes(i));
  const extra = items.filter((i) => !cfg.nav.includes(i));
  return (
    <BottomSheet open={open} onClose={onClose} title="More" description={`${cfg.name} · demo account, sample data`}>
      <SheetGroup>
        {primary.map((item) => {
          const n = item.badge ? badges[item.badge] : undefined;
          return (
            <SheetRow
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              count={n}
              countLabel={item.badge && n ? navBadgeSr(item.badge, n) : undefined}
              active={isActive(item, pathname)}
              onClick={onClose}
            />
          );
        })}
      </SheetGroup>
      {extra.length > 0 && (
        <SheetGroup title="Shortcuts">
          {extra.map((item) => (
            <SheetRow key={item.href} href={item.href} icon={item.icon} label={item.label} onClick={onClose} />
          ))}
        </SheetGroup>
      )}
      <DemoActions area={area} userId={userId} onDone={onClose} />
    </BottomSheet>
  );
}

/* ----------------------------------------------------------------------------- Account sheet */
function AccountSheet({ open, onClose, area, userId }: { open: boolean; onClose: () => void; area: AreaKey; userId: string }) {
  const db = useDb();
  const user = getUser(userId, db);
  const cfg = AREAS[area];
  return (
    <BottomSheet open={open} onClose={onClose} title="Your account">
      {user && (
        <div className="flex items-center gap-3 pb-4">
          <Avatar name={user.name} src={user.avatar} tone={user.tone} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold">{user.name}</p>
            <p className="truncate text-[14px] text-ink/65">{user.email}</p>
            <DemoPill className="mt-1.5" />
          </div>
        </div>
      )}
      <SheetGroup>
        <SheetRow icon="home" label={cfg.name} href={cfg.home} onClick={onClose} />
        <SheetRow icon="settings" label="Settings" href={cfg.settingsHref} onClick={onClose} />
      </SheetGroup>
      <DemoActions area={area} userId={userId} onDone={onClose} />
    </BottomSheet>
  );
}

/* ----------------------------------------------------------------------------- Notifications sheet */
function NotificationsSheet({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const db = useDb();
  const items = getNotifications(userId, db);
  const unread = items.filter((n) => !n.read).length;
  const router = useTransitionRouter();
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Notifications"
      description={unread ? `${unread} unread` : "You're all caught up."}
      headerAction={
        unread > 0 ? (
          <button type="button" onClick={() => demo.markNotificationsRead(userId)} className="tap h-11 rounded-full px-3 text-[14px] font-bold text-blue-deep active:bg-ink/[0.05]">
            Mark all read
          </button>
        ) : undefined
      }
    >
      {items.length ? (
        <ul className="-mx-2 flex flex-col">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  demo.markNotificationsRead(userId, [n.id]);
                  onClose();
                  if (n.href) router.push(n.href);
                }}
                className="tap flex min-h-16 w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left active:bg-butter focus-visible:bg-butter"
              >
                <span className={clsx("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-hotpink")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-snug font-bold">
                    {!n.read && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink/65">{n.body}</span>
                  <span className="mt-1 block text-[12px] font-semibold text-ink/55">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-[15px] text-ink/65">Nothing new. Go learn something.</p>
      )}
    </BottomSheet>
  );
}

/* ----------------------------------------------------------------------------- Search sheet */
function SearchSheet({ open, onClose, area }: { open: boolean; onClose: () => void; area: AreaKey }) {
  const cfg = AREAS[area].search;
  const router = useTransitionRouter();
  const [q, setQ] = useState("");
  return (
    <BottomSheet open={open} onClose={onClose} title="Search" description={cfg.placeholder.replace(/…$/, "")}>
      <form
        role="search"
        className="relative pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          onClose();
          router.push(v ? `${cfg.href}?q=${encodeURIComponent(v)}` : cfg.href);
        }}
      >
        <Icon name="search" className="pointer-events-none absolute top-3.5 left-4 size-5 text-ink/45" />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          data-autofocus=""
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={cfg.short ?? cfg.placeholder}
          aria-label={cfg.placeholder}
          className="h-12 w-full rounded-full bg-cream pr-4 pl-12 text-base font-medium placeholder:text-ink/45 focus:ring-2 focus:ring-blue focus:outline-none"
        />
      </form>
    </BottomSheet>
  );
}

/* ----------------------------------------------------------------------------- top bar */
export function AppTopBar({ area, userId }: { area: AreaKey; userId: string }) {
  const pathname = usePathname() ?? "";
  const cfg = AREAS[area];
  const db = useDb();
  const user = getUser(userId, db);
  const unread = getNotifications(userId, db).filter((n) => !n.read).length;
  const [sheet, setSheet] = useState<null | "search" | "notifications" | "account">(null);
  const parent = detailParent(pathname);
  const title = usePageTitle(!!parent);
  const scrollHidden = useScrollHide({ after: 56, delta: 8 });
  const scrolled = useScrolledPast(4);
  const hidden = scrollHidden && !sheet;
  const close = () => setSheet(null);

  return (
    <>
      <header
        data-hidden={hidden || undefined}
        data-scrolled={scrolled || undefined}
        className="app-topbar sticky top-0 z-30 bg-cream/[0.96] pt-[var(--sat)] sm:hidden"
      >
        <div className="flex h-14 items-center gap-2 pr-[max(16px,var(--sar))] pl-[max(16px,var(--sal))]">
          {parent ? (
            <>
              <Link href={parent} aria-label="Back" className="tap -ml-1.5 grid size-11 shrink-0 place-items-center rounded-full active:bg-ink/[0.06]">
                <Icon name="chevron-left" className="size-6" strokeWidth={2.4} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] leading-tight font-bold">{title || cfg.name}</p>
                <p className="truncate text-[12px] leading-tight font-semibold text-[#6b5400]">Demo data</p>
              </div>
            </>
          ) : (
            <Link href={cfg.home} className="tap flex min-h-11 min-w-0 flex-1 items-center gap-2" aria-label={`${cfg.name} home (demo data)`}>
              <Mascot title="" className="w-7 shrink-0" style={{ transform: "rotate(-6deg)" }} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] leading-tight font-bold">{cfg.mobileName}</span>
                <span className="flex items-center gap-1 text-[12px] leading-tight font-semibold text-[#6b5400]">
                  <span className="size-1.5 rounded-full bg-sun" aria-hidden />
                  Demo data
                </span>
              </span>
            </Link>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {cfg.mobileSearch && (
              <button type="button" onClick={() => setSheet("search")} aria-label={cfg.search.placeholder.replace(/…$/, "")} aria-haspopup="dialog" className={circle}>
                <Icon name="search" className="size-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheet("notifications")}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              aria-haspopup="dialog"
              className={circle}
            >
              <Icon name="bell" className="size-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-hotpink-deep px-1 text-[11px] leading-none font-bold text-white ring-2 ring-cream" aria-hidden>
                  {unread}
                </span>
              )}
            </button>
            {user && (
              <button type="button" onClick={() => setSheet("account")} aria-label="Account and demo settings" aria-haspopup="dialog" className={circle}>
                <Avatar name={user.name} src={user.avatar} tone={user.tone} size="sm" decorative eager className="size-9" />
              </button>
            )}
          </div>
        </div>
      </header>
      {cfg.mobileSearch && <SearchSheet open={sheet === "search"} onClose={close} area={area} />}
      <NotificationsSheet open={sheet === "notifications"} onClose={close} userId={userId} />
      <AccountSheet open={sheet === "account"} onClose={close} area={area} userId={userId} />
    </>
  );
}

/* ----------------------------------------------------------------------------- dock */
export function AppDock({ area, userId, badges, secondary }: { area: AreaKey; userId: string; badges: Badges; secondary: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const cfg = AREAS[area];
  const [moreOpen, setMoreOpen] = useState(false);
  const kbd = useKeyboardOpen();
  const actionBar = useActionBarPresent();
  const hidden = kbd || actionBar;
  const ref = useRef<HTMLElement>(null);
  // only while it is actually on a phone screen (display:none from 640px => height 0 => no --bottom-ui)
  useBottomUi("app-dock", ref, !hidden);
  const more = moreItems(area, secondary);
  const moreActive = more.some((i) => cfg.nav.includes(i) && isActive(i, pathname));
  const moreHasCount = more.some((i) => i.badge && badges[i.badge]);

  const slot = (active: boolean) =>
    clsx(
      "tap relative flex h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-full text-[12px] leading-none font-bold land:h-10",
      active ? cfg.activeClass : "text-ink/60",
    );

  return (
    <>
      <nav
        ref={ref}
        aria-label={`${cfg.name} quick navigation`}
        data-hidden={hidden || undefined}
        data-kbd-hide=""
        className="bottom-bar fixed right-[max(12px,var(--sar))] bottom-[max(12px,var(--sab))] left-[max(12px,var(--sal))] z-40 grid h-16 grid-cols-5 gap-1 rounded-full bg-white p-1.5 shadow-lift sm:hidden land:h-[52px]"
      >
        {cfg.dock.map((item) => {
          const active = isActive(item, pathname);
          const n = item.badge ? badges[item.badge] : undefined;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={slot(active)}>
              <span className="relative">
                <Icon name={item.icon} className="size-[22px]" strokeWidth={active ? 2.3 : 2} />
                {!!n && (
                  <span className="app-fade absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-hotpink-deep px-1 text-[11px] leading-none font-bold text-white ring-2 ring-white">
                    <span aria-hidden>{n}</span>
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5 land:sr-only">
                {item.label}
                {!!n && item.badge && <span className="sr-only">, {navBadgeSr(item.badge, n)}</span>}
              </span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className={slot(moreActive)}>
          <span className="relative">
            <Icon name="more" className="size-[22px]" strokeWidth={moreActive ? 2.3 : 2} />
            {moreHasCount && <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-hotpink ring-2 ring-white" aria-hidden />}
          </span>
          <span className="land:sr-only">
            More
            {moreHasCount && <span className="sr-only">, has updates</span>}
          </span>
        </button>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} area={area} userId={userId} badges={badges} secondary={secondary} />
    </>
  );
}
