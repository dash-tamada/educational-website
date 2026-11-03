/* =============================================================================
   Extra mock data for the tutor studio (owned by the tutor area).
   Deterministic: no Math.random, no Date.now. Built on the foundation's types;
   never mutates SEED_DB.
   ============================================================================= */

import { mediaSrc } from "@/lib/media";
import type { AnalyticsRange, CourseLevel, Tone } from "@/lib/mock/types";

/** Cover presets for the new-course wizard and the builder settings (cinematic stills from the image registry). */
export const THUMBNAIL_PRESETS: { id: string; src: string; label: string; tone: Tone }[] = [
  { id: "clapper", src: mediaSrc("bts-clapper-desert"), label: "On set", tone: "sun" },
  { id: "projector", src: mediaSrc("bts-projector"), label: "Projector beam", tone: "flame" },
  { id: "cinema", src: mediaSrc("bts-cinema-seats"), label: "Cinema seats", tone: "tomato" },
  { id: "edit", src: mediaSrc("bts-edit-timeline"), label: "Edit suite", tone: "indigo" },
  { id: "reels", src: mediaSrc("bts-film-reels"), label: "Film reels", tone: "butter" },
  { id: "studio", src: mediaSrc("bts-music-studio"), label: "Music studio", tone: "hotpink" },
  { id: "mic", src: mediaSrc("bts-microphone"), label: "Voice booth", tone: "tangerine" },
  { id: "neon", src: mediaSrc("still-neon-alley"), label: "Neon night", tone: "magenta" },
  { id: "crossing", src: mediaSrc("still-tokyo-crossing"), label: "City at night", tone: "blue" },
  { id: "desert", src: mediaSrc("still-desert-road"), label: "Desert road", tone: "tangerine" },
  { id: "fog", src: mediaSrc("still-fog-castle"), label: "Fog and stone", tone: "forest" },
  { id: "lake", src: mediaSrc("still-night-lake"), label: "Night sky", tone: "purple" },
  { id: "sunset", src: mediaSrc("still-red-sunset"), label: "Red sun", tone: "flame" },
  { id: "storm", src: mediaSrc("still-teal-storm"), label: "Teal storm", tone: "turquoise" },
  { id: "marquee", src: mediaSrc("still-cinema-neon"), label: "Cinema marquee", tone: "hotpink" },
  { id: "retro", src: mediaSrc("still-retro-tech"), label: "Retro tech", tone: "lilac" },
];

/** Card frame colours a tutor can pick (light + dark frames both work in CourseCard). */
export const CARD_TONES: { value: Tone; label: string }[] = [
  { value: "sun", label: "Sun" },
  { value: "butter", label: "Butter" },
  { value: "tangerine", label: "Tangerine" },
  { value: "hotpink", label: "Hot pink" },
  { value: "blush", label: "Blush" },
  { value: "cyan", label: "Cyan" },
  { value: "mint", label: "Mint" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "lilac", label: "Lilac" },
  { value: "indigo", label: "Indigo" },
  { value: "purple", label: "Purple" },
];

export const COURSE_LANGUAGES = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati"];

export const COURSE_LEVELS: { value: CourseLevel; label: string; description: string }[] = [
  { value: "Beginner", label: "Beginner", description: "No experience needed. Start from zero." },
  { value: "Intermediate", label: "Intermediate", description: "Knows the basics, wants to get good." },
  { value: "Advanced", label: "Advanced", description: "Already confident, wants the deep end." },
  { value: "All levels", label: "All levels", description: "Something for everyone in the room." },
];

export const PRICE_PRESETS = [499, 799, 999, 1499, 1999, 2999];
export const PRICE_MIN = 199;
export const PRICE_MAX = 9999;
export const GST_RATE = 0.18;

/** Sample filenames for the mock upload ("Use a sample clip"). */
export const SAMPLE_VIDEOS = [
  { name: "lesson-take-3-final.mp4", sizeMb: 248, durationSec: 734 },
  { name: "veo-vs-kling-screen-capture.mov", sizeMb: 412, durationSec: 1022 },
  { name: "pipeline-intro-walkthrough.mp4", sizeMb: 96, durationSec: 318 },
  { name: "resolve-grade-breakdown-v2.mp4", sizeMb: 187, durationSec: 545 },
];
export const SAMPLE_FILES = [
  { name: "prompt-cheat-sheet.pdf", sizeKb: 312, fileType: "pdf" as const },
  { name: "style-frames-and-luts.zip", sizeKb: 2_140, fileType: "zip" as const },
  { name: "credit-planner.xlsx", sizeKb: 186, fileType: "sheet" as const },
];

/** Canned replies for the Q&A inbox. */
export const REPLY_TEMPLATES = [
  {
    label: "Great question",
    body: "Great question! Short answer: ",
  },
  {
    label: "Covered later",
    body: "Love that you're thinking ahead. We cover exactly this in the next module, so hang tight. Quick version for now: ",
  },
  {
    label: "Share your prompt",
    body: "Can you paste the exact prompt (and a frame or a short clip of the result)? Nine times out of ten it's one word pulling the model the wrong way, and I'll spot it faster.",
  },
  {
    label: "Check the resource",
    body: "The cheat sheet in this module walks through this step by step. Open it next to the video and pause at the example. Shout if it still doesn't click!",
  },
];

/* ----------------------------------------------------------------------------- deterministic helpers */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Course page funnel: visits -> free preview plays -> purchases, for a course and range.
 * Driven by the sales ledger: `purchases` is the course's enrollments for the range
 * (getTutorAnalytics().byCourse), and the earlier steps are derived backwards from it, so
 * "Bought the course" always matches the By course table and Preview -> purchase stays
 * purchases / previews.
 */
export function getCourseFunnel(courseId: string, purchases: number, range: AnalyticsRange, previewToPurchase: number) {
  const h = hash(courseId + range);
  // each course converts a little differently around the studio-wide rate
  const rate = Math.max(3, previewToPurchase + ((h >> 7) % 5) - 2);
  const previewRate = 0.34 + ((h >> 3) % 9) / 100;
  const previews = purchases > 0 ? Math.round(purchases / (rate / 100)) : 0;
  const visits = previews > 0 ? Math.round(previews / previewRate) : 0;
  const wishlisted = Math.round(previews * (0.11 + ((h >> 5) % 5) / 100));
  return { visits, previews, wishlisted, purchases };
}

/** Masked payout account + tax info for a tutor (sample). */
export function getPayoutAccount(tutorId: string, name: string) {
  const h = hash(tutorId);
  const banks = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"];
  const handle = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  return {
    bank: banks[h % banks.length],
    last4: String(1000 + (h % 9000)),
    ifscPrefix: ["HDFC0", "ICIC0", "SBIN0", "UTIB0", "KKBK0"][h % 5],
    upi: `${handle}@ok${["hdfc", "icici", "sbi", "axis", "kotak"][h % 5]}`,
    panMasked: `•••••${String(1000 + ((h >> 4) % 9000))}${"ABCDEFGHJK"[h % 10]}`,
    payoutDay: 10,
  };
}

/** Friendly studio tips (overview sidebar). */
export const STUDIO_TIPS = [
  "Lessons under 12 minutes get finished 2x more often. Split anything longer.",
  "A test right after a tricky lesson catches confusion before it snowballs.",
  "Reply to questions within a day and your ratings tend to climb.",
  "Your free lesson is your trailer. Make the first 30 seconds count.",
];
