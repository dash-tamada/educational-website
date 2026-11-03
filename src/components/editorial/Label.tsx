import clsx from "clsx";

/* =============================================================================
   Tiny letter-spaced caps (nav, eyebrows, captions) + red-word text helper.
   Server-safe.

   <Label>The Course</Label>
   <Label index="04" marker>What you'll learn</Label>      (04)  ■ WHAT YOU'LL LEARN
   <Eyebrow>Journal</Eyebrow>                               = Label with the red marker
   <RedWords text="Prompts and motion." red={["prompts", "motion"]} />
   ============================================================================= */

export function Label({
  children,
  index,
  marker,
  muted,
  as: El = "p",
  className,
}: {
  children: React.ReactNode;
  /** small running number before the label, e.g. "04" */
  index?: string;
  /** red square before the label */
  marker?: boolean;
  /** muted colour (text-muted) */
  muted?: boolean;
  as?: "p" | "span" | "h2" | "h3" | "div";
  className?: string;
}) {
  return (
    <El className={clsx("t-label flex items-center gap-3", muted && "text-muted", className)}>
      {index && <span className="t-timecode text-muted">({index})</span>}
      {marker && <span aria-hidden className="block size-[7px] shrink-0 bg-red" />}
      <span>{children}</span>
    </El>
  );
}

/** Section eyebrow: Label with the red square marker. */
export function Eyebrow(props: Omit<React.ComponentProps<typeof Label>, "marker">) {
  return <Label marker {...props} />;
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/**
 * Renders `text` with the words listed in `red` set in red (Marlowe accent).
 * Matching is per word, case-insensitive, punctuation ignored; the punctuation
 * itself stays in the base colour ("MOTION." -> red MOTION + ink ".").
 * `redClass` overrides the red utility (e.g. "text-red-lite" for small text on ink).
 */
export function RedWords({ text, red = [], redClass = "text-red" }: { text: string; red?: readonly string[]; redClass?: string }) {
  if (!red.length) return <>{text}</>;
  const set = new Set(red.map(norm));
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => {
        if (!p.trim() || !set.has(norm(p))) return p;
        const m = /^([\p{L}\p{N}']+)(.*)$/u.exec(p);
        if (!m) return p;
        return (
          <span key={i}>
            <span className={redClass}>{m[1]}</span>
            {m[2]}
          </span>
        );
      })}
    </>
  );
}
