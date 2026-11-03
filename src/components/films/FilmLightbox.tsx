"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useIsClient, useLayer } from "@/components/app/overlay-core";
import { topLayer } from "@/components/app/layers";
import { FILMS } from "@/lib/content/films";
import { FLAGSHIP } from "@/lib/content/site";
import { ArrowIcon, ArrowLink, Button, Photo } from "@/components/editorial";

/* =============================================================================
   FILM DETAIL OVERLAY (lightbox). A full-screen theatre dialog: the still on the
   left (full height), the details on the right: kind · year · runtime, the title
   in Anton, maker, logline, a PROMPT card with the key shot's prompt, tool chips,
   and "Make your own" (the course). Prev / next buttons + ← → keys; Esc closes.
   Plumbing from the app kit (overlay-core useLayer): portal, focus trap, Esc,
   page scroll locked (Lenis stopped), focus back to the still that opened it.
   Phones: one scrolling column, still on top. Motion: opacity / transform only.
   ============================================================================= */
export function FilmLightbox({ index, onClose, onNav }: { index: number | null; onClose: () => void; onNav: (dir: 1 | -1) => void }) {
  const client = useIsClient();
  const panel = useRef<HTMLDivElement>(null);
  const open = index !== null;
  useLayer(open, onClose, panel);

  // ← → between films (only while this dialog is the top layer)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      if (topLayer() !== panel.current) return;
      if (e.key === "ArrowRight") onNav(1);
      else if (e.key === "ArrowLeft") onNav(-1);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onNav]);

  // open: scrim + panel fade, still settles from 1.06; next / prev: the still crossfades
  const opened = useRef(false);
  useGSAP(
    () => {
      const el = panel.current;
      if (!el) {
        opened.current = false;
        return;
      }
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      if (!opened.current) {
        opened.current = true;
        gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: "power2.out" });
        gsap.fromTo(q("[data-lb-photo]"), { scale: 1.06 }, { scale: 1, duration: 1.4, ease: "expo.out" });
        gsap.fromTo(q("[data-lb-in]"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.05, delay: 0.1 });
      } else {
        gsap.fromTo(q("[data-lb-photo]"), { autoAlpha: 0.2, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: "expo.out" });
        gsap.fromTo(q("[data-lb-in]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out", stagger: 0.03 });
      }
    },
    { dependencies: [index] },
  );

  if (!client || index === null) return null;
  const f = FILMS[index];
  const prev = FILMS[(index - 1 + FILMS.length) % FILMS.length];
  const next = FILMS[(index + 1) % FILMS.length];
  const n = (i: number) => String(i).padStart(2, "0");

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-lb-title"
      aria-describedby="film-lb-logline"
      data-ground-ignore=""
      data-lenis-prevent=""
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain lg:overflow-hidden"
    >
      <div className="theatre flex min-h-full flex-col lg:h-full">
      {/* Top bar */}
      <div className="container-wide flex h-[64px] shrink-0 items-center justify-between gap-4 border-b border-line pt-[var(--sat)] lg:h-[var(--header-offset)]">
        <p className="t-timecode text-ash" aria-live="polite">
          <span className="text-cream">{n(index + 1)}</span> / {n(FILMS.length)} · {f.kind}
        </p>
        <button type="button" data-overlay-close="" onClick={onClose} className="t-label tap hit flex h-10 items-center gap-3 px-1 hf:text-red-lite">
          Close
          <span aria-hidden className="relative block size-4">
            <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 rotate-45 bg-current" />
            <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 -rotate-45 bg-current" />
          </span>
        </button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* The still */}
        <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:h-full">
          <div data-lb-photo="" className="absolute inset-0">
            <Photo key={f.slug} k={f.still} fill preload sizes="(min-width: 1024px) 58vw, 100vw" />
          </div>
          <div aria-hidden className="scrim-b pointer-events-none absolute inset-x-0 bottom-0 h-1/3" />
          <p className="t-timecode absolute bottom-4 left-[max(var(--edge),var(--sal))] text-cream/85">{f.shot}</p>
        </div>

        {/* Details */}
        <div className="flex min-h-0 flex-col lg:overflow-y-auto lg:overscroll-contain" data-lenis-prevent="">
          <div className="flex flex-1 flex-col px-[max(var(--edge),var(--sal))] pt-8 pb-8 lg:px-12 lg:pt-12">
            <p data-lb-in="" className="t-label flex items-center gap-3 text-ash">
              <span aria-hidden className="block size-[7px] bg-red" />
              {f.kind} · {f.year} · {f.runtime}
            </p>
            <h2 id="film-lb-title" data-lb-in="" className="mt-5 font-display text-[clamp(2.75rem,1.4rem+3.6vw,5.25rem)] leading-[0.88] uppercase">
              {f.title}
            </h2>
            <p data-lb-in="" className="t-label mt-5">
              {f.maker} <span className="text-ash">· {f.city}</span>
            </p>
            <p id="film-lb-logline" data-lb-in="" className="t-body-l mt-6 max-w-[32rem] text-cream/85">
              {f.logline}
            </p>

            <figure data-lb-in="" className="mt-8 border border-line bg-night">
              <figcaption className="t-timecode flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-ash">
                <span>
                  <span className="text-red-lite">Prompt</span> · {f.shot}
                </span>
              </figcaption>
              <blockquote className="px-4 py-4 font-mono text-[13px] leading-[1.65] text-cream/90">{f.prompt}</blockquote>
            </figure>

            <div data-lb-in="" className="mt-7">
              <p className="t-timecode text-ash">Made with</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {f.tools.map((t) => (
                  <li key={t} className="t-tag flex h-8 items-center rounded-full border border-line-strong px-3.5 text-cream/90">
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div data-lb-in="" className="mt-auto flex flex-col gap-5 pt-10 sm:flex-row sm:items-center sm:justify-between">
              <Button href={FLAGSHIP.href} arrow>
                Make your own
              </Button>
              <ArrowLink href={FLAGSHIP.freeLessonHref}>Watch free lesson</ArrowLink>
            </div>
          </div>

          {/* Prev / next */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-[max(var(--edge),var(--sal))] py-4 pb-[max(16px,var(--sab))] lg:px-12">
            <button
              type="button"
              onClick={() => onNav(-1)}
              aria-label={`Previous film: ${prev.title}`}
              className="t-label tap flex min-h-11 items-center gap-3 text-left hf:text-red-lite"
            >
              <span aria-hidden className="round-btn">
                <ArrowIcon dir="left" className="size-4" />
              </span>
              <span aria-hidden>
                <span className="block text-ash">Previous</span>
                <span className="mt-1 block max-w-[12rem] truncate tracking-[0.04em] max-sm:hidden">{prev.title}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNav(1)}
              aria-label={`Next film: ${next.title}`}
              className="t-label tap flex min-h-11 items-center gap-3 text-right hf:text-red-lite"
            >
              <span aria-hidden>
                <span className="block text-ash">Next</span>
                <span className="mt-1 block max-w-[12rem] truncate tracking-[0.04em] max-sm:hidden">{next.title}</span>
              </span>
              <span aria-hidden className="round-btn">
                <ArrowIcon className="size-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
