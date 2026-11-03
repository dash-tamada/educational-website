"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/components/app/mobile";
import { getLenis } from "@/lib/lenis";
import { FILMS } from "@/lib/content/films";
import { FilmsCanvas } from "./FilmsCanvas";
import { FilmsGrid } from "./FilmsGrid";
import { FilmLightbox } from "./FilmLightbox";
import { ViewToggle, type FilmsView } from "./ViewToggle";

/* =============================================================================
   /films top: the view (canvas | grid) + the detail overlay.
   Default view: the drag canvas, or the grid when the visitor prefers reduced
   motion (the server renders the canvas; reduced-motion clients switch on hydrate).
   Switching views jumps to the top of the films and keeps focus on the toggle.
   ============================================================================= */
export function FilmsExplorer() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [chosen, setChosen] = useState<FilmsView | null>(null);
  const view: FilmsView = chosen ?? (reduced ? "grid" : "canvas");
  const [open, setOpen] = useState<number | null>(null);
  const refocus = useRef<FilmsView | null>(null);

  const change = (v: FilmsView) => {
    if (v === view) return;
    refocus.current = v;
    setChosen(v);
  };

  // after a switch: back to the top of the page, focus the same toggle in its new place
  useEffect(() => {
    if (refocus.current !== view) return;
    refocus.current = null;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    document.querySelector<HTMLButtonElement>(`[data-view-btn="${view}"]`)?.focus({ preventScroll: true });
  }, [view]);

  const close = useCallback(() => setOpen(null), []);
  const nav = useCallback((dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + FILMS.length) % FILMS.length)), []);

  const toggle = <ViewToggle view={view} onChange={change} />;

  return (
    <>
      {view === "canvas" ? <FilmsCanvas onOpen={setOpen} toggle={toggle} /> : <FilmsGrid onOpen={setOpen} toggle={toggle} />}
      <FilmLightbox index={open} onClose={close} onNav={nav} />
    </>
  );
}
