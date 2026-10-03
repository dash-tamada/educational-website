import clsx from "clsx";

type Props = { className?: string; title?: string; wink?: boolean };

/** "Tami": the Tamada Media play-button mascot. */
export function Mascot({
  className,
  title = "Tami, the Tamada Media mascot",
  wink,
}: Props) {
  const body = "M24 14 L24 96 L104 55 Z";
  return (
    <svg
      viewBox="0 0 124 132"
      className={clsx("overflow-visible", className)}
      role="img"
      aria-label={title}
    >
      {/* legs + sneakers */}
      <g stroke="#161616" strokeWidth="4" strokeLinecap="round">
        <path d="M38 88 L34 114" />
        <path d="M60 78 L66 114" />
      </g>
      <g stroke="#161616" strokeWidth="3" strokeLinejoin="round" fill="#c8ff2e">
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
      <circle
        cx="8"
        cy="31"
        r="5"
        fill="#fffdf8"
        stroke="#161616"
        strokeWidth="3"
      />
      {/* body: thick round-joined strokes give the rounded play-triangle + ink outline */}
      <path
        d={body}
        fill="#161616"
        stroke="#161616"
        strokeWidth="26"
        strokeLinejoin="round"
      />
      <path
        d={body}
        fill="#e2482b"
        stroke="#e2482b"
        strokeWidth="19"
        strokeLinejoin="round"
      />
      <path
        d="M22 22 Q22 12 32 18"
        fill="none"
        stroke="#ff8a70"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".8"
      />
      {/* face */}
      <circle
        cx="40"
        cy="44"
        r="10"
        fill="#fffdf8"
        stroke="#161616"
        strokeWidth="3"
      />
      {wink ? (
        <path
          d="M54 48 q8 -6 16 0"
          fill="none"
          stroke="#161616"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : (
        <circle
          cx="62"
          cy="48"
          r="10"
          fill="#fffdf8"
          stroke="#161616"
          strokeWidth="3"
        />
      )}
      <circle cx="43" cy="45" r="4.5" fill="#161616" />
      {!wink && <circle cx="65" cy="49" r="4.5" fill="#161616" />}
      <path
        d="M40 64 q12 11 24 1"
        fill="#161616"
        stroke="#161616"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="60" r="4" fill="#ff4fd8" opacity=".7" />
      <circle cx="72" cy="63" r="4" fill="#ff4fd8" opacity=".7" />
    </svg>
  );
}
