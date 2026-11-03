"use client";

import { usePathname } from "next/navigation";
import { WordmarkFooter } from "./WordmarkFooter";
import { LiveClock } from "./LiveClock";

/** Task routes (checkout) get the one-row footer and no fixed clock. */
const TASK = /^\/checkout(\/|$)/;

/**
 * SiteShell's footer + clock for footer="auto": the full WordmarkFooter + fixed LiveClock,
 * or the minimal legal row on task routes (/checkout/*).
 */
export function ShellFooter({ clock = true }: { clock?: boolean }) {
  const task = TASK.test(usePathname() ?? "");
  return (
    <>
      <WordmarkFooter variant={task ? "minimal" : "full"} />
      {clock && !task && <LiveClock />}
    </>
  );
}
