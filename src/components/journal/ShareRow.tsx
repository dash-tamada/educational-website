"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/* =============================================================================
   Share row: copy link (confirms in place), WhatsApp, X, LinkedIn. Tiny caps links;
   the public URL of this note is the only thing passed to the share endpoints.
   `stacked` = the vertical list for the article's left rail.
   ============================================================================= */
export function ShareRow({ path, title, stacked, className }: { path: string; title: string; stacked?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const url = () => `${window.location.origin}${path}`;
  const open = (make: (u: string, t: string) => string) => {
    window.open(make(encodeURIComponent(url()), encodeURIComponent(title)), "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shares = [
    { label: "WhatsApp", make: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
    { label: "X", make: (u: string, t: string) => `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: "LinkedIn", make: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
  const btn = "t-label tap hit link-draw py-1.5 text-fg";

  return (
    <div className={className}>
      <p className="t-timecode text-muted">Share this note</p>
      <ul className={clsx("mt-3 flex", stacked ? "flex-col items-start gap-1" : "flex-wrap gap-x-6 gap-y-2")}>
        <li>
          <button type="button" onClick={copy} className={btn}>
            <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
          </button>
        </li>
        {shares.map((it) => (
          <li key={it.label}>
            <button type="button" onClick={() => open(it.make)} className={btn}>
              {it.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
