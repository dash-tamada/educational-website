import Image from "next/image";
import clsx from "clsx";
import { LOGO, LOGO_SRC } from "@/lib/brand";

/* =============================================================================
   The official Tamada Media logo, alone (no mascot). Server-safe.
   tone="light" = cream letters (dark grounds), "dark" = ink letters (cream grounds),
   "auto" = both stacked, the visible one picked by the closest [data-tone] ancestor
   (the SiteHeader flips it without a re-render).

   <BrandMark tone="light" width={132} sizes="132px" />
   ============================================================================= */
export function BrandMark({
  tone = "dark",
  sizes,
  preload,
  lazy,
  className,
}: {
  tone?: "light" | "dark" | "auto";
  /** next/image sizes = the rendered logo width */
  sizes: string;
  preload?: boolean;
  /** load only once rendered visible (e.g. the intro logo: hidden, and never fetched, for
   *  returning visitors; an eager copy would also make the header pick its larger cached file) */
  lazy?: boolean;
  className?: string;
}) {
  const img = (t: "light" | "dark", extra?: string) => (
    <Image
      src={LOGO_SRC[t]}
      alt={tone === "auto" && t === "dark" ? "" : "Tamada Media"}
      width={LOGO.w}
      height={LOGO.h}
      sizes={sizes}
      preload={preload && (tone === t || (tone === "auto" && t === "light"))}
      loading={preload ? undefined : lazy ? "lazy" : "eager"}
      draggable={false}
      className={clsx("block h-auto w-full max-w-none select-none", extra)}
    />
  );
  if (tone !== "auto") return <span className={clsx("block", className)}>{img(tone)}</span>;
  return (
    <span className={clsx("brand-auto relative block", className)}>
      {img("light", "brand-auto-light transition-opacity duration-300")}
      {img("dark", "brand-auto-dark absolute inset-0 transition-opacity duration-300")}
    </span>
  );
}
