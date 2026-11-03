import Link from "next/link";
import clsx from "clsx";

/* =============================================================================
   Editorial buttons + text links (CSS hooks: .e-btn / .e-roll / .e-arrow in
   globals.css, section BUTTONS). Server-safe.

   <Button href="/learn/ai-filmmaking/af-1-1">Watch free lesson</Button>
   <Button variant="outline" size="sm" arrow href="/courses/ai-filmmaking">Curriculum</Button>
   <Button type="submit" full>Send</Button>
   <ArrowLink href="/courses/ai-filmmaking" size="lg">Get started</ArrowLink>
   ============================================================================= */

export type ButtonVariant = "red" | "ink" | "cream" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/** Thin editorial arrow (stroke = currentColor). */
export function ArrowIcon({ className, dir = "right" }: { className?: string; dir?: "right" | "left" | "up-right" | "down" }) {
  const rot = dir === "left" ? 180 : dir === "up-right" ? -45 : dir === "down" ? 90 : 0;
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      aria-hidden
      className={className}
      style={rot ? { transform: `rotate(${rot}deg)` } : undefined}
    >
      <path d="M1.5 8h12M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

/** The rolling caps label (hover: the copy below rolls up). */
function Roll({ children }: { children: React.ReactNode }) {
  return (
    <span className="e-roll">
      <span>
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    </span>
  );
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** stretch to the container width */
  full?: boolean;
  /** trailing arrow */
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AsLink = Common & {
  href: string;
  /** open in a new tab (external links) */
  external?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  "aria-label"?: string;
};
type AsButton = Common & {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
};

/**
 * Rectangular editorial button: red (default, THE CTA) | ink | cream | outline | ghost.
 * Renders a next/link when `href` is set, else a <button>.
 */
export function Button(props: AsLink | AsButton) {
  const { variant = "red", size = "md", full, arrow, className, children } = props;
  const shared = {
    className: clsx("e-btn", className),
    "data-variant": variant,
    "data-size": size,
    "data-full": full ? "" : undefined,
    "aria-label": props["aria-label"],
  };
  const inner = (
    <>
      <Roll>{children}</Roll>
      {arrow && <ArrowIcon />}
    </>
  );
  if (props.href !== undefined) {
    const { href, external, onClick } = props;
    if (external)
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} {...shared}>
          {inner}
        </a>
      );
    return (
      <Link href={href} onClick={onClick} {...shared}>
        {inner}
      </Link>
    );
  }
  const { type = "button", disabled, onClick } = props;
  return (
    <button type={type} disabled={disabled} onClick={onClick} aria-pressed={props["aria-pressed"]} {...shared}>
      {inner}
    </button>
  );
}

const ARROW_SIZE = {
  sm: "text-[14px]",
  md: "text-[15px] md:text-[16px]",
  lg: "text-[18px] md:text-[21px] tracking-[-0.02em]",
  xl: "text-[22px] md:text-[28px] tracking-[-0.03em] font-heading",
} as const;

/**
 * Mobius text link with an arrow that nudges on hover ("Get started →").
 * size: sm | md (default) | lg (section CTAs) | xl (closing lines).
 */
export function ArrowLink({
  href,
  size = "md",
  className,
  children,
  external,
  onClick,
}: {
  href: string;
  size?: keyof typeof ARROW_SIZE;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const cls = clsx("e-arrow group", ARROW_SIZE[size], className);
  const body = (
    <>
      <span className="link-draw">{children}</span>
      <ArrowIcon />
    </>
  );
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick}>
        {body}
      </a>
    );
  return (
    <Link href={href} className={cls} onClick={onClick}>
      {body}
    </Link>
  );
}
