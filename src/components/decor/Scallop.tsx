import clsx from "clsx";

/**
 * A row of circles that turns a straight section edge into a Krackerz-style
 * scalloped "cloud" edge. Drop it inside a `relative` section.
 */
export function ScallopEdge({
  color = "var(--color-cream)",
  size = 56,
  side = "top",
  className,
}: {
  color?: string;
  size?: number;
  side?: "top" | "bottom";
  className?: string;
}) {
  const at = side === "top" ? "50% 100%" : "50% 0%";
  return (
    <div
      aria-hidden
      className={clsx(
        "pointer-events-none absolute inset-x-0 z-10",
        side === "top" ? "bottom-[calc(100%-1px)]" : "top-[calc(100%-1px)]",
        className,
      )}
      style={{
        height: size / 2,
        backgroundImage: `radial-gradient(circle at ${at}, ${color} ${size / 2 - 0.5}px, transparent ${size / 2}px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: side === "top" ? "center bottom" : "center top",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

/** A circle with bumps round the edge (testimonial badges, featured price card). */
export function ScallopBadge({
  fill,
  bumps = 14,
  className,
  children,
}: {
  fill: string;
  bumps?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const R = 80;
  const r = ((2 * Math.PI * R) / bumps / 2) * 1.18;
  const dots = Array.from({ length: bumps }, (_, i) => {
    const a = (i / bumps) * Math.PI * 2;
    return { cx: 100 + R * Math.cos(a), cy: 100 + R * Math.sin(a) };
  });
  return (
    <div className={clsx("relative", className)}>
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
