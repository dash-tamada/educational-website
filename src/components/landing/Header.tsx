"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { navFor, type NavLink } from "@/lib/landing-data";
import { Mascot } from "@/components/decor/Mascot";
import { ArrowButton } from "@/components/decor/Bits";
import { Cloud } from "@/components/decor/Cloud";
import { ScallopEdge } from "@/components/decor/Scallop";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { getLenis } from "@/lib/lenis";
import { LOGO, LOGO_SRC } from "@/lib/brand";
import type { Role } from "@/lib/mock/types";
import { syncSessionHint, useDemoAuth, useDemoUser } from "@/lib/demo/session-client";
import { DropdownMenu, type MenuItem } from "@/components/app/Overlay";
import { Avatar } from "@/components/app/Display";
import { useOverflowFade } from "@/components/app/Navigation";
import { getCategories } from "@/lib/mock";

/* =============================================================================
   Header (spec V2 §5): fixed, on the container column. Left:
   the brand lockup (Tami + official logo); right side = one white pill of links
   with a sliding butter highlight (H2), the flame split CTA (H1) and a white
   circle log-in button (H4). Hides on scroll down, returns on scroll up (500ms
   ease-ui). Once the page scrolls the lockup gets a white pill backing and eases
   to 80% (same pill language as the nav). Below 1024px: lockup + compact flame
   pill + circle menu button opening a cream cloud sheet with big Londrina links.
   Phones (MOBILE_SPEC §1.6): fits 320px (smaller lockup, 44px CTA + menu button at
   < 360px), the compact CTA turns white when the field under it is flame / tangerine /
   hot pink (it would vanish otherwise), the top padding clears the notch (--sat), and the
   menu sheet scrolls, with a course search, a category chip rail and an account row.
   ============================================================================= */

/* Fills the flame CTA would disappear on (rgb of flame, flame-deep, tangerine, hotpink, hotpink-deep). */
const WARM_FILLS = ["253, 68, 1", "196, 52, 0", "249, 162, 32", "255, 0, 140", "214, 0, 111"];

/** Is the element under `el` (ignoring the header itself) painted in a warm fill? Checked on
 *  mount, on scroll (throttled) and on resize. */
function useWarmBehind(el: React.RefObject<HTMLElement | null>, header: React.RefObject<HTMLElement | null>) {
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    let t = 0;
    let last = 0;
    const check = () => {
      t = 0;
      last = performance.now();
      const n = el.current;
      if (!n || !n.offsetParent) return;
      const r = n.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      let hit = false;
      for (const node of document.elementsFromPoint(x, y)) {
        if (header.current?.contains(node) || node.closest("#mobile-menu")) continue;
        const bg = getComputedStyle(node).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const parts = m[1].split(",").map((v) => v.trim());
        if (parts.length === 4 && parseFloat(parts[3]) < 0.5) continue;
        hit = WARM_FILLS.includes(parts.slice(0, 3).join(", "));
        break;
      }
      setWarm(hit);
    };
    const schedule = () => {
      if (t) return;
      const wait = Math.max(0, 120 - (performance.now() - last));
      t = window.setTimeout(check, wait);
    };
    check();
    // fonts / images settle the layout after first paint
    const late = window.setTimeout(check, 600);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(late);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [el, header]);
  return warm;
}

/** Menu sheet: the first six categories as a swipeable chip rail. */
function MenuCategories({ onGo }: { onGo: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  useOverflowFade(row);
  const cats = getCategories().slice(0, 6);
  return (
    <div ref={row} className="h-scroller mt-3 gap-2 pb-1" data-lenis-prevent="">
      {cats.map((c) => (
        <Link
          key={c.id}
          href={`/courses?category=${c.slug}`}
          data-no-transition=""
          onClick={(e) => onGo(e, `/courses?category=${c.slug}`)}
          className="tap inline-flex h-11 items-center rounded-full bg-white px-4 text-[15px] font-bold whitespace-nowrap text-ink shadow-soft active:bg-butter"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}

/** Official logo size: re-exported from the server-safe "@/lib/brand" (import it from there). */
export { LOGO } from "@/lib/brand";

/**
 * Brand lockup: Tami (the play-button mascot) stands on the LEFT of the official
 * logo, as one unit. Everything is sized from the logo width `--lw` (set it on
 * the lockup or any ancestor):
 *   logo  : w = lw, h = lw * 546/1665 (0.328 lw)
 *   Tami  : w = 0.34 lw => h = 0.36 lw (svg box ~1.1x the logo height, so the
 *           triangle body reads as tall as TAMADA + MEDIA), -6deg
 *   gap   : 0.08 lw (+0.02 lw lead so the tilted arm stays on the column)
 *   total width ~= 1.44 lw
 * The logo image is never stretched, recoloured, cropped or rotated; only Tami
 * moves (hover: bounce + blink + a small wave tilt, fine pointer only, when the
 * lockup sits inside a `.group` and `interactive` is set).
 * `tamiClassName` / `logoClassName` land on GSAP-safe inner boxes (the resting
 * tilt lives on an outer box), e.g. for the intro curtain's entrance.
 * Loading: the lockup almost always sits above the fold (header, app sidebar,
 * learn top bar, role gate), where it is often the LCP image, so it loads
 * eagerly by default. Pass `loading="lazy"` for below-the-fold uses (footer),
 * or `preload` for the one lockup that should also get a <link rel=preload>.
 */
export function BrandLockup({
  light,
  preload,
  loading = "eager",
  sizes,
  interactive,
  className,
  tamiClassName,
  logoClassName,
}: {
  /** white letters (dark / saturated fields); default ink letters */
  light?: boolean;
  preload?: boolean;
  /** img loading; default "eager" (ignored when `preload` is set) */
  loading?: "eager" | "lazy";
  /** next/image sizes: the logo width */
  sizes: string;
  interactive?: boolean;
  className?: string;
  tamiClassName?: string;
  logoClassName?: string;
}) {
  return (
    <span className={clsx("flex items-center", className)}>
      <span
        aria-hidden
        className="mr-[calc(var(--lw)*0.08)] ml-[calc(var(--lw)*0.02)] block w-[calc(var(--lw)*0.34)] shrink-0"
        style={{ transform: "rotate(-6deg)" }}
      >
        <span className={clsx("block", tamiClassName)}>
          <span
            className={clsx(
              "block origin-[50%_90%]",
              interactive &&
                "transition-[rotate] duration-[450ms] ease-spring group-hf:[rotate:8deg]",
            )}
          >
            <Mascot
              title=""
              interactive={interactive}
              className="block h-auto w-full"
            />
          </span>
        </span>
      </span>
      <span className={clsx("block shrink-0", logoClassName)}>
        <Image
          src={
            light
              ? LOGO_SRC.light
              : LOGO_SRC.dark
          }
          alt="Tamada Media"
          width={LOGO.w}
          height={LOGO.h}
          sizes={sizes}
          preload={preload}
          loading={preload ? undefined : loading}
          draggable={false}
          className="block h-auto w-(--lw) max-w-none select-none"
        />
      </span>
    </span>
  );
}

/**
 * Header / footer brand link = the lockup (logo 104px wide on phones, 92px under
 * 375px, 140px from 1024px). `light` = white letters for dark / saturated fields.
 * `compact` (header only): once the page scrolls, a white pill fades in behind the
 * lockup and the whole lockup eases down to 80% (transform only, no layout shift),
 * so Tami + logo stay together, match the 48/52px nav pills and never sit unbacked
 * over hero content (R1-09).
 */
export function Logo({
  className,
  light,
  compact,
  preload,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
  /** header instance: fetch it with the page (LCP-adjacent) */
  preload?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Tamada Media home"
      className={clsx(
        "group tap relative flex h-12 shrink-0 items-center [--lw:104px] max-[374px]:[--lw:92px] phone-s:[--lw:84px] lg:h-[52px] lg:[--lw:140px]",
        className,
      )}
    >
      <span
        className={clsx(
          "relative block origin-left transition-[translate,scale] duration-500 ease-ui",
          compact && "translate-x-[14px] scale-[.8] lg:translate-x-4",
        )}
      >
        {/* Pill backing lives inside the scaled box, so it always hugs the lockup:
            60/65px tall before the 0.8 scale = 48/52px, like the nav pills. */}
        <span
          aria-hidden
          className={clsx(
            "absolute inset-x-[-17.5px] top-1/2 h-[60px] -translate-y-1/2 rounded-full bg-white shadow-soft transition-[opacity,scale] duration-300 ease-ui lg:inset-x-[-20px] lg:h-[65px]",
            compact ? "scale-100 opacity-100" : "scale-[.92] opacity-0",
          )}
        />
        <BrandLockup
          className="relative"
          light={light && !compact}
          preload={preload}
          interactive
          sizes="(min-width: 1024px) 140px, 104px"
        />
      </span>
    </Link>
  );
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8.2"
        r="3.9"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M4.6 20.2c.9-3.7 3.9-5.9 7.4-5.9s6.5 2.2 7.4 5.9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * White link pill with one butter highlight that slides between links (clip-path, no layout).
 * The current section (e.g. Courses on /courses/*) is marked aria-current and the highlight
 * rests on it; hovering another link slides it over, leaving slides it back. Before the first
 * measurement (SSR, hydration) the active link paints its own butter pill with the same
 * geometry, so there is no flash.
 */
function NavPill({ links }: { links: (NavLink & { active: boolean })[] }) {
  const nav = useRef<HTMLElement>(null);
  // jump: appear in place (fade) instead of sliding; snap: no transition at all (the
  // hand-over from the active link's own pill to the highlight must not blink)
  const [hl, setHl] = useState({ l: 0, r: 0, on: false, jump: true, snap: false });
  const activeHref = links.find((l) => l.active)?.href ?? null;

  const measure = (a: HTMLElement, p: HTMLElement) => ({ l: a.offsetLeft, r: p.clientWidth - (a.offsetLeft + a.offsetWidth) });
  const show = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    const p = nav.current;
    if (!p) return;
    const m = measure(e.currentTarget, p);
    setHl((h) => ({ ...m, on: true, jump: !h.on, snap: false }));
  };
  /** back to the current section (or off when there is none) */
  const rest = useCallback(() => {
    const p = nav.current;
    const a = p?.querySelector<HTMLElement>('[aria-current="page"]');
    if (p && a) {
      const m = measure(a, p);
      setHl((h) => ({ ...m, on: true, jump: !h.on, snap: !h.on }));
    } else setHl((h) => ({ ...h, on: false, snap: false }));
  }, []);

  useEffect(() => {
    rest();
    if (!activeHref) return;
    // webfonts change the link widths after first paint
    let alive = true;
    document.fonts?.ready.then(() => alive && rest());
    window.addEventListener("resize", rest);
    return () => {
      alive = false;
      window.removeEventListener("resize", rest);
    };
  }, [activeHref, rest]);

  return (
    <nav
      ref={nav}
      aria-label="Primary"
      onMouseLeave={rest}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
      className="relative flex h-[52px] items-center rounded-full bg-white px-1.5 shadow-soft"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 inset-y-1.5 bg-butter ease-ui"
        style={{
          clipPath: `inset(0 ${hl.r}px 0 ${hl.l}px round 999px)`,
          opacity: hl.on ? 1 : 0,
          transitionProperty: hl.snap ? "none" : hl.jump ? "opacity" : "clip-path, opacity",
          transitionDuration: "300ms, 200ms",
        }}
      />
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          onMouseEnter={show}
          onFocus={show}
          className={clsx(
            "relative flex h-10 items-center rounded-full px-4 text-[16px] leading-none font-semibold tracking-[-0.01em]",
            l.active && !hl.on && "bg-butter",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Logged-out auth links carry the page you are on as ?next= (the auth pages
 * validate it and send you back after a demo login), so "Log in" from a course
 * or checkout page lands you right back there. Home and the auth pages
 * themselves are not worth returning to. Sign-up only returns to buying pages.
 */
function authLinks(pathname: string | null, returnHere = true) {
  const back =
    returnHere && pathname && pathname !== "/" && !/^\/(login|signup|forgot-password)(\/|$)/.test(pathname)
      ? pathname
      : null;
  const q = back ? `?next=${encodeURIComponent(back)}` : "";
  return {
    login: `/login${q}`,
    signup: back && /^\/(courses\/[^/]+|checkout\/[^/]+)/.test(back) ? `/signup${q}` : "/signup",
  };
}

/** Logged-in header CTA per demo role (`short`: the compact pill below 1024px, where a
 *  long label would eat the 20px right gutter at 375px; `tiny`: below 350px, so
 *  lockup + CTA + menu button still fit a 320px phone). */
const ROLE_CTA: Record<Role, { label: string; short: string; tiny: string; href: string }> = {
  student: { label: "Continue learning", short: "Dashboard", tiny: "Learn", href: "/dashboard" },
  tutor: { label: "Open studio", short: "Studio", tiny: "Studio", href: "/tutor" },
  admin: { label: "Control room", short: "Admin", tiny: "Admin", href: "/admin" },
};

/** Compact-pill label that swaps to a shorter word below 350px. */
function FitLabel({ label, tiny }: { label: string; tiny: string }) {
  if (label === tiny) return <>{label}</>;
  return (
    <>
      <span className="max-[349px]:hidden">{label}</span>
      <span className="min-[350px]:hidden">{tiny}</span>
    </>
  );
}

/** Desktop avatar menu (logged in): role area, a couple of shortcuts, log out. */
function AccountButton() {
  const me = useDemoUser();
  const { logout } = useDemoAuth();
  if (!me) return null;
  const extra: MenuItem[] =
    me.role === "student"
      ? [
          { label: "My courses", icon: "book", href: "/dashboard/courses" },
          { label: "Wishlist", icon: "heart", href: "/dashboard/wishlist" },
        ]
      : me.role === "tutor"
        ? [{ label: "New course", icon: "plus", href: "/tutor/courses/new" }]
        : [{ label: "Review queue", icon: "layers", href: "/admin/courses" }];
  return (
    <DropdownMenu
      label={`Account menu for ${me.profile.name}`}
      width={240}
      triggerClassName="hover-icon grid size-[52px] place-items-center rounded-full bg-white shadow-soft"
      trigger={<Avatar name={me.profile.name} src={me.profile.avatar} tone={me.profile.tone} size="md" decorative />}
      header={
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{me.profile.name}</p>
          <p className="truncate text-[12px] text-ink/55">Demo {me.meta.label.toLowerCase()} account</p>
        </div>
      }
      items={[
        { label: me.meta.area, icon: "home", href: me.meta.href },
        ...extra,
        { divider: true },
        { label: "Log out", icon: "logout", danger: true, onSelect: () => logout({ redirectTo: "/" }) },
      ]}
    />
  );
}

/**
 * `light`: white logo letters while the header sits over a dark / saturated
 * field at the top of the page (the compact white-pill state always uses the
 * ink logo). The coming-soon pages pass their field's `dark` flag.
 * `loginNext={false}`: drop the ?next=<this page> return trip from Log in / Sign up
 * (404 pages: returning the visitor to a broken URL after logging in is pointless).
 */
export function Header({
  light = false,
  loginNext = true,
}: { light?: boolean; loginNext?: boolean } = {}) {
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLSpanElement>(null);
  const warm = useWarmBehind(ctaRef, headerRef);
  const [q, setQ] = useState("");
  const router = useTransitionRouter();
  // Demo session: null during SSR/hydration (the pre-paint data-session hint hides
  // the logged-out CTAs meanwhile), then the account state swaps in.
  const me = useDemoUser();
  const { logout } = useDemoAuth();
  const cta = me ? ROLE_CTA[me.role] : null;
  const pathname = usePathname();
  const auth = authLinks(pathname, loginNext);
  const nav = navFor(pathname);
  const links: { label: string; href: string; active?: boolean }[] = me
    ? [...nav, { label: me.role === "student" ? "Dashboard" : me.role === "tutor" ? "Studio" : "Control room", href: me.meta.href }]
    : [...nav, { label: "Log in", href: auth.login }];
  useEffect(() => {
    syncSessionHint();
  }, [me]);

  // Hide on scroll down, show on scroll up. The logo gets its white pill as soon as
  // the page moves (24px), so it is never unbacked over hero content (R1-09).
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      const y = window.scrollY;
      setCompact(y > 24);
      if (y < 80) setHidden(false);
      else if (Math.abs(y - last) > 6) setHidden(y > last);
      if (y < 80 || Math.abs(y - last) > 6) last = y;
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

  // Mobile menu: lock scroll, focus the first link, Escape closes.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const lenis = getLenis();
    lenis?.stop();
    html.style.overflow = "hidden";
    const t = window.setTimeout(
      () => firstLinkRef.current?.focus({ preventScroll: true }),
      120,
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = "";
      lenis?.start();
    };
  }, [open]);

  // Menu links: close (and unlock scroll) first, then navigate with the curtain /
  // Lenis hash scroll on the next frame.
  const go = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      setOpen(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => router.push(href)),
      );
    },
    [router],
  );

  return (
    <>
      {/* First focusable element on every public page: jump past the header (WCAG 2.4.1). */}
      <a
        href="#main"
        className="fixed top-3 left-3 z-[60] -translate-y-[calc(100%+24px)] rounded-full bg-ink px-5 py-3 text-[15px] leading-none font-bold text-cream shadow-soft transition-transform duration-200 ease-ui focus:translate-y-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        Skip to content
      </a>
      <header
        ref={headerRef}
        onFocusCapture={() => setHidden(false)}
        className={clsx(
          "fixed inset-x-0 top-0 z-50 pt-[max(12px,var(--sat))] transition-transform duration-500 ease-ui md:pt-[max(20px,var(--sat))]",
          hidden && !open && "-translate-y-[140%]",
        )}
      >
        <div className="container-x flex items-center justify-between gap-2 sm:gap-3">
          <Logo compact={compact && !open} light={light && !open} preload />

          {/* Desktop */}
          <div className="hidden items-center gap-2 lg:flex">
            <NavPill links={nav} />
            {cta ? (
              <>
                <ArrowButton href={cta.href} variant="flame">
                  {cta.label}
                </ArrowButton>
                <AccountButton />
              </>
            ) : (
              <>
                <span data-session-out="" className="flex">
                  <ArrowButton href={auth.signup} variant="flame">
                    Start free
                  </ArrowButton>
                </span>
                <Link
                  href={auth.login}
                  aria-label="Log in"
                  data-session-out=""
                  className="hover-icon grid size-[52px] place-items-center rounded-full bg-white text-ink shadow-soft"
                >
                  <UserGlyph />
                </Link>
              </>
            )}
          </div>

          {/* Mobile + tablet */}
          <div className="flex items-center gap-2 phone-s:gap-1.5 lg:hidden">
            <span
              ref={ctaRef}
              inert={open}
              data-session-out={cta ? undefined : ""}
              className={clsx(
                "transition-[opacity] duration-300 ease-ui",
                open && "pointer-events-none opacity-0",
              )}
            >
              <ArrowButton href={cta?.href ?? auth.signup} variant={warm ? "paper" : "flame"} compact>
                {cta ? <FitLabel label={cta.short} tiny={cta.tiny} /> : <FitLabel label="Start free" tiny="Start" />}
              </ArrowButton>
            </span>
            <button
              ref={toggleRef}
              type="button"
              className="tap relative grid size-12 place-items-center rounded-full bg-white shadow-soft phone-s:size-11"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="relative block h-3.5 w-5" aria-hidden>
                <span
                  className={clsx(
                    "absolute left-0 block h-[2.5px] w-5 rounded-full bg-ink transition-[top,rotate] duration-300 ease-ui",
                    open ? "top-[6px] rotate-45" : "top-0.5",
                  )}
                />
                <span
                  className={clsx(
                    "absolute left-0 block h-[2.5px] w-5 rounded-full bg-ink transition-[top,rotate] duration-300 ease-ui",
                    open ? "top-[6px] -rotate-45" : "top-[10px]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu: cream cloud sheet that drops from the top (scalloped bottom edge). */}
      <div
        id="mobile-menu"
        inert={!open}
        className={clsx(
          "fixed inset-x-0 top-0 z-40 h-dvh bg-cream transition-transform duration-[650ms] ease-ui lg:hidden",
          open ? "translate-y-0" : "-translate-y-[calc(100%+64px)]",
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--dot) 1.1px, transparent 1.6px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "12px 12px",
        }}
      >
        <ScallopEdge placement="outside-bottom" color="var(--color-cream)" />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <Cloud
            size="m"
            className="absolute top-[18%] right-[-18px]"
            delay={-4}
          />
          <Cloud
            size="s"
            className="absolute bottom-[26%] left-[6%]"
            delay={-11}
            flip
          />
        </div>
        <div className="relative h-full overflow-y-auto overscroll-contain" data-lenis-prevent="">
        <div className="container-x flex min-h-full flex-col pt-[calc(96px+var(--sat))] pb-[max(32px,calc(var(--sab)+16px))] md:pt-[124px]">
          <form
            role="search"
            className={clsx(
              "relative transition-[translate,opacity] duration-[600ms] ease-expo",
              open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}
            style={{ transitionDelay: open ? "100ms" : "0ms" }}
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.trim();
              setOpen(false);
              requestAnimationFrame(() => requestAnimationFrame(() => router.push(v ? `/courses?q=${encodeURIComponent(v)}` : "/courses")));
            }}
          >
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/50" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses"
              aria-label="Search courses"
              className="h-12 w-full rounded-full bg-white pr-4 pl-12 text-base font-medium text-ink shadow-soft placeholder:text-ink/45 focus:ring-2 focus:ring-blue focus:outline-none"
            />
          </form>
          <div
            className={clsx("transition-[translate,opacity] duration-[600ms] ease-expo", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
            style={{ transitionDelay: open ? "130ms" : "0ms" }}
          >
            <MenuCategories onGo={go} />
          </div>
          <nav aria-label="Mobile" className="mt-6 flex flex-col items-start gap-1">
            {links.map((l, i) => (
              <Link
                key={l.href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={l.href}
                aria-current={l.active ? "page" : undefined}
                data-no-transition=""
                onClick={(e) => go(e, l.href)}
                className={clsx(
                  "flex min-h-12 items-center font-display text-[clamp(2.75rem,13vw,4.5rem)] leading-[0.95] uppercase transition-[translate,opacity,color] duration-[600ms] ease-expo active:text-flame",
                  l.active ? "text-flame-deep" : "text-ink",
                  open
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0",
                )}
                style={{ transitionDelay: open ? `${140 + i * 50}ms` : "0ms" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div
            className={clsx(
              "mt-auto flex items-end justify-between gap-4 pt-8 transition-[translate,opacity] duration-[600ms] ease-expo",
              open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            )}
            style={{ transitionDelay: open ? "420ms" : "0ms" }}
          >
            <div className="min-w-0">
              {me && (
                <div className="mb-4 flex items-center gap-3">
                  <Avatar name={me.profile.name} src={me.profile.avatar} tone={me.profile.tone} size="md" decorative />
                  <div className="min-w-0">
                    <p className="truncate text-[16px] leading-tight font-bold">{me.profile.name}</p>
                    <p className="truncate text-[13px] leading-tight font-semibold text-ink/60">Demo {me.meta.label.toLowerCase()} account</p>
                  </div>
                </div>
              )}
              <p
                className="mb-3 t-hand text-indigo"
                style={{ transform: "rotate(-4deg)" }}
              >
                {me ? `hey ${me.profile.name.split(" ")[0].toLowerCase()}, welcome back` : "the first video is on us"}
              </p>
              <ArrowButton
                href={cta?.href ?? auth.signup}
                variant="flame"
                onClick={() => setOpen(false)}
              >
                {cta?.label ?? "Start free"}
              </ArrowButton>
              {me && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="mt-2 flex min-h-11 items-center text-[15px] font-bold text-ink/70 underline-offset-4 active:text-flame"
                >
                  Log out
                </button>
              )}
            </div>
            <Mascot
              title=""
              className="w-20 shrink-0"
              style={{ transform: "rotate(8deg)" }}
            />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
