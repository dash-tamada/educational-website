import type { MediaKey } from "@/lib/media";
import { DIRECTOR } from "./director";
import { FLAGSHIP, SITE } from "./site";

/* =============================================================================
   THE STUDIO + THE CREW (/about -> src/components/about/*; journal authors).
   Server- and client-safe. ALL PEOPLE HERE ARE STAND-IN PERSONAS (sample copy,
   stand-in portraits from media.ts team-* keys). The owner replaces names, roles,
   bios and photos with the real team before launch; keep the ids (journal posts
   reference them as authors).
   ============================================================================= */

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  city: string;
  photo: MediaKey;
  /** what they teach / own in the course (the hover line) */
  focus: string;
  bio: string;
};

export const TEAM: TeamMember[] = [
  {
    id: "zoya",
    name: "Zoya Mirza",
    role: "AI pipeline lead",
    city: "Hyderabad",
    photo: "team-technologist",
    focus: "Teaches prompting, generation and design",
    bio: "Builds the prompt and reference libraries behind every course and tests each new model the week it ships, so you don't have to.",
  },
  {
    id: "naina",
    name: "Naina Kapoor",
    role: "Edit, colour & reels lead",
    city: "Delhi",
    photo: "team-editor",
    focus: "Teaches the edit, the grade and short-form",
    bio: "A decade of cutting trailers, music videos and reels. Teaches the edit and the grade in DaVinci Resolve, where AI films and content are actually finished.",
  },
  {
    id: "rohan",
    name: "Rohan D'Souza",
    role: "Sound & music lead",
    city: "Goa",
    photo: "team-sound",
    focus: "Teaches voice, score and the mix",
    bio: "Sound designer and composer for indie films, ads and podcasts. Teaches voice casting, lip-sync, score and the mix.",
  },
  {
    id: "vikram",
    name: "Vikram Sethi",
    role: "Producer & talent lead",
    city: "Mumbai",
    photo: "team-producer",
    focus: "Runs the mentor cohort and the path into the studio",
    bio: "Produced 200+ ad shoots before moving into AI pipelines. Runs the mentor cohort, reviews the standout work and brings the makers we pick onto Tamada Media productions.",
  },
];

/** Where the studio is, for About + Contact: SITE.city (the same place the footer and
 *  terms use). Change it in site.ts and this follows. */
export const STUDIO_PLACE = SITE.city;

/** Journal bylines: the director + the crew. */
export type Author = { id: string; name: string; role: string; photo: MediaKey; bio: string };

export const AUTHORS: Record<string, Author> = {
  arjun: { id: "arjun", name: DIRECTOR.name, role: DIRECTOR.role, photo: DIRECTOR.portraitAlt, bio: DIRECTOR.short },
  ...Object.fromEntries(TEAM.map((m) => [m.id, { id: m.id, name: m.name, role: m.role, photo: m.photo, bio: m.bio } satisfies Author])),
};

/* ---- /about page copy (Mobius "Studio" flow x Marlowe mood) --------------------- */
export const ABOUT = {
  hero: {
    label: "The studio",
    meta: `Est. ${SITE.founded} · ${STUDIO_PLACE}`,
    titleTop: "We are",
    title: "Tamada Media",
    intro: [
      "Tamada Media is an AI-first creative school and studio, founded by filmmakers. We make films, ads, reels and design with AI, and we teach exactly how we do it.",
      "We started because the tools got astonishing and the work didn't. Anyone can render a beautiful frame now. Very few people are taught to make it mean something. So we teach the craft behind it: story, look, performance, sound and the cut, starting with film and moving into movies, ads, content and design.",
    ],
    side: "Want to make work like the pieces on this site?",
    cta: { label: "Start with film", href: FLAGSHIP.href },
  },
  statement: {
    label: "What we do",
    /** words in `red` are set in red; the whole statement fills in as you scroll */
    text: "We teach you to make everything with AI, film first, so that what you make feels made, not generated, and the best of it finds its way into the studio.",
    red: ["everything", "made,"],
  },
  photos: { narrow: "ai-creator-night" as MediaKey, wide: "ai-studio-team" as MediaKey, caption: "In the studio and at the desk: every lesson is made like a production." },
  director: {
    label: "The founder",
    quote: DIRECTOR.quotes[0],
    creditsTitle: "Selected credits",
    creditsNote: "Sample credits for a stand-in persona; replaced before launch.",
    cta: { label: "Watch Arjun's first lesson", href: FLAGSHIP.freeLessonHref },
  },
  approach: {
    label: "How we teach",
    title: "Our approach.",
    note: "Three rules every lesson follows, in every course. If a lesson breaks one, we re-shoot it.",
    cta: { label: "See the flagship curriculum", href: `${FLAGSHIP.href}#curriculum` },
    items: [
      {
        title: "AI-first, story always",
        statement: "We reach for AI first, and for the story before the tool. A film, an ad or a reel is a want, an obstacle and a turn; the frames come after.",
        body: "Every course starts with a sentence, not a tool. In film that's a logline, a sixty-second script and a shot list that is already your prompt list.",
      },
      {
        title: "Direct the machine",
        statement: "Lens, light, movement and performance, in words a model obeys. Taste is the part no update replaces.",
        body: "We teach the visual language cinematographers and designers use, then show you how each model reads it. When the tools change, the decisions don't.",
      },
      {
        title: "Finish it, then show it",
        statement: "Nothing counts until it's finished. Every course ends with work you'd sign, and the best of it is seen by the studio.",
        body: "Voice, score, the edit, the grade and a proper release, then a portfolio piece the studio reviews: standout makers are invited onto Tamada Media productions.",
      },
    ],
  },
  team: {
    label: "The crew",
    title: "The people behind the frames.",
    note: "Working filmmakers and creators who teach what they do every day. Sample personas: the real crew's photos and bios replace these at launch.",
  },
  numbers: {
    label: "In numbers",
    title: "Tamada, so far.",
    items: [
      { value: FLAGSHIP.learners.toLocaleString("en-IN"), label: "Creators enrolled", note: "Writers, editors, designers, ad-makers and complete beginners." },
      { value: "5", label: "Crafts, taught AI-first", note: "Film first, then movies, ads, content and design." },
      { value: String(FLAGSHIP.rating), label: "Average rating", note: "From learners who finished module one." },
      { value: DIRECTOR.facts[2].value, label: "Festival selections", note: "Across the director's live-action and AI work." },
    ],
  },
  work: {
    label: "Work with us",
    title: "Work with us",
    note: "The school is the heart of it, and the studio is where the best of it goes to work.",
    rows: [
      {
        title: "Graduate into the studio",
        body: "Finish a course, show us the work. The studio reviews standout capstones and mentor-cohort pieces, and invites the makers we pick onto paid Tamada Media productions.",
        cta: { label: "How it works", href: "/contact?topic=work#message" },
      },
      {
        title: "Bring a workshop to your team",
        body: "Half-day and two-day AI filmmaking workshops for agencies, brands, newsrooms and colleges. Online, or in person wherever your team is.",
        cta: { label: "Plan a workshop", href: "/contact?topic=workshop#message" },
      },
      {
        title: "Commission the studio",
        body: "The studio makes films, ads, reels and key art with AI, crewed by Arjun's team and the best of our alumni.",
        cta: { label: "Talk about a project", href: "/contact?topic=studio#message" },
      },
      {
        title: "Teach or mentor with us",
        body: "Working editors, sound designers, cinematographers and directors who want to review cuts with the mentor cohort.",
        cta: { label: "Introduce yourself", href: "/contact?topic=tutor#message" },
      },
      {
        title: "Press and speaking",
        body: "Interviews, panels and festival talks on AI filmmaking, disclosure and the craft of directing with generative tools.",
        cta: { label: "Get in touch", href: "/contact?topic=press#message" },
      },
    ],
    still: "Don't see what you're after?",
    stillCta: { label: "Write to us", href: "/contact" },
  },
  final: {
    image: "bts-projector-beam" as MediaKey,
    lineA: "Everything you make",
    lineB: "starts with one prompt.",
    red: ["prompt."],
    body: "Start with film: watch the first lesson free. If it clicks, the other fifty are waiting.",
    primary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    secondary: { label: "See the course", href: FLAGSHIP.href },
  },
} as const;
