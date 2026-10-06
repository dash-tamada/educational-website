/* =============================================================================
   Extra mock data for the learning player (/learn/**). Owned by the "learn" area.
   Deterministic, built on the foundation types; never mutates SEED_DB.

   - Sample footage: the seed's lesson.videoPath is a storage path for a video that
     doesn't exist yet, so the player maps every lesson to one of a few public,
     openly licensed sample clips (Blender open movies, W3C/Video.js test media).
     The player labels it "Sample footage" so nobody mistakes it for the lesson.
   - Posters: coding courses rotate a few laptop/code photos; others use the
     course thumbnail.
   - The older sample Q&A threads (ids "xcmt_*") now live in the seed
     (src/lib/mock/seed/qa-player.ts), so the player reads db.comments only.
   ============================================================================= */

import type {
  Course,
  ModuleItem,
  Resource,
} from "@/lib/mock/types";
import { u } from "@/lib/mock/seed/util";

/* ----------------------------------------------------------------------------- sample footage */
export interface SampleVideo {
  src: string;
  /** real duration of the clip (seconds) */
  durationSec: number;
  credit: string;
}

/** Short clips (lessons under 15 minutes): quick to finish, so the 90% rule is easy to try. */
const SHORT: SampleVideo[] = [
  {
    src: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    durationSec: 52,
    credit: "Sintel trailer, Blender Foundation (CC BY)",
  },
  {
    src: "https://media.w3.org/2010/05/bunny/trailer.mp4",
    durationSec: 33,
    credit: "Big Buck Bunny trailer, Blender Foundation (CC BY)",
  },
  {
    src: "https://vjs.zencdn.net/v/oceans.mp4",
    durationSec: 47,
    credit: "Oceans sample clip, Video.js test media",
  },
];
/** Long clips (lessons of 15 minutes or more), so resuming at 7:40 makes sense. */
const LONG: SampleVideo[] = [
  {
    src: "https://media.w3.org/2010/05/bunny/movie.mp4",
    durationSec: 596,
    credit: "Big Buck Bunny, Blender Foundation (CC BY)",
  },
  {
    src: "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
    durationSec: 654,
    credit: "Elephants Dream, Blender Foundation (CC BY)",
  },
];

const hash = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Last-resort stream if the primary and the pool backups can't be reached. */
const BACKUP: SampleVideo = {
  src: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  durationSec: 10,
  credit: "Big Buck Bunny test clip, Blender Foundation (CC BY)",
};

/** The public sample clip that stands in for a lesson video. */
export function sampleVideoFor(item: ModuleItem): SampleVideo {
  if (item.type !== "video") return SHORT[0];
  const pool = item.lesson.durationSec >= 15 * 60 ? LONG : SHORT;
  // the demo learner's resume lesson (wd-4-2, 7:40 in) always gets the fast, long clip
  if (item.id === "wd-4-2") return LONG[0];
  return pool[hash(item.id) % pool.length];
}

/**
 * Ordered stream URLs for a lesson: its sample clip first, then one other clip
 * of similar length and a tiny backup. The player falls through them on load
 * errors before showing the "didn't load" screen. (The Google sample bucket
 * often suggested for demos now answers 403, so it is not used.)
 */
export function sampleSourcesFor(item: ModuleItem): string[] {
  const first = sampleVideoFor(item);
  const pool =
    item.type === "video" && item.lesson.durationSec >= 15 * 60 ? LONG : SHORT;
  const alt = pool.find((v) => v.src !== first.src);
  return [first.src, ...(alt ? [alt.src] : []), BACKUP.src];
}

/* ----------------------------------------------------------------------------- posters */
const CODE_POSTERS = [
  u("photo-1461749280684-dccba630e2f6"),
  u("photo-1498050108023-c5249f4df085"),
  u("photo-1517694712202-14dd9538aa97"),
  u("photo-1555066931-4365d14bab8c"),
  u("photo-1504639725590-34d0984388bd"),
  u("photo-1515879218367-8466d910aaa4"),
  u("photo-1587620962725-abab7fe55159"),
];
const CODE_COURSES = new Set([
  "crs_webdev",
  "crs_python",
  "crs_react",
  "crs_git",
]);

/** Unsplash poster for a lesson (no tm-ar hint: the caller crops it). */
export function posterFor(course: Course, item: ModuleItem): string {
  if (CODE_COURSES.has(course.id)) {
    const [, m = "1", p = "1"] = item.id.split("-");
    return (
      CODE_POSTERS[(Number(m) * 3 + Number(p)) % CODE_POSTERS.length] ??
      course.thumbnail
    );
  }
  return course.thumbnail;
}

/* ----------------------------------------------------------------------------- resource file preview */
/**
 * Three "what's inside" lines for a download, picked from what the file is
 * (its type, and words in its title like poster / worksheet / checklist), so a
 * guitar chord poster never promises copy-paste code snippets.
 */
export function resourceBullets(
  r: Pick<Resource, "title" | "fileType">,
): string[] {
  const t = r.title.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (r.fileType === "link")
    return [
      "Opens in a new tab, nothing to install",
      "Make your own copy so you can remix it freely",
      "Free to use alongside the course",
    ];
  if (r.fileType === "audio")
    return [
      "Short tracks, ready to drop into your edits",
      "Royalty-free for your own projects",
      "A readme with the licence in plain words",
    ];
  if (has("preset"))
    return [
      "Every preset from the lessons, ready to import",
      "Step-by-step install notes for phone and desktop",
      "Before / after examples so you know what each one does",
    ];
  if (has("dataset"))
    return [
      "Clean and messy versions of each dataset",
      "A data dictionary explaining every column",
      "Small enough to open on any laptop",
    ];
  if (r.fileType === "zip" || has("repo", "project files", "solution"))
    return [
      "Every file from the lessons, in one folder",
      "Organised by module, so nothing gets lost",
      "A readme on how to open and run it",
    ];
  if (has("poster", "chart"))
    return [
      "Everything from the lessons on one big sheet",
      "Readable from across the room, so you can glance up mid-practice",
      "Prints at A3, or tiled across two A4 pages",
    ];
  if (has("cheat", "card"))
    return [
      "One page, only the essentials",
      "Grouped the way the lessons teach them",
      "Printer-friendly: black and white works fine",
    ];
  if (has("template", "canvas"))
    return [
      "A ready-made structure: just fill in your bits",
      "Example entries so you know what goes where",
      "Make a copy and keep the original clean",
    ];
  if (has("checklist", "list", "tracker"))
    return [
      "Every step in order, with a box to tick",
      "A one-line why next to each step",
      "Print it fresh whenever you start again",
    ];
  if (
    has(
      "worksheet",
      "practice",
      "flashcard",
      "question",
      "problem",
      "prompt",
      "workbook",
      "set",
    )
  )
    return [
      "Exercises in the same order as the lessons",
      "Room to work things out by hand",
      "Answers or a self-check at the end",
    ];
  if (r.fileType === "template" || r.fileType === "sheet")
    return [
      "A ready-made structure: just fill in your bits",
      "Example entries so you know what goes where",
      "Make a copy and keep the original clean",
    ];
  return [
    "The key ideas from this module in one place",
    "Worked examples you can refer back to",
    "A short self-check at the end",
  ];
}

/** What the mock PDF / sheet contains (used to generate the demo download). */
export function resourceOutline(
  r: Pick<Resource, "title" | "fileType">,
  courseTitle: string,
): string[] {
  return [
    `${courseTitle}`,
    `${r.title}`,
    "",
    "This is a demo file generated in your browser by Tamada Media.",
    "In the real course, the tutor's notes, cheat sheets and project files",
    "download from here.",
    "",
    "What you'd find inside:",
    ...resourceBullets(r).map((b, i) => `  ${i + 1}. ${b}`),
    "",
    "Happy learning!",
  ];
}
