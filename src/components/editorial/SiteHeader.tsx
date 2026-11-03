"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { NAV, PRIMARY_CTA, SOCIALS, FLAGSHIP } from "@/lib/content/site";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { currentScrollY, getLenis } from "@/lib/lenis";
import { useDemoAuth, useDemoUser, syncSessionHint } from "@/lib/demo/session-client";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";
import { useGround, type Ground } from "./useGround";

/* =============================================================================
   SiteHeader (Marlowe x Mobius). Fixed; three columns on desktop that line up
   with the hero's hairlines: logo | tiny letter-spaced caps nav (right-aligned) |
   the wide red CTA. Transparent at the very top of the page; once scrolled it
   paints the ground it sits on (ink over theatres, cream over cream sections,
   detected live by useGround). Hides on scroll down, returns on scroll up and on
   keyboard focus. Below 1024px: logo + compact red CTA + "Menu", which opens a
   full-screen ink menu with giant Anton links (a modal dialog: focus trapped,
   Escape closes, page scroll locked).

   <SiteHeader />                      ground auto-detected
   <SiteHeader initialGround="dark" /> SSR hint for pages that open on a dark hero
   <SiteHeader loginNext={false} />    Log in does not return here (404 pages)
   ============================================================================= */

function authHref(pathname: string | null, returnHere: boolean) {
  const back = returnHere && pathname && pathname !== "/" && !/^\/(login|signup|forgot-password)(\/|$)/.test(pathname) ? pathname : null;
  return `/login${back ? `?next=${encodeURIComponent(back)}` : ""}`;
}

const isActive = (pathname: string | null, match?: string) => !!(pathname && match && pathname.startsWith(match));

export function SiteHeader({ initialGround = "light", loginNext = true }: { initialGround?: Ground; loginNext?: boolean }) {
  const pathname = usePathname();
  const ground = useGround({ top: 36, initial: initialGround });
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const me = useDemoUser();
  const account = me ? { label: me.role === "student" ? "Dashboard" : me.role === "tutor" ? "Studio" : "Admin", href: me.meta.href } : { label: "Log in", href: authHref(pathname, loginNext) };

  useEffect(() => {
    syncSessionHint();
  }, [me]);

  // the page scrollbar follows the ground under the header (classic Windows scrollbars
  // would otherwise draw a light strip down every theatre section; globals.css BASE)
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.scrollbar = ground;
    return () => {
      delete html.dataset.scrollbar;
    };
  }, [ground]);

  // scrolled state + hide on scroll down / show on scroll up
  useEffect(() => {
    let last = currentScrollY();
    let raf = 0;
    const update = () => {
      const y = currentScrollY();
      setSolid(y > 8);
      if (y < 120) setHidden(false);
      else if (Math.abs(y - last) > 6) setHidden(y > last);
      if (y < 120 || Math.abs(y - last) > 6) last = y;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // a new route always starts with the menu closed (adjusted during render, no effect)
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const tone: Ground = open ? "dark" : ground;

  return (
    <>
      <a
        href="#main"
        className="t-label fixed top-3 left-3 z-[70] -translate-y-[calc(100%+24px)] bg-red px-5 py-4 text-white transition-transform duration-200 ease-ui focus:translate-y-0"
      >
        Skip to content
      </a>
      <header
        data-tone={tone}
        data-solid={solid && !open ? "" : undefined}
        data-hidden={hidden && !open ? "" : undefined}
        onFocusCapture={() => setHidden(false)}
        className="site-header fixed inset-x-0 top-0 z-50 pt-[var(--sat)]"
      >
        <div className="container-wide grid h-[var(--header-offset)] grid-cols-[1fr_auto] items-center gap-x-grid lg:grid-cols-[11fr_28fr_11fr]">
          <Link href="/" aria-label="Tamada Media, home" className="tap flex w-fit items-center">
            <BrandMark tone="auto" sizes="(min-width: 1024px) 128px, 104px" className="w-[104px] phone-s:w-[92px] lg:w-[128px]" />
          </Link>

          <nav aria-label="Primary" className="hidden h-full items-center justify-end gap-x-5 lg:flex xl:gap-x-8 2xl:gap-x-10">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(pathname, l.match) ? "page" : undefined}
                className="t-label link-draw py-2"
              >
                {l.label}
              </Link>
            ))}
            <span aria-hidden className="h-3.5 w-px bg-current opacity-30" />
            <Link href={account.href} className="t-label link-draw py-2 opacity-70 transition-opacity hf:opacity-100">
              {account.label}
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <Button href={PRIMARY_CTA.href} size="sm" className="lg:hidden phone-s:!px-3">
              {PRIMARY_CTA.short}
            </Button>
            <Button href={PRIMARY_CTA.href} className="hidden w-full max-w-[300px] lg:flex">
              <span className="xl:hidden">{PRIMARY_CTA.short}</span>
              <span className="max-xl:hidden">{PRIMARY_CTA.label}</span>
            </Button>
            <MenuButton open={open} onToggle={() => setOpen((o) => !o)} />
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} pathname={pathname} account={account} />
    </>
  );
}

function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="site-menu"
      className="tap hit t-label flex h-10 items-center gap-2.5 pl-2 lg:hidden"
    >
      <span>{open ? "Close" : "Menu"}</span>
      <span aria-hidden className="relative block h-2.5 w-5">
        <span className={clsx("absolute left-0 block h-px w-5 bg-current transition-[top,rotate] duration-300 ease-ui", open ? "top-[5px] rotate-45" : "top-0")} />
        <span className={clsx("absolute left-0 block h-px w-5 bg-current transition-[top,rotate] duration-300 ease-ui", open ? "top-[5px] -rotate-45" : "top-[9px]")} />
      </span>
    </button>
  );
}

function MobileMenu({
  open,
  onClose,
  pathname,
  account,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string | null;
  account: { label: string; href: string };
}) {
  const panel = useRef<HTMLDivElement>(null);
  const router = useTransitionRouter();
  const me = useDemoUser();
  const { logout } = useDemoAuth();

  // lock scroll, focus the first link, trap focus, Escape closes
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const lenis = getLenis();
    lenis?.stop();
    html.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true }), 160);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        opener?.focus?.();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // the header's Close button sits above the panel: it is part of the loop
      const toggle = document.querySelector<HTMLElement>('[aria-controls="site-menu"]');
      const f = [toggle, ...Array.from(panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"))].filter(
        (n): n is HTMLElement => !!n && n.offsetParent !== null,
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = "";
      lenis?.start();
    };
  }, [open, onClose]);

  // close first (unlock scroll), then navigate with the route curtain
  const go = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onClose();
      requestAnimationFrame(() => requestAnimationFrame(() => router.push(href)));
    },
    [onClose, router],
  );

  const links = [{ label: "Home", href: "/", match: "/" }, ...NAV];
  return (
    <div
      id="site-menu"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={!open}
      data-open={open ? "" : undefined}
      className="site-menu theatre fixed inset-0 z-[45] flex flex-col overflow-y-auto overscroll-contain pt-[calc(var(--header-offset)+var(--sat))] lg:hidden"
      data-lenis-prevent=""
    >
      <div className="container-wide flex min-h-full flex-1 flex-col pb-[max(28px,calc(var(--sab)+20px))]">
        <nav aria-label="Menu" className="mt-[clamp(20px,6vh,56px)] flex flex-col border-t border-line">
          {links.map((l, i) => {
            const active = l.href === "/" ? pathname === "/" : isActive(pathname, l.match);
            return (
              <Link
                key={l.href}
                href={l.href}
                data-no-transition=""
                aria-current={active ? "page" : undefined}
                onClick={(e) => go(e, l.href)}
                className="menu-item group flex items-baseline justify-between gap-4 border-b border-line py-2"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className={clsx("font-display text-[clamp(3rem,15vw,6.5rem)] leading-[0.92] uppercase", active && "text-red")}>{l.label}</span>
                <span className="t-timecode text-muted">{String(i + 1).padStart(2, "0")}</span>
              </Link>
            );
          })}
        </nav>

        <div className="menu-item mt-auto grid gap-6 pt-10" style={{ "--i": links.length } as React.CSSProperties}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href={FLAGSHIP.freeLessonHref} onClick={(e) => go(e, FLAGSHIP.freeLessonHref)}>
              {PRIMARY_CTA.label}
            </Button>
            <Link href={account.href} data-no-transition="" onClick={(e) => go(e, account.href)} className="t-label link-draw py-3">
              {account.label}
            </Link>
            {me && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="t-label py-3 text-muted"
              >
                Log out
              </button>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="t-label text-muted">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
