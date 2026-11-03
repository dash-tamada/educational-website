"use client";

import { useSyncExternalStore } from "react";
import clsx from "clsx";
import { CLOCK, SITE } from "@/lib/content/site";

/* =============================================================================
   AppClock: a quiet live timecode (Mobius "BERLIN, DE 07:22 AM", Marlowe slates).
     <AppClock />                               BENGALURU, IN  14:22:07   (IST, ticking)
     <AppClock place={null} seconds={false} />  14:22
   Renders nothing on the server and during hydration (no mismatch), then ticks once
   a second while mounted. One shared interval for every clock on the page.
   ============================================================================= */

/** "Bengaluru, IN": the studio city from SITE (the same place the footer, About and Contact name). */
const STUDIO = `${SITE.city.split(",")[0]}, IN`;

const fmtS = new Intl.DateTimeFormat("en-GB", { timeZone: CLOCK.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fmtM = new Intl.DateTimeFormat("en-GB", { timeZone: CLOCK.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });

let now = 0;
let timer = 0;
const subs = new Set<() => void>();
function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      subs.forEach((s) => s());
    }, 1000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
}
const snapshot = () => Math.floor((now || Date.now()) / 1000);
const serverSnapshot = () => 0;

export function AppClock({ place = STUDIO, seconds = true, className }: { place?: string | null; seconds?: boolean; className?: string }) {
  const t = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const time = t ? (seconds ? fmtS : fmtM).format(new Date(t * 1000)) : "";
  return (
    <p className={clsx("flex items-baseline gap-2 font-mono text-[10.5px] font-medium tracking-[0.08em] uppercase tabular-nums", className)} aria-hidden>
      {place && <span className="opacity-55">{place}</span>}
      <span className="min-w-[8ch]">{time}</span>
    </p>
  );
}
