"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Drawer } from "@/components/app";
import { scrollToTarget } from "@/lib/lenis";

type Item = { id: string; title: string };

/**
 * Table of contents with scroll-spy (editorial: ruled rows, mono numbers, the
 * active row's number in red with a red square beside it).
 * - From 1024px: a sticky ruled list beside the article.
 * - Below 1024px: one ruled "Contents · 03 · Refunds" row, plus a floating ink
 *   Contents bar once that row has scrolled away; both open the full list in a
 *   drawer (a bottom sheet on phones), so readers can jump from anywhere.
 */
export function LegalToc({ sections }: { sections: Item[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const [navGone, setNavGone] = useState(false);
  // the article has (mostly) scrolled away: the footer is coming in, so the pill steps aside
  const [articleDone, setArticleDone] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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
      <nav ref={navRef} aria-label="On this page">
        {/* lg+: the ruled, numbered list (sticky beside the article) */}
        <div className="max-lg:hidden">
          <p className="t-label border-b border-fg pb-3">On this page</p>
          <ol>
            {sections.map((s, i) => {
              const on = active === s.id;
              return (
                <li key={s.id} className="border-b border-line">
                  <a
                    href={`#${s.id}`}
                    onClick={() => pin(s.id)}
                    aria-current={on ? "location" : undefined}
                    className={clsx(
                      "group relative grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-2 py-2.5 text-[14px] leading-snug transition-colors duration-200 short:py-2",
                      on ? "font-medium text-fg" : "text-muted hf:text-fg",
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        "absolute top-1/2 -left-4 size-[6px] -translate-y-1/2 bg-red transition-opacity duration-300",
                        on ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span aria-hidden className={clsx("t-timecode transition-colors", on ? "text-red" : "text-muted")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>

        {/* below lg: one ruled row that opens the full list in a sheet */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="group grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-line py-2 text-left lg:hidden"
        >
          <span className="t-label">Contents</span>
          <span className="truncate text-[14px] text-muted">
            <span className="font-mono text-[12.5px] tabular-nums">{String(activeIndex + 1).padStart(2, "0")}</span> · {current?.title}
          </span>
          <span className="t-label text-muted transition-colors group-hf:text-fg">{sections.length} sections</span>
        </button>
      </nav>

      {/* below lg: a floating Contents bar once that row has scrolled away */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-[max(16px,var(--sab))] z-30 flex justify-center px-[max(16px,var(--sal))] transition-[opacity,translate] duration-300 ease-ui lg:hidden",
          showPill ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
        aria-hidden={!showPill}
        data-kbd-hide=""
        data-ground-ignore=""
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={showPill ? 0 : -1}
          aria-haspopup="dialog"
          className="flex h-12 max-w-full min-w-0 items-center gap-3 bg-ink pr-5 pl-4 text-cream shadow-[0_10px_30px_-12px_rgb(11_11_11/0.45)]"
        >
          <span aria-hidden className="size-[7px] shrink-0 bg-red" />
          <span className="t-label shrink-0">Contents</span>
          {current && (
            <span className="min-w-0 truncate text-[13.5px] text-cream/70">
              <span className="font-mono text-[12px] tabular-nums">{String(activeIndex + 1).padStart(2, "0")}</span> · {current.title}
            </span>
          )}
        </button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="On this page" description={`${sections.length} sections`} width={380} mobile="sheet">
        <ol className="border-t border-line">
          {sections.map((s, i) => (
            <li key={s.id} className="border-b border-line">
              <a
                href={`#${s.id}`}
                data-no-transition
                onClick={(e) => {
                  e.preventDefault();
                  jump(s.id);
                }}
                aria-current={active === s.id ? "location" : undefined}
                className={clsx(
                  "grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-2 py-3 text-[15px] leading-snug transition-colors max-sm:text-base",
                  active === s.id ? "font-medium text-fg" : "text-muted hf:text-fg",
                )}
              >
                <span aria-hidden className={clsx("t-timecode", active === s.id ? "text-red" : "text-muted")}>
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
