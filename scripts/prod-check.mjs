#!/usr/bin/env node
/**
 * Production smoothness check without touching the running dev server:
 * snapshots the app into .qa/prod/app (node_modules linked as a junction), runs
 * `next build` + `next start -p 3100` there, then runs scripts/perf.mjs against it.
 *
 *   node scripts/prod-check.mjs [--vp=desktop,mobile] [--cpu=4] [--name=prod] [--port=3100] [--keep]
 *   --name/--port let several agents run isolated checks at once (e.g. --name=prod-hero --port=3101).
 *   --keep leaves the production server running (kill it yourself when done).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const root = process.cwd();
const NAME = args.name ?? "prod";
const app = path.join(root, ".qa", NAME, "app");
const PORT = Number(args.port ?? 3100);

fs.rmSync(app, { recursive: true, force: true });
fs.mkdirSync(app, { recursive: true });
for (const f of ["src", "public", "next.config.ts", "package.json", "tsconfig.json", "postcss.config.mjs"]) {
  if (fs.existsSync(path.join(root, f))) fs.cpSync(path.join(root, f), path.join(app, f), { recursive: true });
}
fs.symlinkSync(path.join(root, "node_modules"), path.join(app, "node_modules"), "junction");

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
console.log("building production snapshot...");
const b = spawnSync(process.execPath, [nextBin, "build"], { cwd: app, encoding: "utf8" });
const buildOut = (b.stdout || "") + (b.stderr || "");
fs.writeFileSync(path.join(root, ".qa", NAME, "build.log"), buildOut);
if (b.status !== 0) {
  console.error("BUILD FAILED\n" + buildOut.split("\n").slice(-40).join("\n"));
  process.exit(1);
}
console.log(buildOut.split("\n").filter((l) => /Route|○|ƒ|First Load|✓ Compiled/.test(l)).join("\n"));

const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { cwd: app, stdio: "ignore" });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(url);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

const vps = (args.vp ?? "desktop,mobile").split(",");
for (const vp of vps) {
  const r = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "perf.mjs"), `--url=${url}`, `--vp=${vp}`, `--cpu=${args.cpu ?? 4}`, `--out=${path.join(root, ".qa", NAME)}`],
    { cwd: root, encoding: "utf8" },
  );
  console.log(`\n===== ${vp} (cpu x${args.cpu ?? 4}) =====\n` + (r.stdout || r.stderr));
}

if (args.keep) {
  console.log(`production server left running at ${url} (pid ${server.pid})`);
  server.unref();
} else {
  server.kill();
}
