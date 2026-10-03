#!/usr/bin/env node
/**
 * Scroll-smoothness probe. Wheel-scrolls the page top to bottom in installed Chrome and
 * records every animation frame, long tasks, layout shifts and transferred bytes.
 *
 *   node scripts/perf.mjs [--url=http://localhost:3000/] [--vp=desktop|mobile] [--cpu=4] [--out=.qa/perf] [--touch=true|false]
 *   (mobile scrolls with real touch swipes by default; desktop with wheel events)
 *
 * --cpu=N throttles the CPU N times (DevTools emulation) to approximate a mid-range laptop/phone.
 * Writes <out>/perf-<vp>.json and prints a summary: fps, % janky frames (>20ms / >33ms),
 * worst frames with scroll position, long tasks, CLS, image/JS/font bytes, heaviest images,
 * DOM size, number of ScrollTriggers, will-change layers, backdrop-filter/filter elements.
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
const url = args.url ?? "http://localhost:3000/";
const vpName = args.vp ?? "desktop";
const cpu = Number(args.cpu ?? 1);
const out = path.resolve(args.out ?? ".qa/perf");
fs.mkdirSync(out, { recursive: true });

const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: VPS[vpName],
  isMobile: vpName === "mobile",
  hasTouch: vpName === "mobile",
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("tm-intro-seen", "1");
  } catch {}
  window.__perf = { frames: [], long: [], cls: 0 };
  let last = performance.now();
  const loop = (t) => {
    window.__perf.frames.push([t - last, window.scrollY]);
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.long.push([e.duration, window.scrollY]);
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

// Reset counters, then scroll the whole page with real wheel events (~1.2 screens/sec).
await page.evaluate(() => {
  window.__perf.frames = [];
  window.__perf.long = [];
});
await page.mouse.move(VPS[vpName].width / 2, VPS[vpName].height / 2);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
const t0 = Date.now();
const touch = args.touch === "true" || (args.touch !== "false" && vpName === "mobile");
for (let i = 0; i < 2000; i++) {
  if (touch) {
    // Real finger swipe (native touch scrolling), the way phones actually scroll.
    await cdp.send("Input.synthesizeScrollGesture", {
      x: Math.round(VPS[vpName].width / 2), y: Math.round(VPS[vpName].height * 0.7),
      yDistance: -600, speed: 900, gestureSourceType: "touch", repeatCount: 1,
    }).catch(() => {});
    await page.waitForTimeout(120);
    const y2 = await page.evaluate(() => scrollY + innerHeight).catch(() => 0);
    if (y2 >= H - 4 || Date.now() - t0 > 150000) break;
    continue;
  }
  await page.mouse.wheel(0, 90);
  await page.waitForTimeout(70);
  const y = await page.evaluate(() => scrollY + innerHeight).catch(() => 0);
  if (y >= H - 4 || Date.now() - t0 > 150000) break;
}
await page.waitForTimeout(1500);
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

const data = await page.evaluate(() => {
  const res = performance.getEntriesByType("resource");
  const sum = (f) => res.filter(f).reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0);
  const isImg = (r) => r.initiatorType === "img" || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(r.name) || r.name.includes("images.unsplash.com");
  const imgs = res.filter(isImg).map((r) => ({ url: r.name.slice(0, 140), kb: Math.round((r.transferSize || r.encodedBodySize || 0) / 1024) }));
  const all = [...document.querySelectorAll("*")];
  const cs = (el) => getComputedStyle(el);
  const willChange = all.filter((e) => { const w = cs(e).willChange; return w && w !== "auto"; }).length;
  const backdrop = all.filter((e) => { const b = cs(e).backdropFilter; return b && b !== "none"; }).length;
  const filters = all.filter((e) => { const f = cs(e).filter; return f && f !== "none"; }).length;
  const fixed = all.filter((e) => cs(e).position === "fixed").length;
  const imgEls = [...document.images].map((i) => ({
    src: (i.currentSrc || i.src).slice(0, 120),
    natural: `${i.naturalWidth}x${i.naturalHeight}`,
    shown: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
  }));
  return {
    frames: window.__perf.frames,
    long: window.__perf.long,
    cls: window.__perf.cls,
    bytes: {
      imagesKB: Math.round(sum(isImg) / 1024),
      jsKB: Math.round(sum((r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name)) / 1024),
      fontsKB: Math.round(sum((r) => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name)) / 1024),
      cssKB: Math.round(sum((r) => /\.css(\?|$)/.test(r.name)) / 1024),
    },
    heaviestImages: imgs.sort((a, b) => b.kb - a.kb).slice(0, 8),
    oversizedImages: imgEls.filter((i) => { const [nw] = i.natural.split("x").map(Number); const [sw] = i.shown.split("x").map(Number); return sw > 0 && nw > sw * 2.6; }).slice(0, 8),
    upscaledImages: imgEls.filter((i) => { const [nw] = i.natural.split("x").map(Number); const [sw] = i.shown.split("x").map(Number); return nw > 0 && nw < sw * 0.95; }).slice(0, 8),
    dom: all.length,
    scrollTriggers: window.ScrollTrigger?.getAll?.().length ?? null,
    willChange,
    backdrop,
    filters,
    fixed,
  };
});
await browser.close();

const ft = data.frames.map((f) => f[0]).filter((d) => d > 0 && d < 1000);
const avg = ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length);
const pct = (n) => Math.round((ft.filter((d) => d > n).length / Math.max(1, ft.length)) * 1000) / 10;
const sorted = [...ft].sort((a, b) => a - b);
const p = (q) => Math.round(sorted[Math.floor(q * (sorted.length - 1))] * 10) / 10;
const worst = data.frames
  .filter((f) => f[0] < 1000)
  .sort((a, b) => b[0] - a[0])
  .slice(0, 10)
  .map(([d, y]) => ({ ms: Math.round(d), scrollY: Math.round(y) }));
const summary = {
  url,
  vp: vpName,
  cpuThrottle: cpu,
  frames: ft.length,
  fps: Math.round(1000 / avg),
  p50ms: p(0.5),
  p95ms: p(0.95),
  p99ms: p(0.99),
  jankOver20ms: pct(20) + "%",
  jankOver33ms: pct(33) + "%",
  worstFrames: worst,
  longTasks: data.long.length,
  longTaskMsTotal: Math.round(data.long.reduce((a, l) => a + l[0], 0)),
  cls: Math.round(data.cls * 1000) / 1000,
  bytes: data.bytes,
  heaviestImages: data.heaviestImages,
  oversizedImages: data.oversizedImages,
  upscaledImages: data.upscaledImages,
  dom: data.dom,
  scrollTriggers: data.scrollTriggers,
  willChangeLayers: data.willChange,
  backdropFilterEls: data.backdrop,
  filterEls: data.filters,
  fixedEls: data.fixed,
};
fs.writeFileSync(path.join(out, `perf-${vpName}${cpu > 1 ? `-cpu${cpu}` : ""}.json`), JSON.stringify({ summary, raw: data }, null, 1));
console.log(JSON.stringify(summary, null, 2));
