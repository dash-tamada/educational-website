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
import { AREAS, detailParent, isActive, moreItems, navBadgeSr, type AreaKey, type NavBadge, type NavItem } from "./nav";
import { Icon } from "./icons";
import { Avatar } from "./Display";
import { DemoPill } from "./Badge";
import { Segmented } from "./Form";
import { ConfirmDialog } from "./Overlay";
import { BottomSheet } from "./Sheet";
import { toast } from "./Toast";
import { useActionBarPresent, useBottomUi, useKeyboardOpen, useScrollHide, useScrolledPast } from "./mobile";
import { INK_SURFACE } from "./surfaces";

/* =============================================================================
   Phone chrome for the DashboardShell (MOBILE_SPEC §1.5), rendered below 640px only.
   Design system v2: a hairline-ruled cream top bar and an INK dock flush to the bottom.
   - AppTopBar: 56px (+ safe area), area name in Inter Tight + a mono "Demo data" slate
     (or back + page title on detail routes), up to three 44px square buttons: Search
     (student/admin), Notifications (red mono count), Avatar. Hides on scroll down,
     returns on scroll up and whenever one of its sheets opens.
   - AppDock: an ink bar flush to the bottom edge (safe-area padded), 5 slots (4 area
     destinations + More), tiny-caps labels, a red rule over the active slot, red mono
     badges. Publishes --bottom-ui. Steps aside while the keyboard is up or a
     StickyActionBar is on screen (one bottom bar at a time).
   - Sheets: More (rest of the nav + demo controls), Account, Notifications, Search.
   ============================================================================= */

type Badges = Partial<Record<NavBadge, number>>;

const square = "tap relative grid size-11 shrink-0 place-items-center text-ink active:bg-ink/[0.06]";

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
      <p className="mt-2.5 text-[13px] leading-snug text-muted">
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
    "tap relative flex min-h-[52px] w-full items-center gap-3.5 rounded-none px-3 text-left font-heading text-[17px] font-medium tracking-[-0.015em] outline-none focus-visible:bg-cream-2",
    danger ? "text-red-deep active:bg-red/[0.07]" : active ? "bg-cream-2 text-ink" : "text-ink active:bg-cream-2",
  );
  const inner = (
    <>
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] bg-red" />}
      <Icon name={icon} className="size-5 shrink-0 opacity-70" strokeWidth={1.6} />
      <span className="min-w-0 flex-1">{label}</span>
      {!!count && (
        <span className="grid h-5 min-w-5 place-items-center bg-red px-1.5 font-mono text-[11px] font-medium text-white">
          <span aria-hidden>{count}</span>
          <span className="sr-only">, {countLabel ?? count}</span>
        </span>
      )}
      {href && !count && <Icon name="arrow-right" className="size-4 shrink-0 opacity-35" strokeWidth={1.6} />}
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
    <div className="mt-5 first:mt-0">
      {title && <p className="mb-2 border-b border-line px-1 pb-2 text-[10.5px] font-semibold tracking-[0.18em] text-muted uppercase">{title}</p>}
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
        <div className="mb-2 flex items-center gap-3.5 border-b border-line pb-5">
          <Avatar name={user.name} src={user.avatar} tone={user.tone} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[19px] font-semibold tracking-[-0.025em]">{user.name}</p>
            <p className="truncate text-[13.5px] text-muted">{user.email}</p>
            <DemoPill className="mt-2" />
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
          <button type="button" onClick={() => demo.markNotificationsRead(userId)} className="tap h-11 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-ink uppercase active:bg-ink/[0.05]">
            Mark all read
          </button>
        ) : undefined
      }
    >
      {items.length ? (
        <ul className="-mx-2 flex flex-col divide-y divide-line">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  demo.markNotificationsRead(userId, [n.id]);
                  onClose();
                  if (n.href) router.push(n.href);
                }}
                className="tap flex min-h-16 w-full items-start gap-3 px-3 py-3.5 text-left active:bg-cream-2 focus-visible:bg-cream-2"
              >
                <span className={clsx("mt-[7px] size-[6px] shrink-0", n.read ? "bg-transparent" : "bg-red")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] leading-snug font-medium">
                    {!n.read && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted">{n.body}</span>
                  <span className="mt-1.5 block font-mono text-[10.5px] tracking-[0.06em] text-ink/50 uppercase">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center font-heading text-[18px] font-medium tracking-[-0.02em] text-muted">Nothing new. Go make something.</p>
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
        <Icon name="search" className="pointer-events-none absolute top-3.5 left-3.5 z-[1] size-5 text-ink/50" strokeWidth={1.6} />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          data-autofocus=""
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={cfg.short ?? cfg.placeholder}
          aria-label={cfg.placeholder}
          className="h-12 w-full rounded-none border-0 border-b border-ink/30 bg-cream-2 pr-4 pl-11 text-base placeholder:text-ink/45 focus:border-red focus:bg-paper focus:shadow-[inset_0_-1px_0_var(--color-red)] focus:outline-none"
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
        className="app-topbar sticky top-0 z-30 border-b border-line bg-cream pt-[var(--sat)] sm:hidden"
      >
        <div className="flex h-14 items-center gap-1 pr-[max(8px,var(--sar))] pl-[max(16px,var(--sal))]">
          {parent ? (
            <>
              <Link href={parent} aria-label="Back" className="tap -ml-3 grid size-11 shrink-0 place-items-center active:bg-ink/[0.06]">
                <Icon name="arrow-left" className="size-5" strokeWidth={1.7} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[16px] leading-tight font-semibold tracking-[-0.02em]">{title || cfg.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] leading-tight tracking-[0.1em] text-ink/60 uppercase">
                  <span className="size-[5px] rounded-full bg-red" aria-hidden />
                  Demo data
                </p>
              </div>
            </>
          ) : (
            <Link href={cfg.home} className="tap flex min-h-11 min-w-0 flex-1 items-center gap-2.5" aria-label={`${cfg.name} home (demo data)`}>
              <span aria-hidden className="font-display text-[20px] leading-none tracking-[0.02em]">
                TM<span className="text-red">.</span>
              </span>
              <span aria-hidden className="h-6 w-px bg-line-strong" />
              <span className="min-w-0">
                <span className="block truncate font-heading text-[16px] leading-tight font-semibold tracking-[-0.02em]">{cfg.mobileName}</span>
                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] leading-tight tracking-[0.1em] text-ink/60 uppercase">
                  <span className="size-[5px] rounded-full bg-red" aria-hidden />
                  Demo data
                </span>
              </span>
            </Link>
          )}
          <div className="ml-auto flex shrink-0 items-center">
            {cfg.mobileSearch && (
              <button type="button" onClick={() => setSheet("search")} aria-label={cfg.search.placeholder.replace(/…$/, "")} aria-haspopup="dialog" className={square}>
                <Icon name="search" className="size-5" strokeWidth={1.6} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheet("notifications")}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              aria-haspopup="dialog"
              className={square}
            >
              <Icon name="bell" className="size-5" strokeWidth={1.6} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1 grid h-4 min-w-4 place-items-center bg-red px-1 font-mono text-[9.5px] leading-none font-medium text-white" aria-hidden>
                  {unread}
                </span>
              )}
            </button>
            {user && (
              <button type="button" onClick={() => setSheet("account")} aria-label="Account and demo settings" aria-haspopup="dialog" className={square}>
                <Avatar name={user.name} src={user.avatar} tone={user.tone} size="sm" decorative />
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
      "tap relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1.5 text-[9.5px] leading-none font-semibold tracking-[0.12em] uppercase transition-colors land:h-11",
      active ? "text-cream" : "text-cream/50 active:text-cream",
    );
  const marker = (active: boolean) => <span aria-hidden className={clsx("absolute inset-x-3 top-0 h-[2px] bg-red transition-opacity duration-300", active ? "opacity-100" : "opacity-0")} />;

  return (
    <>
      <nav
        ref={ref}
        aria-label={`${cfg.name} quick navigation`}
        data-hidden={hidden || undefined}
        data-kbd-hide=""
        data-field="dark"
        className={clsx(
          "bottom-bar fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 pr-[var(--sar)] pb-[var(--sab)] pl-[var(--sal)] sm:hidden",
          INK_SURFACE,
        )}
      >
        {cfg.dock.map((item) => {
          const active = isActive(item, pathname);
          const n = item.badge ? badges[item.badge] : undefined;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={slot(active)}>
              {marker(active)}
              <span className="relative">
                <Icon name={item.icon} className="size-5" strokeWidth={1.6} />
                {!!n && (
                  <span className="app-fade absolute -top-1.5 -right-3 grid h-4 min-w-4 place-items-center bg-red px-1 font-mono text-[9.5px] leading-none font-medium tracking-normal text-white">
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
          {marker(moreActive)}
          <span className="relative">
            <Icon name="menu" className="size-5" strokeWidth={1.6} />
            {moreHasCount && <span className="absolute -top-0.5 -right-1.5 size-[6px] bg-red" aria-hidden />}
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
