"use client";

import clsx from "clsx";
import { Skeleton } from "@/components/app";
import { SectionTitle } from "./bits";
import { useStoreHydrated } from "@/lib/demo/store";

/* =============================================================================
   Store gate for the student pages. The server and the hydration pass only
   know the seed, while the demo store (purchases, wishlist edits, profile
   changes) lives in this browser. Rendering the seed first and then swapping
   in the overlay makes lists jump and briefly shows removed items, so every
   store-driven view renders a calm skeleton until the overlay is applied.
   ============================================================================= */

export function Hydrated({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  const ready = useStoreHydrated();
  return <>{ready ? children : fallback}</>;
}

/** Wrapper that announces "loading" once for assistive tech. */
function Busy({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={clsx("app-fade", className)}>
      <span className="sr-only" role="status">
        Loading your data
      </span>
      {children}
    </div>
  );
}

export function HeaderSkeleton({
  crumbs = true,
  meta = false,
}: {
  crumbs?: boolean;
  meta?: boolean;
}) {
  return (
    <div className="mb-6 md:mb-8" aria-hidden>
      {crumbs && <Skeleton className="mb-4 h-4 w-40 rounded-full" />}
      <Skeleton className="h-7 w-32 rounded-full" />
      <Skeleton className="mt-4 h-11 w-full max-w-[520px] rounded-[14px] md:h-14" />
      <Skeleton className="mt-3 h-4 w-full max-w-[380px] rounded-full" />
      {meta && (
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      )}
    </div>
  );
}

/** Same container query as StatGrid: four across only once the content column is 56rem+. */
export function TilesSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("@container", className)} aria-hidden>
      <div className="grid grid-cols-2 gap-3 md:gap-4 @4xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[128px] rounded-card md:h-[152px]" />
        ))}
      </div>
    </div>
  );
}

/** Rows like the My courses list cards: the same container-query layout as CourseRow. */
export function RowsSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={clsx("@container space-y-3", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="grid gap-4 rounded-card bg-white p-4 shadow-soft @[560px]:grid-cols-[176px_minmax(0,1fr)] @[560px]:gap-x-5 @[560px]:gap-y-3 @[560px]:p-3 @[860px]:grid-cols-[200px_minmax(0,1fr)_auto] @[860px]:items-center @[860px]:pr-5 @[1040px]:grid-cols-[224px_minmax(0,1fr)_auto]"
        >
          <Skeleton className="aspect-video w-full rounded-img @[560px]:self-start @[860px]:self-center" />
          <div className="space-y-2.5 px-1 @[560px]:px-0 @[560px]:py-0.5">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-6 w-3/4 rounded-full" />
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-2.5 w-full max-w-[260px] rounded-full" />
            <Skeleton className="h-3.5 w-2/3 rounded-full" />
            <Skeleton className="h-3.5 w-3/5 rounded-full" />
          </div>
          <div className="flex items-center gap-2 px-1 pb-1 @[560px]:col-span-2 @[560px]:justify-end @[560px]:border-t @[560px]:border-ink/[0.07] @[560px]:pt-3 @[860px]:col-span-1 @[860px]:border-0 @[860px]:p-0">
            <Skeleton className="h-11 flex-1 rounded-full @[560px]:w-32 @[560px]:flex-none" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Dashboard: the real header (the caller renders it from the seed, which is what the store starts
 * from), then blocks sized like the hero + fortnight row, the stat tiles and "Your courses".
 */
export function DashboardSkeleton({
  header,
  newLearner = false,
}: {
  header: React.ReactNode;
  newLearner?: boolean;
}) {
  if (newLearner)
    return (
      <Busy>
        {header}
        <Skeleton className="h-[440px] rounded-card md:h-[400px]" />
        <Skeleton className="mt-10 h-7 w-48 rounded-full md:mt-12" />
        <div
          className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-hidden
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              key={i}
              variant="card"
              className={i === 2 ? "max-xl:hidden" : undefined}
            />
          ))}
        </div>
      </Busy>
    );
  return (
    <Busy>
      {header}
      <div className="grid gap-4 md:gap-5 xl:grid-cols-3" aria-hidden>
        <Skeleton className="h-[488px] rounded-card-lg md:h-[316px] xl:col-span-2 xl:h-[350px]" />
        <Skeleton className="h-[324px] rounded-card-lg md:h-[228px] xl:h-[350px]" />
      </div>
      <TilesSkeleton className="mt-4 md:mt-5" />
      <section aria-hidden className="mt-10 md:mt-12">
        <SectionTitle
          title="Your courses"
          description="Pick up where you left off, or revisit the ones you smashed."
          action={<Skeleton className="h-9 w-32 rounded-full" />}
        />
        {/* phones: the 2x2 tab grid; from sm: one tab row */}
        <Skeleton className="h-[84px] w-full rounded-[22px] sm:h-11 sm:w-[440px] sm:max-w-full sm:rounded-full" />
        {/* phones: compact continue rows; from sm: progress course cards (~460px tall) */}
        <div className="mt-4 space-y-2.5 sm:hidden">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[84px] rounded-card" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 max-sm:hidden sm:grid-cols-2 md:mt-5 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              key={i}
              className={clsx(
                "h-[460px] rounded-card",
                i === 2 && "max-xl:hidden",
              )}
            />
          ))}
        </div>
      </section>
    </Busy>
  );
}

export function ListPageSkeleton({
  header,
  toolbar = true,
  rows = 3,
}: {
  header?: React.ReactNode;
  toolbar?: boolean | React.ReactNode;
  rows?: number;
}) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton meta />}
      {toolbar === true ? (
        <div className="mb-5 flex flex-wrap gap-3" aria-hidden>
          <Skeleton className="h-11 w-full max-w-[420px] rounded-full" />
          <Skeleton className="h-11 w-full max-w-[260px] rounded-full" />
        </div>
      ) : (
        toolbar || null
      )}
      <RowsSkeleton count={rows} />
    </Busy>
  );
}

export function TablePageSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <TilesSkeleton className="mb-6 md:mb-8" />
      <Skeleton className="mb-4 h-11 w-full max-w-[320px] rounded-full" />
      <div
        className="space-y-px overflow-hidden rounded-card bg-white shadow-soft"
        aria-hidden
      >
        <div className="h-11 bg-cream/70" />
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-ink/[0.06] px-4 py-3.5"
          >
            <Skeleton className="size-11 shrink-0 rounded-[12px]" />
            <Skeleton className="h-4 flex-1 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full max-sm:hidden" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function CardsPageSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <TilesSkeleton className="mb-6 md:mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            key={i}
            className={clsx(
              "h-[350px] rounded-card",
              i === 2 && "max-xl:hidden",
            )}
          />
        ))}
      </div>
    </Busy>
  );
}

export function SettingsSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <div
        className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8"
        aria-hidden
      >
        <div className="flex gap-1 lg:flex-col">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-28 shrink-0 rounded-full lg:w-full"
            />
          ))}
        </div>
        <div className="space-y-5">
          <Skeleton className="h-[520px] rounded-card" />
          <Skeleton className="h-[280px] rounded-card" />
        </div>
      </div>
    </Busy>
  );
}

/** Wishlist rows: the same container-query layout as the real rows (thumb + text, footer on narrow lists). */
function WishlistRowsSkeleton({ count }: { count: number }) {
  return (
    <ul className="@container space-y-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-3 rounded-card bg-white p-3 shadow-soft @[600px]:grid-cols-[168px_minmax(180px,1fr)_168px] @[600px]:gap-x-5 @[600px]:pr-5"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-[14px] @[600px]:row-span-2 @[600px]:aspect-auto @[600px]:h-full @[600px]:min-h-[132px] @[600px]:rounded-img" />
          <div className="space-y-2 self-center @[600px]:self-start @[600px]:pt-1">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-6 w-4/5 rounded-full" />
          </div>
          <div className="col-span-2 space-y-2.5 @[600px]:col-span-1 @[600px]:col-start-2 @[600px]:row-start-2">
            <Skeleton className="h-3.5 w-full rounded-full" />
            <Skeleton className="h-3.5 w-2/3 rounded-full" />
            <Skeleton className="h-3.5 w-3/4 rounded-full" />
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
          </div>
          <div className="col-span-2 flex gap-2 border-t border-ink/[0.07] pt-3 @[600px]:col-span-1 @[600px]:col-start-3 @[600px]:row-span-2 @[600px]:row-start-1 @[600px]:flex-col @[600px]:items-end @[600px]:border-0 @[600px]:py-1">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="ml-auto h-11 w-28 rounded-full @[600px]:mt-3 @[600px]:ml-0 @[600px]:w-full" />
            <Skeleton className="hidden h-11 w-full rounded-full @[600px]:block" />
            <Skeleton className="hidden h-8 w-24 self-center rounded-full @[600px]:block" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Wishlist: count + sort row, rows, and the summary column from xl. */
export function WishlistSkeleton({
  header,
  rows = 3,
}: {
  header?: React.ReactNode;
  rows?: number;
}) {
  return (
    <Busy>
      {header ?? <HeaderSkeleton />}
      <div
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
        aria-hidden
      >
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-11 w-full rounded-full sm:w-56" />
          </div>
          <WishlistRowsSkeleton count={rows} />
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Skeleton className="h-[252px] rounded-card" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[90px] rounded-card" />
            <Skeleton className="h-[72px] rounded-card" />
          </div>
        </div>
      </div>
    </Busy>
  );
}
