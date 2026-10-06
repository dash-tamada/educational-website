"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Drawer, Icon } from "@/components/app";
import { scrollToTarget } from "@/lib/lenis";

type Item = { id: string; title: string };

/**
 * Table of contents with scroll-spy.
 * - From 1024px: a sticky vertical list beside the article.
 * - Below 1024px: a horizontally scrolling row of chips at the top, plus a
 *   floating "Contents" pill (current section name) once that row has scrolled
 *   away, which opens the full list in a drawer (a bottom sheet on phones).
 *   Readers can jump between sections from anywhere without scrolling back up.
 */
export function LegalToc({ sections }: { sections: Item[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const [navGone, setNavGone] = useState(false);
  // the article has (mostly) scrolled away: the footer is coming in, so the pill steps aside
  const [articleDone, setArticleDone] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Phones: keep the active chip centred inside the horizontal row (never scrolls the page).
  useEffect(() => {
    const ol = listRef.current;
    if (!ol || ol.scrollWidth <= ol.clientWidth) return;
    const a = ol.querySelector<HTMLElement>('[aria-current="location"]');
    if (!a) return;
    const centred =
      a.offsetLeft - ol.offsetLeft - (ol.clientWidth - a.offsetWidth) / 2;
    const left = Math.max(0, Math.min(centred, ol.scrollWidth - ol.clientWidth));
    if (Math.abs(left - ol.scrollLeft) > 2)
      ol.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  /* Scroll-spy, position based: the active section is the last one whose top has
     crossed a reading line just under the fixed header. Every scroll recomputes from
     all sections in document order (no IntersectionObserver deltas, no flicker).
     After a TOC jump the spy is locked on the chosen section until the glide settles,
     so a short section near the page end (which can never reach the line) keeps it. */
  const lockRef = useRef<string | null>(null);
  const lockTimers = useRef<{ idle?: number; max?: number }>({});
  const releaseLock = useRef<() => void>(() => {});

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let raf = 0;
    const readingLine = () => {
      const v = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--header-offset",
        ),
      );
      const header = Number.isFinite(v) ? v : 96;
      return header + Math.min(120, window.innerHeight * 0.15);
    };
    const compute = () => {
      raf = 0;
      if (lockRef.current) return;
      const line = readingLine();
      let id = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) id = el.id;
        else break;
      }
      setActive((cur) => (cur === id ? cur : id));
    };
    const release = () => {
      const t = lockTimers.current;
      window.clearTimeout(t.idle);
      window.clearTimeout(t.max);
      lockTimers.current = {};
      if (lockRef.current) {
        lockRef.current = null;
      }
    };
    releaseLock.current = release;
    const onScroll = () => {
      if (lockRef.current) {
        // still gliding: release once scrolling has been quiet for a moment
        window.clearTimeout(lockTimers.current.idle);
        lockTimers.current.idle = window.setTimeout(release, 220);
        return;
      }
      if (!raf) raf = requestAnimationFrame(compute);
    };
    // the reader takes over (wheel, touch, keys): drop the lock right away
    const takeOver = () => {
      if (!lockRef.current) return;
      release();
      onScroll();
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("keydown", takeOver);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      release();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", takeOver);
    };
  }, [sections]);

  /** A TOC entry was chosen: highlight it now and hold it until the scroll settles. */
  const pin = (id: string) => {
    releaseLock.current();
    lockRef.current = id;
    setActive(id);
    const t = lockTimers.current;
    // no scroll at all (already there) -> idle release; long glides are capped
    t.idle = window.setTimeout(() => releaseLock.current(), 400);
    t.max = window.setTimeout(() => releaseLock.current(), 2200);
  };

  // Has the chip row scrolled up out of view? (drives the floating pill below lg)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setNavGone(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(nav);
    return () => io.disconnect();
  }, []);

  // Hide the floating pill once the article ends (it would sit on the footer otherwise).
  useEffect(() => {
    const article = navRef.current
      ?.closest("aside")
      ?.parentElement?.querySelector("article");
    if (!article) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      setArticleDone(
        article.getBoundingClientRect().bottom < window.innerHeight * 0.75,
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  const showPill = navGone && !articleDone && !open;

  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === active),
  );
  const current = sections[activeIndex];

  const jump = (id: string) => {
    setOpen(false);
    pin(id);
    // wait for the drawer to close (it locks scrolling), then glide to the section
    window.setTimeout(() => {
      if (!scrollToTarget(`#${id}`, { duration: 0.9 }))
        document.getElementById(id)?.scrollIntoView();
      history.replaceState(null, "", `#${id}`);
      document.getElementById(`${id}-h`)?.focus({ preventScroll: true });
    }, 60);
  };

  return (
    <>
      <nav
        ref={navRef}
        aria-label="On this page"
        className="rounded-card-lg bg-white p-2 shadow-soft lg:p-4"
      >
        <p className="hidden px-3 pt-1 pb-2 t-micro text-ink/70 uppercase lg:block">
          On this page
        </p>
        <ol
          ref={listRef}
          className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
          data-lenis-prevent
        >
          {sections.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={() => pin(s.id)}
                aria-current={active === s.id ? "location" : undefined}
                className={clsx(
                  "flex items-center gap-2.5 rounded-full px-3 py-2 text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 coarse:min-h-11 lg:rounded-tag lg:whitespace-normal",
                  active === s.id
                    ? "bg-ink text-cream"
                    : "text-ink/70 hf:bg-ink/[0.05] hf:text-ink",
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    "w-5 shrink-0 t-micro tabular-nums",
                    active === s.id ? "text-cream/70" : "text-ink/60",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* below lg: floating contents pill once the chip row is off-screen */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-[max(16px,var(--sab))] z-30 flex justify-center px-[max(16px,var(--sal))] transition-[opacity,translate] duration-300 ease-ui lg:hidden",
          showPill
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
        aria-hidden={!showPill}
        data-kbd-hide=""
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={showPill ? 0 : -1}
          aria-haspopup="dialog"
          className="tap flex h-12 max-w-full min-w-0 items-center gap-2.5 rounded-full bg-ink pr-5 pl-2 text-[14px] font-bold text-cream shadow-lift"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-sun text-ink"
            aria-hidden
          >
            <Icon name="menu" className="size-4" />
          </span>
          <span className="shrink-0">Contents</span>
          {current && (
            <span className="min-w-0 truncate font-semibold text-cream/70">
              <span className="tabular-nums">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>{" "}
              · {current.title}
            </span>
          )}
        </button>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="On this page"
        description={`${sections.length} sections`}
        width={380}
        mobile="sheet"
      >
        <ol className="grid gap-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                data-no-transition
                onClick={(e) => {
                  e.preventDefault();
                  jump(s.id);
                }}
                aria-current={active === s.id ? "location" : undefined}
                className={clsx(
                  "flex min-h-12 items-center gap-3 rounded-tag px-3 py-3 text-[15px] font-semibold transition-colors max-sm:text-base",
                  active === s.id
                    ? "bg-ink text-cream"
                    : "text-ink/80 hf:bg-ink/[0.05] hf:text-ink",
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    "w-5 shrink-0 t-micro tabular-nums",
                    active === s.id ? "text-cream/70" : "text-ink/60",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </Drawer>
    </>
  );
}
