import clsx from "clsx";

/* =============================================================================
   Ledger kit: local pieces for the admin money / catalogue / moderation pages
   (Orders, Payments, Payouts, Coupons, Categories, Reports, Settings).

   WideSection: the kit <Section> head (strong top rule, mono index + tiny caps label
   + note on the left, Inter Tight title + action on the right) but its CONTENT runs the
   full width underneath. Use it for awards tables and long ruled lists that need every
   column (the kit Section squeezes content into 9 of 12 columns from lg).
     <WideSection index="03" label="Ledger" note="Sample of 120 orders" title="All orders" action={…}>
       <DataTable … />
     </WideSection>
   ============================================================================= */

export function WideSection({
  index,
  label,
  note,
  title,
  action,
  children,
  id,
  className,
  bodyClassName,
}: {
  index?: string;
  label: React.ReactNode;
  note?: React.ReactNode;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={clsx("border-t border-fg pt-5 md:pt-6", className)}>
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="flex items-baseline gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
            {index && <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-red-deep on-dark:text-red-lite">{index}</span>}
            <span>{label}</span>
          </p>
          {note && <div className="t-small mt-2.5 max-w-[34ch] text-muted">{note}</div>}
        </div>
        {(title || action) && (
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 lg:col-span-9">
            {title && (
              <h2 id={headingId} className="t-app-h2 min-w-0 grow basis-40">
                {title}
              </h2>
            )}
            {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
          </div>
        )}
      </div>
      <div className={clsx("mt-7 md:mt-9", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A tiny-caps sub-heading inside drawers and panels ("Payment", "Refund"). */
export function PanelLabel({ children, className, as: As = "h3" }: { children: React.ReactNode; className?: string; as?: "h3" | "h4" | "p" }) {
  return <As className={clsx("mb-3 text-[11px] leading-[1.35] font-semibold tracking-[0.14em] text-muted uppercase", className)}>{children}</As>;
}

/** A coupon code as a square mono slate (hairline frame). */
export function CodeSlate({ code, className }: { code: string; className?: string }) {
  return (
    <span className={clsx("inline-flex h-[26px] items-center px-2 font-mono text-[13px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ring-1 ring-line-strong ring-inset", className)}>
      {code}
    </span>
  );
}
