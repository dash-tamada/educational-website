#!/usr/bin/env node
/**
 * Pre-sizes the brand logos for next/image (see src/lib/image-loader.ts).
 * The custom loader cannot resize local files at runtime, so every width that
 * next/image can put in a srcset (imageSizes + deviceSizes up to the source
 * width) gets its own WebP: public/brand/v/<name>-<w>.webp. This keeps the
 * srcset descriptors honest (a "256w" file really is 256px wide), so the
 * browser never computes a fake density and never upscales the mark.
 *
 *   node scripts/brand-variants.mjs        (re-run after replacing a logo PNG)
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = ["tamada-media-logo-dark", "tamada-media-logo-light"];
export const BRAND_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200];
const dir = path.resolve("public/brand");
const out = path.join(dir, "v");
fs.mkdirSync(out, { recursive: true });
let total = 0;
for (const name of SRC) {
  const input = path.join(dir, `${name}.png`);
  const { width } = await sharp(input).metadata();
  for (const w of [...BRAND_WIDTHS.filter((x) => x < width), width]) {
    const file = path.join(out, `${name}-${w}.webp`);
    await sharp(input)
      .resize({ width: w })
      .webp({ quality: 88, alphaQuality: 90, effort: 6, smartSubsample: true })
      .toFile(file);
    const kb = fs.statSync(file).size / 1024;
    total += kb;
    console.log(path.relative(process.cwd(), file), kb.toFixed(1) + " KB");
  }
}
console.log("total", total.toFixed(1), "KB");
