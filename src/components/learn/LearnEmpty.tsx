"use client";

import clsx from "clsx";

/**
 * Editorial empty / gone state for the player (full-page learn states: unknown
 * course, unavailable course, missing item, empty draft). A mono slate with the
 * red rec dot, an Inter Tight headline, one muted line, actions. No art.
 * The heading level is choosable: on a full-page state the title is the page's h1.
 * Reads the context tokens, so it works on the theatre and on cream panels.
 */
export function LearnEmpty({
  title,
  body,
  action,
  eyebrow = "00:00:00:00 · Nothing on the reel",
  as: H = "h1",
  align = "start",
  className,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  /** mono slate above the title */
  eyebrow?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  align?: "start" | "center";
  className?: string;
}) {
  const center = align === "center";
  return (
    <div
      className={clsx(
        "flex flex-col py-12 md:py-16",
        center ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
        <span aria-hidden className="size-[6px] shrink-0 rounded-full bg-red" />
        {eyebrow}
      </p>
      <H className="mt-5 max-w-[18ch] font-heading text-[clamp(1.75rem,1.2rem+1.9vw,3rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-fg">
        {title}
      </H>
      {body && (
        <p className="mt-4 max-w-[46ch] t-body text-muted">{body}</p>
      )}
      {action && (
        <div
          className={clsx(
            "mt-7 flex flex-wrap gap-2",
            center && "justify-center",
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
