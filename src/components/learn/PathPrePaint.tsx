"use client";

/**
 * "Hide your path" before first paint.
 *
 * The server renders the aside from the tm_learn_path cookie (LearnShell mirrors
 * the preference into it). A viewer whose preference so far only lives in
 * localStorage (no cookie yet) would still see the aside open and then jump shut
 * after hydration, so this inline script reads localStorage while the HTML is
 * parsed and sets <html data-learn-path>. The CSS below hides the aside and shows
 * the top-bar "Your path" button and Demo pill until React takes over; LearnShell
 * keeps the attribute in sync afterwards.
 *
 * Same pattern as motion/PrePaint: a real script on the server, `text/plain` on
 * the client so React never warns about a script tag.
 */
const js = `(function(){try{var v=localStorage.getItem("tm-player-path-collapsed");if(v)document.documentElement.dataset.learnPath=v==="true"?"collapsed":"open";}catch(e){}})();`;

const css = `@media (min-width:1024px){html[data-learn-path=collapsed] [data-learn-aside]{display:none!important}html[data-learn-path=collapsed] [data-learn-show],html[data-learn-path=collapsed] [data-learn-pill]{display:inline-flex!important}}`;

export function PathPrePaint() {
  return (
    <>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: js }}
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
