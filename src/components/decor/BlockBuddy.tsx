import clsx from "clsx";

/**
 * Flat Maxima-style "block" character: rounded body + round head + dot eyes +
 * one-line smile. Pure SVG, scales with its width. Shared by the hero, tutor banner, final CTA and footer scenes.
 * Add className="hover-wiggle" (or a parent .group + group-hf:) for hover life.
 */
export function BlockBuddy({
  body = "#2668fd",
  head = "#fd4401",
  hat,
  wave,
  className,
  style,
}: {
  body?: string;
  head?: string;
  /** optional cap colour */
  hat?: string;
  /** raise one arm */
  wave?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 64 104" className={clsx("overflow-visible", className)} style={style} aria-hidden>
      {wave && (
        <path d="M50 52 Q62 40 58 26" fill="none" stroke={body} strokeWidth="9" strokeLinecap="round" />
      )}
      <rect x="10" y="44" width="44" height="60" rx="20" fill={body} />
      <circle cx="32" cy="26" r="20" fill={head} />
      {hat && <path d="M12 22 C13 8 22 3 32 3 C43 3 51 9 52 20 C40 15 25 15 12 22 Z" fill={hat} />}
      <circle cx="25" cy="27" r="2.6" fill="#161616" />
      <circle cx="39" cy="27" r="2.6" fill="#161616" />
      <path d="M25 35 q7 6 14 0" fill="none" stroke="#161616" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
