"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { navLinks } from "@/lib/landing-data";
import { Mascot } from "@/components/decor/Mascot";
import { ArrowButton } from "@/components/decor/Bits";
import { Cloud } from "@/components/decor/Cloud";
import { ScallopEdge } from "@/components/decor/Scallop";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { getLenis } from "@/lib/lenis";

/* =============================================================================
   Header (spec V2 §5): fixed, on the container column. Left:
   the brand lockup (Tami + official logo); right side = one white pill of links
   with a sliding butter highlight (H2), the flame split CTA (H1) and a white
   circle log-in button (H4). Hides on scroll down, returns on scroll up (500ms
   ease-ui). Once the page scrolls the lockup gets a white pill backing and eases
   to 80% (same pill language as the nav). Below 1024px: lockup + compact flame
   pill + circle menu button opening a cream cloud sheet with big Londrina links.
   ============================================================================= */

/** Official logo asset: 1665 x 546 px (ratio 3.05), trimmed, transparent. */
export const LOGO = { w: 1665, h: 546 } as const;

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
 */
export function BrandLockup({
  light,
  preload,
  sizes,
  interactive,
  className,
  tamiClassName,
  logoClassName,
}: {
  /** white letters (dark / saturated fields); default ink letters */
  light?: boolean;
  preload?: boolean;
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
              ? "/brand/tamada-media-logo-light.png"
              : "/brand/tamada-media-logo-dark.png"
          }
          alt="Tamada Media"
          width={LOGO.w}
          height={LOGO.h}
          sizes={sizes}
          preload={preload}
          draggable={false}
          className="block h-auto w-(--lw) max-w-none select-none"
        />
      </span>
    </span>
  );
}

/**
 * Header / footer brand link = the lockup (logo 104px wide on phones, 92px under
 * 360px, 140px from 1024px). `light` = white letters for dark / saturated fields.
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
        "group tap relative flex h-12 shrink-0 items-center [--lw:104px] max-[359px]:[--lw:92px] lg:h-[52px] lg:[--lw:140px]",
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

/** White link pill with one butter highlight that slides between links (clip-path, no layout). */
function NavPill() {
  const nav = useRef<HTMLElement>(null);
  const [hl, setHl] = useState({ l: 0, r: 0, on: false, jump: true });

  const show = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    const p = nav.current;
    if (!p) return;
    const a = e.currentTarget;
    const l = a.offsetLeft;
    const r = p.clientWidth - (a.offsetLeft + a.offsetWidth);
    setHl((h) => ({ l, r, on: true, jump: !h.on }));
  };
  const hide = () => setHl((h) => ({ ...h, on: false }));

  return (
    <nav
      ref={nav}
      aria-label="Primary"
      onMouseLeave={hide}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
      className="relative flex h-[52px] items-center rounded-full bg-white px-1.5 shadow-soft"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 inset-y-1.5 bg-butter ease-ui"
        style={{
          clipPath: `inset(0 ${hl.r}px 0 ${hl.l}px round 999px)`,
          opacity: hl.on ? 1 : 0,
          transitionProperty: hl.jump ? "opacity" : "clip-path, opacity",
          transitionDuration: "300ms, 200ms",
        }}
      />
      {navLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onMouseEnter={show}
          onFocus={show}
          className="relative flex h-10 items-center rounded-full px-4 text-[16px] leading-none font-semibold tracking-[-0.01em]"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const menuLinks = [...navLinks, { label: "Log in", href: "/login" }];

/**
 * `light`: white logo letters while the header sits over a dark / saturated
 * field at the top of the page (the compact white-pill state always uses the
 * ink logo). The coming-soon pages pass their field's `dark` flag.
 */
export function Header({ light = false }: { light?: boolean } = {}) {
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const router = useTransitionRouter();

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
      <header
        onFocusCapture={() => setHidden(false)}
        className={clsx(
          "fixed inset-x-0 top-0 z-50 pt-3 transition-transform duration-500 ease-ui md:pt-5",
          hidden && !open && "-translate-y-[140%]",
        )}
      >
        <div className="container-x flex items-center justify-between gap-2 sm:gap-3">
          <Logo compact={compact && !open} light={light && !open} preload />

          {/* Desktop */}
          <div className="hidden items-center gap-2 lg:flex">
            <NavPill />
            <ArrowButton href="/signup" variant="flame">
              Start free
            </ArrowButton>
            <Link
              href="/login"
              aria-label="Log in"
              className="hover-icon grid size-[52px] place-items-center rounded-full bg-white text-ink shadow-soft"
            >
              <UserGlyph />
            </Link>
          </div>

          {/* Mobile + tablet */}
          <div className="flex items-center gap-2 lg:hidden">
            <span
              inert={open}
              className={clsx(
                "transition-[opacity] duration-300 ease-ui",
                open && "pointer-events-none opacity-0",
              )}
            >
              <ArrowButton href="/signup" variant="flame" compact>
                Start free
              </ArrowButton>
            </span>
            <button
              ref={toggleRef}
              type="button"
              className="tap relative grid size-12 place-items-center rounded-full bg-white shadow-soft"
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
        <div className="relative container-x flex h-full flex-col pt-[104px] pb-8 md:pt-[124px]">
          <nav aria-label="Mobile" className="flex flex-col items-start gap-3">
            {menuLinks.map((l, i) => (
              <Link
                key={l.href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={l.href}
                data-no-transition=""
                onClick={(e) => go(e, l.href)}
                className={clsx(
                  "font-display text-[clamp(3rem,14vw,4.5rem)] leading-[0.95] text-ink uppercase transition-[translate,opacity,color] duration-[600ms] ease-expo active:text-flame",
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
              "mt-auto flex items-end justify-between gap-4 transition-[translate,opacity] duration-[600ms] ease-expo",
              open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            )}
            style={{ transitionDelay: open ? "420ms" : "0ms" }}
          >
            <div>
              <p
                className="mb-3 t-hand text-indigo"
                style={{ transform: "rotate(-4deg)" }}
              >
                the first video is on us
              </p>
              <ArrowButton
                href="/signup"
                variant="flame"
                onClick={() => setOpen(false)}
              >
                Start free
              </ArrowButton>
            </div>
            <Mascot
              title=""
              className="w-20 shrink-0"
              style={{ transform: "rotate(8deg)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
