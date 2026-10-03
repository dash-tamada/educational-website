import clsx from "clsx";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { ScallopEdge } from "@/components/decor/Scallop";

/**
 * The shared curtain visual (route transitions + first-visit intro): a cream sheet
 * with scalloped top and bottom edges, drifting white clouds, a colour disc with
 * Tami, and an optional Londrina label. Pure markup: animate it with GSAP via the
 * data hooks:
 *   [data-curtain-sheet]  the sheet (yPercent 100 -> 0 cover, 0 -> -100 reveal)
 *   [data-curtain-cloud]  each cloud (extra parallax)
 *   [data-curtain-disc]   the colour disc
 *   [data-curtain-tami]   the mascot
 *   [data-curtain-label]  the label
 * The sheet is taller than the viewport by one scallop so the bumps lead/trail.
 */
export function CurtainArt({
  accent = "#fd4401",
  label,
  className,
  children,
}: {
  accent?: string;
  label?: React.ReactNode;
  className?: string;
  /** replaces the default disc + label centre piece (e.g. the intro wordmark) */
  children?: React.ReactNode;
}) {
  return (
    <div
      data-curtain-sheet
      className={clsx("absolute inset-x-0 bg-cream", className)}
      style={{
        top: "calc(var(--scallop) / -2)",
        height: "calc(100% + var(--scallop))",
      }}
    >
      <ScallopEdge placement="outside-top" color="var(--color-cream)" />
      <ScallopEdge placement="outside-bottom" color="var(--color-cream)" />
      <div className="absolute inset-0 overflow-hidden">
        <span data-curtain-cloud className="absolute top-[14%] left-[6%] block">
          <Cloud size="l" delay={-6} />
        </span>
        <span data-curtain-cloud className="absolute top-[22%] right-[8%] block">
          <Cloud size="m" delay={-12} flip />
        </span>
        <span data-curtain-cloud className="absolute bottom-[18%] left-[16%] block">
          <Cloud size="s" delay={-3} />
        </span>
        <span data-curtain-cloud className="absolute right-[14%] bottom-[12%] block">
          <Cloud size="l" delay={-18} flip />
        </span>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <div className="flex flex-col items-center">
            <div
              data-curtain-disc
              className="grid size-[132px] place-items-center rounded-full md:size-[188px]"
              style={{ background: accent }}
            >
              <span data-curtain-tami className="block">
                <Mascot
                  title=""
                  className="w-[86px] translate-x-[6%] md:w-[122px]"
                />
              </span>
            </div>
            {label !== undefined && (
              <p
                data-curtain-label
                className="t-display-l mt-5 text-flame md:mt-7"
              >
                {label}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
