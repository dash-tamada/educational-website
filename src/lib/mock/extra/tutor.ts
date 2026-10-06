/* =============================================================================
   Extra mock data for the tutor studio (owned by the tutor area).
   Deterministic: no Math.random, no Date.now. Built on the foundation's types;
   never mutates SEED_DB.
   ============================================================================= */

import type { AnalyticsRange, CourseLevel, Tone } from "@/lib/mock/types";

const u = (id: string) => `https://images.unsplash.com/${id}`;

/** Cover presets for the new-course wizard and the builder settings (verified Unsplash ids used by the seed). */
export const THUMBNAIL_PRESETS: { id: string; src: string; label: string; tone: Tone }[] = [
  { id: "code", src: u("photo-1461749280684-dccba630e2f6"), label: "Code on screen", tone: "sun" },
  { id: "react", src: u("photo-1633356122544-f134324a6cee"), label: "Front-end", tone: "indigo" },
  { id: "git", src: u("photo-1556075798-4825dfaaf498"), label: "Dev workflow", tone: "butter" },
  { id: "python", src: u("photo-1526379095098-d400fd0bf935"), label: "Python", tone: "cyan" },
  { id: "data", src: u("photo-1460925895917-afdab827c52f"), label: "Charts and data", tone: "mint" },
  { id: "colour", src: u("photo-1561070791-2526d30994b5"), label: "Colour and design", tone: "hotpink" },
  { id: "ui", src: u("photo-1581291518857-4e27b48ff24e"), label: "UI sketches", tone: "lilac" },
  { id: "guitar", src: u("photo-1525201548942-d8732f6617a0"), label: "Music", tone: "tangerine" },
  { id: "camera", src: u("photo-1516035069371-29a1b244cc32"), label: "Photography", tone: "blue" },
  { id: "mic", src: u("photo-1478737270239-2f02b77fc618"), label: "Podcasting", tone: "flame" },
  { id: "money", src: u("photo-1633158829585-23ba8f7c8caf"), label: "Money", tone: "green" },
  { id: "science", src: u("photo-1614935151651-0bea6508db6b"), label: "Science", tone: "turquoise" },
  { id: "physics", src: u("photo-1636466497217-26a8cbeaf0aa"), label: "Exam prep", tone: "purple" },
  { id: "talk", src: u("photo-1543269865-cbf427effbad"), label: "Speaking", tone: "blush" },
  { id: "kitchen", src: u("photo-1589301760014-d929f3979dbc"), label: "Cooking", tone: "sun" },
  { id: "social", src: u("photo-1611224923853-80b023f02d71"), label: "Social media", tone: "magenta" },
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

export const PRICE_PRESETS = [499, 799, 999, 1499, 1999];
export const PRICE_MIN = 199;
export const PRICE_MAX = 9999;
export const GST_RATE = 0.18;

/** Sample filenames for the mock upload ("Use a sample clip"). */
export const SAMPLE_VIDEOS = [
  { name: "lesson-take-3-final.mp4", sizeMb: 248, durationSec: 734 },
  { name: "screen-recording-0412.mov", sizeMb: 412, durationSec: 1022 },
  { name: "intro-walkthrough.mp4", sizeMb: 96, durationSec: 318 },
  { name: "worked-example-v2.mp4", sizeMb: 187, durationSec: 545 },
];
export const SAMPLE_FILES = [
  { name: "cheat-sheet.pdf", sizeKb: 312, fileType: "pdf" as const },
  { name: "starter-files.zip", sizeKb: 2_140, fileType: "zip" as const },
  { name: "practice-workbook.xlsx", sizeKb: 186, fileType: "sheet" as const },
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
    label: "Share your code",
    body: "Can you paste the exact error message (or a screenshot of your code)? Nine times out of ten it's a tiny typo, and I'll spot it faster.",
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
  "Your free preview is your trailer. Make the first 30 seconds count.",
];
