"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CLOCK } from "@/lib/content/site";
import { useGround } from "./useGround";

/* =============================================================================
   Mobius bottom-right clock: "INDIA · IST  07:19 AM" (CLOCK in site.ts).
   <LiveClock />          fixed bottom-right, from 640px up (phones would collide
                          with sticky bars); flips cream / ink with the ground under it and
                          steps aside while the page scrolls, then returns at rest only where
                          no text or control sits under it (it never covers content; one hit test
                          per scroll stop, nothing per frame)
   <LiveClock inline />   static inline copy (footer bottom line on phones)
   Ticks on the minute (one timer per minute, no per-second work).
   ============================================================================= */

const fmt = (() => {
  try {
    return new Intl.DateTimeFormat("en-IN", { timeZone: CLOCK.timeZone, hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
})();

function nowLabel() {
  if (!fmt) return "";
  return fmt.format(new Date()).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

function useMinuteClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    let interval = 0;
    const tick = () => setTime(nowLabel());
    tick();
    const toNext = 60_000 - (Date.now() % 60_000) + 50;
    const t = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, toNext);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return time;
}

/** Text and controls the clock must never sit on (photos and plain grounds are fine). */
const CONTENT = "a,button,input,textarea,select,label,summary,p,h1,h2,h3,h4,h5,h6,li,dt,dd,th,td,figcaption,blockquote,time,code,pre,span,strong,em,small";
/** Grounds (as in useGround): a clock straddling a light and a dark one can't be read either way. */
const DARK_GROUND = '.theatre, .theatre-night, [data-field="dark"], [data-ground="dark"]';
const ANY_GROUND = `${DARK_GROUND}, .ground-cream, .ground-cream-2, [data-ground="light"]`;
const ownText = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && !!n.textContent?.trim());

/** true while the element may show: hidden from the first scroll event of a gesture (one
 *  state change, no per-frame work), back once scrolling has been still for 180ms AND
 *  six sample points under it (elementFromPoint; the clock is pointer-events: none) hit
 *  no text or control. Hit testing forces a style / layout pass, so it never runs while
 *  scroll-driven animations are moving (profiled: per-frame sampling cost ~10% of frames). */
function useClear(ref: React.RefObject<HTMLElement | null>) {
  const [clear, setClear] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let trail = 0;
    let moving = false;
    const check = () => {
      raf = 0;
      moving = false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      let hit = false;
      const tones = new Set<boolean>();
      outer: for (const x of [r.left + 2, r.left + r.width / 2, r.right - 2]) {
        for (const y of [r.top + 2, r.bottom - 2]) {
          const e = document.elementFromPoint(x, y);
          if (!e || e === document.body || e === document.documentElement || e.closest("[data-ground-ignore], .route-curtain, .site-header")) continue;
          if (e.matches(CONTENT) || ownText(e) || e.closest("a, button, label")) {
            hit = true;
            break outer;
          }
          const g = e.closest(ANY_GROUND);
          tones.add(!!g && g.matches(DARK_GROUND));
        }
      }
      // half on a cream card, half on the theatre: no single tone reads
      if (tones.size > 1) hit = true;
      setClear(!hit);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const onScroll = () => {
      if (!moving) {
        moving = true;
        setClear(false);
      }
      window.clearTimeout(trail);
      trail = window.setTimeout(schedule, 180);
    };
    const first = window.setTimeout(schedule, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(trail);
      window.clearTimeout(first);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
  return clear;
}

/** The clock's vertical centre, in px from the viewport bottom: the line useGround samples.
 *  It moves up while a sticky bar publishes --bottom-ui, so it is re-measured then. */
function useCentreLine(ref: React.RefObject<HTMLElement | null>, off?: boolean) {
  const [line, setLine] = useState(26);
  useEffect(() => {
    const el = ref.current;
    if (off || !el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.height) setLine(Math.max(1, Math.round(window.innerHeight - (r.top + r.height / 2))));
    };
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-action-bar"] });
    window.addEventListener("resize", measure);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, off]);
  return line;
}

function Face({ time }: { time: string | null }) {
  return (
    <>
      <span className="opacity-60">{CLOCK.label}</span>
      <time className="font-semibold" suppressHydrationWarning>
        {time ?? "--:-- --"}
      </time>
    </>
  );
}

export function LiveClock({ inline, className }: { inline?: boolean; className?: string }) {
  const time = useMinuteClock();
  const ref = useRef<HTMLParagraphElement>(null);
  const line = useCentreLine(ref, inline);
  const ground = useGround({ bottom: line, x: -60, disabled: inline });
  const clear = useClear(ref);
  if (inline)
    return (
      <p className={clsx("live-clock t-timecode flex items-center gap-3", className)} aria-label={`Local time in India: ${time ?? ""}`}>
        <Face time={time} />
      </p>
    );
  return (
    <p
      ref={ref}
      aria-hidden
      data-tone={ground}
      data-covering={clear ? undefined : ""}
      data-kbd-hide=""
      className={clsx(
        "live-clock t-timecode pointer-events-none fixed right-[max(var(--edge),var(--sar))] bottom-[calc(var(--bottom-ui)+max(18px,var(--sab)))] z-40 hidden items-center gap-3 transition-[color,opacity] duration-500 sm:flex",
        ground === "dark" ? "text-cream" : "text-ink",
        !clear && "opacity-0",
        className,
      )}
    >
      <Face time={time} />
    </p>
  );
}
