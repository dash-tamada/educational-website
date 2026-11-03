"use client";

import clsx from "clsx";
import { Icon, toast } from "@/components/app";
import { Eyebrow } from "@/components/editorial";
import { useWishlist } from "../hooks";

/* =============================================================================
   Small editorial pieces shared by the course page, checkout and tutor profile.
   Square, hairline, mono caps. No pills, no coloured circles.
   ============================================================================= */

/** Section head: (04) ■ LABEL + an optional Inter Tight title. */
export function SectionHead({
  index,
  label,
  title,
  id,
  className,
  titleClassName = "t-headline-l",
}: {
  index?: string;
  label: string;
  title?: React.ReactNode;
  id?: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow index={index}>{label}</Eyebrow>
      {title && (
        <h2 id={id} className={clsx("mt-6 max-w-[18ch]", titleClassName)}>
          {title}
        </h2>
      )}
    </div>
  );
}

/** Mono caps tag in a hairline box: VIDEO / TEST / FILE / FREE PREVIEW. */
export function MonoTag({ children, tone = "line", className }: { children: React.ReactNode; tone?: "line" | "red" | "ink" | "solid"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] shrink-0 items-center px-[7px] font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] whitespace-nowrap uppercase",
        tone === "line" && "border border-line-strong text-muted",
        tone === "red" && "bg-red-deep text-white",
        tone === "ink" && "border border-fg text-fg",
        tone === "solid" && "bg-fg text-surface",
        className,
      )}
    >
      {children}
    </span>
  );
}

const STAR = "m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z";

/** Five small stars (decorative; pair with a text rating). */
export function Stars({ value, className, size = "size-3.5" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-[3px]", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((s) => {
        const fill = Math.max(0, Math.min(1, value - (s - 1)));
        return (
          <svg key={s} viewBox="0 0 24 24" className={clsx(size, "shrink-0")}>
            <path d={STAR} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity={0.45} />
            {/* a nested viewport clips the filled star to its share (no ids needed) */}
            {fill > 0 && (
              <svg x="0" y="0" width={24 * fill} height="24" viewBox={`0 0 ${24 * fill} 24`} overflow="hidden">
                <path d={STAR} fill="currentColor" />
              </svg>
            )}
          </svg>
        );
      })}
    </span>
  );
}

/** Square red play mark (the trailer / free-lesson button face). */
export function PlayMark({ className, size = "size-16 md:size-[72px]" }: { className?: string; size?: string }) {
  return (
    <span aria-hidden className={clsx("grid shrink-0 place-items-center bg-red text-white transition-[scale,background-color] duration-500 ease-expo group-hf:scale-[1.06] group-hf:bg-red-deep", size, className)}>
      <svg viewBox="0 0 16 16" className="ml-[3px] size-[30%]" fill="currentColor">
        <path d="M3 1.8v12.4L13.6 8z" />
      </svg>
    </span>
  );
}

/** Square hairline icon button (save, share). */
export function IconSquare({
  label,
  icon,
  pressed,
  onClick,
  small,
  className,
  children,
}: {
  label: string;
  icon: string;
  pressed?: boolean;
  onClick: () => void;
  /** 36px instead of 44px */
  small?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={children ? undefined : label}
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        "tap inline-flex items-center justify-center gap-2 border border-line-strong px-3 t-label transition-colors duration-300 hf:border-fg aria-pressed:border-fg",
        small ? "h-9 coarse:h-11" : "h-11",
        !children && (small ? "w-9 px-0 coarse:w-11" : "w-11 px-0"),
        className,
      )}
    >
      <Icon name={icon} className={clsx("size-[17px]", pressed && "fill-current text-red")} strokeWidth={1.6} />
      {children}
    </button>
  );
}

/** Save to wishlist (students; others get the demo login toast from useWishlist). */
export function SaveButton({ courseId, title, withText, small, className }: { courseId: string; title: string; withText?: boolean; small?: boolean; className?: string }) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(courseId);
  return (
    <IconSquare label={saved ? "Remove from wishlist" : "Save to wishlist"} icon="heart" pressed={saved} onClick={() => toggle(courseId, title)} small={small} className={className}>
      {withText ? (saved ? "Saved" : "Save") : undefined}
    </IconSquare>
  );
}

/** Share: the native share sheet where there is one, else copy the link. */
export function ShareButton({ title, path, withText, small, className }: { title: string; path: string; withText?: boolean; small?: boolean; className?: string }) {
  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: url.replace(/^https?:\/\//, "") });
    } catch (e) {
      // the share sheet was dismissed: nothing to say
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.info("Copy this link", { description: url });
    }
  };
  return (
    <IconSquare label="Share this course" icon="share" onClick={share} small={small} className={className}>
      {withText ? "Share" : undefined}
    </IconSquare>
  );
}

/** One hairline-ruled definition row (price breakdowns, receipts). */
export function Row({ k, v, className, muted }: { k: React.ReactNode; v: React.ReactNode; className?: string; muted?: boolean }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4 border-b border-line py-3", muted && "text-muted", className)}>
      <dt className="t-small">{k}</dt>
      <dd className="t-small text-right tabular-nums">{v}</dd>
    </div>
  );
}

/** "· "-joined mono caps facts line. */
export function MetaLine({ items, className }: { items: (string | false | null | undefined)[]; className?: string }) {
  const list = items.filter(Boolean) as string[];
  return (
    <ul className={clsx("t-timecode flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {list.map((t, i) => (
        <li key={t} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden className="block size-[5px] bg-current opacity-40" />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
