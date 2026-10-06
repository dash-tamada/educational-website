import Link from "next/link";
import clsx from "clsx";
import { toneBg, type Tone } from "@/lib/landing-data";
import { Eyebrow } from "@/components/decor/Bits";
import { Icon, type IconName } from "./icons";
import { smallToneText } from "./Display";

/* Secondary text on a tile: 80% where that still clears 4.5:1, full strength on
   mid tones (and white-on-blue, which only passes at 100%). */
const FULL_TEXT: Partial<Record<Tone, true>> = { hotpink: true, flame: true, tomato: true, lilac: true, green: true, blue: true, olive: true, magenta: true };
const mutedOn = (tone: Tone) => (FULL_TEXT[tone] ? "" : "opacity-80");

/* =============================================================================
   PageHeader: breadcrumbs -> eyebrow -> Londrina title (t-display-m) -> one-line
   description, actions on the right (wrap under on mobile).
     <PageHeader
       eyebrow="Student space"
       title="Saved for later."
       description="The courses you bookmarked while pretending to go to sleep."
       breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Wishlist" }]}
       actions={<Button href="/courses" variant="accent">Browse courses</Button>}
     />
   StatTile: colourful flat number tile.
     <StatTile label="Minutes learned" value="425" tone="sun" icon="clock" delta={12} hint="vs last week" />
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
        <Link href={parent.href!} className="tap -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 text-[14px] font-bold text-ink/75 sm:hidden">
          <Icon name="chevron-left" className="size-5" strokeWidth={2.4} />
          {parent.label}
        </Link>
      )}
      <ol className={clsx("flex flex-wrap items-center gap-1 text-[13px] font-semibold text-ink/65", parent && "max-sm:hidden")}>
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <Icon name="chevron-right" className="size-3.5 opacity-60" />}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="truncate rounded-md hf:text-ink focus-visible:text-ink">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="truncate text-ink/80">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  eyebrow,
  eyebrowTone = "blue",
  description,
  actions,
  breadcrumbs,
  meta,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  eyebrowTone?: Tone;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** small row under the description (badges, dates) */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx("mb-5 sm:mb-6 md:mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-4 max-sm:mb-2" />}
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-x-8">
        <div className="min-w-0 lg:flex-[1_1_16rem]">
          {/* phones inside the DashboardShell: the top bar + dock already name the area, so the eyebrow goes */}
          {eyebrow && (
            <span className="contents max-sm:[[data-shell]_&]:hidden">
              <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
            </span>
          )}
          <h1 className={clsx("t-display-m max-w-[22ch] break-words", eyebrow && "mt-eyebrow max-sm:[[data-shell]_&]:mt-0")}>{title}</h1>
          {description && <p className="t-body mt-3 max-w-[52ch] text-ink/70 max-sm:mt-2 max-sm:line-clamp-3">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {/* Beside the title from lg, up to 60% of the row (room for three buttons at 1024 with the
            sidebar open). The title keeps at least 16rem: if title + actions don't fit, the actions
            wrap onto their own line under the title (still right-aligned) instead of squeezing it into a
            one-word column. */}
        {/* phones: the actions share the full width (each grows, wraps when it must) */}
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-[1_1_auto] lg:ml-auto lg:max-w-[60%] lg:shrink-0 lg:justify-end">{actions}</div>}
      </div>
    </header>
  );
}

export function StatTile({
  label,
  value,
  tone = "white",
  icon,
  delta,
  deltaLabel,
  hint,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  icon?: IconName;
  /** percent change; positive = up (green), negative = down (flame) */
  delta?: number;
  deltaLabel?: string;
  hint?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      {/* Phones (2-up tiles ~165px wide at 375): the icon FLOATS top-right, so a label word that
          doesn't fit beside it drops to the next line at the full tile width instead of being cut
          mid-word ("Completio / n"). From sm the icon sits in its own flex column again. Words wrap
          whole (overflow-wrap normal); hyphens-auto is the last resort. */}
      <div className="flow-root sm:flex sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-3">
        {icon && (
          <span
            className={clsx(
              "float-right mb-1 ml-2 grid size-7 shrink-0 place-items-center rounded-full max-[340px]:hidden sm:float-none sm:mb-0 sm:ml-0 sm:size-9",
              tone === "white" ? "bg-cream" : "bg-white/55",
            )}
            aria-hidden
          >
            <Icon name={icon} className="size-4 sm:size-[18px]" strokeWidth={2.2} />
          </span>
        )}
        <span className={clsx("t-label block min-w-0 hyphens-auto [overflow-wrap:normal] sm:flex-1 sm:text-balance sm:[overflow-wrap:break-word] max-sm:text-[14px] max-sm:leading-[1.15]", mutedOn(tone))}>
          {label}
        </span>
      </div>
      <div className="mt-3 t-stat break-words">{value}</div>
      {(delta !== undefined || hint) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold">
          {delta !== undefined && (
            <span
              className={clsx(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                // solid fills + deep text: AA (>= 4.5:1) on every tile tone, white included
                delta >= 0 ? "bg-white text-forest" : "bg-white text-[#a12b00]",
                tone === "white" && (delta >= 0 ? "bg-mint" : "bg-[#ffe1d4]"),
              )}
            >
              <Icon name={delta >= 0 ? "arrow-up" : "arrow-down"} className="size-3" strokeWidth={3} />
              {Math.abs(delta)}%<span className="sr-only">{delta >= 0 ? " increase" : " decrease"}</span>
            </span>
          )}
          {(hint || deltaLabel) && <span className={mutedOn(tone)}>{hint ?? deltaLabel}</span>}
        </div>
      )}
    </>
  );
  const cls = clsx(
    "block min-w-0 rounded-card p-4 sm:p-5 phone-s:p-3.5",
    toneBg[tone],
    smallToneText(tone),
    tone === "white" && "shadow-soft",
    href && "hover-lift tap",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Responsive grid for StatTiles: 2 cols, 4 once the CONTENT column is >= 896px
 *  (a container query, so the sidebar at 1024-1279 keeps it at 2 and labels don't wrap). */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("@container", className)}>
      <div className="grid grid-cols-2 gap-3 md:gap-4 @4xl:grid-cols-4">{children}</div>
    </div>
  );
}
