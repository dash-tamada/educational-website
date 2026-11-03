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
    focus: "Teaches modules 04 to 06",
    bio: "Builds the prompt and reference libraries behind the course and tests every new model the week it ships, so you don't have to.",
  },
  {
    id: "naina",
    name: "Naina Kapoor",
    role: "Edit & colour lead",
    city: "Delhi",
    photo: "team-editor",
    focus: "Teaches module 09",
    bio: "A decade of cutting trailers and music videos. Teaches the edit and the grade in DaVinci Resolve, where AI films are actually made.",
  },
  {
    id: "rohan",
    name: "Rohan D'Souza",
    role: "Sound & music lead",
    city: "Goa",
    photo: "team-sound",
    focus: "Teaches modules 07 and 08",
    bio: "Sound designer and composer for indie films and podcasts. Teaches voice casting, lip-sync, score and the mix.",
  },
  {
    id: "vikram",
    name: "Vikram Sethi",
    role: "Producer & cohort lead",
    city: "Mumbai",
    photo: "team-producer",
    focus: "Runs the mentor cohort",
    bio: "Produced 200+ ad shoots before moving into AI pipelines. Keeps every cohort on schedule and every capstone on budget.",
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
      "Tamada Media is an AI filmmaking school built like a film studio. One flagship course, one director at the front of the room, and a small crew of working filmmakers behind every lesson.",
      "We started because the tools got astonishing and the films didn't. Anyone can render a beautiful frame now. Very few people are taught to direct one. So we teach the decisions: story, look, lens, performance, sound and the cut.",
    ],
    side: "Want to make films like the ones on this site?",
    cta: { label: "Join the course", href: FLAGSHIP.href },
  },
  statement: {
    label: "What we do",
    /** words in `red` are set in red; the whole statement fills in as you scroll */
    text: "We teach the director's half of AI filmmaking, from the first logline to the final grade, so that what you make feels made, not generated.",
    red: ["director's", "made,"],
  },
  photos: { narrow: "bts-director-monitor" as MediaKey, wide: "bts-crew-location" as MediaKey, caption: "On set and in the suite: every lesson is shot like a production." },
  director: {
    label: "The director",
    quote: DIRECTOR.quotes[0],
    creditsTitle: "Selected credits",
    creditsNote: "Sample credits for a stand-in persona; replaced before launch.",
    cta: { label: "Watch Arjun's first lesson", href: FLAGSHIP.freeLessonHref },
  },
  approach: {
    label: "How we teach",
    title: "Our approach.",
    note: "Three rules every lesson follows. If a lesson breaks one, we re-shoot it.",
    cta: { label: "See the curriculum", href: `${FLAGSHIP.href}#curriculum` },
    items: [
      {
        title: "Story first",
        statement: "No prompt before a logline. A film is a want, an obstacle and a turn; the frames come after.",
        body: "Module one starts with a sentence, not a tool. You leave it with a logline, a sixty-second script and a shot list that is already your prompt list.",
      },
      {
        title: "Direct the machine",
        statement: "Lens, light, movement and performance, in words a model obeys. Taste is the part no update replaces.",
        body: "We teach the camera language cinematographers use, then show you how each model reads it. When the tools change, the decisions don't.",
      },
      {
        title: "Finish like a pro",
        statement: "Half of cinema is heard and the rest is decided in the cut. We finish every film to a standard you'd sign.",
        body: "Voice, score, foley, the edit, the grade and a proper release: masters, Reels cut-downs, disclosure and credits.",
      },
    ],
  },
  team: {
    label: "The crew",
    title: "The people behind the frames.",
    note: "Working filmmakers who teach what they do every day. Sample personas: the real crew's photos and bios replace these at launch.",
  },
  numbers: {
    label: "In numbers",
    title: "Tamada, so far.",
    items: [
      { value: FLAGSHIP.learners.toLocaleString("en-IN"), label: "Filmmakers enrolled", note: "Writers, editors, ad-makers and complete beginners." },
      { value: String(FLAGSHIP.modules), label: "Modules + a capstone", note: "In the order a film is actually made." },
      { value: String(FLAGSHIP.rating), label: "Average rating", note: "From learners who finished module one." },
      { value: DIRECTOR.facts[2].value, label: "Festival selections", note: "Across the director's live-action and AI work." },
    ],
  },
  work: {
    label: "Work with us",
    title: "Work with us",
    note: "The school is the heart of it, but the studio takes on a few other things each year.",
    rows: [
      {
        title: "Bring a workshop to your team",
        body: "Half-day and two-day AI filmmaking workshops for agencies, brands, newsrooms and colleges. Online, or in person wherever your team is.",
        cta: { label: "Plan a workshop", href: "/contact?topic=workshop#message" },
      },
      {
        title: "Commission a film",
        body: "The studio directs a small number of brand films and music videos each year, crewed by Arjun and the best of our alumni.",
        cta: { label: "Talk about a film", href: "/contact?topic=studio#message" },
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
    lineA: "Your first film",
    lineB: "starts with one prompt.",
    red: ["prompt."],
    body: "Watch the first lesson free. If it clicks, the other fifty are waiting.",
    primary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    secondary: { label: "See the course", href: FLAGSHIP.href },
  },
} as const;
