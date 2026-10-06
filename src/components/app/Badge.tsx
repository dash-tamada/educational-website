import clsx from "clsx";
import type { Tone } from "@/lib/landing-data";

/* =============================================================================
   Badge / StatusPill. Flat pills; colour + a dot + text (never colour alone).
     <Badge tone="mint">New</Badge>
     <StatusPill status="in_review" />          course / order / account / application / payout status
     <DemoPill />                                "Demo data" indicator (shells, catalog)
   ============================================================================= */

const BADGE: Partial<Record<Tone, string>> & Record<"neutral", string> = {
  neutral: "bg-ink/[0.07] text-ink/75",
  mint: "bg-mint text-forest",
  butter: "bg-butter text-[#6b5400]",
  sun: "bg-sun text-ink",
  blush: "bg-blush text-[#8a0d55]",
  cyan: "bg-cyan text-[#0b5d5e]",
  lilac: "bg-[#e7e0fb] text-indigo",
  flame: "bg-[#ffe1d4] text-[#b02f00]",
  blue: "bg-[#dfe8ff] text-[#1a4cc0]",
  green: "bg-green text-ink",
  hotpink: "bg-hotpink-deep text-white",
  purple: "bg-purple text-white",
  ink: "bg-ink text-cream",
  white: "bg-white text-ink",
};
const DOT: Record<string, string> = {
  neutral: "bg-ink/40",
  mint: "bg-green",
  butter: "bg-tangerine",
  sun: "bg-ink",
  blush: "bg-hotpink",
  cyan: "bg-turquoise",
  lilac: "bg-indigo",
  flame: "bg-flame",
  blue: "bg-blue",
  green: "bg-ink",
  hotpink: "bg-white",
  purple: "bg-white",
  ink: "bg-sun",
  white: "bg-ink/50",
};

export type BadgeTone = keyof typeof BADGE;

export function Badge({
  children,
  tone = "neutral",
  dot,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold whitespace-nowrap",
        size === "sm" ? "h-[22px] px-2 text-[11.5px]" : "h-[26px] px-2.5 text-[12.5px]",
        BADGE[tone] ?? BADGE.neutral,
        className,
      )}
    >
      {dot && <span aria-hidden className={clsx("size-1.5 rounded-full", DOT[tone] ?? DOT.neutral)} />}
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
  changes_requested: { label: "Changes requested", tone: "blue" },
  // payouts
  scheduled: { label: "Scheduled", tone: "neutral" },
  processing: { label: "Processing", tone: "butter" },
  on_hold: { label: "On hold", tone: "flame" },
  // reports
  open: { label: "Open", tone: "butter" },
  resolved: { label: "Resolved", tone: "mint" },
  dismissed: { label: "Dismissed", tone: "neutral" },
  // roles
  student: { label: "Student", tone: "blush" },
  tutor: { label: "Tutor", tone: "cyan" },
  admin: { label: "Admin", tone: "lilac" },
  // enrollment sources
  purchase: { label: "Purchase", tone: "mint" },
  admin_grant: { label: "Admin grant", tone: "blue" },
  free: { label: "Free", tone: "neutral" },
};

export function StatusPill({ status, label, size, className }: { status: string; label?: string; size?: "sm" | "md"; className?: string }) {
  const m = STATUS_META[status] ?? { label: status.replace(/_/g, " "), tone: "neutral" as const };
  return (
    <Badge tone={m.tone} dot size={size} className={className}>
      {label ?? m.label}
    </Badge>
  );
}

/**
 * "Demo data" indicator: shells and the catalog show it so sample numbers are never mistaken for real ones.
 *   tone="light" (default) butter pill for white/cream surfaces
 *   tone="white" white pill for butter, sun, lime and other yellow panels (where butter disappears)
 *   tone="dark"  translucent pill for ink and other dark panels
 */
export function DemoPill({ className, tone = "light" }: { className?: string; tone?: "light" | "white" | "dark" }) {
  return (
    <span
      title="Everything here is sample data for the demo: people, numbers, orders and reviews."
      className={clsx(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap",
        tone === "dark" ? "bg-white/15 text-white" : tone === "white" ? "bg-white text-[#6b5400] shadow-soft" : "bg-butter text-[#6b5400]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M9 3.5h6M10 3.5v5.2L4.8 18a1.8 1.8 0 0 0 1.6 2.5h11.2a1.8 1.8 0 0 0 1.6-2.5L14 8.7V3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 14.5h9" strokeLinecap="round" />
      </svg>
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
    <p className={clsx("t-small flex items-start gap-2 text-ink/65", className)}>
      <svg viewBox="0 0 24 24" className="mt-[3px] size-4 shrink-0 text-ink/45" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.6v.4" strokeLinecap="round" />
      </svg>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
