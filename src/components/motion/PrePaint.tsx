"use client";

import { useLayoutEffect } from "react";

/**
 * Pre-paint <html> attributes (see docs: preventing-flash-before-hydration).
 * - data-motion="ok" | "reduce": CSS only pre-hides [data-reveal] targets when "ok",
 *   so no-JS and reduced-motion visitors always see static content.
 * - data-intro="done" on every route except "/" (the intro curtain only lives on home).
 * - data-session="<role>" when the demo session cookie exists, so the (statically
 *   rendered, logged-out) header hides its Log in / Start free bits until the
 *   client header swaps in the account menu (no flash of the wrong state).
 *
 * `refill` (the client twin of the inline script) only sets attributes that are missing,
 * so re-running it never fights state
 * that client code changed later (IntroCurtain flipping data-intro, logout clearing
 * data-session).
 */
function refill() {
  const d = document.documentElement;
  try {
    const r = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!d.dataset.motion) d.dataset.motion = r ? "reduce" : "ok";
    if (!d.dataset.intro && (location.pathname !== "/" || r)) d.dataset.intro = "done";
  } catch {
    d.dataset.intro = "done";
  }
  try {
    const m = document.cookie.match(/(?:^|; )tm_demo=(student|tutor|admin)/);
    if (m && !d.dataset.session) d.dataset.session = m[1];
  } catch {}
}

/** The same logic as a literal string, so server and client render identical markup. */
const html = `(function(){var d=document.documentElement;try{var r=matchMedia("(prefers-reduced-motion: reduce)").matches;d.dataset.motion=r?"reduce":"ok";if(location.pathname!=="/"||r)d.dataset.intro="done";}catch(e){d.dataset.intro="done";}try{var m=document.cookie.match(/(?:^|; )tm_demo=(student|tutor|admin)/);if(m)d.dataset.session=m[1];}catch(e){}})();`;

/**
 * Renders the inline script that runs while the HTML is parsed (before first paint).
 *
 * On the server it is a real `text/javascript` script. On the client it renders as
 * `text/plain` (a data block React does not warn about): when React has to client-render
 * the root layout (e.g. after `notFound()` in dev, or the Strict Mode remount) it would
 * otherwise log "Encountered a script tag while rendering React component", and it also
 * resets <html> to the attributes it manages, so the layout effect puts ours back.
 */
export function PrePaint() {
  useLayoutEffect(() => {
    refill();
  }, []);
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
