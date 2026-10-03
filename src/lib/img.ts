/**
 * Aspect-correct image crops (server- and client-safe).
 *
 * `ratio` = rendered HEIGHT / WIDTH of the box the image covers (object-cover).
 * For an image inside a parallax/oversized layer, pass the layer's ratio (the
 * frame ratio x the overscan, e.g. 1.25 * 1.16). The custom loader then requests
 * w x round(w * ratio) from Unsplash, so `sizes` can simply describe the frame
 * WIDTH and the picture is never upscaled.
 *
 *   <Image src={cropSrc(c.img, 4 / 3)} fill sizes="140px" className="object-cover" />
 */
export function cropSrc(src: string, ratio?: number) {
  if (!ratio || !(ratio > 0) || !src.startsWith("https://images.unsplash.com/")) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}tm-ar=${ratio.toFixed(3)}`;
}

/** Height/width from an unprefixed Tailwind aspect class (aspect-[4/5], aspect-square, aspect-video). */
export function ratioFromClass(className?: string) {
  if (!className) return undefined;
  const m = /(?:^|\s)aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\](?=\s|$)/.exec(className);
  if (m) return parseFloat(m[2]) / parseFloat(m[1]);
  if (/(?:^|\s)aspect-square(?=\s|$)/.test(className)) return 1;
  if (/(?:^|\s)aspect-video(?=\s|$)/.test(className)) return 9 / 16;
  return undefined;
}
