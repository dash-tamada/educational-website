import clsx from "clsx";
import { toneBg, toneText, type Tone } from "@/lib/landing-data";

/* =============================================================================
   Card: the white (or colour) rounded block every app page is built from.
     <Card>…</Card>                                  white, p-5/md:p-6, rounded-card, shadow-soft
     <Card tone="butter" padding="lg">…</Card>       flat colour card (no shadow)
     <Card padding="none" className="overflow-hidden"><DataTable … /></Card>
     <Card ref={cardRef} tabIndex={-1}>…</Card>      React 19 ref-as-prop (e.g. a focus target)
   CardHeader: title (t-app-h2) + optional description + right-side action.
   ============================================================================= */

export function Card({
  children,
  tone = "white",
  padding = "md",
  as: As = "div",
  className,
  ref,
  ...rest
}: {
  children: React.ReactNode;
  tone?: Tone;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article" | "aside" | "li";
  className?: string;
  /** forwarded to the root element (React 19: ref is a plain prop) */
  ref?: React.Ref<HTMLElement>;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  /* One concrete tag type for TS: the union of intrinsic elements makes ref types intersect. */
  const Tag = As as "div";
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={clsx(
        "relative min-w-0 rounded-card",
        toneBg[tone],
        toneText[tone],
        tone === "white" && "shadow-soft",
        padding === "sm" && "p-4",
        padding === "md" && "p-5 md:p-6",
        padding === "lg" && "p-6 md:p-8",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  as: H = "h2",
  id,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  /* The action shares the TITLE row (the title shrinks and wraps first, from a 7rem floor);
     the description always runs full width underneath. So a small "All →" link never drops
     under the description on narrow cards; only a genuinely wide action (a Segmented range
     picker) wraps, and then it sits flush left under the title. */
  return (
    <div className={clsx("mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 md:mb-5", className)}>
      <H id={id} className={clsx("min-w-0 grow basis-28 self-center", H === "h2" ? "t-app-h2" : "t-app-h3")}>
        {title}
      </H>
      {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
      {description && <p className="t-small -mt-0.5 basis-full opacity-70">{description}</p>}
    </div>
  );
}

/** Label / value rows (order details, course meta). */
export function DescriptionList({ items, className }: { items: { label: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={clsx("divide-y divide-ink/[0.07]", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="t-small text-ink/60">{it.label}</dt>
          <dd className="t-small text-right font-semibold">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
