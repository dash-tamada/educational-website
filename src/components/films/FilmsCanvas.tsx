"use client";

import { useRef } from "react";
import clsx from "clsx";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { armEnter, markEntered, onPageReady, prefersReducedMotion } from "@/lib/motion";
import { FILMS, FILMS_PAGE } from "@/lib/content/films";
import { currentScrollY } from "@/lib/lenis";
import { Photo } from "@/components/editorial";

/* =============================================================================
   FILMS CANVAS (Mobius "Work": scroll / drag image field). Theatre.
   A tall section with a sticky full-viewport stage. The giant FILMS title sits in
   the middle; the stills float over it on an endless, wrapping field:
     - page scroll pans the field vertically (Lenis-smoothed, 1:1),
     - pointer drag pans it in both axes (mouse) or sideways (touch: vertical swipes
       keep scrolling the page), with inertia on release,
     - a horizontal trackpad / wheel gesture pans sideways.
   Every still is a <button> (opens the detail overlay). Keyboard: the field is ONE
   tab stop (roving tabindex on the still nearest the centre); arrow keys move to
   the nearest still in that direction and glide it to the centre; Enter opens.
   Performance: one gsap.ticker loop, only while the section is on screen; it reads
   once (scroll) then writes transforms (translate3d) only for items that moved.
   No layout reads per frame. Reduced motion: no inertia / easing (the page defaults
   to the grid view anyway).
   ============================================================================= */

/** Per-still shape + scatter: ar = frame aspect class, r = height / width (crop), s = width in --u units,
 *  jx / jy = jitter inside the cell (0..1). */
const SLOTS = [
  { ar: "aspect-[3/2]", r: 2 / 3, s: 1.04, jx: 0.12, jy: 0.28 },
  { ar: "aspect-[4/5]", r: 5 / 4, s: 0.74, jx: 0.78, jy: 0.06 },
  { ar: "aspect-[16/9]", r: 9 / 16, s: 1.1, jx: 0.36, jy: 0.7 },
  { ar: "aspect-square", r: 1, s: 0.78, jx: 0.88, jy: 0.4 },
  { ar: "aspect-[4/5]", r: 5 / 4, s: 0.8, jx: 0.42, jy: 0.04 },
  { ar: "aspect-[3/2]", r: 2 / 3, s: 0.94, jx: 0.06, jy: 0.78 },
  { ar: "aspect-[3/2]", r: 2 / 3, s: 1.08, jx: 0.64, jy: 0.22 },
  { ar: "aspect-[4/5]", r: 5 / 4, s: 0.72, jx: 0.22, jy: 0.9 },
  { ar: "aspect-[16/9]", r: 9 / 16, s: 1.02, jx: 0.9, jy: 0.12 },
  { ar: "aspect-[4/5]", r: 5 / 4, s: 0.78, jx: 0.18, jy: 0.46 },
  { ar: "aspect-square", r: 1, s: 0.84, jx: 0.66, jy: 0.86 },
  { ar: "aspect-[3/2]", r: 2 / 3, s: 1.0, jx: 0.4, jy: 0.16 },
  { ar: "aspect-[3/2]", r: 2 / 3, s: 0.92, jx: 0.74, jy: 0.62 },
  { ar: "aspect-[16/9]", r: 9 / 16, s: 1.08, jx: 0.08, jy: 0.1 },
  { ar: "aspect-[4/5]", r: 5 / 4, s: 0.76, jx: 0.5, jy: 0.74 },
  { ar: "aspect-square", r: 1, s: 0.86, jx: 0.96, jy: 0.3 },
] as const;
const slot = (i: number) => SLOTS[i % SLOTS.length];
const COLS = 4;
const GAP = 40;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function FilmsCanvas({ onOpen, toggle }: { onOpen: (index: number) => void; toggle: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const stage = stageRef.current!;
      const items = Array.from(stage.querySelectorAll<HTMLElement>("[data-film-item]"));
      const btns = items.map((li) => li.querySelector<HTMLButtonElement>("[data-film-btn]")!);
      if (!items.length) return;
      const reduced = prefersReducedMotion();

      const S = { vw: 1, vh: 1, TW: 1, TH: 1, padX: 0, padY: 0 };
      const geo = items.map(() => ({ bx: 0, by: 0, w: 0, h: 0, x: Number.NaN, y: Number.NaN }));
      const cur = { x: 0, y: 0 };
      const tgt = { x: 0, y: 0 };
      const vel = { x: 0, y: 0 };
      let scrollPx = 0;
      let active = -1;
      let frame = 0;

      /* ---- layout: reads first, then writes ---- */
      const layout = () => {
        S.vw = stage.clientWidth;
        S.vh = stage.clientHeight;
        const sizes = items.map((li) => [li.offsetWidth, li.offsetHeight] as const);
        const maxW = Math.max(...sizes.map((s) => s[0]));
        const maxH = Math.max(...sizes.map((s) => s[1]));
        const rows = Math.ceil(items.length / COLS);
        const cellW = Math.max((S.vw + maxW + GAP) / COLS, maxW * 1.45);
        const cellH = Math.max((S.vh + maxH + GAP) / rows, maxH * 1.32);
        S.TW = cellW * COLS;
        S.TH = cellH * rows;
        S.padX = maxW + GAP / 2;
        S.padY = maxH + GAP / 2;
        items.forEach((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const sl = slot(i);
          const [w, h] = sizes[i];
          const g = geo[i];
          g.w = w;
          g.h = h;
          g.bx = col * cellW + (row % 2) * cellW * 0.5 + sl.jx * (cellW - w);
          g.by = row * cellH + sl.jy * (cellH - h);
          g.x = g.y = Number.NaN;
        });
        items.forEach((li) => {
          li.style.left = "0px";
          li.style.top = "0px";
        });
      };

      const render = () => {
        const ox = cur.x;
        const oy = cur.y - scrollPx;
        for (let i = 0; i < items.length; i++) {
          const g = geo[i];
          const x = Math.round((mod(g.bx + ox + S.padX, S.TW) - S.padX) * 10) / 10;
          const y = Math.round((mod(g.by + oy + S.padY, S.TH) - S.padY) * 10) / 10;
          if (x !== g.x || y !== g.y) {
            g.x = x;
            g.y = y;
            items[i].style.transform = `translate3d(${x}px, ${y}px, 0)`;
          }
        }
      };

      /* the still nearest the centre of the stage */
      const nearest = () => {
        let best = 0;
        let bd = Infinity;
        geo.forEach((g, i) => {
          const d = Math.hypot(g.x + g.w / 2 - S.vw / 2, g.y + g.h / 2 - S.vh / 2);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        return best;
      };
      const setActive = (i: number) => {
        if (i === active) return;
        active = i;
        btns.forEach((b, j) => (b.tabIndex = j === i ? 0 : -1));
      };
      /* glide still i to the centre of the stage */
      const centre = (i: number) => {
        const g = geo[i];
        tgt.x += S.vw / 2 - (g.x + g.w / 2);
        tgt.y += S.vh / 2 - (g.y + g.h / 2);
        vel.x = vel.y = 0;
      };

      const st = ScrollTrigger.create({ trigger: section, start: "top top", end: "bottom bottom" });
      // Lenis' own scroll value (no DOM read): st.scroll() reads pageYOffset, and in this tick
      // (after GSAP has rendered the frame's tweens) that forced a style + layout pass per frame
      const readScroll = () => {
        scrollPx = clamp(currentScrollY() - st.start, 0, Math.max(0, st.end - st.start));
      };

      /* ---- the loop (only while the section is on screen) ---- */
      const drag = { down: false, active: false, moved: false, touch: false, id: -1, sx: 0, sy: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0 };
      const tick = (_time: number, dtMs: number) => {
        const f = Math.min(dtMs || 16.7, 64) / (1000 / 60);
        readScroll();
        if (!drag.active && (vel.x || vel.y)) {
          tgt.x += vel.x * f;
          tgt.y += vel.y * f;
          const k = Math.pow(0.935, f);
          vel.x = Math.abs(vel.x * k) < 0.02 ? 0 : vel.x * k;
          vel.y = Math.abs(vel.y * k) < 0.02 ? 0 : vel.y * k;
        }
        if (reduced) {
          cur.x = tgt.x;
          cur.y = tgt.y;
        } else {
          const k = 1 - Math.pow(1 - 0.14, f);
          cur.x += (tgt.x - cur.x) * k;
          cur.y += (tgt.y - cur.y) * k;
          if (Math.abs(tgt.x - cur.x) < 0.05) cur.x = tgt.x;
          if (Math.abs(tgt.y - cur.y) < 0.05) cur.y = tgt.y;
        }
        render();
        // keep the tab stop on a visible still (not while someone is inside the field)
        if (++frame % 12 === 0 && !stage.contains(document.activeElement)) setActive(nearest());
      };
      let running = false;
      const run = (on: boolean) => {
        if (on === running) return;
        running = on;
        if (on) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      };
      const vis = ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom top", onToggle: (s) => run(s.isActive) });

      /* first frame: lay out, pick a composed starting offset, render */
      layout();
      cur.x = tgt.x = -S.TW * 0.07;
      cur.y = tgt.y = -S.TH * 0.06;
      readScroll();
      render();
      setActive(nearest());
      run(vis.isActive || section.getBoundingClientRect().top < window.innerHeight);

      /* ---- entrance (after the intro / route curtain) ---- */
      const inners = stage.querySelectorAll("[data-film-inner]");
      const titleParts = stage.querySelectorAll("[data-films-title]");
      const ui = stage.querySelectorAll("[data-films-ui]");
      const stopReady = reduced
        ? () => {}
        : onPageReady(() => {
            armEnter(stage);
            gsap
              .timeline({ defaults: { ease: "expo.out" } })
              .fromTo(titleParts, { autoAlpha: 0, yPercent: 108 }, { autoAlpha: 1, yPercent: 0, duration: 1.3, stagger: 0.08 }, 0)
              .fromTo(inners, { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 1.3, stagger: { each: 0.04, from: "center" } }, 0.15)
              .fromTo(ui, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.6)
              .call(() => markEntered(stage.querySelectorAll("[data-enter]")));
            // a slow glide on arrival hints that the field moves
            vel.x = -7;
            vel.y = -2;
          });

      /* ---- pointer drag with inertia ---- */
      const onDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        drag.down = true;
        drag.active = false;
        drag.moved = false;
        drag.touch = e.pointerType !== "mouse";
        drag.id = e.pointerId;
        drag.sx = drag.lx = e.clientX;
        drag.sy = drag.ly = e.clientY;
        drag.lt = performance.now();
        drag.vx = drag.vy = 0;
        vel.x = vel.y = 0;
      };
      const onMove = (e: PointerEvent) => {
        if (!drag.down || e.pointerId !== drag.id) return;
        if (!drag.active) {
          if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
          drag.active = true;
          drag.moved = true;
          drag.lx = e.clientX;
          drag.ly = e.clientY;
          try {
            stage.setPointerCapture(e.pointerId);
          } catch {}
          stage.setAttribute("data-dragging", "");
          return;
        }
        const dx = e.clientX - drag.lx;
        const dy = drag.touch ? 0 : e.clientY - drag.ly;
        tgt.x += dx;
        tgt.y += dy;
        const now = performance.now();
        const dt = Math.max(1, now - drag.lt);
        drag.vx = drag.vx * 0.55 + (dx / dt) * (1000 / 60) * 0.45;
        drag.vy = drag.vy * 0.55 + (dy / dt) * (1000 / 60) * 0.45;
        drag.lx = e.clientX;
        drag.ly = e.clientY;
        drag.lt = now;
      };
      const onUp = (e: PointerEvent) => {
        if (!drag.down || e.pointerId !== drag.id) return;
        drag.down = false;
        if (!drag.active) return;
        drag.active = false;
        stage.removeAttribute("data-dragging");
        try {
          if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
        } catch {}
        // a flick keeps going; a drag that paused before release just stops
        if (!reduced && performance.now() - drag.lt < 90) {
          vel.x = clamp(drag.vx, -70, 70);
          vel.y = clamp(drag.vy, -70, 70);
        }
      };
      // a drag never opens the still it started on
      const onClickCapture = (e: MouseEvent) => {
        if (!drag.moved) return;
        drag.moved = false;
        e.preventDefault();
        e.stopPropagation();
      };
      // sideways trackpad swipes / shift-wheel pan the field (vertical wheel scrolls the page)
      const onWheel = (e: WheelEvent) => {
        const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
        if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
        tgt.x -= dx;
      };

      /* ---- keyboard: arrows move between stills ---- */
      const DIRS: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
      const onKey = (e: KeyboardEvent) => {
        const d = DIRS[e.key];
        const from = btns.indexOf(e.target as HTMLButtonElement);
        if (!d || from < 0) return;
        e.preventDefault();
        const a = geo[from];
        const ax = a.x + a.w / 2;
        const ay = a.y + a.h / 2;
        let best = -1;
        let score = Infinity;
        geo.forEach((g, i) => {
          if (i === from) return;
          const dx = g.x + g.w / 2 - ax;
          const dy = g.y + g.h / 2 - ay;
          const along = dx * d[0] + dy * d[1];
          if (along <= 4) return;
          const across = Math.abs(dx * d[1] - dy * d[0]);
          const s = along + across * 2.2;
          if (s < score) {
            score = s;
            best = i;
          }
        });
        if (best < 0) return;
        centre(best);
        setActive(best);
        btns[best].focus({ preventScroll: true });
      };
      // a still focused near the edge glides into view
      const onFocusIn = (e: FocusEvent) => {
        const i = btns.indexOf(e.target as HTMLButtonElement);
        if (i < 0) return;
        setActive(i);
        const g = geo[i];
        const m = 48;
        if (g.x < m || g.y < m + 60 || g.x + g.w > S.vw - m || g.y + g.h > S.vh - m - 60) centre(i);
      };

      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onUp);
      stage.addEventListener("lostpointercapture", onUp);
      stage.addEventListener("click", onClickCapture, true);
      stage.addEventListener("wheel", onWheel, { passive: true });
      stage.addEventListener("keydown", onKey);
      stage.addEventListener("focusin", onFocusIn);

      let rt = 0;
      const ro = new ResizeObserver(() => {
        window.cancelAnimationFrame(rt);
        rt = window.requestAnimationFrame(() => {
          layout();
          render();
        });
      });
      ro.observe(stage);

      return () => {
        run(false);
        stopReady();
        ro.disconnect();
        window.cancelAnimationFrame(rt);
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onUp);
        stage.removeEventListener("lostpointercapture", onUp);
        stage.removeEventListener("click", onClickCapture, true);
        stage.removeEventListener("wheel", onWheel);
        stage.removeEventListener("keydown", onKey);
        stage.removeEventListener("focusin", onFocusIn);
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="films-title" className="theatre relative h-[250svh] lg:h-[280svh]">
      <div
        ref={stageRef}
        data-cursor="grab"
        className="films-stage sticky top-0 h-[100svh] min-h-[560px] touch-pan-y overflow-clip select-none [--u:clamp(150px,25vw,360px)]"
      >
        {/* Title: the middle of the stage, under the stills */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-edge">
          <div className="flex flex-col items-center text-center">
            <span className="line-mask">
              <span data-films-title="" data-enter="" className="t-label flex items-center gap-3">
                <span className="t-timecode text-ash">({String(FILMS.length).padStart(2, "0")})</span>
                <span aria-hidden className="block size-[7px] bg-red" />
                {FILMS_PAGE.kicker}
              </span>
            </span>
            <h1 id="films-title" className="mt-[clamp(14px,1.6vw,26px)] font-display text-[clamp(6.5rem,2rem+19vw,23rem)] leading-[0.8] tracking-[-0.01em] uppercase">
              <span className="line-mask">
                <span data-films-title="" data-enter="" className="block">
                  {FILMS_PAGE.title}
                </span>
              </span>
            </h1>
            <span className="line-mask mt-5 self-end">
              <span data-films-title="" data-enter="" className="t-timecode block text-cream/75">
                <span className="coarse:hidden">{FILMS_PAGE.hint}</span>
                <span className="hidden coarse:inline">{FILMS_PAGE.hintTouch}</span>
              </span>
            </span>
          </div>
        </div>

        <p id="films-canvas-help" className="sr-only">
          {FILMS.length} films on a moving field. Use the arrow keys to move between films and Enter to open one, or switch to the grid view for a plain list.
        </p>

        {/* The field */}
        <ul aria-label="Films" aria-describedby="films-canvas-help" className="absolute inset-0">
          {FILMS.map((f, i) => {
            const sl = slot(i);
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            // no-JS fallback scatter (JS replaces it with transforms before the entrance)
            const left = mod(col * 38 + (row % 2) * 19 + sl.jx * 12 + 8, 152) - 26;
            const top = row * 52 + sl.jy * 14 - 20;
            return (
              <li
                key={f.slug}
                data-film-item=""
                className="absolute will-change-transform"
                style={{ width: `calc(var(--u) * ${sl.s})`, left: `${left}%`, top: `${top}%` }}
              >
                <div data-film-inner="" data-enter="">
                  <button
                    type="button"
                    data-film-btn=""
                    onClick={() => onOpen(i)}
                    aria-label={`${f.title}, by ${f.maker}. ${f.kind}, ${f.runtime}. Open details`}
                    className="film-btn group relative block w-full text-left"
                  >
                    <Photo
                      k={f.still}
                      ratio={sl.r}
                      alt=""
                      loading="eager"
                      sizes="(min-width: 1440px) 400px, (min-width: 1024px) 28vw, (min-width: 640px) 26vw, 170px"
                      className={clsx("film-frame w-full", sl.ar)}
                      imgClassName="film-img"
                    >
                      <span aria-hidden className="film-dim pointer-events-none absolute inset-0 bg-ink" />
                    </Photo>
                    <span aria-hidden className="film-cap pointer-events-none absolute top-full left-0 mt-3 block w-[max(100%,15rem)]">
                      <span className="t-label block text-cream">
                        <span className="text-ash">{String(i + 1).padStart(2, "0")}</span> &nbsp;{f.title}
                      </span>
                      <span className="t-timecode mt-1.5 block text-ash">{f.tools.join(" · ")}</span>
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Edge scrims: the header and the bottom UI (toggle, clock) stay legible over the stills */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[clamp(96px,16vh,150px)] bg-linear-to-b from-ink/85 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[clamp(110px,20vh,190px)] bg-linear-to-t from-ink/90 via-ink/50 to-transparent" />

        {/* UI: view toggle + count (bottom-left; the live clock owns bottom-right) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div className="container-wide flex items-end justify-between gap-6 pb-[max(20px,calc(var(--sab)+16px))]">
            <div data-films-ui="" data-enter="" className="pointer-events-auto">
              {toggle}
            </div>
            <p data-films-ui="" data-enter="" className="t-timecode mr-[min(15rem,30vw)] hidden text-ash lg:block">
              {FILMS_PAGE.count} · {FILMS_PAGE.note.split(".")[0]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
