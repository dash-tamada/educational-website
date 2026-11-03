"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { prefersReducedMotion } from "@/lib/motion";
import { CurtainArt } from "./CurtainArt";

/* Touch devices (MOBILE_SPEC §1.15, F-18): a shorter curtain (cover ~380ms, reveal ~480ms,
   total <= 0.9s), Tami's idle bob only if the hold runs past 600ms, and NO curtain on
   browser back/forward (iOS edge swipe / Android back already animate the page):
   the stored scroll position is restored instantly instead. */
const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const COVER_SCALE = 0.56 / 0.38; // timeline speed-up on touch: the sheet covers in 380ms
const REVEAL_SCALE = 0.82 / 0.48; // the reveal lifts away in 480ms
import { areaOf, isAppArea } from "@/components/app/nav";

/**
 * Curtain or instant? The branded curtain plays when moving BETWEEN site areas
 * (landing -> login, catalog -> course, login -> dashboard). Navigation inside one
 * app area (/dashboard/*, /tutor/*, /admin/*, /learn/*) and query-only changes
 * (filters, pagination: same pathname, new ?search) are instant.
 */
export function shouldCurtain(fromPath: string, toPath: string) {
  if (fromPath === toPath) return false;
  const a = areaOf(fromPath);
  return !(a === areaOf(toPath) && isAppArea(a));
}

/* =============================================================================
   Route transitions (design system v2): black curtain with a red leading edge,
   hairline columns and a slate (red SC/TK block + destination title + running
   timecode). The art lives in CurtainArt.tsx; the engine below is unchanged.
   - One persistent curtain in the root layout.
   - A window-level capture click listener turns EVERY internal <a href> (plain
     anchors, next/link, ArrowButton, TransitionLink) into: cover -> router.push
     -> wait for the new route to render -> land (top / #hash / restored y) ->
     reveal. next/link sees defaultPrevented and stands down; the link's own
     onClick still runs.
   - Every cover resets the slate, timecode and label explicitly (fromTo with full
     from/to states), so the 2nd, 3rd... transition looks exactly like the 1st.
   - While the route loads, the timecode runs. The slate/label/timecode ride
     up WITH the sheet on reveal (they live inside it), so the screen is never an
     empty cream sheet.
   - Same-page hashes (/#how on /) smooth-scroll with Lenis instead.
   - Back/forward: instant cover with the same art, the previous scroll position
     of that page is restored (sessionStorage, keyed by pathname), then the normal
     reveal plays.
   - Cross-route #hash landing: refresh triggers, jump, re-check, then an anchor
     lock keeps the target pinned under the header for ~2.5s while late layout
     settles (cancelled by any user input).
   - Modified clicks, target=_blank, download, external, mailto/tel and links
     with data-no-transition are left to the browser.
   - Reduced motion: quick opacity fades only.
   - Never traps: the hold is capped at 2.5s and every error path reveals.
   ============================================================================= */

/* =============================================================================
   Navigation guards (unsaved-changes prompts and the like).

     const off = registerNavigationGuard((to) => {
       if (!dirtyRef.current) return true;          // allow
       return askUser();                            // Promise<boolean>: false blocks
     });
     off();                                         // unregister

   Guards run for EVERY navigation that goes through this module: intercepted
   link clicks (sidebar, breadcrumbs, next/link, plain <a>), useTransitionRouter()
   push/replace, useDemoAuth() loginAs/logout, the dashboard top-bar search,
   notifications and DataTable rowHref. Same-page #hash / back-to-top scrolls are
   never guarded. Newest guard runs first; the first one that returns false (or a
   Promise resolving to false) blocks the navigation. A guard that throws allows
   it (never trap the user). While one guard is waiting for an answer, other
   navigation attempts are ignored.
   NOT covered: browser back/forward (the App Router can't veto popstate) and
   reload / tab close (use useBeforeUnload, or <UnsavedChangesGuard> from
   "@/components/app", which does both). Navigating with next/navigation's
   router directly also skips guards: use useTransitionRouter() (or wrap the
   call in whenNavigationAllowed(href, go)) when a page might be guarded.
   To navigate after the user already confirmed (or right after saving), pass
   { skipGuards: true } to useTransitionRouter().push / replace.
   ============================================================================= */

export type NavigationAttempt = {
  /** destination as pathname + search + hash */
  href: string;
  url: URL;
  /** pathname + search being left */
  from: string;
  /** "link" (intercepted click) or "push" / "replace" (programmatic) */
  source: "link" | "push" | "replace";
};
/** Return false (or resolve to false) to block; true / undefined allow. */
export type NavigationGuard = (
  to: NavigationAttempt,
) => boolean | void | Promise<boolean | void>;

const guards = new Set<NavigationGuard>();
let guardPending = false;

/** Register a guard; returns its unregister function. Client only. */
export function registerNavigationGuard(guard: NavigationGuard): () => void {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}

/** True while at least one guard is registered. */
export function hasNavigationGuards() {
  return guards.size > 0;
}

function attemptFor(href: string, source: NavigationAttempt["source"]): NavigationAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(href, window.location.href);
    return {
      href: url.pathname + url.search + url.hash,
      url,
      from: window.location.pathname + window.location.search,
      source,
    };
  } catch {
    return null;
  }
}

/**
 * Ask every guard. Returns `true` SYNCHRONOUSLY when none is registered (so
 * unguarded navigation stays instant), `false` while another guard is still
 * waiting for an answer, else a Promise<boolean>.
 */
export function checkNavigation(
  href: string,
  source: NavigationAttempt["source"] = "push",
): boolean | Promise<boolean> {
  if (!guards.size) return true;
  if (guardPending) return false;
  const attempt = attemptFor(href, source);
  if (!attempt) return true;
  const list = Array.from(guards).reverse();
  guardPending = true;
  return (async () => {
    try {
      for (const g of list) {
        if (!guards.has(g)) continue;
        let ok: boolean | void;
        try {
          ok = await g(attempt);
        } catch {
          ok = true;
        }
        if (ok === false) return false;
      }
      return true;
    } finally {
      guardPending = false;
    }
  })();
}

/** Promise form of checkNavigation, for code that navigates on its own. */
export function confirmNavigation(
  href: string,
  source: NavigationAttempt["source"] = "push",
): Promise<boolean> {
  return Promise.resolve(checkNavigation(href, source));
}

/** Run `proceed` once the guards allow `href` (synchronously when there are none). */
export function whenNavigationAllowed(
  href: string,
  proceed: () => void,
  source: NavigationAttempt["source"] = "push",
) {
  const r = checkNavigation(href, source);
  if (r === true) proceed();
  else if (r !== false) void r.then((ok) => ok && proceed());
}

type NavigateOpts = {
  replace?: boolean;
  /** skip navigation guards (the user already confirmed, or the page just saved) */
  skipGuards?: boolean;
  /** where the navigation came from (reported to guards) */
  source?: NavigationAttempt["source"];
};
type Ctx = { navigate: (href: string, opts?: NavigateOpts) => void };
const RouteCtx = createContext<Ctx | null>(null);

/** Options for useTransitionRouter().push / replace. */
export type TransitionNavOptions = { skipGuards?: boolean };

/** router.push with the curtain and navigation guards. Falls back to a plain router when no provider. */
export function useTransitionRouter() {
  const ctx = useContext(RouteCtx);
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string, opts?: TransitionNavOptions) => {
        if (ctx) return ctx.navigate(href, { skipGuards: opts?.skipGuards, source: "push" });
        if (opts?.skipGuards) return router.push(href);
        whenNavigationAllowed(href, () => router.push(href), "push");
      },
      replace: (href: string, opts?: TransitionNavOptions) => {
        if (ctx)
          return ctx.navigate(href, { replace: true, skipGuards: opts?.skipGuards, source: "replace" });
        if (opts?.skipGuards) return router.replace(href);
        whenNavigationAllowed(href, () => router.replace(href), "replace");
      },
      back: () => router.back(),
      prefetch: (href: string) => router.prefetch(href),
    }),
    [ctx, router],
  );
}

/**
 * next/link with an explicit opt-in to the curtain (the global interceptor already
 * covers plain links; this is the documented, typed way to write internal links).
 */
export function TransitionLink(props: React.ComponentProps<typeof Link>) {
  return <Link {...props} data-transition="" />;
}

/** Destination title + scene number for the curtain slate (accent kept for API compat: red). */
const RED = "#e3061b";
const ROUTES: { test: RegExp; label: string; scene: string }[] = [
  { test: /^\/$/, label: "Home", scene: "01" },
  { test: /^\/courses/, label: "Course", scene: "02" },
  { test: /^\/films/, label: "Films", scene: "03" },
  { test: /^\/about/, label: "Director", scene: "04" },
  { test: /^\/journal/, label: "Journal", scene: "05" },
  { test: /^\/contact/, label: "Contact", scene: "06" },
  { test: /^\/learn/, label: "Press play", scene: "07" },
  { test: /^\/checkout/, label: "Checkout", scene: "08" },
  { test: /^\/certificates/, label: "Certificate", scene: "09" },
  { test: /^\/login/, label: "Log in", scene: "10" },
  { test: /^\/signup/, label: "Sign up", scene: "10" },
  { test: /^\/forgot-password/, label: "Reset", scene: "10" },
  { test: /^\/dashboard/, label: "Your desk", scene: "11" },
  { test: /^\/tutors\//, label: "Tutor", scene: "12" },
  { test: /^\/tutor(\/|$)/, label: "Studio", scene: "12" },
  { test: /^\/become-tutor/, label: "Teach", scene: "12" },
  { test: /^\/admin/, label: "Control room", scene: "13" },
];
export function routeAccent(pathname: string) {
  const hit = ROUTES.find((r) => r.test.test(pathname));
  if (hit) return { ...hit, accent: RED };
  const seg = decodeURIComponent(pathname.split("/").filter(Boolean)[0] ?? "");
  return { accent: RED, scene: "00", label: seg.replace(/-/g, " ") || "Home" };
}

/* ----------------------------------------------------------------------------- helpers */
const q = (root: HTMLElement | null, sel: string) =>
  root ? Array.from(root.querySelectorAll<HTMLElement>(sel)) : [];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const raf2 = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Instant scroll jump that works with and without Lenis. */
function jumpTo(y: number) {
  const lenis = getLenis();
  lenis?.scrollTo(y, { immediate: true, force: true });
  window.scrollTo(0, y);
}

/** Resolve "#faq" / "faq" to its element (null when missing). */
function findHash(hash: string): HTMLElement | null {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return null;
  if (id === "top") return document.getElementById("top");
  try {
    return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  } catch {
    return null;
  }
}

/** Move focus to an in-page target without a second scroll jump (makes it focusable if needed). */
function focusTarget(el: HTMLElement) {
  const focusable = el.matches("a[href],button,input,select,textarea,[tabindex]");
  if (!focusable) el.setAttribute("tabindex", "-1");
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/** Distance between the target's top and where it should rest (its scroll-margin). */
function anchorError(el: HTMLElement) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const top = el.getBoundingClientRect().top;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const atBottom = window.scrollY >= max - 1;
  const err = top - margin;
  // Clamped at the bottom of the page: the target legitimately rests lower.
  if (err > 0 && atBottom) return 0;
  return err;
}

/** Same-page anchor: put the #hash in the address bar (copyable, bookmarkable) as a new history
 *  entry, remembering where we scrolled from so Back returns there. Next patches pushState and
 *  copies its own router state into the entry, so the app router stays in sync. */
function pushHashEntry(hash: string, fromY: number) {
  try {
    const cur = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.replaceState({ ...cur, __tmY: fromY }, "");
    window.history.pushState({ __tmHash: true }, "", hash);
  } catch {}
}

/** Land on a cross-route #hash: refresh, jump, re-check twice. Returns the element. */
async function landOnHash(hash: string) {
  const el = findHash(hash);
  if (!el) return null;
  ScrollTrigger.refresh();
  await raf();
  scrollToTarget(el, { immediate: true });
  for (let i = 0; i < 2; i++) {
    await raf();
    if (Math.abs(anchorError(el)) > 1) {
      jumpTo(Math.max(0, window.scrollY + anchorError(el)));
    }
  }
  return el;
}

/**
 * Keep `el` pinned at its resting position for `ms` while late layout settles
 * (images, fonts, deferred triggers). Any user input cancels it immediately.
 */
function lockAnchor(el: HTMLElement, ms = 2500) {
  const t0 = performance.now();
  let alive = true;
  const stop = () => {
    if (!alive) return;
    alive = false;
    gsap.ticker.remove(tick);
    for (const ev of INPUT) window.removeEventListener(ev, stop, true);
  };
  const tick = () => {
    if (!alive) return;
    if (performance.now() - t0 > ms || !el.isConnected) return stop();
    const err = anchorError(el);
    if (Math.abs(err) > 1) jumpTo(Math.max(0, window.scrollY + err));
  };
  const INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  for (const ev of INPUT) window.addEventListener(ev, stop, { capture: true, passive: true });
  gsap.ticker.add(tick);
  return stop;
}

/* Scroll memory per pathname (for back/forward). */
const SCROLL_KEY = "tm-scroll";
function readScrollMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}
function saveScroll(path: string, y: number) {
  try {
    const m = readScrollMap();
    m[path] = Math.max(0, Math.round(y));
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m));
  } catch {}
}

/* ----------------------------------------------------------------------------- provider */
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [dest, setDest] = useState(() => routeAccent("/"));
  const s = useRef({
    busy: false,
    pending: null as null | (() => void),
    pop: false,
    /** touch back/forward: no curtain, just restore the scroll position */
    popBare: false,
    popY: 0,
    popAt: 0,
    popTimer: 0,
    path: pathname,
    /** last scroll position of the CURRENT page (frozen while a transition runs) */
    y: 0,
    hash: "",
    coverTl: null as gsap.core.Timeline | null,
    idle: null as gsap.core.Tween | null,
    unlock: null as null | (() => void),
  });

  const pieces = useCallback(() => {
    const root = rootRef.current;
    return {
      root,
      sheet: q(root, "[data-curtain-sheet]"),
      disc: q(root, "[data-curtain-disc]"),
      tami: q(root, "[data-curtain-tami]"),
      label: q(root, "[data-curtain-label]"),
      clouds: q(root, "[data-curtain-cloud]"),
      tc: q(root, "[data-curtain-tc]"),
    };
  }, []);

  /** Stop every curtain tween (previous cover/reveal/idle) so states never leak. */
  const killAll = useCallback(() => {
    const st = s.current;
    st.coverTl?.kill();
    st.coverTl = null;
    st.idle?.kill();
    st.idle = null;
    const p = pieces();
    gsap.killTweensOf([p.root, ...p.sheet, ...p.disc, ...p.tami, ...p.label, ...p.clouds]);
  }, [pieces]);

  /** Put the art at its covered, at-rest state (used by reduced motion and back/forward). */
  const setCovered = useCallback(() => {
    const p = pieces();
    gsap.set(p.sheet, { yPercent: 0 });
    gsap.set(p.clouds, { scaleY: 1 });
    gsap.set(p.disc, { scaleX: 1, autoAlpha: 1 });
    gsap.set(p.tami, { autoAlpha: 1 });
    gsap.set(p.label, { yPercent: 0, autoAlpha: 1 });
  }, [pieces]);

  /** The timecode runs (24 fps) while we wait for the route (a long wait still looks alive). */
  const startIdle = useCallback(() => {
    const st = s.current;
    const { tc } = pieces();
    if (!tc.length || prefersReducedMotion()) return;
    st.idle?.kill();
    const clock = { f: 0 };
    const fmt = (n: number) => String(n).padStart(2, "0");
    st.idle = gsap.to(clock, {
      f: 24 * 60,
      duration: 60,
      ease: "none",
      onUpdate: () => {
        const f = Math.floor(clock.f);
        const text = `00:00:${fmt(Math.floor(f / 24) % 60)}:${fmt(f % 24)}`;
        for (const n of tc) n.textContent = text;
      },
    });
  }, [pieces]);

  const cover = useCallback(
    (reduced: boolean) => {
      const st = s.current;
      const p = pieces();
      const root = p.root!;
      killAll();
      root.setAttribute("data-active", "");
      return new Promise<void>((resolve) => {
        if (reduced) {
          setCovered();
          gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.12, onComplete: resolve });
          return;
        }
        gsap.set(root, { opacity: 1 });
        // Wipe whatever the previous reveal / idle loop left on the slate.
        gsap.set([...p.disc, ...p.tami, ...p.label], {
          clearProps: "transform,opacity,visibility",
        });
        for (const n of p.tc) n.textContent = "00:00:00:00";
        st.coverTl = gsap
          .timeline()
          .fromTo(p.sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.56, ease: "expo.inOut" }, 0)
          .fromTo(p.clouds, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 }, 0.22)
          .fromTo(p.disc, { scaleX: 0, transformOrigin: "0% 50%", autoAlpha: 1 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0.3)
          .fromTo(p.label, { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.6, ease: "expo.out" }, 0.34)
          .fromTo(p.tami, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power1.out" }, 0.42)
          .call(resolve, [], 0.56);
        if (isTouch()) {
          // idle bob only when the route takes longer than ~600ms after covering
          st.coverTl.call(startIdle, [], 0.56 + 0.6 * COVER_SCALE).timeScale(COVER_SCALE);
        } else st.coverTl.call(startIdle, [], 0.84);
      });
    },
    [killAll, pieces, setCovered, startIdle],
  );

  const reveal = useCallback(
    (reduced: boolean) => {
      const p = pieces();
      const root = p.root!;
      const st = s.current;
      // Let the cover finish its pops instantly (no half-scaled disc), stop the idle bob.
      st.coverTl?.progress(1).kill();
      st.coverTl = null;
      st.idle?.kill();
      st.idle = null;
      const announce = () => {
        delete document.documentElement.dataset.curtain;
        window.dispatchEvent(new Event("route:revealed"));
      };
      return new Promise<void>((resolve) => {
        const end = () => {
          root.removeAttribute("data-active");
          gsap.set(root, { clearProps: "opacity" });
          resolve();
        };
        if (reduced) {
          announce();
          gsap.to(root, { opacity: 0, duration: 0.16, onComplete: end });
          return;
        }
        // The slate, title and timecode sit inside the sheet: they leave first, then the
        // sheet lifts away (never an empty black frame on screen for long).
        gsap
          .timeline({ onComplete: end })
          .timeScale(isTouch() ? REVEAL_SCALE : 1)
          .to(p.label, { yPercent: -110, duration: 0.4, ease: "power2.in" }, 0)
          .to(p.disc, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.4, ease: "power2.in" }, 0.04)
          .to(p.tami, { autoAlpha: 0, duration: 0.2, ease: "power1.in" }, 0)
          .to(p.sheet, { yPercent: -100, duration: 0.72, ease: "expo.inOut" }, 0.12)
          .call(announce, [], 0.45);
      });
    },
    [pieces],
  );

  /** Back/forward landing: restore the stored y, then reveal. */
  const finishPop = useCallback(async () => {
    const st = s.current;
    const reduced = prefersReducedMotion();
    if (st.popBare) {
      // touch back/forward: the browser animated the page already; restore the spot instantly
      st.popBare = false;
      try {
        await raf2();
        const lenis = getLenis();
        lenis?.start();
        lenis?.resize();
        ScrollTrigger.refresh();
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        jumpTo(Math.min(st.popY, max));
        await raf();
        st.y = window.scrollY;
        if (liveRef.current) liveRef.current.textContent = document.title;
      } catch {}
      delete document.documentElement.dataset.curtain;
      window.dispatchEvent(new Event("route:revealed"));
      st.busy = false;
      return;
    }
    try {
      // Give the freshly shown curtain time to rasterise before the page behind
      // jumps thousands of px (otherwise one unpainted cream frame can show).
      // The hold is measured from the route COMMIT (React renders the popped page
      // synchronously, which can eat the whole budget measured from popstate), and
      // never shorter than 360ms since popstate, so Back reads as the same branded
      // hold as a push cover instead of a flash.
      const committed = performance.now();
      await raf2();
      await wait(
        Math.max(
          160 - (performance.now() - committed),
          360 - (performance.now() - st.popAt),
          0,
        ),
      );
      const lenis = getLenis();
      lenis?.start();
      lenis?.resize();
      ScrollTrigger.refresh();
      await raf();
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.min(st.popY, max);
      jumpTo(y);
      await raf();
      if (Math.abs(window.scrollY - y) > 1) jumpTo(y);
      st.y = window.scrollY;
      if (liveRef.current) liveRef.current.textContent = document.title;
    } catch {}
    await reveal(reduced).catch(() => {});
    delete document.documentElement.dataset.curtain;
    st.busy = false;
  }, [reveal]);

  // The new route has committed: resolve a pending push, finish a back/forward.
  useEffect(() => {
    const st = s.current;
    st.path = pathname;
    if (st.pending) {
      const done = st.pending;
      st.pending = null;
      done();
    }
    // The route rendered after the hold cap (slow network/dev compile): honour the hash now.
    if (st.hash) {
      const hash = st.hash;
      st.hash = "";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          scrollToTarget(hash);
        }),
      );
    }
    if (st.pop) {
      st.pop = false;
      window.clearTimeout(st.popTimer);
      void finishPop();
    }
  }, [pathname, finishPop]);

  const go = useCallback(
    async (url: URL, opts?: NavigateOpts) => {
      const st = s.current;
      if (st.busy) return;
      st.busy = true;
      st.unlock?.();
      // Remember where we were on this page (browser Back restores it).
      saveScroll(st.path, window.scrollY);
      const reduced = prefersReducedMotion();
      const html = document.documentElement;
      const lenis = getLenis();
      const target = url.pathname + url.search + url.hash;
      setDest(routeAccent(url.pathname));
      html.dataset.curtain = "cover";
      let anchor: HTMLElement | null = null;
      try {
        lenis?.stop();
        await raf2(); // let the label/accent render
        await cover(reduced);

        // Covered: reset scroll BEFORE the new page mounts so its triggers measure from 0.
        jumpTo(0);

        const samePath = url.pathname === st.path;
        const rendered = new Promise<void>((res) => {
          if (samePath) res();
          else st.pending = res;
        });
        try {
          if (opts?.replace) router.replace(target, { scroll: false });
          else router.push(target, { scroll: false });
        } catch {
          st.pending?.();
        }
        await Promise.race([
          Promise.all([
            rendered.then(raf2).then(() => document.fonts?.ready),
            wait(220),
          ]),
          wait(2500),
        ]);
      } catch {
        // fall through to reveal: never trap the user
      } finally {
        st.pending = null;
        try {
          // Start Lenis first: html.lenis-stopped clips overflow, so landing must be
          // measured in the final (scrollable) layout.
          lenis?.start();
          lenis?.resize();
          ScrollTrigger.refresh();
          if (url.hash) {
            anchor = await landOnHash(url.hash);
            if (!anchor && url.pathname !== st.path) st.hash = url.hash;
          } else {
            jumpTo(0);
          }
          st.y = window.scrollY;
          const main = document.querySelector("main");
          if (main) {
            if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
            main.focus({ preventScroll: true });
          }
          if (liveRef.current) liveRef.current.textContent = document.title;
        } catch {}
        if (anchor) st.unlock = lockAnchor(anchor);
        await reveal(reduced).catch(() => {});
        delete html.dataset.curtain;
        st.busy = false;
      }
    },
    [cover, reveal, router],
  );

  const navigate = useCallback(
    (href: string, opts?: NavigateOpts) => {
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) {
        window.location.href = url.href;
        return;
      }
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) {
        // Same page: hash => Lenis scroll; bare link => back to top.
        if (url.hash && url.hash !== "#") {
          const el = findHash(url.hash);
          const fromY = window.scrollY;
          if (!scrollToTarget(url.hash)) window.location.hash = url.hash;
          else if (url.hash !== here.hash) pushHashEntry(url.hash, fromY);
          // Skip links / in-page anchors: move keyboard focus too (WCAG 2.4.1), not just the viewport.
          if (el) focusTarget(el);
        } else scrollToTarget(0);
        return;
      }
      const target = url.pathname + url.search + url.hash;
      const proceed = () => {
        const now = window.location;
        // Query-only change (filters / pagination): instant, keep the scroll position.
        if (url.pathname === now.pathname) {
          if (opts?.replace) router.replace(target, { scroll: false });
          else router.push(target, { scroll: false });
          return;
        }
        // Inside one app area: instant (no curtain), normal scroll-to-top.
        if (!shouldCurtain(now.pathname, url.pathname)) {
          if (opts?.replace) router.replace(target);
          else router.push(target);
          return;
        }
        void go(url, opts);
      };
      if (opts?.skipGuards) proceed();
      else
        whenNavigationAllowed(
          target,
          proceed,
          opts?.source ?? (opts?.replace ? "replace" : "push"),
        );
    },
    [go, router],
  );

  // Global interceptor (capture phase, before next/link) + back/forward + scroll memory.
  useEffect(() => {
    // We restore positions ourselves (Lenis + late layout make the browser's guess wrong).
    try {
      window.history.scrollRestoration = "manual";
    } catch {}

    // Track the last resting y for Back. Read once a gesture settles (120ms after the last
    // scroll event), never per event: reading scrollY right after scroll-driven style writes
    // forces a style/layout pass every frame (profiled on /terms: ~10% of scroll frame time).
    let yTimer = 0;
    const onScroll = () => {
      window.clearTimeout(yTimer);
      yTimer = window.setTimeout(() => {
        const st = s.current;
        if (!st.busy && !st.pop) st.y = window.scrollY;
      }, 120);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download") || a.hasAttribute("data-no-transition")) return;
      const raw = a.getAttribute("href") ?? "";
      if (/^(mailto|tel|javascript):/i.test(raw)) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash, { source: "link" });
    };
    // Back/forward: cover instantly with the same art, restore y, then the normal reveal.
    const onPop = () => {
      const st = s.current;
      if (st.busy) return;
      if (window.location.pathname === st.path) {
        // Back/forward between same-page #hash entries (pushHashEntry): restore the spot we left,
        // or land on the section again. Other same-path entries (query changes) are Next's.
        const state = window.history.state as { __tmY?: unknown; __tmHash?: unknown } | null;
        if (typeof state?.__tmY === "number") scrollToTarget(state.__tmY, { immediate: true });
        else if (state?.__tmHash && window.location.hash) scrollToTarget(window.location.hash, { immediate: true });
        return;
      }
      // Back/forward inside one app area: instant, Next handles it.
      if (!shouldCurtain(st.path, window.location.pathname)) return;
      const root = rootRef.current;
      if (!root) return;
      // the position right now (a Back within 120ms of scrolling), else the last settled one
      saveScroll(st.path, window.scrollY || st.y);
      st.busy = true;
      st.pop = true;
      st.unlock?.();
      st.popY = readScrollMap()[window.location.pathname] ?? 0;
      st.popAt = performance.now();
      if (isTouch()) {
        st.popBare = true;
        st.popTimer = window.setTimeout(() => {
          if (!s.current.pop) return;
          s.current.pop = false;
          void finishPop();
        }, 2500);
        return;
      }
      setDest(routeAccent(window.location.pathname));
      document.documentElement.dataset.curtain = "cover";
      getLenis()?.stop();
      killAll();
      // Frame 0 of a Back cover = the hold frame of a push cover: every piece at its
      // final "in" state BEFORE the root becomes visible (React's setDest render lands a
      // microtask later), and the
      // idle bob running from the first frame.
      setCovered();
      gsap.set(root, { opacity: 1 });
      root.setAttribute("data-active", "");
      startIdle();
      // Safety: never leave it up if the route doesn't change.
      st.popTimer = window.setTimeout(() => {
        if (!s.current.pop) return;
        s.current.pop = false;
        void finishPop();
      }, 2500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(yTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [navigate, killAll, setCovered, startIdle, finishPop, pieces]);

  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <RouteCtx.Provider value={value}>
      {children}
      <div ref={rootRef} className="route-curtain" aria-hidden>
        <CurtainArt label={dest.label} scene={dest.scene} />
      </div>
      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </RouteCtx.Provider>
  );
}
