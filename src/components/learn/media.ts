"use client";

import imageLoader from "@/lib/image-loader";
import { cropSrc } from "@/lib/img";
import type { Resource } from "@/lib/mock/types";
import { resourceOutline } from "@/lib/mock/extra/learn";

/** A sized 16:9 Unsplash URL for <video poster> (which can't use next/image). */
export function posterUrl(src: string, width = 1280) {
  return imageLoader({ src: cropSrc(src, 9 / 16), width, quality: 75 });
}

/* ----------------------------------------------------------------------------- autoplay hand-off */
/**
 * Set right before the countdown navigates to the next VIDEO, consumed by the
 * player that mounts on exactly that path (and only within a few seconds). A
 * stale request (e.g. the next item was a test) can never start a later video.
 */
let autoplayPending: { href: string; at: number } | null = null;
export const requestAutoplay = (href: string) => {
  autoplayPending = { href, at: Date.now() };
};
export const consumeAutoplay = (pathname: string) => {
  const p = autoplayPending;
  autoplayPending = null;
  return !!p && p.href === pathname && Date.now() - p.at < 8000;
};
export const clearAutoplay = () => {
  autoplayPending = null;
};

/* ----------------------------------------------------------------------------- viewer prefs */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`tm-player-${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function writePref(key: string, value: unknown) {
  try {
    window.localStorage.setItem(`tm-player-${key}`, JSON.stringify(value));
  } catch {
    /* private mode: keep it in memory only */
  }
}

/* ----------------------------------------------------------------------------- resource meta */
export const FILE_META: Record<
  Resource["fileType"],
  { label: string; ext: string; tone: string; icon: string }
> = {
  pdf: {
    label: "PDF",
    ext: "pdf",
    tone: "bg-[#ffe1d4] text-[#b02f00]",
    icon: "file",
  },
  template: {
    label: "Template",
    ext: "pdf",
    tone: "bg-[#e7e0fb] text-indigo",
    icon: "layers",
  },
  zip: {
    label: "ZIP",
    ext: "zip",
    tone: "bg-butter text-[#6b5400]",
    icon: "download",
  },
  sheet: {
    label: "Sheet",
    ext: "csv",
    tone: "bg-mint text-forest",
    icon: "grid",
  },
  link: {
    label: "Link",
    ext: "",
    tone: "bg-[#dfe8ff] text-blue",
    icon: "link",
  },
  audio: {
    label: "Audio",
    ext: "txt",
    tone: "bg-blush text-[#8a0d55]",
    icon: "music",
  },
};

export function formatSize(kb?: number) {
  if (!kb) return null;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/* ----------------------------------------------------------------------------- demo downloads */
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Escape text for a PDF string literal (ASCII only). */
const pdfText = (s: string) =>
  s.replace(/[^\x20-\x7e]/g, "-").replace(/([\\()])/g, "\\$1");

/** A tiny, valid one-page PDF with the given lines (Helvetica). */
function makePdf(lines: string[]): Blob {
  const content = [
    "BT",
    "/F1 20 Tf",
    "56 780 Td",
    "26 TL",
    ...lines.map(
      (l, i) => `${i === 2 ? "/F1 12 Tf 18 TL " : ""}(${pdfText(l)}) '`,
    ),
    "ET",
  ].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}

/**
 * Generates a small demo file in the browser and saves it (no server, nothing
 * real is downloaded). Links open the resource URL in a new tab instead.
 */
export function downloadDemoResource(resource: Resource, courseTitle: string) {
  const meta = FILE_META[resource.fileType];
  if (resource.fileType === "link") {
    window.open(resource.url, "_blank", "noopener,noreferrer");
    return;
  }
  const lines = resourceOutline(resource, courseTitle);
  let blob: Blob;
  let ext = meta.ext;
  if (resource.fileType === "pdf" || resource.fileType === "template")
    blob = makePdf(lines);
  else if (resource.fileType === "sheet")
    blob = new Blob(
      [
        [
          "Topic,Status,Notes",
          ...lines
            .filter(Boolean)
            .slice(1, 6)
            .map(
              (l, i) =>
                `"${l.trim().replace(/"/g, "'")}",${i < 2 ? "Done" : "To do"},`,
            ),
        ].join("\n"),
      ],
      { type: "text/csv" },
    );
  else {
    // zip / audio: a readme stands in for the real file in the demo
    ext = "txt";
    blob = new Blob([lines.join("\n")], { type: "text/plain" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(resource.title)}${resource.fileType === "zip" || resource.fileType === "audio" ? "-readme" : ""}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
