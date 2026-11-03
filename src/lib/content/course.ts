import type { MediaKey } from "@/lib/media";
import { DIRECTOR } from "./director";
import { FLAGSHIP } from "./site";

/* =============================================================================
   COURSE PAGE + CHECKOUT COPY (src/app/(public)/courses/[slug], /checkout/*,
   src/components/catalog). Server- and client-safe (no React).
   Only the flagship (FLAGSHIP.id) gets the editorial extras below; any other
   course renders from its own mock data (title, promise, outcomes, curriculum).
   Numbers that can change in the demo store (price, learners, lessons, rating)
   are NOT written here: the page reads them live from src/lib/mock.
   ============================================================================= */

/** Text with words to set in red (per word, case-insensitive, punctuation ignored). */
export type RedLine = { text: string; red: string[] };

export const COURSE_PAGE = {
  /* ---- 01 Hero (theatre) ------------------------------------------------------ */
  hero: {
    /** small caps line above the title */
    kicker: "Course 01 · AI Filmmaking",
    /** giant Anton lockup: small first line + the giant word */
    titleTop: "Prompt to",
    title: "Premiere",
    statement: {
      text: "Write, shoot, voice, score and cut a short film with AI. No camera. No crew. Your vision.",
      red: ["vision"],
    } satisfies RedLine,
    /** the trailer poster (play opens the free first lesson) */
    poster: "still-cinema-neon" as MediaKey,
    /** caption + subtitle facts the mock data doesn't carry */
    languages: "English · Hindi subtitles",
    by: `${DIRECTOR.name}, director`,
  },

  /* ---- 02 Outcomes ------------------------------------------------------------- */
  outcomes: {
    label: "What you'll be able to do",
    statement: {
      text: "Not prompts that make pretty clips. A director's method that turns one idea into a finished film: story, look, motion, sound and the cut.",
      red: ["finished", "film"],
    } satisfies RedLine,
  },

  /* ---- 03 Who it's for ------------------------------------------------------------ */
  audience: {
    label: "Who it's for",
    title: "For people with stories and no crew.",
    items: [
      { who: "First-time filmmakers", body: "You have films in your head and no camera, crew or budget. You leave with a finished short and a method you can repeat." },
      { who: "Editors & motion designers", body: "You already know the cut. Add generation, continuity and sound design, and direct whole pieces yourself." },
      { who: "Creators & ad-makers", body: "Reels, brand spots and music videos that look directed, not generated. Plan credits, deliver on time." },
      { who: "Writers & storytellers", body: "Turn a logline into something people can watch. Story first; the tools serve the script." },
    ],
    before: "Before you start",
  },

  /* ---- 04 Curriculum ----------------------------------------------------------- */
  curriculum: {
    label: "Curriculum",
    title: "Ten modules. One premiere.",
    note: "Built in the order a film is actually made. A checkpoint test closes every big idea: pass it to unlock what comes next.",
  },

  /* ---- 05 Capstone (theatre) ------------------------------------------------------- */
  capstone: {
    label: "Capstone",
    titleTop: "Your",
    title: "60-second premiere",
    body: "The course ends with a film, not a quiz. One complete short, scripted, generated, voiced, scored, cut and graded by you, on a production calendar that fits two weekends.",
    image: "poster-m11" as MediaKey,
    caption: "Module 11 · Brief, workbook and Arjun's feedback rubric",
    steps: [
      { when: "W1 · Sat", title: "Logline, script, shot list", body: "One sentence, one page, twelve numbered shots that double as your prompt list." },
      { when: "W1 · Sun", title: "Look development", body: "Style frames and a style bible that lock the film's look before a single video credit." },
      { when: "W2 · Sat", title: "Shots in motion", body: "Generate, direct and fix every shot: lens, movement, light and the same face throughout." },
      { when: "W2 · Sun", title: "Voice, score, cut and grade", body: "Cast the voices, sync the lips, score it, then edit and grade in DaVinci Resolve." },
      { when: "Premiere", title: "Release it", body: "Export for Reels, YouTube or a festival, label it honestly, and share it for feedback." },
    ],
  },

  /* ---- 06 Toolkit strip ------------------------------------------------------------ */
  tools: {
    label: "Toolkit",
    line: "Tools change every month. The decisions behind them don't. You learn both, and lessons are re-shot when the tools move.",
  },

  /* ---- 07 Director (theatre) -------------------------------------------------------- */
  director: {
    label: "Your director",
    portrait: DIRECTOR.portrait,
    quote: DIRECTOR.quotes[0],
    cta: { label: "Meet your director", href: "/about" },
  },

  /* ---- 08 Reviews ------------------------------------------------------------------- */
  reviews: {
    label: "Reviews",
    title: "From the class",
    sample: "Sample reviews from stand-in learners (demo data).",
  },

  /* ---- 09 Certificate --------------------------------------------------------------- */
  certificate: {
    label: "Certificate",
    title: FLAGSHIP.certificateTitle,
    body: "Finish every lesson, pass the checkpoints and premiere your capstone. Your certificate gets its own public page with a code anyone can verify.",
    cta: { label: "Verify a certificate", href: "/certificates" },
    sampleName: "Your name here",
    sampleCode: "TM-AF-2026-0000",
  },

  /* ---- 11 First lesson free (theatre) ------------------------------------------------- */
  free: {
    label: "First lesson free",
    title: "Watch lesson 01",
    note: "No card. No account. The whole pipeline in one lesson.",
    image: "still-tokyo-crossing" as MediaKey,
  },

  /* ---- Final CTA (theatre) ------------------------------------------------------------ */
  final: {
    text: "Your premiere starts with lesson one.",
    red: ["premiere"],
    owned: "Your premiere is waiting.",
  },

  /* ---- What's included (purchase rail) --------------------------------------------- */
  includedTitle: "What's included",
  trust: ["7-day refund", "Lifetime access", "GST included"],
} as const;

/* ---- Checkout ------------------------------------------------------------------------ */
export const CHECKOUT = {
  label: "Checkout",
  demo: "Demo payment",
  demoNote: "Pick any method: no money moves and we never ask for card or bank details. In the real app, Razorpay opens here.",
  trust: ["7-day refund", "Lifetime access", "GST invoice", "No real payment (demo)"],
  steps: { account: "Your account", method: "Payment method", confirm: "Confirm and pay" },
} as const;

/* ---- Success (theatre "premiere" moment) ------------------------------------------------- */
export const SUCCESS = {
  next: [
    { title: "Watch at your pace", body: "Short lessons, progress saves itself. Phone or laptop." },
    { title: "Pass the checkpoints", body: "Each one unlocks the next module." },
    { title: "Premiere and get certified", body: "Finish your 60-second short and claim your certificate." },
  ],
} as const;
