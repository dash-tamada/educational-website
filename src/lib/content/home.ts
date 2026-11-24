import type { MediaKey } from "@/lib/media";
import { DIRECTOR } from "./director";
import { FLAGSHIP, emi3 } from "./site";

/* =============================================================================
   HOME PAGE COPY (src/app/(public)/page.tsx -> src/components/home/*).
   Server- and client-safe (no React). One export per section, in page order.
   Voice: cinematic, confident, concise, for Indian creators; money in INR.
   Positioning: an AI-first creative school, founded by filmmakers. Film is the
   flagship (Course 01, live now); movies, ads, content and design open next; the
   standout graduates are considered for work on Tamada Media productions.
   Testimonials are SAMPLE copy for stand-in learners and are labelled as such
   on the page. Images are referenced by media.ts key only.
   ============================================================================= */

/** Text with words to set in red. Matching is per word, case-insensitive, punctuation ignored. */
export type RedText = { text: string; red?: string[] };

/* ---- 01 Hero (theatre, Marlowe) --------------------------------------------- */
export const HERO = {
  /** top-left statement, Anton caps, one line per entry */
  statement: ["Films and ads,", "made AI-first,", "directed by you."],
  statementRed: ["AI-first"],
  /** giant title, bottom: small first line + the giant word */
  titleTop: "The AI-first",
  title: "School",
  /** right column, under the CTA */
  side: DIRECTOR.sideNote,
  sideBy: `${DIRECTOR.name}, founder & director`,
  meta: {
    course: "Tamada Media · AI-first school",
    year: "© 2026",
    facts: "Film · Movies · Ads · Reels · Design",
  },
  portrait: DIRECTOR.portrait,
} as const;

/* ---- 02 Scattered words (cream, Mobius "imagination / beauty / design") ------ */
/** The statement; words wrapped in [brackets] start scattered across the screen
 *  and travel into place as you scroll. */
export const SCATTERED = {
  label: "The school",
  statement:
    "We teach you to [create] with AI: to turn a [prompt] into a frame, a frame into a [film,] and your best work into a [career.]",
  body: [
    "We started as filmmakers. Then we rebuilt everything we make around AI: short films, movies, ads, reels and design. Tamada Media teaches that whole way of working, with the craft that makes it land: story, look, performance, sound and the cut.",
    "Start with the flagship, AI Filmmaking: a logline on day one, a finished 60-second short at the end. Movies, ads, content and design open next. And the standout graduates don't just leave with a certificate: they get a shot at working on Tamada Media productions.",
  ],
} as const;

/* ---- 03 Full-bleed still with giant passing words (theatre) ------------------ */
export const MOTION_STILL = {
  image: "still-tokyo-crossing" as MediaKey,
  rowA: "Made with AI.",
  rowB: "Directed by you.",
  caption: "Fig. 01 · Every frame generated. Every decision human.",
  timecode: "00:01:04:12",
} as const;

/* ---- 04 What we teach (Mobius "Our Services"): the five tracks --------------- */
export type CourseGroup = {
  letter: string;
  title: string;
  /** status line next to the title ("Course 01 · Enrolling now") */
  modules: string;
  statement: string;
  chips: string[];
};

export const COURSE_GROUPS: CourseGroup[] = [
  {
    letter: "A",
    title: "Filmmaking",
    modules: "Course 01 · Enrolling now",
    statement:
      "Where we started and where you start: write, generate, voice, score and cut a finished short film with AI. No camera. No crew. Your vision.",
    chips: ["Story & script", "Look development", "Prompting the shot", "Image-to-video", "Voice & sound", "Edit & grade", "60-second capstone"],
  },
  {
    letter: "B",
    title: "Movie making",
    modules: "Opening next",
    statement:
      "From a short to a feature: hold one story, one cast and one world together across scenes, then previs it, pitch it and cut the trailer that gets it made.",
    chips: ["Feature scripts", "Previs & storyboards", "Character continuity", "World building", "Trailers", "Pitch decks"],
  },
  {
    letter: "C",
    title: "Ads & brand films",
    modules: "Opening next",
    statement:
      "The paid side of AI. Read a client brief, pitch with style frames, keep a product on-brand in every shot and deliver spots that clients sign off on.",
    chips: ["Client briefs", "Product shots", "Brand consistency", "15 & 30-second spots", "Pitching", "Delivery specs"],
  },
  {
    letter: "D",
    title: "Content & reels",
    modules: "Opening next",
    statement:
      "Short-form that looks made, not generated: hooks, formats and a weekly system that turns one idea into Reels, Shorts and a YouTube channel.",
    chips: ["Hooks & formats", "Reels & Shorts", "YouTube", "AI presenters & voice", "Thumbnails", "Posting system"],
  },
  {
    letter: "E",
    title: "Design & photography",
    modules: "Opening next",
    statement:
      "Key art, posters, product photography and brand visuals: image-making with AI, finished to print and campaign standard.",
    chips: ["Key art & posters", "Product photography", "Brand visuals", "Retouching", "Upscaling", "Print-ready files"],
  },
];

export const COURSE_INTRO = {
  label: "What we teach",
  title: "Five crafts, one method",
  meta: "Film · Movies · Ads · Reels · Design",
  note: "Five crafts, one AI-first way of working. Filmmaking is enrolling now; the rest open next.",
  cta: { label: "Start with film", href: FLAGSHIP.href },
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
  titleTop: "Tamada Media",
  title: "In Numbers",
  note: "A school measured in finished work, not hours watched.",
  cta: { label: "See the flagship course", href: FLAGSHIP.href },
  stats: [
    {
      value: "5",
      title: "Crafts, one AI-first method",
      body: "Film, movies, ads, content and design. The tools overlap, the thinking carries over, and every course ends with work you can show.",
      image: "ai-video-wall",
      cta: { label: "What we teach", href: "#course" },
    },
    {
      value: "60",
      title: "Seconds of finished film",
      body: "The flagship capstone is a complete short: scripted, generated, voiced, scored, cut and graded. Yours to release, and the piece the studio reviews.",
      image: "ai-edit-suite",
      cta: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    },
    {
      value: FLAGSHIP.learners.toLocaleString("en-IN"),
      title: "Creators enrolled",
      body: "Writers, editors, designers, ad-makers and complete beginners, learning at their own pace and finishing work they are proud of.",
      image: "ai-learners",
      cta: { label: "Join them", href: FLAGSHIP.checkoutHref },
    },
  ] satisfies Stat[],
} as const;

/* ---- 06 Tools table (Mobius "Our Awards") ------------------------------------ */
export type ToolRow = { tool: string; use: string; /** which crafts use it */ module: string };

export const TOOLS = {
  titleTop: "The stack",
  title: "You'll master",
  note: "Tools change every month. The decisions behind them don't. We teach both, across every craft, and re-shoot lessons when the tools move.",
  cta: { label: "See the flagship lessons", href: `${FLAGSHIP.href}#curriculum` },
  head: ["Tool", "What you use it for", "Used in"],
  rows: [
    { tool: "ChatGPT · Claude", use: "Ideas, scripts, briefs and shot lists", module: "All" },
    { tool: "Midjourney", use: "Moodboards, key art and style frames", module: "Film · Ads · Design" },
    { tool: "Flux", use: "Hero frames, characters and products", module: "Film · Ads · Design" },
    { tool: "Google Veo", use: "Image-to-video and dialogue shots", module: "Film · Movies · Ads" },
    { tool: "Kling", use: "Motion, physics and longer takes", module: "Film · Movies" },
    { tool: "Runway", use: "Camera paths, motion brush, keyframes", module: "Film · Reels" },
    { tool: "ElevenLabs", use: "Voices, dubbing and narration", module: "Film · Reels" },
    { tool: "Suno", use: "Score, themes and jingles", module: "Film · Ads" },
    { tool: "Photoshop · Firefly", use: "Retouching, generative fill, print files", module: "Design" },
    { tool: "CapCut", use: "Fast vertical edits and captions", module: "Reels" },
    { tool: "DaVinci Resolve", use: "Edit, colour grade and the mix", module: "Film · Movies · Ads" },
    { tool: "Topaz", use: "Upscale and delivery masters", module: "All" },
  ] satisfies ToolRow[],
} as const;

/* ---- 07 Director (Marlowe screenshot 4) -------------------------------------- */
export const DIRECTOR_BLOCK = {
  label: "Founder & director",
  /** quote in two parts: the second part is indented (Marlowe) */
  quoteA: "Your audience will never see the prompt.",
  quoteB: "They will only feel the cut.",
  red: "feel",
  by: DIRECTOR.name,
  bio: DIRECTOR.short,
  large: "ai-edit-suite" as MediaKey,
  small: "ai-prompt-hands" as MediaKey,
  cta: { label: "Meet the studio", href: "/about" },
} as const;

/* ---- 08 Full-bleed break: the path into the studio ---------------------------- */
export const BTS_BREAK = {
  image: "ai-studio-team" as MediaKey,
  label: "From class to studio",
  line: "Your work is your audition.",
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
        "The shot list as a prompt list changed everything. I stopped burning credits and finished my first short in three weekends. Now I use the same method for client ads.",
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
        "I've cut for years and still learned the most from the sound modules. My AI films and my reels finally sound finished.",
      name: "Dev Malhotra",
      role: "Editor & creator, Delhi",
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
  body: "Start with the flagship. One course, one price, yours for life. Pay once or split it into three no-cost EMIs, and watch the first lesson before you pay a rupee.",
  toggle: { once: "One-time", emi: "3 EMIs" },
  startingFrom: "Starting from",
  talk: { note: "Not sure which one is for you? Tell us what you want to make.", label: "Let's talk", href: "#enquiry" },
  plans: [
    {
      id: "course",
      name: "Course",
      for: "For self-paced creators who want the whole AI film pipeline.",
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
      for: "For creators who want a director's eyes on their work, and a path into the studio.",
      features: [
        "Everything in Course",
        "3 live cut reviews, small group",
        "Written capstone notes from the director's team",
        "Private cohort channel",
        "Priority answers in every lesson",
        "Showcase slot on the work page",
        "Studio review: standout work is considered for Tamada Media productions",
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
  about: { label: "About the studio", href: "/about" },
  items: [
    {
      q: "Is Tamada Media only about filmmaking?",
      a: "No. We're an AI-first school founded by filmmakers. Film is where we started and the course that's open today; movie making, ads and brand films, content and reels, and design and photography open next.",
    },
    {
      q: "Can I work with Tamada Media after the course?",
      a: "That's the idea. The studio reviews standout capstones and mentor-cohort work, and the makers we pick are invited onto paid Tamada Media productions. It's earned on the work you show, not guaranteed with the course.",
    },
    {
      q: "Do I need a camera or editing experience?",
      a: "No. Every shot is generated, and the edit is taught from zero in the free version of DaVinci Resolve. A laptop and an idea you want to make are enough.",
    },
    {
      q: "How much will the AI tools cost me?",
      a: "Most lessons run on free tiers. For the film capstone, budget around ₹2,000 of credits. Module one shows you how to plan it shot by shot so nothing is wasted.",
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
      q: "Can I pay in instalments?",
      a: "Yes. Three no-cost EMIs are available on supported cards and UPI apps; choose them at checkout.",
    },
    {
      q: "Who owns the work I make?",
      a: "You do. Every course covers disclosure and rights basics for releasing AI-made work on Instagram, YouTube, festivals and client projects.",
    },
  ],
} as const;

/* ---- 13 Conversational enquiry (Mobius contact form) --------------------------- */
export const ENQUIRY = {
  label: "Enquiry",
  title: "Let's talk.",
  side: "Prefer email? Write to",
  roles: ["first-time filmmaker", "working editor", "content creator", "designer or photographer", "brand or agency", "teacher or school"],
  intents: ["take the film course", "join the mentor cohort", "hear when a new course opens", "work with the studio", "bring a workshop to my team", "just say hello"],
  send: "Send",
  done: (name: string) => `Thank you${name ? `, ${name}` : ""}. Your note is in. We reply within one working day.`,
  again: "Send another note",
} as const;

/** Formats a price in INR with the Indian grouping (₹2,999). */
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
