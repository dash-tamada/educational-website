import clsx from "clsx";

/**
 * The route curtain (design system v2): a black sheet wiping up with a red
 * leading edge, hairline columns, and a slate in the middle (red SC/TK block +
 * the destination title in Anton + a running timecode). No mascot.
 * Pure markup: RouteTransition animates it through the data hooks
 *   [data-curtain-sheet]  the sheet (yPercent 100 -> 0 cover, 0 -> -100 reveal)
 *   [data-curtain-cloud]  each hairline column (scaleY in)
 *   [data-curtain-disc]   the red slate block (scaleX in)
 *   [data-curtain-label]  the destination title (rises out of a mask)
 *   [data-curtain-tami]   the timecode row (counts while the route loads)
 *   [data-curtain-tc]     the timecode text node
 * (hook names are kept from v1 so the transition engine did not change shape)
 */
export function CurtainArt({
  label,
  scene = "01",
  className,
}: {
  /** destination title, e.g. "Course" */
  label?: React.ReactNode;
  /** scene number on the slate */
  scene?: string;
  className?: string;
}) {
  return (
    <div data-curtain-sheet className={clsx("theatre absolute inset-0 overflow-hidden", className)}>
      {/* red leading edge of the wipe */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-red" />
      <div className="container-wide pointer-events-none absolute inset-0">
        <div className="relative h-full">
          {[25, 50, 75].map((p) => (
            <span key={p} data-curtain-cloud className="absolute inset-y-0 w-px origin-top bg-line" style={{ left: `${p}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-start">
          <div className="flex items-stretch gap-4">
            <span data-curtain-disc className="t-label flex origin-left flex-col justify-center gap-1 bg-red px-3 py-2.5 text-white">
              <span>Sc {scene}</span>
              <span>Tk 1</span>
            </span>
            <span className="line-mask">
              <span data-curtain-label className="t-display-xl block text-cream">
                {label}
              </span>
            </span>
          </div>
          <p data-curtain-tami className="t-timecode mt-4 flex w-full items-center justify-between gap-6 text-ash">
            <span className="flex items-center gap-2">
              <span aria-hidden className="curtain-rec block size-[7px] rounded-full bg-red" />
              Rec
            </span>
            <span data-curtain-tc>00:00:00:00</span>
          </p>
        </div>
      </div>
    </div>
  );
}
