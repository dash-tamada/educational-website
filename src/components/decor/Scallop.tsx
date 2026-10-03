import clsx from "clsx";

type Placement = "outside-top" | "outside-bottom" | "inside-top" | "inside-bottom";

/**
 * Scalloped "cloud" edge (Krackerz). Drop it inside a `relative` section.
 * Bump diameter is responsive (48px mobile, 72px >=1024 via --scallop) unless
 * `size` is given. Every edge overlaps its section by 1px so no hairline shows.
 *
 * placement:
 *   "outside-top"    bumps rise ABOVE the section, filled with `color` = THIS section's colour
 *   "outside-bottom" bumps hang BELOW the section, `color` = THIS section's colour
 *   "inside-top"     bumps hang DOWN into the section from its top edge,
 *                    `color` = the colour of the section ABOVE (cream for the canvas)
 *   "inside-bottom"  bumps rise UP into the section from its bottom edge,
 *                    `color` = the colour of the section BELOW
 * Legacy: side="top" = "outside-top", side="bottom" = "outside-bottom".
 */
export function ScallopEdge({
  color = "var(--color-cream)",
  size,
  placement,
  side,
  className,
}: {
  color?: string;
  /** bump diameter in px; omit for the responsive 48/72 default */
  size?: number;
  placement?: Placement;
  /** @deprecated use placement */
  side?: "top" | "bottom";
  className?: string;
}) {
  const p: Placement =
    placement ?? (side === "bottom" ? "outside-bottom" : "outside-top");
  // Circles sit on the strip edge that touches the section body.
  const atBottom = p === "outside-top" || p === "inside-bottom";
  const pos: React.CSSProperties =
    p === "outside-top"
      ? { bottom: "calc(100% - 1px)" }
      : p === "outside-bottom"
        ? { top: "calc(100% - 1px)" }
        : p === "inside-top"
          ? { top: -1 }
          : { bottom: -1 };
  const style: React.CSSProperties & Record<string, string | number> = {
    ...pos,
    backgroundImage: `radial-gradient(circle at 50% ${atBottom ? "100%" : "0%"}, ${color} calc(var(--s) / 2 - 0.5px), transparent calc(var(--s) / 2))`,
    backgroundPosition: atBottom ? "center bottom" : "center top",
  };
  if (size) style["--s"] = `${size}px`;
  return (
    <div aria-hidden className={clsx("scallop z-10", className)} style={style} />
  );
}

/**
 * A circle with bumps round the edge (testimonial badges, featured price card,
 * number badges). Position it with className (absolute/fixed work: relative is
 * only added when no position utility is given).
 */
export function ScallopBadge({
  fill,
  bumps = 14,
  className,
  style,
  children,
}: {
  fill: string;
  bumps?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const R = 80;
  const r = ((2 * Math.PI * R) / bumps / 2) * 1.18;
  const dots = Array.from({ length: bumps }, (_, i) => {
    const a = (i / bumps) * Math.PI * 2;
    return { cx: 100 + R * Math.cos(a), cy: 100 + R * Math.sin(a) };
  });
  return (
    <div
      className={clsx(
        // only add relative when the caller did not position it (absolute/fixed/sticky)
        !/(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className ?? "") && "relative",
        className,
      )}
      style={style}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <circle cx="100" cy="100" r={R} fill={fill} />
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.cx.toFixed(2)}
            cy={d.cy.toFixed(2)}
            r={r.toFixed(2)}
            fill={fill}
          />
        ))}
      </svg>
      <div className="relative h-full">{children}</div>
    </div>
  );
}
