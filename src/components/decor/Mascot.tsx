import clsx from "clsx";

type Props = {
  className?: string;
  title?: string;
  wink?: boolean;
  /** Wink + bounce on hover (H13). Also triggers when a parent `.group` is hovered. */
  interactive?: boolean;
  style?: React.CSSProperties;
};

/**
 * "Tami": the Tamada Media play-button mascot. Flat flame-red body with a thin
 * 2px ink outline (matches the flat Maxima-style scenes). Sizes: 64px badges,
 * 120-160px section accents, 220-300px scene hero. Give it a resting tilt via
 * `style={{ transform: "rotate(-8deg)" }}` or GSAP, never Tailwind rotate classes
 * if GSAP also animates it.
 */
export function Mascot({
  className,
  title = "Tami, the Tamada Media mascot",
  wink,
  interactive,
  style,
}: Props) {
  const body = "M24 14 L24 96 L104 55 Z";
  const decorative = !title;
  return (
    <svg
      viewBox="0 0 124 132"
      className={clsx("overflow-visible", interactive && "tami-hover", className)}
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      {/* legs + sneakers */}
      <g stroke="#161616" strokeWidth="4" strokeLinecap="round">
        <path d="M38 88 L34 114" />
        <path d="M60 78 L66 114" />
      </g>
      <g stroke="#161616" strokeWidth="2.5" strokeLinejoin="round" fill="#ffcf3f">
        <path d="M22 112 h16 a6 6 0 0 1 6 6 v3 h-24 a4 4 0 0 1 -4 -4 a5 5 0 0 1 6 -5z" />
        <path d="M60 112 h16 a6 6 0 0 1 6 6 v3 h-24 a4 4 0 0 1 -4 -4 a5 5 0 0 1 6 -5z" />
      </g>
      {/* waving arm */}
      <path
        d="M22 58 Q6 50 8 34"
        fill="none"
        stroke="#161616"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="31" r="5" fill="#fffdf8" stroke="#161616" strokeWidth="2.5" />
      {/* body: thick round-joined strokes give the rounded play-triangle; the ink
          layer is 4px wider than the red one => a 2px outline */}
      <path d={body} fill="#161616" stroke="#161616" strokeWidth="24" strokeLinejoin="round" />
      <path d={body} fill="#fd4401" stroke="#fd4401" strokeWidth="20" strokeLinejoin="round" />
      <path
        d="M22 22 Q22 12 32 18"
        fill="none"
        stroke="#ff8a5c"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".85"
      />
      {/* face */}
      <circle cx="40" cy="44" r="10" fill="#fffdf8" stroke="#161616" strokeWidth="2.5" />
      <circle cx="43" cy="45" r="4.5" fill="#161616" />
      {wink ? (
        <path
          d="M54 48 q8 -6 16 0"
          fill="none"
          stroke="#161616"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : (
        <g className="tami-eye-r">
          <circle cx="62" cy="48" r="10" fill="#fffdf8" stroke="#161616" strokeWidth="2.5" />
          <circle cx="65" cy="49" r="4.5" fill="#161616" />
        </g>
      )}
      <path
        d="M40 64 q12 11 24 1"
        fill="#161616"
        stroke="#161616"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="60" r="4" fill="#ff008c" opacity=".55" />
      <circle cx="72" cy="63" r="4" fill="#ff008c" opacity=".55" />
    </svg>
  );
}
