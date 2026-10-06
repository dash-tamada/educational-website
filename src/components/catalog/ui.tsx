import clsx from "clsx";

/**
 * Section title for the course / tutor pages: small caps kicker + Bricolage
 * chunky heading, optional right-side action. Sits on the cream canvas.
 */
export function SectionTitle({
  kicker,
  title,
  id,
  action,
  className,
  as: H = "h2",
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={clsx("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0">
        {kicker && <p className="t-eyebrow text-blue">{kicker}</p>}
        <H id={id} className={clsx("font-heading text-[clamp(1.875rem,1.45rem+1.4vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.035em] [font-variation-settings:'opsz'_96]", kicker && "mt-2.5")}>
          {title}
        </H>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Tones dark enough for white text at small sizes (WCAG AA 4.5:1) in the course /
 * tutor heroes. Green, lilac, hotpink and flame read better with ink text (white
 * on them is 2.8-3.7:1), which also matches the catalog cards.
 */
export const DARK_TONES = new Set(["blue", "purple", "indigo", "forest", "olive", "ink"]);

/** Hero text colour on a tone: white on the dark set above, ink everywhere else. */
export const heroText = (tone: string) => (DARK_TONES.has(tone) ? "text-white" : "text-ink");
