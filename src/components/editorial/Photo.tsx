import Image from "next/image";
import clsx from "clsx";
import { media, type MediaKey } from "@/lib/media";
import { cropSrc } from "@/lib/img";
import { ParallaxImage } from "@/components/motion/Parallax";

/* =============================================================================
   <Photo>: every editorial photo, by media.ts key. A frame that reserves its box
   (aspect class or explicit size, so no layout shift) + next/image `fill` with an
   aspect-correct Unsplash crop and the registry's alt + object-position.

   <Photo k="director-hero" ratio={5 / 4} sizes="50vw" className="aspect-[4/5]" />
   <Photo k="bts-crew-location" sizes="(min-width: 1024px) 60vw, 100vw" className="aspect-[3/2]" preload />
   <Photo k="still-tokyo-crossing" fill sizes="100vw" />      fills a positioned parent
   `ratio` = rendered HEIGHT / WIDTH (see src/lib/img.ts); omit for an uncropped request.
   `imgClassName` lands on the <img> (GSAP parallax target, filters).
   ============================================================================= */
export function Photo({
  k,
  sizes,
  ratio,
  fill,
  preload,
  loading,
  alt,
  className,
  imgClassName,
  pos,
  children,
}: {
  k: MediaKey;
  /** next/image sizes: the rendered frame WIDTH */
  sizes: string;
  /** crop ratio height / width */
  ratio?: number;
  /** the frame fills its positioned parent (absolute inset-0) */
  fill?: boolean;
  preload?: boolean;
  loading?: "eager" | "lazy";
  /** override the registry alt ("" = decorative) */
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** override the registry object-position */
  pos?: string;
  children?: React.ReactNode;
}) {
  const m = media(k);
  return (
    <div className={clsx("media-frame", fill && "absolute! inset-0", className)}>
      <Image
        src={cropSrc(m.src, ratio)}
        alt={alt ?? m.alt}
        fill
        sizes={sizes}
        preload={preload}
        loading={preload ? undefined : loading}
        draggable={false}
        className={clsx("object-cover select-none", imgClassName)}
        style={{ objectPosition: pos ?? m.pos }}
      />
      {children}
    </div>
  );
}

/**
 * <ParallaxPhoto>: a media.ts photo that drifts inside its frame on scroll
 * (ParallaxImage from @/components/motion/Parallax: transform-only, off under reduced motion).
 *   <ParallaxPhoto k="bts-crew-location" sizes="50vw" className="aspect-[4/3]" amount={8} />
 */
export function ParallaxPhoto({
  k,
  sizes,
  className,
  imgClassName,
  amount,
  ratio,
  preload,
  alt,
  children,
}: {
  k: MediaKey;
  sizes: string;
  /** frame classes (size / aspect) */
  className?: string;
  imgClassName?: string;
  /** max drift, % of the frame height (default 7) */
  amount?: number;
  ratio?: number;
  preload?: boolean;
  alt?: string;
  children?: React.ReactNode;
}) {
  const m = media(k);
  return (
    <ParallaxImage
      src={m.src}
      alt={alt ?? m.alt}
      pos={m.pos}
      sizes={sizes}
      className={clsx("media-frame", className)}
      imgClassName={imgClassName}
      amount={amount}
      ratio={ratio}
      preload={preload}
    >
      {children}
    </ParallaxImage>
  );
}
