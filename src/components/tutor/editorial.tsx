"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { cropSrc } from "@/lib/img";
import type { Tone } from "@/lib/tone";
import { Icon, type IconName } from "@/components/app";

/* =============================================================================
   Studio editorial primitives (tutor studio + admin control room), design system v2.
   Small local pieces the app kit doesn't ship, so every studio/admin page speaks
   the same Mobius x Marlowe language:
     <Idx n={1} />                    mono "01" index in red (lists, steps, modules)
     <Poster src={c.thumbnail} />     square-cornered still on charcoal (no tone fills)
     <RuledList> <RuledRow …/> </RuledList>   ink top rule + hairline rows
     <RuleNote tone="red" label="Note from the review team">…</RuleNote>   ruled callout
     <SquareTick state="done" />  <CheckRow state="todo">…</CheckRow>      square ticks
     <LineIcon name="chat" />         plain 1.5px line icon (never in a coloured circle)
     <Figure label="You keep" value="₹699" strong />   tiny-caps label + Inter Tight value
     <MonoMeta>12:40 · 3 tests</MonoMeta>             mono caps meta line
     <TonePalette value onChange />   editorial palette picker: ink / charcoal / red / cream / sand
   Admin pages import these from "@/components/tutor/editorial" too.
   ============================================================================= */

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Mono index ("01") in red-deep (red-lite on ink). */
export function Idx({ n, className, muted }: { n: number | string; className?: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "shrink-0 font-mono text-[11px] leading-none font-medium tracking-[0.04em] tabular-nums",
        muted ? "text-muted" : "text-red-deep on-dark:text-red-lite",
        className,
      )}
    >
      {typeof n === "number" ? pad2(n) : n}
    </span>
  );
}

/** Mono caps meta line (durations, counts, dates). */
export function MonoMeta({ children, className, as: As = "p" }: { children: React.ReactNode; className?: string; as?: "p" | "span" }) {
  return <As className={clsx("font-mono text-[11px] leading-[1.5] tracking-[0.06em] text-muted uppercase tabular-nums", className)}>{children}</As>;
}

/** A square-cornered still on charcoal. `ratio` = width / height of the crop (default 1 = square). */
export function Poster({
  src,
  alt = "",
  ratio = 1,
  className,
  sizes = "120px",
  eager,
  children,
}: {
  src: string;
  alt?: string;
  ratio?: number;
  className?: string;
  sizes?: string;
  eager?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={clsx("relative block shrink-0 overflow-hidden bg-charcoal", className)}>
      {src && <Image src={cropSrc(src, 1 / ratio)} alt={alt} fill sizes={sizes} loading={eager ? "eager" : undefined} className="object-cover" />}
      {children}
    </span>
  );
}

/** Plain line icon: no circle, no fill. */
export function LineIcon({ name, className, tone }: { name: IconName; className?: string; tone?: "red" | "muted" }) {
  return (
    <Icon
      name={name}
      strokeWidth={1.5}
      className={clsx("size-[18px]", tone === "red" ? "text-red-deep on-dark:text-red-lite" : tone === "muted" ? "text-muted" : "text-fg", className)}
    />
  );
}

/** Ruled list: a strong top rule, hairline rows. */
export function RuledList({
  children,
  className,
  as: As = "ul",
  strong = true,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "ul" | "ol" | "div";
  /** ink top rule (default) or a hairline */
  strong?: boolean;
  label?: string;
}) {
  return (
    <As aria-label={label} className={clsx("divide-y divide-line border-b border-line", strong ? "border-t border-t-fg" : "border-t", className)}>
      {children}
    </As>
  );
}

/**
 * One ruled row: [index] [lead] [title + meta] [trailing] [→]. Pass `href` to make the whole
 * row one link (the title carries it, stretched over the row); other controls go in `trailing`
 * and sit above the stretch with `relative z-[1]`.
 */
export function RuledRow({
  index,
  lead,
  title,
  meta,
  trailing,
  href,
  arrow,
  className,
  titleClassName,
  as: As = "li",
  children,
}: {
  index?: number | string;
  lead?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  /** show a trailing arrow (defaults to true for links) */
  arrow?: boolean;
  className?: string;
  titleClassName?: string;
  as?: "li" | "div";
  children?: React.ReactNode;
}) {
  const showArrow = arrow ?? !!href;
  return (
    <As className={clsx("group/row relative flex items-start gap-4 py-4 md:gap-5 md:py-5", href && "transition-colors hf:bg-cream-2/60", className)}>
      {index !== undefined && <Idx n={index} className="mt-[5px] w-5" />}
      {lead}
      <div className="min-w-0 flex-1">
        <p className={clsx("t-app-h3 min-w-0 [overflow-wrap:anywhere]", titleClassName)}>
          {href ? (
            <Link
              href={href}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-red"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
        {meta && <div className="t-small mt-1 text-muted">{meta}</div>}
        {children}
      </div>
      {trailing && <div className="relative z-[1] flex shrink-0 items-center gap-3 self-center">{trailing}</div>}
      {showArrow && (
        <Icon
          name="arrow-right"
          strokeWidth={1.6}
          className="size-4 shrink-0 self-center text-muted transition-[translate,color] duration-300 ease-expo group-hover/row:text-fg motion-ok:group-hover/row:translate-x-1"
        />
      )}
    </As>
  );
}

/** Ruled callout: a 2px rule on the left (red = needs attention), tiny caps label, body. */
export function RuleNote({
  tone = "ink",
  label,
  icon,
  children,
  action,
  className,
  role,
}: {
  tone?: "ink" | "red" | "quiet";
  label?: React.ReactNode;
  icon?: IconName;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: string;
}) {
  return (
    <div
      role={role}
      className={clsx(
        "border-l-2 bg-cream-2/70 py-3.5 pr-4 pl-4 on-dark:bg-white/[0.04]",
        tone === "red" ? "border-red" : tone === "quiet" ? "border-line-strong" : "border-fg",
        className,
      )}
    >
      {label && (
        <p className={clsx("flex items-center gap-2 text-[11px] leading-[1.35] font-semibold tracking-[0.14em] uppercase", tone === "red" ? "text-red-deep on-dark:text-red-lite" : "text-fg")}>
          {icon && <Icon name={icon} strokeWidth={1.6} className="size-3.5" />}
          {label}
        </p>
      )}
      {children && <div className={clsx("t-small text-fg/80 [overflow-wrap:anywhere]", label && "mt-1.5")}>{children}</div>}
      {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export type TickState = "done" | "todo" | "fail" | "warn";

/** Square tick: filled ink + check (done), hollow (todo), red + x (fail), red ring + ! (warn). */
export function SquareTick({ state, className }: { state: TickState; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid size-[18px] shrink-0 place-items-center",
        state === "done" && "bg-fg text-surface",
        state === "todo" && "ring-1 ring-line-strong ring-inset",
        state === "fail" && "bg-red text-white",
        state === "warn" && "text-red-deep ring-1 ring-red/60 ring-inset on-dark:text-red-lite",
        className,
      )}
    >
      {state === "done" && <Icon name="check" strokeWidth={2.6} className="size-3" />}
      {state === "fail" && <Icon name="x" strokeWidth={2.6} className="size-3" />}
      {state === "warn" && <span className="font-mono text-[11px] leading-none font-semibold">!</span>}
    </span>
  );
}

/** A checklist line with a square tick. `sr` = the state word for screen readers. */
export function CheckRow({
  state,
  children,
  hint,
  action,
  className,
  as: As = "li",
}: {
  state: TickState;
  children: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: "li" | "div";
}) {
  const sr = state === "done" ? "Done: " : state === "fail" ? "Failing: " : state === "warn" ? "Check: " : "To do: ";
  return (
    <As className={clsx("flex items-start gap-3 py-2.5", className)}>
      <SquareTick state={state} className="mt-[1px]" />
      <div className="min-w-0 flex-1">
        <p className={clsx("text-[14px] leading-snug", state === "done" ? "text-muted" : "font-medium text-fg")}>
          <span className="sr-only">{sr}</span>
          {children}
        </p>
        {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
        {action && <div className="mt-1.5">{action}</div>}
      </div>
    </As>
  );
}

/** Tiny caps label over an Inter Tight value (money breakdowns, key facts). */
export function Figure({ label, value, strong, hint, className }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <p className="text-[11px] leading-[1.35] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className={clsx("mt-2 font-heading leading-none font-semibold tracking-[-0.035em] tabular-nums", strong ? "text-[30px] md:text-[34px]" : "text-[22px] md:text-[24px]")}>{value}</p>
      {hint && <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------------------- palette */

/** The editorial card / category palette. Values stay legacy Tone names so stored data
 *  keeps working (globals.css aliases them onto the v2 palette). */
export const EDITORIAL_TONES: { value: Tone; label: string; swatch: string; dark: boolean }[] = [
  { value: "ink", label: "Ink", swatch: "bg-ink", dark: true },
  { value: "indigo", label: "Charcoal", swatch: "bg-charcoal", dark: true },
  { value: "hotpink", label: "Red", swatch: "bg-red", dark: true },
  { value: "butter", label: "Cream", swatch: "bg-cream-2", dark: false },
  { value: "sun", label: "Sand", swatch: "bg-sand", dark: false },
];

const NEAREST: Partial<Record<Tone, Tone>> = {
  ink: "ink",
  purple: "ink",
  indigo: "indigo",
  blue: "indigo",
  forest: "indigo",
  green: "indigo",
  olive: "indigo",
  hotpink: "hotpink",
  flame: "hotpink",
  tomato: "hotpink",
  butter: "butter",
  mint: "butter",
  blush: "butter",
  lime: "butter",
  white: "butter",
  cyan: "butter",
};

/** Any stored tone -> the nearest of the five editorial swatches (for display + selection). */
export function editorialTone(t: Tone | undefined | null): Tone {
  if (!t) return "sun";
  return NEAREST[t] ?? "sun";
}

/** Fill + text classes for a tone on the editorial palette (category chips, card fills). */
export function toneSurface(t: Tone | undefined | null) {
  const e = EDITORIAL_TONES.find((x) => x.value === editorialTone(t))!;
  return clsx(e.swatch, e.value === "hotpink" ? "text-white" : e.dark ? "text-cream" : "text-ink");
}

/** Editorial palette picker (radio group of square swatches). */
export function TonePalette({
  value,
  onChange,
  legend = "Colour",
  hint,
  name = "tone",
  className,
}: {
  value: Tone;
  onChange: (t: Tone) => void;
  legend?: React.ReactNode;
  hint?: React.ReactNode;
  name?: string;
  className?: string;
}) {
  const current = editorialTone(value);
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase">{legend}</legend>
      {hint && <p className="-mt-1 mb-3 text-[12.5px] leading-snug text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-3">
        {EDITORIAL_TONES.map((t) => {
          const on = current === t.value;
          return (
            <label key={t.value} className="group relative flex cursor-pointer flex-col items-center gap-1.5">
              <input type="radio" name={name} value={t.value} checked={on} onChange={() => onChange(t.value)} className="peer sr-only" />
              <span
                className={clsx(
                  "grid size-11 place-items-center transition-[box-shadow] duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red",
                  t.swatch,
                  on ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : "ring-1 ring-line ring-inset group-hf:ring-line-strong",
                )}
              >
                {on && <Icon name="check" strokeWidth={2.4} className={clsx("size-4", t.dark ? "text-cream" : "text-ink")} />}
              </span>
              <span className={clsx("font-mono text-[10px] tracking-[0.08em] uppercase", on ? "text-fg" : "text-muted")}>{t.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
