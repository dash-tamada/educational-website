"use client";

import clsx from "clsx";
import { Mascot } from "@/components/decor/Mascot";
import { BlockBuddy } from "@/components/decor/BlockBuddy";

/**
 * The UI kit's EmptyState look, with a choosable heading level: full-page learn
 * states (unknown course, unavailable course, missing item, empty draft) need
 * their title to be the page's h1.
 */
export function LearnEmpty({
  title,
  body,
  action,
  art = "tami",
  tone = "bg-butter",
  as: H = "h1",
  className,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  art?: "tami" | "buddies";
  /** a bg-* class for the art disc */
  tone?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center px-6 py-12 text-center md:py-16",
        className,
      )}
    >
      <div
        className={clsx(
          "relative grid size-32 place-items-center rounded-full md:size-36",
          tone,
        )}
        aria-hidden
      >
        {art === "tami" ? (
          <Mascot
            title=""
            className="w-[4.5rem] md:w-20"
            style={{ transform: "rotate(-6deg)" }}
          />
        ) : (
          <span className="flex items-end gap-1">
            <BlockBuddy
              body="#ff008c"
              head="#ffcf3f"
              hat="#2668fd"
              className="w-10"
            />
            <BlockBuddy body="#00b351" head="#f780d4" wave className="w-11" />
          </span>
        )}
      </div>
      <H className="mt-5 max-w-[24ch] t-app-h2">{title}</H>
      {body && <p className="mt-2 max-w-[42ch] t-small text-ink/70">{body}</p>}
      {action && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
