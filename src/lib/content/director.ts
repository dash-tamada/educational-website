import type { MediaKey } from "@/lib/media";

/* =============================================================================
   The lead director (the dramatic face of the brand). Mirrors the mock tutor
   u_arjun (src/lib/mock) — same name, slug and city. ALL OF THIS IS SAMPLE COPY
   for a stand-in persona: the owner replaces bio, credits and quotes before launch.
   ============================================================================= */

export type DirectorQuote = {
  /** the quote text; the word in `red` is set in red (first match, case-insensitive) */
  text: string;
  red?: string;
  context?: string;
};

export type Credit = { year: number; title: string; role: string; kind: string; note?: string };

export const DIRECTOR = {
  id: "u_arjun",
  slug: "arjun-rao",
  name: "Arjun Rao",
  firstName: "Arjun",
  lastName: "Rao",
  role: "Founder, director & lead instructor",
  city: "Bengaluru",
  portrait: "director-hero" as MediaKey,
  portraitAlt: "director-portrait" as MediaKey,
  onSet: "director-on-set" as MediaKey,
  /** hero statement, top-left (Marlowe). Words in `red` are set in red. */
  heroStatement: { text: "A filmmaker who went AI-first, and built a school and a studio around it.", red: ["AI-first"] },
  /** side note under the nav (Marlowe right column) */
  sideNote:
    "We started as filmmakers. Now we make everything with AI, and we teach you to do the same: with intent in every frame.",
  short:
    "Arjun Rao spent a decade directing ads, music videos and short films before rebuilding his whole practice around AI. He founded Tamada Media to teach it, and to bring the best of the people he teaches into the studio.",
  bio: [
    "Arjun Rao is a Bengaluru-based director who spent ten years on sets: ads for national brands, music videos for independent artists, and short films that travelled to festivals in India and abroad.",
    "In 2023 he went AI-first: whole films, then ads, reels and key art, made with generative tools. He noticed what everyone else noticed: the models could render anything, and almost nothing felt made. The gap wasn't the software. It was craft.",
    "Tamada Media is the school and the studio he wished existed. Film first, because that's where the craft lives, then movies, ads, content and design, all taught AI-first. No hype, no prompt dumps. And the best work from every cohort gets a seat at the studio's table.",
  ],
  quotes: [
    { text: "AI can render anything. That is exactly the problem. A director's job is to decide what deserves a frame.", red: "decide", context: "On the first day of every cohort" },
    { text: "I don't teach buttons. Buttons change every month. I teach you to see.", red: "see" },
    { text: "Sixty seconds is not a limitation. It's a discipline. Every shot has to earn its place.", red: "earn" },
    { text: "Your audience will never see the prompt. They will only feel the cut.", red: "feel" },
  ] satisfies DirectorQuote[],
  credits: [
    { year: 2025, title: "Monsoon Static", role: "Writer, director", kind: "AI short", note: "Festival selection (sample)" },
    { year: 2025, title: "The Last Tram to Esplanade", role: "Director", kind: "AI short" },
    { year: 2024, title: "Saltwater Hymn", role: "Director", kind: "Music video", note: "Generated with Veo and Kling, graded in Resolve" },
    { year: 2024, title: "Paper Kites", role: "Director", kind: "Brand film" },
    { year: 2022, title: "Night Bus to Hampi", role: "Writer, director", kind: "Live-action short", note: "Festival selection (sample)" },
    { year: 2020, title: "Ten Rupees of Rain", role: "Director", kind: "Live-action short" },
    { year: 2016, title: "Ads, music videos and promos", role: "Director", kind: "Commercial work", note: "120+ spots" },
  ] satisfies Credit[],
  facts: [
    { value: "10", label: "Years directing" },
    { value: "120+", label: "Ads & music videos" },
    { value: "14", label: "Festival selections" },
  ],
} as const;
