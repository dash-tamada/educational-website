import Link from "next/link";
import clsx from "clsx";
import { Icon } from "@/components/app";

/* =============================================================================
   Small presentational pieces shared by the student pages (server-safe), in the
   v2 "cinematic editorial" language: tiny caps labels, mono indexes, hairline
   rules, square cells, one red. No tinted blocks, no round icon tiles, no mascots.
   ============================================================================= */

/** "07:40" from seconds (always two-digit minutes, h:mm:ss past an hour). */
export function timecode(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

/** Two-digit mono index ("01"). */
export const idx = (n: number) => String(n).padStart(2, "0");

/** Section title row (Mobius): optional mono index + tiny caps label over an Inter Tight title, hairline above. */
export function SectionTitle({
  id,
  title,
  description,
  action,
  index,
  className,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** small mono index before the title ("02") */
  index?: string;
  className?: string;
}) {
  return (
    <div className={clsx("mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-fg pt-5 md:mb-6", className)}>
      <div className="min-w-0">
        <h2 id={id} className="flex items-baseline gap-3 t-app-h2">
          {index && <span className="font-mono text-[11px] font-medium tracking-[0.04em] text-red-deep">{index}</span>}
          <span className="min-w-0">{title}</span>
        </h2>
        {description && <p className="mt-1.5 max-w-[60ch] t-small text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Mobius text link: "All courses ->" (sentence case, the arrow nudges right). */
export function SeeAll({ href, children = "See all", className }: { href: string; children?: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        "group tap inline-flex min-h-9 items-center gap-2 text-[14px] font-medium tracking-[-0.01em] text-fg transition-colors coarse:min-h-11 hf:text-red focus-visible:text-red",
        className,
      )}
    >
      <span className="underline decoration-line-strong decoration-1 underline-offset-[5px] group-hf:decoration-red">{children}</span>
      <Icon name="arrow-right" className="size-4 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" strokeWidth={1.8} />
    </Link>
  );
}

/** Tiny caps label (11px, wide tracking). */
export function Caps({ children, className, as: As = "p" }: { children: React.ReactNode; className?: string; as?: "p" | "span" | "dt" | "h3" | "h2" }) {
  return <As className={clsx("text-[11px] font-semibold tracking-[0.16em] uppercase", className)}>{children}</As>;
}

/**
 * Two-week activity strip (oldest first): 14 square hairline cells. Active days are filled ink,
 * today carries a red bar under its cell. Labels in mono underneath.
 */
export function StreakStrip({ days, className, labels = true }: { days: boolean[]; className?: string; labels?: boolean }) {
  const active = days.filter(Boolean).length;
  return (
    <div className={clsx("w-full", className)}>
      <div role="img" aria-label={`Active on ${active} of the last ${days.length} days`} className="grid grid-cols-[repeat(14,minmax(0,1fr))] border-t border-l border-line-strong">
        {days.map((on, i) => {
          const ago = days.length - 1 - i;
          const when = ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`;
          return (
            <span key={i} title={`${when}: ${on ? "learned" : "no learning"}`} className="relative aspect-square border-r border-b border-line-strong">
              {on && <span className={clsx("absolute inset-[3px]", ago === 0 ? "bg-red" : "bg-fg")} />}
              {ago === 0 && !on && <span className="absolute inset-x-[3px] bottom-[3px] h-[2px] bg-red" />}
            </span>
          );
        })}
      </div>
      {labels && (
        <div aria-hidden className="mt-2 flex justify-between font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
          <span>−14d</span>
          <span>−7d</span>
          <span className="text-fg">Today</span>
        </div>
      )}
    </div>
  );
}

/** Small badges never go under 12px on phones (MOBILE_SPEC §1.2: 12px is the floor for text). */
export const BADGE_SM = "max-sm:text-[12px]";

/**
 * Extra classes for StatTile on phones: a little less padding and no decorative icon below
 * 400px, so labels like "Certificates" or "Courses completed" never break mid-word in the
 * two-column grid.
 */
export const TILE_TIGHT = "max-sm:p-4 max-[400px]:[&_span[aria-hidden]]:hidden";
