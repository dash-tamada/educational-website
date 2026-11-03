import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/app";
import { ArrowIcon, Eyebrow, GridLines, RedWords } from "@/components/editorial";
import { Mascot } from "@/components/decor/Mascot";
import { NotFoundSearch } from "@/components/auth/NotFoundSearch";
import { Timecode } from "@/components/auth/Timecode";
import { FLAGSHIP } from "@/lib/content/site";
import { POSTS } from "@/lib/content/journal";
import { media } from "@/lib/media";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/* =============================================================================
   404 (Marlowe hero grammar). One theatre screen on the home hero's columns
   (22 / 56 / 22, hairlines on the column edges):
   left   SCENE MISSING. in condensed caps, the note, a frozen-then-running slate
   centre a viewfinder: slate, NO SIGNAL, a giant Anton 404 with a still showing through the glyphs
   right  site search + four ruled exits (Course, Films, Journal, Home)
   Phones stack it: numerals, title, note, search, exits.
   ============================================================================= */

const EXITS = [
  { label: "The course", href: FLAGSHIP.href },
  { label: "Films", href: "/films" },
  { label: "Journal", href: "/journal" },
  { label: "Home", href: "/" },
];

/** Viewfinder corner marks around the centre column (desktop). */
function Viewfinder() {
  const c = "absolute size-6 border-cream/45";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 max-lg:hidden">
      <span className={`${c} top-0 left-0 border-t border-l`} />
      <span className={`${c} top-0 right-0 border-t border-r`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} right-0 bottom-0 border-r border-b`} />
      <div className="absolute inset-x-0 top-[26%] flex flex-col items-center gap-3">
        <span className="relative block size-5">
          <span className="absolute top-1/2 left-0 h-px w-full bg-cream/45" />
          <span className="absolute top-0 left-1/2 h-full w-px bg-cream/45" />
        </span>
        <span className="t-timecode text-ash">No signal</span>
      </div>
    </div>
  );
}

/**
 * "404" with a still inside the glyphs (background-clip: text), so only the numerals
 * show the picture and the ground around them stays the exact theatre ink. The red
 * background colour is the fallback while the still loads (or if it never does).
 * The URL is the media.ts entry with the same Unsplash params the next/image loader adds.
 */
function Numerals({ className }: { className?: string }) {
  const m = media("still-cinema-neon");
  const url = `${m.src}?w=1400&h=840&fit=crop&crop=faces,entropy&q=72&auto=format`;
  return (
    <p
      aria-hidden
      className={`bg-red bg-cover bg-clip-text px-[0.03em] pt-[0.06em] pb-[0.04em] font-display leading-[0.8] tracking-[0.03em] whitespace-nowrap text-transparent select-none ${className ?? ""}`}
      style={{ backgroundImage: `url("${url}")`, backgroundPosition: "50% 52%", WebkitBackgroundClip: "text" }}
    >
      404
    </p>
  );
}

function Slate() {
  return (
    <p className="t-timecode flex flex-wrap items-center gap-x-3 gap-y-1 text-ash" aria-hidden>
      <span>SC 404 · TK 00</span>
      <span className="flex items-center gap-2 text-cream">
        <span className="size-[7px] animate-pulse rounded-full bg-red" />
        <Timecode start={4 * 60 + 4} />
      </span>
      <span className="lg:hidden">No signal</span>
    </p>
  );
}

function Exits() {
  return (
    <nav aria-label="Ways back">
      <ul className="border-t border-line">
        {EXITS.map((e, i) => (
          <li key={e.href} className="border-b border-line">
            <Link href={e.href} className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-3.5 lg:py-3 xl:py-3.5 [@media(min-height:860px)]:py-4">
              <span className="t-timecode text-ash">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-heading text-[clamp(1.25rem,1.05rem+0.6vw,1.625rem)] leading-tight font-semibold tracking-[-0.03em] transition-colors group-hf:text-red-lite">
                {e.label}
              </span>
              <ArrowIcon className="size-4 self-center transition-[translate] duration-500 ease-expo group-hf:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function NotFound() {
  // loginNext={false}: logging in from a 404 should not bounce back to the 404
  return (
    <SiteShell flush headerLight loginNext={false}>
      <section aria-labelledby="nf-title" className="theatre relative isolate overflow-hidden lg:h-[100svh] lg:min-h-[680px]">
        <div className="max-lg:hidden">
          <GridLines stops={[22, 78]} />
        </div>

        <div className="container-wide relative flex h-full flex-col pt-[calc(var(--header-offset)+var(--sat)+20px)] pb-12 lg:grid lg:grid-cols-[11fr_28fr_11fr] lg:gap-x-grid lg:pt-[calc(var(--header-offset)+var(--sat)+8px)] lg:pb-0">
          {/* left: the title + note (top), the slate (bottom) */}
          <div className="flex flex-col justify-between max-lg:mt-8 lg:pb-[clamp(24px,4vh,44px)]">
            <div>
              <Eyebrow index="404" className="text-cream">
                Error
              </Eyebrow>
              <h1 id="nf-title" className="mt-6 font-display text-[clamp(2.75rem,1.2rem+5vw,4rem)] leading-[0.9] uppercase lg:text-[clamp(1.9rem,0.6rem+1.9vw,2.75rem)]">
                <RedWords text="Scene missing." red={["missing"]} />
                <span className="sr-only"> Error 404, page not found.</span>
              </h1>
              <p className="t-body mt-5 max-w-[22rem] text-cream/80">
                This page was cut in the edit, or never shot. Check the link, search the set, or take one of the exits.
              </p>
            </div>
            <div className="mt-10 max-lg:hidden">
              <p className="flex items-center gap-2.5 text-[12.5px] text-ash">
                <Mascot title="" className="w-4 shrink-0" style={{ transform: "rotate(-8deg)" }} />
                Tami checked behind every flat. Nothing.
              </p>
            </div>
          </div>

          {/* centre: a viewfinder (corner marks, slate, NO SIGNAL) with the numerals at its foot */}
          <div className="@container relative mt-8 flex flex-col justify-end max-lg:order-first max-lg:mt-2 lg:mt-3 lg:mb-[clamp(24px,4vh,44px)]">
            <Viewfinder />
            <div className="absolute inset-x-5 top-4 flex items-center justify-between gap-4 max-lg:hidden">
              <Slate />
              <span className="t-timecode text-ash" aria-hidden>
                2.39:1 · 24 FPS
              </span>
            </div>
            <div className="relative flex justify-center lg:px-6 lg:pb-6">
              <Numerals className="text-[60cqw] lg:text-[min(56cqw,44svh)]" />
            </div>
          </div>

          {/* right: search (middle) + exits (bottom) */}
          <div className="mt-10 flex flex-col justify-between gap-10 lg:mt-0 lg:pt-[14vh] lg:pb-[clamp(60px,9vh,84px)]">
            <NotFoundSearch notes={POSTS.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, tag: p.tag }))} />
            <Exits />
            <div className="lg:hidden">
              <Slate />
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
