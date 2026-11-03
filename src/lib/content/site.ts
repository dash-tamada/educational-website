/* =============================================================================
   Site-wide constants: brand, flagship course, nav, footer, clock, socials.
   Server- and client-safe (no React). Copy voice: confident, cinematic, concise,
   for Indian creators; money in INR.
   ============================================================================= */

/** The one product. Mirrors the mock catalogue (src/lib/mock: crs_aifilm). */
/** One of three no-cost EMIs, rounded up to the rupee (₹2,999 -> ₹1,000). */
export const emi3 = (price: number) => Math.ceil(price / 3);

export const FLAGSHIP = {
  id: "crs_aifilm",
  slug: "ai-filmmaking",
  title: "AI Filmmaking: Prompt to Premiere",
  shortTitle: "Prompt to Premiere",
  href: "/courses/ai-filmmaking",
  freeLessonId: "af-1-1",
  freeLessonHref: "/learn/ai-filmmaking/af-1-1",
  learnHref: "/learn/ai-filmmaking",
  checkoutHref: "/checkout/ai-filmmaking",
  price: 2999,
  compareAtPrice: 4999,
  currency: "INR",
  /** "Course + mentor feedback" plan (home + course page pricing; sold through an enquiry) */
  mentorPrice: 5999,
  mentorCompareAtPrice: 8999,
  modules: 10,
  /** module 11 */
  capstone: "Your 60-second short",
  videos: 34,
  quizzes: 9,
  resources: 8,
  lessons: 51,
  /** total video runtime, as the course page prints it (seed: 7h 01m) */
  hours: "7h 01m",
  learners: 2480,
  rating: 4.8,
  certificateTitle: "Certified AI Filmmaker",
  level: "All levels",
  language: "English",
  director: "Arjun Rao",
} as const;

/** Bottom-right live clock (Mobius "BERLIN, DE 07:19 AM"). Change it here only. */
export const CLOCK = {
  label: "India · IST",
  timeZone: "Asia/Kolkata",
} as const;

export const SITE = {
  name: "Tamada Media",
  /** the ® mark is used on the wordmark only */
  wordmark: "Tamada Media",
  tagline: "An AI filmmaking school for Indian creators.",
  city: "Bengaluru, India",
  email: "hello@tamada.demo",
  founded: 2023,
} as const;

export type NavItem = { label: string; href: string; /** pathname prefix that marks it active */ match?: string };

/** Primary nav (caps, in this order). */
export const NAV: NavItem[] = [
  { label: "Course", href: FLAGSHIP.href, match: "/courses" },
  { label: "Films", href: "/films", match: "/films" },
  { label: "Director", href: "/about", match: "/about" },
  { label: "Journal", href: "/journal", match: "/journal" },
  { label: "Contact", href: "/contact", match: "/contact" },
];

/** The red header CTA. */
export const PRIMARY_CTA = {
  label: "Watch free lesson",
  short: "Free lesson",
  href: FLAGSHIP.freeLessonHref,
} as const;

// TODO(owner): point these at the real Tamada Media profiles once the handles exist.
export const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "YouTube", href: "https://www.youtube.com/" },
  { label: "Vimeo", href: "https://vimeo.com/" },
  { label: "X (Twitter)", href: "https://x.com/" },
] as const;

export const LEGAL = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Verify a certificate", href: "/certificates" },
] as const;

/** Footer link columns (tutor recruitment is intentionally not linked publicly). */
export const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "School",
    links: [
      { label: "The course", href: FLAGSHIP.href },
      { label: "Free first lesson", href: FLAGSHIP.freeLessonHref },
      { label: "Films", href: "/films" },
      { label: "Journal", href: "/journal" },
    ],
  },
  {
    title: "Studio",
    links: [
      { label: "Director & team", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Log in", href: "/login" },
    ],
  },
];

export const NEWSLETTER = {
  title: "Studio notes, once a month.",
  body: "New techniques, tool shifts worth knowing and one short film we loved. No spam, ever.",
  placeholder: "Your email",
  done: "You're on the list. First note lands on the 1st.",
} as const;

export const COPYRIGHT = `© ${new Date().getFullYear()} Tamada Media. All rights reserved.`;
