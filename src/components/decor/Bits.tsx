import Link from "next/link";
import clsx from "clsx";
import { toneBg, type Tone } from "@/lib/landing-data";

/** Rotated lime highlight box, as in Krackerz's "KRACK" / "NOT CASH". */
export function LimeBox({
  children,
  className,
  rotate = -3,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <span
      className={clsx(
        "shadow-hard inline-block rounded-[0.18em] border-[3px] border-ink bg-lime px-[0.22em] pt-[0.16em] pb-[0.06em] text-ink",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** Script accent word, e.g. "actually". */
export function Script({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "font-script font-normal tracking-normal normal-case",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Handwritten side note (Aardvark-style). */
export function HandNote({
  children,
  className,
  rotate = -8,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <p
      className={clsx(
        "font-hand text-2xl leading-[1.05] text-purple",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </p>
  );
}

/** Small tilted tag such as "PRICING" or "FAQ". */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex -rotate-3 items-center gap-2 rounded-md border-2 border-ink bg-tomato px-2.5 pt-1.5 pb-1 font-display text-[10px] leading-none text-paper uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Sticker({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "shadow-hard inline-block rounded-full border-[3px] border-ink px-5 py-2 font-heading text-xl font-extrabold tracking-tight whitespace-nowrap text-ink sm:px-7 sm:py-3 sm:text-3xl lg:text-4xl",
        toneBg[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type BtnVariant = "lime" | "pink" | "ink" | "paper";
const btn: Record<BtnVariant, string> = {
  lime: "bg-lime text-ink",
  pink: "bg-hotpink text-paper",
  ink: "bg-ink text-paper",
  paper: "bg-paper text-ink",
};

export function ArrowButton({
  href,
  children,
  variant = "lime",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: BtnVariant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group shadow-hard inline-flex items-center gap-3 rounded-xl border-[3px] border-ink py-1.5 pr-1.5 pl-4 font-display text-[11px] leading-none uppercase transition-transform duration-200 hover:-translate-y-0.5 hover:-rotate-1 active:translate-y-0.5 active:shadow-none",
        btn[variant],
        className,
      )}
    >
      <span className="pt-1">{children}</span>
      <ArrowDot />
    </Link>
  );
}

export function ArrowDot({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-tomato text-paper transition-transform duration-300 group-hover:rotate-45",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          d="M4 12 L12 4 M6 4 H12 V10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Soft wavy blob background (Aardvark hero / panels). */
export function Blob({
  className,
  fill,
  variant = 0,
}: {
  className?: string;
  fill: string;
  variant?: 0 | 1 | 2;
}) {
  const paths = [
    "M0 210 C120 120 210 260 330 190 S520 40 640 120 S860 260 1000 150 V600 H0Z",
    "M0 330 C160 250 250 120 420 190 S640 360 780 250 S930 90 1000 140 V600 H0Z",
    "M0 120 C180 40 300 210 470 150 S720 20 840 110 S960 210 1000 180 V600 H0Z",
  ];
  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      className={clsx("pointer-events-none absolute", className)}
      aria-hidden
    >
      <path d={paths[variant]} fill={fill} />
    </svg>
  );
}

/** Four-point sparkle doodle. */
export function Sparkle({
  className,
  fill = "#c8ff2e",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2Z"
        fill={fill}
        stroke="#161616"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
