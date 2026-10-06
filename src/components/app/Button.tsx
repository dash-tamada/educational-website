"use client";

import Link from "next/link";
import { forwardRef } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";

/* =============================================================================
   App buttons: flat pills in the landing's language (no borders, soft shadow on
   white). For marketing CTAs keep using <ArrowButton> from decor/Bits.
     <Button>Save</Button>                                  primary (ink)
     <Button variant="accent" icon="plus">New course</Button> hot pink
     <Button variant="secondary" size="sm">Cancel</Button>   white + hairline ring
     <Button variant="ghost" icon="edit" iconOnly aria-label="Edit" />
     <Button variant="danger" loading>Deleting…</Button>
     <Button href="/tutor/courses/new">Create</Button>      renders next/link
   ============================================================================= */

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "success" | "sun" | "blue";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ink text-cream hf:bg-ink/85",
  accent: "bg-hotpink-deep text-white hf:bg-[#b8005e]",
  /* hairline ring (same as inputs) so it still reads as a button on white cards */
  secondary: "bg-white text-ink shadow-soft ring-1 ring-inset ring-ink/[0.12] hf:bg-butter hf:ring-ink/20",
  ghost: "bg-transparent text-ink hf:bg-ink/[0.06]",
  danger: "bg-flame-deep text-white hf:bg-[#a82d00]",
  success: "bg-green text-ink hf:bg-[#00c95a]",
  sun: "bg-sun text-ink hf:bg-[#ffc414]",
  blue: "bg-blue text-white hf:bg-[#1c55e0]",
};
/* Touch screens (coarse pointer): sm grows to the 44px minimum target (MOBILE_SPEC §1.4). */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[14px] coarse:h-11",
  md: "h-11 gap-2 px-5 text-[15px]",
  lg: "h-[52px] gap-2 px-6 text-[16px]",
};
const ICON_ONLY: Record<ButtonSize, string> = { sm: "size-9 coarse:size-11", md: "size-11", lg: "size-[52px]" };
const ICON_SIZE: Record<ButtonSize, string> = { sm: "size-4", md: "size-[18px]", lg: "size-5" };

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  /** square/round icon button; pass aria-label */
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  iconOnly,
  fullWidth,
  className,
}: Pick<Common, "variant" | "size" | "iconOnly" | "fullWidth" | "className">) {
  return clsx(
    "tap relative inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none tracking-[-0.01em] whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,scale,opacity] duration-200 ease-ui",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    VARIANT[variant],
    iconOnly ? ICON_ONLY[size] : SIZE[size],
    fullWidth && "w-full",
    className,
  );
}

function Inner({ icon, iconRight, loading, size = "md", children, iconOnly }: Common) {
  return (
    <>
      {loading ? (
        <svg viewBox="0 0 24 24" className={clsx(ICON_SIZE[size], "animate-spin")} aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        icon && <Icon name={icon} className={ICON_SIZE[size]} strokeWidth={2.2} />
      )}
      {!iconOnly && children}
      {iconRight && !iconOnly && <Icon name={iconRight} className={ICON_SIZE[size]} strokeWidth={2.2} />}
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
  const { variant, size = "md", icon, iconRight, iconOnly, loading, fullWidth, className, children, ...rest } = props;
  const cls = buttonClass({ variant, size, iconOnly, fullWidth, className });
  const inner = <Inner {...{ icon, iconRight, loading, size, children, iconOnly }} />;
  if ("href" in rest && rest.href !== undefined) {
    const { href, prefetch, ...a } = rest as ButtonLinkProps;
    const external = /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href);
    if (external)
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} {...a} target={a.target ?? (href.startsWith("http") ? "_blank" : undefined)} rel="noreferrer">
          {inner}
        </a>
      );
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} prefetch={prefetch} className={cls} {...a}>
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
