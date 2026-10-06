import { Suspense } from "react";
import { BlobSet, Eyebrow, HighlightBox, Sparkle, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Parallax } from "@/components/motion/Parallax";
import { DemoPill } from "@/components/app";
import { CatalogSearch } from "./CatalogSearch";
import { CatalogCounts } from "./LiveCounts";

/**
 * /courses header: a sun Aardvark panel with the Maxima caps heading, the big
 * search and a Tami scene. Kept shorter than a landing panel so results are
 * one scroll away.
 */
export function CatalogHero() {
  return (
    <section aria-labelledby="catalog-title" className="panel bg-sun py-12 md:py-16 lg:py-20">
      <BlobSet tone="sun" />
      <div className="container-x relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Eyebrow tone="blue">The library</Eyebrow>
          <h1 id="catalog-title" className="t-display-l mt-eyebrow max-w-[14ch]">
            Find your next <HighlightBox tone="blue">rabbit hole.</HighlightBox>
          </h1>
          <p className="t-body-l mt-sub max-w-[34rem] opacity-80">
            Browse by mood, skill, or the thing you keep saying you&apos;ll learn someday. The first video of every course is on us.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-14 max-w-[40rem] rounded-full bg-white shadow-soft md:h-16" />}>
              <CatalogSearch />
            </Suspense>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-semibold">
            <DemoPill />
            <CatalogCounts />
          </div>
        </div>

        <div className="relative hidden h-[300px] lg:block" aria-hidden>
          <Parallax y={36} rotate={[-4, 4]} className="absolute top-6 right-6 w-[190px]">
            <Mascot title="" className="w-full" style={{ transform: "rotate(8deg)" }} />
          </Parallax>
          <div className="absolute top-0 left-2">
            <Sticker tone="hotpink" rotate={-8} size="sm">
              first video free
            </Sticker>
          </div>
          <div className="absolute bottom-6 left-0">
            <Sticker tone="blue" rotate={5} size="sm">
              no boring bits
            </Sticker>
          </div>
          <Sparkle fill="#ffffff" className="absolute top-24 left-16 size-9" />
          <Sparkle fill="#2668fd" className="absolute right-2 bottom-2 size-7" />
        </div>
      </div>
    </section>
  );
}
