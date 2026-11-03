"use client";

import clsx from "clsx";
import { Skeleton } from "@/components/app";
import { useStoreHydrated } from "@/lib/demo/store";

/* =============================================================================
   Store gate for the student pages. The server and the hydration pass only
   know the seed, while the demo store (purchases, wishlist edits, profile
   changes) lives in this browser. Rendering the seed first and then swapping
   in the overlay makes lists jump and briefly shows removed items, so every
   store-driven view renders a calm skeleton until the overlay is applied.
   Skeletons are square hairline blocks in the shape of the real page.
   ============================================================================= */

export function Hydrated({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
  const ready = useStoreHydrated();
  return <>{ready ? children : fallback}</>;
}

/** Wrapper that announces "loading" once for assistive tech. */
export function Busy({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-busy="true" className={clsx("app-fade", className)}>
      <span className="sr-only" role="status">
        Loading your data
      </span>
      {children}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="mb-7 border-b border-line pb-6 sm:mb-9 sm:pb-8 md:mb-11 md:pb-9" aria-hidden>
      <Skeleton className="mb-6 h-3 w-32" />
      <Skeleton className="h-12 w-full max-w-[520px] md:h-14" />
      <Skeleton className="mt-4 h-4 w-full max-w-[380px]" />
    </div>
  );
}

/** A Mobius split section: label column + ruled rows. */
function SectionSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx("grid gap-5 border-t border-line-strong pt-5 lg:grid-cols-12 lg:gap-x-8", className)} aria-hidden>
      <div className="space-y-2.5 lg:col-span-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="space-y-3 lg:col-span-9">
        {Array.from({ length: rows }, (_, j) => (
          <Skeleton key={j} className="h-12" />
        ))}
      </div>
    </div>
  );
}

/** Orders: hairline stat strip, toolbar, table rows. */
export function TablePageSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <div className="mb-10 grid grid-cols-2 border-t border-l border-line md:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-r border-b border-line p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-6 h-9 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-4 h-11 w-full max-w-[320px]" />
      <div className="border-t border-fg" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16 max-sm:hidden" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Certificates: split sections with a paper sheet. */
export function CardsPageSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <div className="grid gap-5 border-t border-line-strong pt-5 lg:grid-cols-12 lg:gap-x-8" aria-hidden>
        <div className="space-y-2.5 lg:col-span-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:col-span-9">
          <div className="space-y-3">
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-[380px]" />
        </div>
      </div>
    </Busy>
  );
}

/** Settings: label column + form sections. */
export function SettingsSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <Skeleton className="mb-10 h-10 w-full max-w-[560px]" />
      <SectionSkeleton rows={4} />
    </Busy>
  );
}

/** Wishlist: count + sort row, ruled rows, the summary column from xl. */
export function WishlistSkeleton({ header, rows = 2 }: { header?: React.ReactNode; rows?: number }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <div className="border-t border-line-strong" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid gap-6 border-b border-line py-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Skeleton className="aspect-[16/10]" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Busy>
  );
}
