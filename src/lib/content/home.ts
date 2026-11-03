import type { MediaKey } from "@/lib/media";
import { DIRECTOR } from "./director";
import { FLAGSHIP, emi3 } from "./site";

/* =============================================================================
   HOME PAGE COPY (src/app/(public)/page.tsx -> src/components/home/*).
   Server- and client-safe (no React). One export per section, in page order.
   Voice: cinematic, confident, concise, for Indian creators; money in INR.
   Testimonials are SAMPLE copy for stand-in learners and are labelled as such
   on the page. Images are referenced by media.ts key only.
   ============================================================================= */

/** Text with words to set in red. Matching is per word, case-insensitive, punctuation ignored. */
export type RedText = { text: string; red?: string[] };

/* ---- 01 Hero (theatre, Marlowe) --------------------------------------------- */
export const HERO = {
  /** top-left statement, Anton caps, one line per entry */
  statement: ["Making films", "through the lens of", "prompts and motion."],
  statementRed: ["prompts", "motion"],
  /** giant title, bottom: small first line + the giant word */
  titleTop: "Prompt to",
  title: "Premiere",
  /** right column, under the CTA */
  side: DIRECTOR.sideNote,
  sideBy: `${DIRECTOR.name}, director`,
  meta: {
    course: "Course 01 · AI Filmmaking",
    year: "© 2026",
    facts: `${FLAGSHIP.modules} modules · 60-second capstone · First lesson free`,
  },
  portrait: DIRECTOR.portrait,
} as const;

/* ---- 02 Scattered words (cream, Mobius "imagination / beauty / design") ------ */
/** The statement; words wrapped in [brackets] start scattered across the screen
 *  and travel into place as you scroll. */
export const SCATTERED = {
  label: "The school",
  statement:
    "We teach you to [direct] the machine: to turn a [prompt] into a frame, a frame into [motion,] and motion into [cinema.]",
  body: [
    "Generative tools can render anything in seconds. That is exactly why so much AI video looks the same: nobody is directing it. Tamada Media teaches the director's half of the craft: story, look, lens, performance, sound and the cut.",
    "One flagship course, built like a production. You write a logline on day one and premiere a finished 60-second short at the end, with every prompt, every credit and every decision explained on the way. No camera. No crew. Your vision.",
  ],
} as const;

/* ---- 03 Full-bleed still with giant passing words (theatre) ------------------ */
export const MOTION_STILL = {
  image: "still-tokyo-crossing" as MediaKey,
  rowA: "Frames in motion.",
  rowB: "Prompt to premiere.",
  caption: "Fig. 01 · Lock the look before you spend a single video credit.",
  timecode: "00:01:04:12",
} as const;

/* ---- 04 What you'll learn (Mobius "Our Services") ---------------------------- */
export type CourseGroup = {
  letter: string;
  title: string;
  modules: string;
  statement: string;
  chips: string[];
};

export const COURSE_GROUPS: CourseGroup[] = [
  {
    letter: "A",
    title: "Story & look",
    modules: "Modules 01 to 03",
    statement:
      "We start where every film starts: a story worth a minute of someone's life, and a look that makes it unmistakably yours.",
    chips: ["The AI film stack", "Loglines", "60-second scripts", "Shot list = prompt list", "Moodboards", "Style frames", "Style bible"],
  },
  {
    letter: "B",
    title: "Prompting & generation",
    modules: "Modules 04 and 05",
    statement:
      "Then you learn to talk to a camera that isn't there: lens, movement and light in words a model obeys, and motion that holds together past second four.",
    chips: ["Lens language", "Camera movement", "Lighting prompts", "Image-to-video", "Veo · Kling · Runway", "Fixing artefacts"],
  },
  {
    letter: "C",
    title: "Characters & worlds",
    modules: "Module 06",
    statement:
      "Same face, same costume, same rain-soaked street in every shot. Continuity is what separates a film from a playlist of clips.",
    chips: ["Character sheets", "Reference images", "Costume continuity", "World bibles", "Recurring locations"],
  },
  {
    letter: "D",
    title: "Sound & voice",
    modules: "Modules 07 and 08",
    statement:
      "Half of cinema is heard. You cast voices, direct performances, sync lips to faces, then score and design the sound that carries the picture.",
    chips: ["Voice casting", "Dialogue direction", "Lip-sync", "Score", "Foley & ambience", "The mix"],
  },
  {
    letter: "E",
    title: "Edit, finish & release",
    modules: "Modules 09, 10 + capstone",
    statement:
      "Finally you cut, grade and deliver, then premiere your own 60-second short, finished to a standard you would put your name on.",
    chips: ["Editing in DaVinci Resolve", "Colour grade", "Upscale & deliver", "Disclosure & rights", "Capstone premiere"],
  },
];

export const COURSE_INTRO = {
  label: "The Course",
  note: "Ten modules and a capstone, in the order a film is actually made.",
  cta: { label: "Get started", href: FLAGSHIP.href },
} as const;

/* ---- 05 In numbers (Mobius "42 Clients": photos inside giant numerals) ------- */
export type Stat = {
  value: string;
  title: string;
  body: string;
  image: MediaKey;
  cta: { label: string; href: string };
};

export const NUMBERS = {
  titleTop: "Prompt to Premiere",
  title: "In Numbers",
  note: "A course measured in finished films, not hours watched.",
  cta: { label: "See the curriculum", href: `${FLAGSHIP.href}#curriculum` },
  stats: [
    {
      value: String(FLAGSHIP.modules),
      title: "Modules, in production order",
      body: "From the AI film stack to finish and release. Every module ends with something you can show, not just something you watched.",
      image: "bts-lighting-setup",
      cta: { label: "See the curriculum", href: `${FLAGSHIP.href}#curriculum` },
    },
    {
      value: "60",
      title: "Seconds of finished film",
      body: "The capstone is a complete short: scripted, generated, voiced, scored, cut and graded. Yours to release on Reels, YouTube or the festival circuit.",
      image: "bts-clapper-desert",
      cta: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    },
    {
      value: FLAGSHIP.learners.toLocaleString("en-IN"),
      title: "Filmmakers enrolled",
      body: "Writers, editors, ad-makers and complete beginners, learning at their own pace and finishing films they are proud of.",
      image: "bts-audience",
      cta: { label: "Join them", href: FLAGSHIP.checkoutHref },
    },
  ] satisfies Stat[],
} as const;

/* ---- 06 Tools table (Mobius "Our Awards") ------------------------------------ */
export type ToolRow = { tool: string; use: string; module: string };

export const TOOLS = {
  titleTop: "The stack",
  title: "You'll master",
  note: "Tools change every month. The decisions behind them don't. We teach both, and re-shoot lessons when the tools move.",
  cta: { label: "See every lesson", href: `${FLAGSHIP.href}#curriculum` },
  head: ["Tool", "What you use it for", "Module"],
  rows: [
    { tool: "ChatGPT · Claude", use: "Loglines, scripts and shot lists", module: "02" },
    { tool: "Midjourney", use: "Moodboards and style frames", module: "03" },
    { tool: "Flux", use: "Hero frames and character sheets", module: "03 · 06" },
    { tool: "Google Veo", use: "Image-to-video and dialogue shots", module: "05" },
    { tool: "Kling", use: "Motion, physics and longer takes", module: "05" },
    { tool: "Runway", use: "Motion brush, camera paths, keyframes", module: "05" },
    { tool: "ElevenLabs", use: "Voice casting and performance", module: "07" },
    { tool: "Lip-sync models", use: "Dialogue that lands on the face", module: "07" },
    { tool: "Suno", use: "Score, themes and stingers", module: "08" },
    { tool: "DaVinci Resolve", use: "Edit, colour grade and the mix", module: "09" },
    { tool: "Topaz Video", use: "Upscale and delivery masters", module: "10" },
  ] satisfies ToolRow[],
} as const;

/* ---- 07 Director (Marlowe screenshot 4) -------------------------------------- */
export const DIRECTOR_BLOCK = {
  label: "Your director",
  /** quote in two parts: the second part is indented (Marlowe) */
  quoteA: "Your audience will never see the prompt.",
  quoteB: "They will only feel the cut.",
  red: "feel",
  by: DIRECTOR.name,
  bio: DIRECTOR.short,
  large: "bts-crew-location" as MediaKey,
  small: "bts-camera-rig" as MediaKey,
  cta: { label: "Meet your director", href: "/about" },
} as const;

/* ---- 08 Full-bleed BTS break -------------------------------------------------- */
export const BTS_BREAK = {
  image: DIRECTOR.onSet,
  label: "Behind the frame",
  line: "Every frame is a decision.",
  timecode: "01:04:22:13",
} as const;

/* ---- 09 Reflections (Mobius slider). SAMPLE reviews, labelled on the page. --- */
export type Reflection = { quote: string; name: string; role: string; image: MediaKey };

export const REFLECTIONS = {
  title: "From the class",
  note: "Sample reviews from stand-in learners. Real stories from the first cohort replace these at launch.",
  items: [
    {
      quote:
        "I'd been generating pretty clips for a year. Module four was the first time a shot of mine felt directed. The lens, the move, the light: all of it meant something.",
      name: "Riya Menon",
      role: "Copywriter, Kochi",
      image: "learner-1",
    },
    {
      quote:
        "The shot list as a prompt list changed everything. I stopped burning credits and finished my first short in three weekends.",
      name: "Kabir Shah",
      role: "Wedding filmmaker, Pune",
      image: "learner-2",
    },
    {
      quote:
        "Arjun teaches taste, not buttons. My capstone is the first thing I've made that I send to people without an apology.",
      name: "Ananya Iyer",
      role: "Illustrator, Chennai",
      image: "learner-3",
    },
    {
      quote:
        "I've cut for years and still learned the most from the sound modules. My AI films finally sound like films.",
      name: "Dev Malhotra",
      role: "Editor, Delhi",
      image: "learner-4",
    },
  ] satisfies Reflection[],
} as const;

/* ---- 10 Pricing (Mobius) ------------------------------------------------------- */
export type Plan = {
  id: string;
  name: string;
  for: string;
  features: string[];
  price: number;
  was: number;
  /** per-instalment amount for 3 EMIs */
  emi: number;
  cta: { label: string; href: string };
  note?: string;
};

export const PRICING = {
  title: "Pricing",
  body: "One course, one price, yours for life. Pay once or split it into three no-cost EMIs, and watch the first lesson before you pay a rupee.",
  toggle: { once: "One-time", emi: "3 EMIs" },
  startingFrom: "Starting from",
  talk: { note: "Not sure which one is for you? Tell us what you're making.", label: "Let's talk", href: "#enquiry" },
  plans: [
    {
      id: "course",
      name: "Course",
      for: "For self-paced filmmakers who want the whole pipeline.",
      features: [
        `${FLAGSHIP.modules} modules, ${FLAGSHIP.lessons} lessons`,
        `${FLAGSHIP.videos} video lessons, ${FLAGSHIP.hours}`,
        "Prompt & look-dev libraries",
        `${FLAGSHIP.quizzes} checkpoints`,
        "Capstone brief & rubric",
        `${FLAGSHIP.certificateTitle} certificate`,
        "Lifetime access & re-shot updates",
        "Free first lesson",
      ],
      price: FLAGSHIP.price,
      was: FLAGSHIP.compareAtPrice,
      emi: emi3(FLAGSHIP.price),
      cta: { label: "Enroll now", href: FLAGSHIP.checkoutHref },
    },
    {
      id: "mentor",
      name: "Course + mentor feedback",
      for: "For filmmakers who want a director's eyes on their cuts.",
      features: [
        "Everything in Course",
        "3 live cut reviews, small group",
        "Written capstone notes from the director's team",
        "Private cohort channel",
        "Priority answers in every lesson",
        "Showcase slot on the films page",
      ],
      price: FLAGSHIP.mentorPrice,
      was: FLAGSHIP.mentorCompareAtPrice,
      emi: emi3(FLAGSHIP.mentorPrice),
      cta: { label: "Apply for a seat", href: "#enquiry" },
      note: "Small cohorts: 20 seats a month.",
    },
  ] satisfies Plan[],
} as const;

/* ---- 11 Journal teaser: JOURNAL_TEASER lives in ./journal (derived from the posts,
   so titles, dates and read times can't drift; kept out of this file so the client
   sections that import home copy don't ship every journal post). -------------------- */

/* ---- 12 FAQ (Mobius "Questions, answered.") ------------------------------------ */
export const FAQ = {
  title: "Questions, answered.",
  still: "Still have questions? Write to us. A human replies within one working day.",
  ask: { label: "Ask a question", href: "#enquiry" },
  about: { label: "About the director", href: "/about" },
  items: [
    {
      q: "Do I need a camera or editing experience?",
      a: "No. Every shot is generated, and the edit is taught from zero in the free version of DaVinci Resolve. A laptop and a story you want to tell are enough.",
    },
    {
      q: "How much will the AI tools cost me?",
      a: "Most modules run on free tiers. For the capstone, budget around ₹2,000 of credits. Module one shows you how to plan it shot by shot so nothing is wasted.",
    },
    {
      q: "Is the first lesson really free?",
      a: "Yes. The first lesson of module one is open to everyone, no card needed. Watch it, then decide.",
    },
    {
      q: "How long do I keep access?",
      a: "For life, including updates. When a tool changes in a way that matters, the lessons that depend on it are re-shot.",
    },
    {
      q: "What do I have at the end?",
      a: `A finished 60-second short you can release, and a verifiable ${FLAGSHIP.certificateTitle} certificate with its own public link.`,
    },
    {
      q: "Can I pay in instalments?",
      a: "Yes. Three no-cost EMIs are available on supported cards and UPI apps; choose them at checkout.",
    },
    {
      q: "Who owns the films I make?",
      a: "You do. The course also covers disclosure and rights basics for releasing AI-generated work on Instagram, YouTube and festivals.",
    },
  ],
} as const;

/* ---- 13 Conversational enquiry (Mobius contact form) --------------------------- */
export const ENQUIRY = {
  label: "Enquiry",
  title: "Let's talk.",
  side: "Prefer email? Write to",
  roles: ["first-time filmmaker", "working editor", "content creator", "brand or agency", "teacher or school"],
  intents: ["take the course", "join the mentor cohort", "bring a workshop to my team", "just say hello"],
  send: "Send",
  done: (name: string) => `Thank you${name ? `, ${name}` : ""}. Your note is in. We reply within one working day.`,
  again: "Send another note",
} as const;

/** Formats a price in INR with the Indian grouping (₹2,999). */
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
