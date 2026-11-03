"use client";

import { useEffect, useRef, useState } from "react";

/* =============================================================================
   PROMPT card inside an article (and the "Template" variant): a night-black slate
   with a mono caps header (PROMPT · label · tool), the prompt in mono, and a Copy
   button that confirms in place ("Copied", announced politely).
   ============================================================================= */
export function PromptCard({ label, tool, text, kind = "Prompt", className }: { label: string; tool: string; text: string; kind?: "Prompt" | "Template"; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure className={className}>
      <div className="theatre-night border border-line">
        <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <span className="t-timecode flex flex-wrap items-center gap-x-2 text-ash">
            <span aria-hidden className="block size-[6px] bg-red" />
            <span className="text-red-lite">{kind}</span>
            <span aria-hidden>·</span>
            <span className="text-cream">{label}</span>
          </span>
          <span className="t-timecode text-ash">{tool}</span>
        </figcaption>
        <pre className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-[1.7] whitespace-pre-wrap text-cream/90 sm:px-5 sm:text-[13.5px]">{text}</pre>
        <div className="flex items-center justify-end border-t border-line px-2 py-1.5">
          <button type="button" onClick={copy} className="t-label tap hit flex h-9 items-center gap-2 px-3 text-cream/80 hf:text-cream">
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
              {copied ? <path d="M3 8.5 6.5 12 13 4.5" /> : <path d="M5.5 5.5V2.5h8v8h-3M2.5 5.5h8v8h-8z" />}
            </svg>
            <span aria-live="polite">{copied ? "Copied" : `Copy ${kind.toLowerCase()}`}</span>
          </button>
        </div>
      </div>
    </figure>
  );
}
