import clsx from "clsx";
import type { Tone } from "@/lib/tone";

/* =============================================================================
   Card, design system v2: a square paper panel framed by ONE hairline. No radius,
   no soft shadow. Every app page is built from these.
     <Card>…</Card>                                  paper + hairline, p-5 / md:p-7
     <Card variant="plain">…</Card>                  no frame (a section that sits on the canvas)
     <Card variant="ruled">…</Card>                  Mobius section: a strong top rule, no box
     <Card variant="ink">…</Card>                    theatre panel (ink ground, cream text, red accents)
     <Card variant="cream">…</Card>                  flat cream-2 panel (callouts, inline notes)
     <Card padding="none" className="overflow-hidden"><DataTable … /></Card>
     <Card ref={cardRef} tabIndex={-1}>…</Card>      React 19 ref-as-prop (e.g. a focus target)
   Legacy `tone`: dark tones (ink, purple, indigo, forest, blue, green, olive) render the ink
   panel; red tones (hotpink, flame, tomato) the red one; light tones the cream-2 panel; white
   = paper. Prefer `variant` in new work.
   CardHeader: optional tiny-caps eyebrow, Inter Tight title, description, right-side action.
   ============================================================================= */

export type CardVariant = "paper" | "plain" | "ruled" | "ink" | "cream" | "red";

const DARK = new Set<Tone>(["ink", "purple", "indigo", "forest", "blue", "green", "olive"]);
const REDS = new Set<Tone>(["hotpink", "flame", "tomato", "magenta"]);

const SURFACE: Record<CardVariant, string> = {
  paper: "bg-paper border border-ink/[0.11] [--surface:var(--color-paper)]",
  plain: "",
  ruled: "border-t border-fg",
  ink: "theatre-night border border-white/[0.06]",
  cream: "ground-cream-2",
  red: "bg-red text-white [--fg:#fff] [--muted:rgb(255_255_255/0.8)] [--line:rgb(255_255_255/0.28)] [--line-strong:rgb(255_255_255/0.5)] [--surface:var(--color-red)]",
};

export function cardVariantFor(tone?: Tone, variant?: CardVariant): CardVariant {
  if (variant) return variant;
  if (!tone || tone === "white") return "paper";
  if (DARK.has(tone)) return "ink";
  if (REDS.has(tone)) return "red";
  return "cream";
}

export function Card({
  children,
  tone,
  variant,
  padding = "md",
  as: As = "div",
  className,
  ref,
  ...rest
}: {
  children: React.ReactNode;
  /** legacy tone (see header); prefer `variant` */
  tone?: Tone;
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article" | "aside" | "li";
  className?: string;
  /** forwarded to the root element (React 19: ref is a plain prop) */
  ref?: React.Ref<HTMLElement>;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  /* One concrete tag type for TS: the union of intrinsic elements makes ref types intersect. */
  const Tag = As as "div";
  const v = cardVariantFor(tone, variant);
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      data-card={v}
      className={clsx(
        "relative min-w-0 rounded-none",
        SURFACE[v],
        v === "ruled" || v === "plain"
          ? padding === "none"
            ? ""
            : padding === "sm"
              ? "py-4"
              : padding === "lg"
                ? "py-7 md:py-9"
                : "py-5 md:py-6"
          : [
              padding === "sm" && "p-4",
              padding === "md" && "p-5 md:p-7",
              padding === "lg" && "p-6 md:p-9",
            ],
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
  eyebrow,
  as: H = "h2",
  id,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** tiny caps line above the title ("This week", "01 / Revenue") */
  eyebrow?: React.ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  /* The action shares the TITLE row (the title shrinks and wraps first, from a 7rem floor);
     the description always runs full width underneath. So a small "All ->" link never drops
     under the description on narrow cards; only a genuinely wide action (a Segmented range
     picker) wraps, and then it sits flush left under the title. */
  return (
    <div className={clsx("mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 md:mb-6", className)}>
      <div className="min-w-0 grow basis-28 self-center">
        {eyebrow && <p className="t-label mb-2.5 text-muted">{eyebrow}</p>}
        <H id={id} className={H === "h2" ? "t-app-h2" : "t-app-h3"}>
          {title}
        </H>
      </div>
      {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
      {description && (
        <div className="-mt-0.5 basis-full">
          <p className="t-small max-w-[60ch] text-muted">{description}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Mobius split section: a strong top rule, a left label column (mono index + tiny caps
 * label + optional note) and the content on the right. Stacks on phones/tablets; splits
 * 3/9 from lg. Use it to give dashboards and settings pages the editorial rhythm instead
 * of a grid of boxes.
 *   <Section index="02" label="Revenue" note="Gross, GST incl." title="Last 30 days" action={<Segmented … />}>
 *     <LineChart … />
 *   </Section>
 */
export function Section({
  label,
  index,
  note,
  title,
  action,
  children,
  id,
  as: As = "section",
  className,
}: {
  label: React.ReactNode;
  /** small mono index before the label ("01") */
  index?: string;
  /** short muted line under the label */
  note?: React.ReactNode;
  /** optional Inter Tight title at the top of the content column */
  title?: React.ReactNode;
  /** right side of the title row */
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  as?: "section" | "div";
  className?: string;
}) {
  const Tag = As as "section";
  return (
    <Tag id={id} className={clsx("grid gap-x-8 gap-y-5 border-t border-fg pt-5 md:pt-6 lg:grid-cols-12", className)}>
      <div className="lg:col-span-3">
        <p className="flex items-baseline gap-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
          {index && <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-red-deep on-dark:text-red-lite">{index}</span>}
          <span>{label}</span>
        </p>
        {note && <p className="t-small mt-2.5 max-w-[30ch] text-muted">{note}</p>}
      </div>
      <div className="min-w-0 lg:col-span-9">
        {(title || action) && (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            {title && <h2 className="t-app-h2 min-w-0 grow basis-40">{title}</h2>}
            {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </Tag>
  );
}

/** Label / value rows (order details, course meta): hairline rows, tiny-caps labels. */
export function DescriptionList({ items, className }: { items: { label: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={clsx("divide-y divide-line", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{it.label}</dt>
          <dd className="t-small min-w-0 text-right font-medium [overflow-wrap:anywhere]">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
