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

/* =============================================================================
   Route transitions (spec V2 §7): cream cloud curtain + accent disc + Tami.
   - One persistent curtain in the root layout.
   - A window-level capture click listener turns EVERY internal <a href> (plain
     anchors, next/link, ArrowButton, TransitionLink) into: cover -> router.push
     -> wait for the new route to render -> land (top / #hash / restored y) ->
     reveal. next/link sees defaultPrevented and stands down; the link's own
     onClick still runs.
   - Every cover resets the disc, Tami and label explicitly (fromTo with full
     from/to states), so the 2nd, 3rd... transition looks exactly like the 1st.
   - While the route loads, Tami bobs on an idle loop. The disc/label/Tami ride
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

type NavigateOpts = { replace?: boolean };
type Ctx = { navigate: (href: string, opts?: NavigateOpts) => void };
const RouteCtx = createContext<Ctx | null>(null);

/** router.push with the curtain. Falls back to a plain router when no provider. */
export function useTransitionRouter() {
  const ctx = useContext(RouteCtx);
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string) => (ctx ? ctx.navigate(href) : router.push(href)),
      replace: (href: string) =>
        ctx ? ctx.navigate(href, { replace: true }) : router.replace(href),
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

/** Destination accent colour + label for the curtain disc. */
const ROUTES: { test: RegExp; accent: string; label: string }[] = [
  { test: /^\/$/, accent: "#ffcf3f", label: "Home" },
  { test: /^\/login/, accent: "#2668fd", label: "Log in" },
  { test: /^\/signup/, accent: "#ff008c", label: "Sign up" },
  { test: /^\/courses/, accent: "#ffcf3f", label: "Courses" },
  { test: /^\/become-tutor/, accent: "#00b351", label: "Teach" },
  { test: /^\/admin/, accent: "#3b308f", label: "Admin" },
];
export function routeAccent(pathname: string) {
  const hit = ROUTES.find((r) => r.test.test(pathname));
  if (hit) return hit;
  const seg = decodeURIComponent(pathname.split("/").filter(Boolean)[0] ?? "");
  return { accent: "#fd4401", label: seg.replace(/-/g, " ") || "Home" };
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
    gsap.set(p.clouds, { y: 0 });
    gsap.set(p.disc, { scale: 1, rotate: 0, autoAlpha: 1 });
    gsap.set(p.tami, { scale: 1, rotate: 0, y: 0, autoAlpha: 1 });
    gsap.set(p.label, { yPercent: 0, y: 0, scale: 1, autoAlpha: 1 });
  }, [pieces]);

  /** Tami bobs while we wait for the route (a long wait still looks alive). */
  const startIdle = useCallback(() => {
    const st = s.current;
    const { tami } = pieces();
    if (!tami.length || prefersReducedMotion()) return;
    st.idle?.kill();
    st.idle = gsap.to(tami, {
      keyframes: [
        { y: -12, rotate: 7, scaleX: 0.96, scaleY: 1.05, duration: 0.26, ease: "power2.out" },
        { y: 0, rotate: 0, scaleX: 1.05, scaleY: 0.95, duration: 0.22, ease: "power2.in" },
        { scaleX: 1, scaleY: 1, duration: 0.18, ease: "back.out(3)" },
      ],
      repeat: -1,
      repeatDelay: 0.12,
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
        // Wipe whatever the previous reveal / idle loop left on the centre piece.
        gsap.set([...p.disc, ...p.tami, ...p.label], {
          clearProps: "transform,opacity,visibility",
        });
        st.coverTl = gsap
          .timeline()
          .fromTo(p.sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.56, ease: "expo.inOut" }, 0)
          .fromTo(
            p.clouds,
            { y: "30vh" },
            { y: 0, duration: 0.7, ease: "expo.inOut", stagger: 0.03 },
            0,
          )
          .fromTo(
            p.disc,
            { scale: 0, rotate: -45, autoAlpha: 1 },
            { scale: 1, rotate: 0, duration: 0.62, ease: "elastic.out(1,0.6)" },
            0.26,
          )
          .fromTo(
            p.tami,
            { scale: 0, rotate: -24, y: 0, autoAlpha: 1 },
            { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.2)" },
            0.32,
          )
          .fromTo(
            p.label,
            { autoAlpha: 0, yPercent: 60, y: 0, scale: 1 },
            { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: "expo.out" },
            0.38,
          )
          .call(resolve, [], 0.56)
          .call(startIdle, [], 0.84);
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
        // The disc, Tami and label sit inside the sheet: they stay on screen and
        // lift away WITH it (no empty cream frame). Tami hops first.
        gsap
          .timeline({ onComplete: end })
          .to(p.tami, { y: -16, rotate: 8, scale: 1, duration: 0.18, ease: "power2.out" }, 0)
          .to(p.tami, { y: 0, rotate: 0, duration: 0.3, ease: "power2.in" }, 0.18)
          .to(p.disc, { scale: 0.9, duration: 0.5, ease: "power2.in" }, 0.08)
          .to(p.label, { yPercent: -30, duration: 0.5, ease: "power2.in" }, 0.08)
          .to(p.sheet, { yPercent: -100, duration: 0.72, ease: "expo.inOut" }, 0.1)
          .to(p.clouds, { y: "-24vh", duration: 0.72, ease: "expo.inOut", stagger: 0.02 }, 0.1)
          .call(announce, [], 0.45);
      });
    },
    [pieces],
  );

  /** Back/forward landing: restore the stored y, then reveal. */
  const finishPop = useCallback(async () => {
    const st = s.current;
    const reduced = prefersReducedMotion();
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
          if (!scrollToTarget(url.hash)) window.location.hash = url.hash;
        } else scrollToTarget(0);
        return;
      }
      void go(url, opts);
    },
    [go],
  );

  // Global interceptor (capture phase, before next/link) + back/forward + scroll memory.
  useEffect(() => {
    // We restore positions ourselves (Lenis + late layout make the browser's guess wrong).
    try {
      window.history.scrollRestoration = "manual";
    } catch {}

    const onScroll = () => {
      const st = s.current;
      if (!st.busy && !st.pop) st.y = window.scrollY;
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
      navigate(url.pathname + url.search + url.hash);
    };
    // Back/forward: cover instantly with the same art, restore y, then the normal reveal.
    const onPop = () => {
      const st = s.current;
      if (st.busy || window.location.pathname === st.path) return;
      const root = rootRef.current;
      if (!root) return;
      saveScroll(st.path, st.y);
      st.busy = true;
      st.pop = true;
      st.unlock?.();
      st.popY = readScrollMap()[window.location.pathname] ?? 0;
      st.popAt = performance.now();
      setDest(routeAccent(window.location.pathname));
      document.documentElement.dataset.curtain = "cover";
      getLenis()?.stop();
      killAll();
      // Frame 0 of a Back cover = the hold frame of a push cover: every piece at its
      // final "in" state BEFORE the root becomes visible, the destination accent
      // painted directly (React's setDest render lands a microtask later), and the
      // idle bob running from the first frame.
      const { disc } = pieces();
      const accent = routeAccent(window.location.pathname).accent;
      for (const d of disc) d.style.background = accent;
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
        <CurtainArt accent={dest.accent} label={dest.label} />
      </div>
      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </RouteCtx.Provider>
  );
}
