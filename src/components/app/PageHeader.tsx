import Link from "next/link";
import clsx from "clsx";
import type { Tone } from "@/lib/tone";
import { Icon, type IconName } from "./icons";

/* =============================================================================
   PageHeader, design system v2 (Mobius page head):
     tiny-caps breadcrumb trail  ·  tiny-caps eyebrow with a red marker
     BIG Inter Tight title (one word may be red: <em>)        right-aligned actions
     one-line description (muted)                              meta row (slates, dates)
     ───────────────────────────── hairline rule ─────────────────────────────
     <PageHeader
       eyebrow="Student space"
       title="Saved for later."
       description="The courses you bookmarked while pretending to go to sleep."
       breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Wishlist" }]}
       actions={<Button href="/courses" variant="red">Browse courses</Button>}
     />
   Extras: size="lg" (hero greeting) | "md" (default) | "sm" (sub-pages, detail views);
   display (Anton caps instead of Inter Tight); rule={false} drops the hairline.
   Wrap ONE word of the title in <em> to set it in red (the editorial accent).
   eyebrowTone is accepted for backward compatibility and ignored.

   StatTile: a mono-labelled Anton numeral. StatGrid lays tiles in a hairline grid.
     <StatGrid>
       <StatTile label="Minutes learned" value="425" icon="clock" delta={12} hint="vs last week" />
     </StatGrid>
   Legacy `tone`: dark tones (ink, purple, forest, blue…) give an ink tile, red tones a red
   tile; light tones are ignored (paper). Prefer `variant="ink" | "red"`.
   ============================================================================= */

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  // phones: one 44px back link to the nearest parent crumb instead of the trail (MOBILE_SPEC F-13).
  // Inside the DashboardShell the phone top bar already carries back/area navigation, so the
  // whole breadcrumb row is dropped there on phones.
  const parent = [...items.slice(0, -1)].reverse().find((c) => c.href);
  return (
    <nav aria-label="Breadcrumb" className={clsx("min-w-0 max-sm:[[data-shell]_&]:hidden", className)}>
      {parent && (
        <Link
          href={parent.href!}
          className="tap -ml-1 inline-flex min-h-11 items-center gap-1.5 pr-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase sm:hidden"
        >
          <Icon name="arrow-left" className="size-4" strokeWidth={1.8} />
          {parent.label}
        </Link>
      )}
      <ol className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase", parent && "max-sm:hidden")}>
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-fg/30">
                /
              </span>
            )}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="truncate transition-colors hf:text-fg focus-visible:text-fg">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="truncate text-fg">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Tiny caps eyebrow with the red marker (page heads, sections). */
export function Eyebrow({ children, className, as: As = "p" }: { children: React.ReactNode; className?: string; as?: "p" | "span" | "div" }) {
  return (
    <As className={clsx("flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.16em] text-fg uppercase md:text-[11.5px]", className)}>
      <span aria-hidden className="h-px w-5 shrink-0 bg-red" />
      <span className="min-w-0">{children}</span>
    </As>
  );
}

const TITLE: Record<"sm" | "md" | "lg", string> = {
  sm: "text-[clamp(1.625rem,1.25rem+1.4vw,2.375rem)] leading-[1.02] tracking-[-0.04em]",
  md: "text-[clamp(2rem,1.35rem+2.3vw,3.5rem)] leading-[0.98] tracking-[-0.047em]",
  lg: "text-[clamp(2.375rem,1.4rem+3.6vw,4.75rem)] leading-[0.95] tracking-[-0.052em]",
};
const DISPLAY: Record<"sm" | "md" | "lg", string> = {
  sm: "t-display-s",
  md: "t-display-m",
  lg: "t-display-l",
};

export function PageHeader({
  title,
  eyebrow,
  eyebrowTone: _eyebrowTone,
  description,
  actions,
  breadcrumbs,
  meta,
  size = "md",
  display,
  rule = true,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** legacy, ignored */
  eyebrowTone?: Tone;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** small row under the description (badges, dates) */
  meta?: React.ReactNode;
  /** title scale: lg (home greeting), md (default), sm (detail pages) */
  size?: "sm" | "md" | "lg";
  /** Anton condensed caps instead of Inter Tight */
  display?: boolean;
  /** hairline under the header (default true) */
  rule?: boolean;
  className?: string;
}) {
  void _eyebrowTone;
  return (
    <header className={clsx("mb-7 sm:mb-9 md:mb-11", rule && "border-b border-line pb-6 sm:pb-8 md:pb-9", className)}>
      {(breadcrumbs?.length || eyebrow) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 max-sm:mb-3 md:mb-7">
          {eyebrow ? (
            // phones inside the DashboardShell: the top bar + dock already name the area, so the eyebrow goes
            <span className="contents max-sm:[[data-shell]_&]:hidden">
              <Eyebrow>{eyebrow}</Eyebrow>
            </span>
          ) : (
            <span />
          )}
          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        </div>
      )}
      <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-x-10">
        <div className="min-w-0 lg:flex-[1_1_18rem]">
          <h1
            className={clsx(
              "max-w-[20ch] break-words [&_em]:text-red [&_em]:not-italic",
              display ? DISPLAY[size] : ["font-heading font-semibold", TITLE[size]],
            )}
          >
            {title}
          </h1>
          {description && <p className="t-body-l mt-4 max-w-[54ch] text-muted max-sm:mt-3 max-sm:line-clamp-3 max-sm:text-[15px]">{description}</p>}
          {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {/* Beside the title from lg, up to 60% of the row; they wrap under the title (right-aligned)
            when title + actions don't fit. Phones: labelled actions share the full width; square icon
            buttons and "More" menu triggers keep their natural size. */}
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:[&>*:not([data-icon-only]):not([aria-haspopup])]:flex-[1_1_auto] lg:ml-auto lg:max-w-[60%] lg:shrink-0 lg:justify-end">{actions}</div>}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------------- StatTile */
const DARK = new Set<Tone>(["ink", "purple", "indigo", "forest", "blue", "olive"]);
const REDS = new Set<Tone>(["hotpink", "flame", "tomato", "magenta"]);

export function StatTile({
  label,
  value,
  tone,
  variant,
  icon,
  delta,
  deltaLabel,
  hint,
  href,
  index,
  className,
}: {
  label: string;
  value: React.ReactNode;
  /** legacy tone: dark tones -> ink tile, red tones -> red tile, the rest -> paper */
  tone?: Tone;
  variant?: "paper" | "ink" | "red";
  icon?: IconName;
  /** percent change; positive = up, negative = down (red) */
  delta?: number;
  deltaLabel?: string;
  hint?: React.ReactNode;
  href?: string;
  /** small mono index in the corner ("01") */
  index?: string;
  className?: string;
}) {
  const v = variant ?? (tone && DARK.has(tone) ? "ink" : tone && REDS.has(tone) ? "red" : "paper");
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[11px] leading-[1.35] font-semibold tracking-[0.15em] uppercase opacity-75 [overflow-wrap:normal] text-balance">{label}</span>
        {index ? (
          <span className="shrink-0 font-mono text-[11px] tabular-nums opacity-55" aria-hidden>
            {index}
          </span>
        ) : (
          icon && <Icon name={icon} className="size-4 shrink-0 opacity-55 max-[340px]:hidden" strokeWidth={1.6} />
        )}
      </div>
      <div className="mt-6 t-stat break-words sm:mt-8">{value}</div>
      {(delta !== undefined || hint || deltaLabel) && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] leading-snug">
          {delta !== undefined && (
            <span
              className={clsx(
                "inline-flex items-center gap-1 font-mono text-[12px] font-medium tabular-nums",
                delta < 0 && v === "paper" && "text-red-deep",
                delta < 0 && v === "ink" && "text-red-lite",
              )}
            >
              <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span>
              {Math.abs(delta)}%<span className="sr-only">{delta >= 0 ? " increase" : " decrease"}</span>
            </span>
          )}
          {(hint || deltaLabel) && <span className="opacity-70">{hint ?? deltaLabel}</span>}
        </div>
      )}
    </>
  );
  const cls = clsx(
    "group/stat relative block min-w-0 p-4 sm:p-5 phone-s:p-3.5",
    v === "ink" && "theatre-night",
    v === "red" && "bg-red text-white",
    v === "paper" && "bg-paper text-ink",
    // hairline frame; inside a StatGrid the grid draws the top/left edge, so tiles only draw right/bottom
    "border-r border-b border-ink/[0.11] [:not([data-statgrid])>&]:border-t [:not([data-statgrid])>&]:border-l",
    href && "tap transition-colors duration-200 hf:bg-cream-2",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
      <Icon
        name="arrow-right"
        className="absolute right-4 bottom-4 size-4 opacity-0 transition-[opacity,translate] duration-300 group-hover/stat:translate-x-0.5 group-hover/stat:opacity-60 sm:right-5 sm:bottom-5"
        strokeWidth={1.6}
      />
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Hairline grid for StatTiles: 2 cols, 4 once the CONTENT column is >= 896px (a container
 *  query, so the sidebar at 1024-1279 keeps it at 2 and labels don't wrap). */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("@container", className)}>
      <div data-statgrid="" className="grid grid-cols-2 border-t border-l border-ink/[0.11] @4xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
