import clsx from "clsx";
import type { Tone } from "@/lib/tone";

/* =============================================================================
   Badge / StatusPill, design system v2: square-ish slates in mono caps. Meaning is
   carried by the WORD plus a small square marker (never colour alone):
     ■ filled ink   = positive / live      □ hollow ring = pending / waiting
     ■ red          = needs attention      · grey        = neutral / archived
     <Badge tone="mint">New</Badge>
     <Badge tone="red">Bestseller</Badge>            solid red slate (use sparingly)
     <Badge tone="ink" size="sm">Draft</Badge>       solid ink slate
     <StatusPill status="in_review" />               course / order / account / application / payout status
     <DemoPill />                                    "Demo data" slate with the red rec dot
   Tones: the legacy v1 names still work and fold into five editorial looks:
     positive (mint, green, forest)  pending (butter, sun, tangerine, yellow)
     alert (flame, tomato)           solid red (hotpink, red)   solid ink (ink, purple, indigo)
     quiet (neutral, blue, cyan, lilac, blush, white …)
   `variant="text"` drops the frame (a marker + word, for dense tables).
   ============================================================================= */

type Look = "positive" | "pending" | "alert" | "red" | "ink" | "quiet";
const LOOK: Record<string, Look> = {
  neutral: "quiet",
  mint: "positive",
  green: "positive",
  forest: "positive",
  lime: "positive",
  butter: "pending",
  sun: "pending",
  yellow: "pending",
  tangerine: "pending",
  orange: "pending",
  flame: "alert",
  tomato: "alert",
  hotpink: "red",
  red: "red",
  magenta: "red",
  ink: "ink",
  purple: "ink",
  indigo: "ink",
  blue: "quiet",
  cyan: "quiet",
  aqua: "quiet",
  turquoise: "quiet",
  lilac: "quiet",
  blush: "quiet",
  bubblegum: "quiet",
  olive: "quiet",
  white: "quiet",
};

const FRAME: Record<Look, string> = {
  positive: "bg-transparent text-fg ring-1 ring-inset ring-line-strong",
  pending: "bg-cream-2 text-ink ring-1 ring-inset ring-ink/15 on-dark:bg-white/10 on-dark:text-cream on-dark:ring-white/20",
  alert: "bg-transparent text-red-deep ring-1 ring-inset ring-red/45 on-dark:text-red-lite on-dark:ring-red-lite/50",
  red: "bg-red text-white",
  ink: "bg-ink text-cream on-dark:bg-cream on-dark:text-ink",
  quiet: "bg-transparent text-muted ring-1 ring-inset ring-line",
};
const MARK: Record<Look, string> = {
  positive: "bg-current",
  pending: "ring-1 ring-current ring-inset",
  alert: "bg-red on-dark:bg-red-lite",
  red: "bg-white",
  ink: "bg-red",
  quiet: "bg-current opacity-60",
};
const TEXT_ONLY: Record<Look, string> = {
  positive: "text-fg",
  pending: "text-fg",
  alert: "text-red-deep on-dark:text-red-lite",
  red: "text-red-deep on-dark:text-red-lite",
  ink: "text-fg",
  quiet: "text-muted",
};

export type BadgeTone = "neutral" | "red" | Tone;

export function Badge({
  children,
  tone = "neutral",
  dot,
  size = "md",
  variant = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** small square marker before the word */
  dot?: boolean;
  size?: "sm" | "md";
  /** slate (default): framed mono caps; text: marker + word only */
  variant?: "slate" | "text";
  className?: string;
}) {
  const look = LOOK[tone] ?? "quiet";
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[2px] font-mono font-medium whitespace-nowrap uppercase tabular-nums",
        size === "sm" ? "h-[20px] text-[10px] tracking-[0.07em]" : "h-[23px] text-[10.5px] tracking-[0.08em]",
        variant === "text" ? ["px-0", TEXT_ONLY[look]] : [size === "sm" ? "px-1.5" : "px-2", FRAME[look]],
        className,
      )}
    >
      {dot && <span aria-hidden className={clsx("size-[6px] shrink-0", MARK[look])} />}
      {children}
    </span>
  );
}

/** Every status string in the data model -> label + tone. */
export const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  // courses
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "butter" },
  published: { label: "Published", tone: "mint" },
  rejected: { label: "Rejected", tone: "flame" },
  archived: { label: "Archived", tone: "lilac" },
  // orders
  paid: { label: "Paid", tone: "mint" },
  pending: { label: "Pending", tone: "butter" },
  failed: { label: "Failed", tone: "flame" },
  refunded: { label: "Refunded", tone: "lilac" },
  grant: { label: "Admin grant", tone: "blue" },
  // accounts
  active: { label: "Active", tone: "mint" },
  suspended: { label: "Suspended", tone: "flame" },
  // tutor applications
  approved: { label: "Approved", tone: "mint" },
  changes_requested: { label: "Changes requested", tone: "butter" },
  // payouts
  scheduled: { label: "Scheduled", tone: "neutral" },
  processing: { label: "Processing", tone: "butter" },
  on_hold: { label: "On hold", tone: "flame" },
  // reports
  open: { label: "Open", tone: "butter" },
  resolved: { label: "Resolved", tone: "mint" },
  dismissed: { label: "Dismissed", tone: "neutral" },
  // roles
  student: { label: "Student", tone: "neutral" },
  tutor: { label: "Tutor", tone: "cyan" },
  admin: { label: "Admin", tone: "ink" },
  // enrollment sources
  purchase: { label: "Purchase", tone: "mint" },
  admin_grant: { label: "Admin grant", tone: "blue" },
  free: { label: "Free", tone: "neutral" },
};

export function StatusPill({
  status,
  label,
  size,
  variant,
  className,
}: {
  status: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "slate" | "text";
  className?: string;
}) {
  const m = STATUS_META[status] ?? { label: status.replace(/_/g, " "), tone: "neutral" as const };
  return (
    <Badge tone={m.tone} dot size={size} variant={variant} className={className}>
      {label ?? m.label}
    </Badge>
  );
}

/**
 * "Demo data" slate: shells and the catalog show it so sample numbers are never mistaken for real ones.
 *   tone="light" (default) hairline slate for cream / paper surfaces
 *   tone="white" paper slate for tinted panels
 *   tone="dark"  for ink / theatre surfaces
 */
export function DemoPill({ className, tone = "light" }: { className?: string; tone?: "light" | "white" | "dark" }) {
  return (
    <span
      title="Everything here is sample data for the demo: people, numbers, orders and reviews."
      className={clsx(
        "inline-flex h-[23px] shrink-0 items-center gap-1.5 rounded-[2px] px-2 font-mono text-[10.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase",
        tone === "dark" ? "text-cream/80 ring-1 ring-white/20 ring-inset" : tone === "white" ? "bg-paper text-ink ring-1 ring-ink/15 ring-inset" : "text-ink/75 ring-1 ring-ink/20 ring-inset",
        className,
      )}
    >
      <span aria-hidden className="size-[6px] rounded-full bg-red" />
      Demo data
    </span>
  );
}

/**
 * "This list is a sample" line, for order or people lists that share a screen with
 * platform totals (which come from the full sales ledger). Pass the copy from
 * LEDGER_SAMPLE.note / .accountsNote or getLedgerSample(range, db).note.
 *   <SampleNote>{getLedgerSample("all", db).note}</SampleNote>
 */
export function SampleNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={clsx("t-small flex items-start gap-2.5 text-muted", className)}>
      <span aria-hidden className="mt-[7px] h-px w-4 shrink-0 bg-current opacity-60" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
