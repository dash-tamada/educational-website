import clsx from "clsx";

/* =============================================================================
   Marlowe hairline columns: an absolute, non-interactive overlay inside a
   positioned section. Lines sit on the .container-wide content edges by default.

   <section className="theatre relative"><GridLines /> ...</section>          3 lines (4 cols)
   <GridLines cols={3} />                                                       2 lines
   <GridLines stops={[25, 75]} />                                                lines at 25% and 75%
   <GridLines stops={[25, 75]} edges className="max-md:hidden" />               + outer edges
   Colour follows the ground (--line): cream hairlines on .theatre, ink on cream.
   ============================================================================= */
export function GridLines({
  cols = 4,
  stops,
  edges,
  bleed,
  className,
}: {
  /** equal columns (draws cols - 1 inner lines) */
  cols?: number;
  /** explicit line positions in % of the content width (overrides cols) */
  stops?: number[];
  /** also draw the left and right content edges */
  edges?: boolean;
  /** full viewport width instead of the .container-wide content box */
  bleed?: boolean;
  className?: string;
}) {
  const at = stops ?? Array.from({ length: Math.max(0, cols - 1) }, (_, i) => ((i + 1) * 100) / cols);
  const all = edges ? [0, ...at, 100] : at;
  return (
    <div aria-hidden className={clsx("pointer-events-none absolute inset-0 z-0", className)}>
      <div className={clsx("relative mx-auto h-full", !bleed && "container-wide")}>
        <div className="relative h-full">
          {all.map((p) => (
            <span
              key={p}
              className="absolute inset-y-0 w-px bg-line"
              style={{ left: `${p}%`, translate: p === 100 ? "-1px 0" : undefined }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
