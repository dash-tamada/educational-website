#!/usr/bin/env node
/**
 * Visual QA capture tool. Drives the locally installed Google Chrome via
 * playwright-core and writes JPEG frames + an index.json you can review.
 *
 *   node scripts/capture.mjs --out=.qa/run1                       # scroll sweep, desktop+tablet+mobile
 *   node scripts/capture.mjs --out=.qa/hero --mode=intro           # intro curtain, frame by frame
 *   node scripts/capture.mjs --out=.qa/steps --mode=motion --target="#how" --frames=30
 *   node scripts/capture.mjs --out=.qa/rm --reduced                # prefers-reduced-motion
 *   node scripts/capture.mjs --out=.qa/ref --url=https://krackerz.com/ --vp=desktop
 *
 * Options
 *   --url=       page to capture (default http://localhost:3000/)
 *   --out=       output directory (required)
 *   --vp=        comma list: desktop(1440x900) laptop(1280x720) tablet(768x1024) mobile(375x812)
 *   --mode=      sweep | intro | motion | full   (default sweep)
 *   --reduced    emulate prefers-reduced-motion: reduce
 *   --intro      (sweep/motion) let the intro curtain play instead of skipping it
 *   --step=      sweep step as a fraction of the viewport height (default 0.8)
 *   --settle=    ms to wait after each sweep scroll (default 1300)
 *   --from= --to=  sweep only between these page Y offsets (px)
 *   --target=    motion: CSS selector to animate through (default main)
 *   --frames=    motion/intro: number of frames (default 24)
 *   --interval=  motion/intro: ms between frames (default 90)
 *   --wheel=     motion: px per wheel tick between frames (default 140)
 *   --quality=   JPEG quality (default 70)
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);

if (!args.out) {
  console.error("--out=<dir> is required");
  process.exit(1);
}

const VPS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};
const url = args.url ?? "http://localhost:3000/";
const out = path.resolve(args.out);
const mode = args.mode ?? "sweep";
const vps = (args.vp ?? (mode === "sweep" ? "desktop,tablet,mobile" : "desktop")).split(",");
const quality = Number(args.quality ?? 70);
const isLocal = /localhost|127\.0\.0\.1/.test(url);
fs.mkdirSync(out, { recursive: true });

const report = { url, mode, reduced: !!args.reduced, frames: [], diagnostics: {} };

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function newPage(vpName) {
  const vp = VPS[vpName];
  if (!vp) throw new Error(`unknown viewport ${vpName}`);
  const mobile = vpName === "mobile";
  const ctx = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: args.reduced ? "reduce" : "no-preference",
  });
  if (isLocal && mode !== "intro" && !args.intro) {
    // Skip the once-per-session intro curtain so frames show the page itself.
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("tm-intro-seen", "1");
      } catch {}
    });
  }
  const page = await ctx.newPage();
  const diag = { consoleErrors: [], pageErrors: [], brokenImages: [], overflowX: null };
  page.on("console", (m) => {
    if (m.type() === "error") diag.consoleErrors.push(m.text().slice(0, 400));
  });
  page.on("pageerror", (e) => diag.pageErrors.push(String(e).slice(0, 400)));
  return { ctx, page, diag };
}

async function load(page) {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // Hide the Next.js dev-tools badge so it doesn't pollute frames.
  await page
    .addStyleTag({ content: "nextjs-portal{display:none!important}" })
    .catch(() => {});
  await page.waitForTimeout(isLocal ? 1200 : 3500);
}

async function frameInfo(page) {
  return page.evaluate(() => {
    const vh = innerHeight;
    const headings = [...document.querySelectorAll("h1,h2,h3")]
      .filter((h) => {
        const r = h.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh && r.width > 0;
      })
      .slice(0, 6)
      .map((h) => h.textContent.replace(/\s+/g, " ").trim().slice(0, 50));
    return { y: Math.round(scrollY), headings };
  });
}

async function shoot(page, vpName, name, extra = {}) {
  const file = `${vpName}-${name}.jpg`;
  await page.screenshot({ path: path.join(out, file), type: "jpeg", quality });
  const info = await frameInfo(page);
  report.frames.push({ file, vp: vpName, ...info, ...extra });
  return file;
}

async function diagnostics(page, diag) {
  const d = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - innerWidth,
    brokenImages: [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src)
      .slice(0, 10),
    scrollHeight: document.documentElement.scrollHeight,
  }));
  return { ...diag, ...d };
}

for (const vpName of vps) {
  const { ctx, page, diag } = await newPage(vpName);
  const vh = VPS[vpName].height;

  if (mode === "intro") {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const frames = Number(args.frames ?? 30);
    const interval = Number(args.interval ?? 100);
    for (let f = 0; f < frames; f++) {
      await shoot(page, vpName, `intro-${String(f).padStart(3, "0")}`, { t: f * interval });
      await page.waitForTimeout(interval);
    }
  } else if (mode === "motion") {
    await load(page);
    const target = args.target ?? "main";
    const frames = Number(args.frames ?? 24);
    const interval = Number(args.interval ?? 90);
    const wheel = Number(args.wheel ?? 140);
    // Start with the target's top edge at the bottom of the viewport.
    const startY = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return 0;
      return Math.max(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.9);
    }, target);
    await page.evaluate((y) => window.scrollTo(0, y), startY);
    await page.waitForTimeout(1200);
    await page.mouse.move(VPS[vpName].width / 2, vh / 2);
    const slug = target.replace(/[^a-z0-9]+/gi, "") || "main";
    for (let f = 0; f < frames; f++) {
      await shoot(page, vpName, `motion-${slug}-${String(f).padStart(3, "0")}`, { frame: f });
      await page.mouse.wheel(0, wheel);
      await page.waitForTimeout(interval);
    }
  } else if (mode === "full") {
    await load(page);
    // Walk the page once so scroll-triggered reveals have fired, then capture it whole.
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += vh * 0.7) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(350);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const file = `${vpName}-full.jpg`;
    await page.screenshot({ path: path.join(out, file), type: "jpeg", quality, fullPage: true });
    report.frames.push({ file, vp: vpName, y: 0, headings: ["(full page)"] });
  } else {
    await load(page);
    const step = Number(args.step ?? 0.8);
    const settle = Number(args.settle ?? 1300);
    const from = Number(args.from ?? 0);
    let H = await page.evaluate(() => document.documentElement.scrollHeight);
    const to = Number(args.to ?? H);
    let y = from;
    let i = 0;
    for (;;) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(settle);
      await shoot(page, vpName, `sweep-${String(i).padStart(3, "0")}`);
      H = await page.evaluate(() => document.documentElement.scrollHeight);
      if (y + vh >= Math.min(H, to + vh) - 2) break;
      y = Math.min(y + Math.round(vh * step), H - vh, to);
      i++;
      if (i > 200) break;
    }
  }

  report.diagnostics[vpName] = await diagnostics(page, diag);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      out,
      frames: report.frames.length,
      diagnostics: Object.fromEntries(
        Object.entries(report.diagnostics).map(([k, v]) => [
          k,
          {
            overflowX: v.overflowX,
            consoleErrors: v.consoleErrors.length,
            pageErrors: v.pageErrors.length,
            brokenImages: v.brokenImages.length,
            scrollHeight: v.scrollHeight,
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
