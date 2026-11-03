"use client";

import Link from "next/link";
import { forwardRef } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";

/* =============================================================================
   App buttons, design system v2 ("cinematic editorial"): square rectangles with a
   tiny-caps label (Marlowe "TALK TO ME"), hairlines instead of shadows, one red.

     <Button>Save</Button>                                   ink (primary)
     <Button variant="red" icon="plus">New course</Button>    THE red CTA (alias: "accent")
     <Button variant="outline" size="sm">Cancel</Button>      hairline outline ("secondary" = the same on a paper fill)
     <Button variant="ghost" icon="edit" iconOnly aria-label="Edit" />
     <Button variant="arrow" href="/courses">All courses</Button>   Mobius text link "All courses ->"
     <Button variant="danger" loading>Deleting…</Button>
     <Button variant="cream">On ink</Button>                 cream block for dark (.theatre) grounds
     <Button href="/tutor/courses/new">Create</Button>       renders next/link

   Variants
     primary | ink      ink block, cream label            (the default)
     accent  | red      red block, white label            one per view: the main action
     outline            transparent + 1px line-strong (context tokens); fills with the text colour on hover
     secondary          the outline frame on a paper fill (reads on tinted / red panels too); fills ink on hover
     ghost              no frame; label turns red on hover (toolbar / icon buttons)
     arrow              no frame, sentence case 15px + arrow that nudges right (text-arrow link)
     danger             red-deep block (destructive confirm)
     cream              cream block (on ink / theatre surfaces)
     success | sun | blue  legacy names: ink / sand / ink
   Sizes: sm 36px (44 on touch), md 44px, lg 52px. iconOnly = square.
   `caps={false}` keeps the label in sentence case (long labels in dense tools).
   ============================================================================= */

export type ButtonVariant =
  | "primary"
  | "ink"
  | "accent"
  | "red"
  | "secondary"
  | "outline"
  | "ghost"
  | "arrow"
  | "danger"
  | "cream"
  | "success"
  | "sun"
  | "blue";
export type ButtonSize = "sm" | "md" | "lg";

const INK = "bg-ink text-cream hf:bg-graphite on-dark:bg-cream on-dark:text-ink on-dark:hf:bg-white";
const RED = "bg-red text-white hf:bg-red-deep";
/* outline: transparent, follows the ground's context tokens (fg / line-strong / surface) */
const OUTLINE = "bg-transparent text-fg ring-1 ring-inset ring-line-strong hf:bg-fg hf:text-surface hf:ring-fg";
/* secondary: the same hairline frame on a PAPER fill, so it still reads on tinted / red panels
   (on cream it is indistinguishable from outline); on dark grounds it turns transparent */
const SECONDARY =
  "bg-paper text-ink ring-1 ring-inset ring-ink/25 hf:bg-ink hf:text-cream hf:ring-ink on-dark:bg-transparent on-dark:text-cream on-dark:ring-white/35 on-dark:hf:bg-cream on-dark:hf:text-ink on-dark:hf:ring-cream";

const VARIANT: Record<ButtonVariant, string> = {
  primary: INK,
  ink: INK,
  success: INK,
  blue: INK,
  accent: RED,
  red: RED,
  secondary: SECONDARY,
  outline: OUTLINE,
  ghost: "bg-transparent text-fg hf:text-red on-dark:hf:text-red-lite",
  arrow: "bg-transparent text-fg hf:text-red on-dark:hf:text-red-lite",
  danger: "bg-red-deep text-white hf:bg-[#8f0011]",
  cream: "bg-cream text-ink hf:bg-white",
  sun: "bg-sand text-ink hf:bg-stone",
};
/* Touch screens (coarse pointer): sm grows to the 44px minimum target (MOBILE_SPEC §1.4). */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 gap-2 px-3.5 coarse:h-11",
  md: "h-11 gap-2.5 px-5",
  lg: "h-[52px] gap-3 px-7",
};
const CAPS: Record<ButtonSize, string> = {
  sm: "text-[11px] tracking-[0.13em] uppercase",
  md: "text-[11.5px] tracking-[0.14em] uppercase",
  lg: "text-[12.5px] tracking-[0.15em] uppercase",
};
const SENTENCE: Record<ButtonSize, string> = {
  sm: "text-[13.5px] tracking-[-0.005em]",
  md: "text-[14.5px] tracking-[-0.01em]",
  lg: "text-[16px] tracking-[-0.015em]",
};
const ICON_ONLY: Record<ButtonSize, string> = { sm: "size-9 coarse:size-11", md: "size-11", lg: "size-[52px]" };
const ICON_SIZE: Record<ButtonSize, string> = { sm: "size-4", md: "size-[17px]", lg: "size-[19px]" };

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  /** square icon button; pass aria-label */
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** tiny-caps label (default true; the arrow variant is always sentence case) */
  caps?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  iconOnly,
  fullWidth,
  caps = true,
  className,
}: Pick<Common, "variant" | "size" | "iconOnly" | "fullWidth" | "caps" | "className">) {
  const arrow = variant === "arrow";
  return clsx(
    "group/btn tap relative inline-flex shrink-0 items-center justify-center rounded-none leading-none whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,scale,opacity] duration-200 ease-ui",
    "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    VARIANT[variant],
    arrow
      ? clsx("h-auto min-h-11 gap-2.5 px-0 font-medium sm:min-h-0", size === "lg" ? "text-[17px]" : size === "sm" ? "text-[14px]" : "text-[15px]", "tracking-[-0.01em]")
      : [iconOnly ? ICON_ONLY[size] : SIZE[size], "font-semibold", !iconOnly && (caps ? CAPS[size] : SENTENCE[size])],
    fullWidth && "w-full",
    className,
  );
}

function Inner({ icon, iconRight, loading, size = "md", children, iconOnly, variant }: Common) {
  const arrow = variant === "arrow";
  return (
    <>
      {loading ? (
        <svg viewBox="0 0 24 24" className={clsx(ICON_SIZE[size], "animate-spin")} aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        icon && <Icon name={icon} className={ICON_SIZE[size]} strokeWidth={1.8} />
      )}
      {!iconOnly && children}
      {(iconRight || arrow) && !iconOnly && (
        <Icon
          name={iconRight ?? "arrow-right"}
          className={clsx(ICON_SIZE[size], "transition-[translate] duration-500 ease-expo motion-ok:group-hover/btn:translate-x-1")}
          strokeWidth={1.8}
        />
      )}
    </>
  );
}

export type ButtonProps = Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };
export type ButtonLinkProps = Common &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> & {
    href: string;
    /** next/link prefetch */
    prefetch?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps | ButtonLinkProps>(function Button(props, ref) {
  const { variant, size = "md", icon, iconRight, iconOnly, loading, fullWidth, caps, className, children, ...rest } = props;
  const cls = buttonClass({ variant, size, iconOnly, fullWidth, caps, className });
  const inner = <Inner {...{ icon, iconRight, loading, size, children, iconOnly, variant }} />;
  // marks square icon buttons so layouts can keep them natural width (PageHeader phone actions)
  const io = iconOnly ? { "data-icon-only": "" } : {};
  if ("href" in rest && rest.href !== undefined) {
    const { href, prefetch, ...a } = rest as ButtonLinkProps;
    const external = /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href);
    if (external)
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} {...io} {...a} target={a.target ?? (href.startsWith("http") ? "_blank" : undefined)} rel="noreferrer">
          {inner}
        </a>
      );
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} prefetch={prefetch} className={cls} {...io} {...a}>
        {inner}
      </Link>
    );
  }
  const b = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  /* While loading the button stays focusable (aria-disabled, not the disabled attribute), so keyboard
     focus doesn't drop to <body> mid-action; clicks and Enter/Space are swallowed instead. */
  const busy = !!loading && !b.disabled;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={b.type ?? "button"}
      className={cls}
      aria-busy={loading || undefined}
      {...io}
      {...b}
      aria-disabled={busy ? true : b["aria-disabled"]}
      disabled={b.disabled}
      onClick={
        busy
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : b.onClick
      }
    >
      {inner}
    </button>
  );
});
