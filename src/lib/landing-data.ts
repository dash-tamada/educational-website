// Static landing-page content. Courses, categories and reviews move to DB queries
// once the catalog (milestone 6) exists, so keep these shapes close to the schema.

const u = (id: string) => `https://images.unsplash.com/${id}`;

/**
 * Colour tones shared by cards, stickers, tags and panels. Keep the legacy names
 * (yellow, orange, tomato) working; they map to the V2 palette (sun, tangerine, flame).
 */
export type Tone =
  | "sun"
  | "yellow"
  | "butter"
  | "tangerine"
  | "orange"
  | "flame"
  | "tomato"
  | "hotpink"
  | "magenta"
  | "blush"
  | "bubblegum"
  | "cyan"
  | "aqua"
  | "turquoise"
  | "blue"
  | "green"
  | "mint"
  | "forest"
  | "lilac"
  | "purple"
  | "indigo"
  | "olive"
  | "lime"
  | "white"
  | "ink";

/** Tailwind background class per tone. */
export const toneBg: Record<Tone, string> = {
  sun: "bg-sun",
  yellow: "bg-sun",
  butter: "bg-butter",
  tangerine: "bg-tangerine",
  orange: "bg-tangerine",
  flame: "bg-flame",
  tomato: "bg-flame",
  hotpink: "bg-hotpink",
  magenta: "bg-magenta",
  blush: "bg-blush",
  bubblegum: "bg-bubblegum",
  cyan: "bg-cyan",
  aqua: "bg-aqua",
  turquoise: "bg-turquoise",
  blue: "bg-blue",
  green: "bg-green",
  mint: "bg-mint",
  forest: "bg-forest",
  lilac: "bg-lilac",
  purple: "bg-purple",
  indigo: "bg-indigo",
  olive: "bg-olive",
  lime: "bg-lime",
  white: "bg-white",
  ink: "bg-ink",
};

/** Readable text colour class on each tone (spec V2 contrast rules). */
export const toneText: Record<Tone, string> = {
  sun: "text-ink",
  yellow: "text-ink",
  butter: "text-ink",
  tangerine: "text-ink",
  orange: "text-ink",
  flame: "text-white",
  tomato: "text-white",
  hotpink: "text-white",
  magenta: "text-ink",
  blush: "text-ink",
  bubblegum: "text-ink",
  cyan: "text-ink",
  aqua: "text-ink",
  turquoise: "text-ink",
  blue: "text-white",
  green: "text-white",
  mint: "text-forest",
  forest: "text-mint",
  lilac: "text-white",
  purple: "text-white",
  indigo: "text-white",
  olive: "text-white",
  lime: "text-ink",
  white: "text-ink",
  ink: "text-cream",
};

/** Raw hex per tone, for SVG fills and inline styles. */
export const toneHex: Record<Tone, string> = {
  sun: "#ffcf3f",
  yellow: "#ffcf3f",
  butter: "#fff2b7",
  tangerine: "#f9a220",
  orange: "#f9a220",
  flame: "#fd4401",
  tomato: "#fd4401",
  hotpink: "#ff008c",
  magenta: "#fd48f2",
  blush: "#ffdbfd",
  bubblegum: "#f780d4",
  cyan: "#a3f6f6",
  aqua: "#1ce8ed",
  turquoise: "#2cd1d0",
  blue: "#2668fd",
  green: "#00b351",
  mint: "#a7eb98",
  forest: "#163f10",
  lilac: "#9b82e0",
  purple: "#3b308f",
  indigo: "#4f3fb0",
  olive: "#857a23",
  lime: "#c8ff2e",
  white: "#ffffff",
  ink: "#161616",
};

export const navLinks = [
  { label: "Courses", href: "/#courses" },
  { label: "How it works", href: "/#how" },
  { label: "For tutors", href: "/#tutors" },
  { label: "FAQ", href: "/#faq" },
];

/**
 * Hero photo fan (7 cards, centre = index 3). The fan geometry (arc, tilt, overlap,
 * parallax speed) is derived from the index in Hero.tsx so it stays symmetric:
 * mobile shows the middle 3, tablet the middle 5, desktop all 7. Keep captions
 * short (<= 12 chars) so the tag never reaches the neighbouring card.
 */
export const heroCards: {
  caption: string;
  alt: string;
  img: string;
  tone: Tone;
}[] = [
  {
    caption: "Photo walks",
    alt: "A film camera and printed photos on a map",
    img: u("photo-1452587925148-ce544e77e70d"),
    tone: "lilac",
  },
  {
    caption: "My first app",
    alt: "A student coding on a laptop with headphones on",
    img: u("photo-1513258496099-48168024aec0"),
    tone: "blue",
  },
  {
    caption: "Sketch club",
    alt: "Drawing on a tablet with a stylus",
    img: u("photo-1611241893603-3c359704e0ee"),
    tone: "hotpink",
  },
  {
    caption: "Guitar riffs",
    alt: "Close-up of hands playing an acoustic guitar",
    img: u("photo-1510915361894-db8b60106cb1"),
    tone: "tangerine",
  },
  {
    caption: "Money basics",
    alt: "A calculator and budget papers on a desk",
    img: u("photo-1554224155-6726b3ff858f"),
    tone: "aqua",
  },
  {
    caption: "Café Spanish",
    alt: "Friends laughing around a laptop in a café",
    img: u("photo-1522202176988-66273c2fd55f"),
    tone: "flame",
  },
  {
    caption: "Home cooking",
    alt: "Fresh vegetables being chopped on a wooden board",
    img: u("photo-1507048331197-7d4ac70811cf"),
    tone: "green",
  },
];

/** One sentence per promo tape (MarqueeTape repeats each along its tape). */
export const marqueeItems = [
  "1st video of every course is free!",
  "Learn at your pace with real tutors",
];

export type Course = {
  slug: string;
  title: string;
  blurb: string;
  tutor: string;
  img: string;
  tone: Tone;
  badge: "NEW" | "BESTSELLER" | "JUST DROPPED";
  tags: string[];
  modules: number;
  lessons: number;
  price: number;
};

export const courses: Course[] = [
  {
    slug: "web-dev-from-zero",
    title: "Web Dev From Zero",
    blurb:
      "HTML, CSS and JavaScript until you've shipped a real site you're proud of.",
    tutor: "Arjun Rao",
    img: u("photo-1461749280684-dccba630e2f6"),
    tone: "aqua",
    badge: "BESTSELLER",
    tags: ["Coding", "Beginner"],
    modules: 6,
    lessons: 42,
    price: 1499,
  },
  {
    slug: "colour-for-designers",
    title: "Colour, Actually",
    blurb: "Build palettes that feel right, and know exactly why they work.",
    tutor: "Meera Shah",
    img: u("photo-1561070791-2526d30994b5"),
    tone: "magenta",
    badge: "NEW",
    tags: ["Design", "All levels"],
    modules: 4,
    lessons: 24,
    price: 999,
  },
  {
    slug: "guitar-in-30-days",
    title: "Guitar in 30 Days",
    blurb:
      "Chords, strumming and your first three songs. Calluses not included.",
    tutor: "Kabir Das",
    img: u("photo-1525201548942-d8732f6617a0"),
    tone: "sun",
    badge: "JUST DROPPED",
    tags: ["Music", "Beginner"],
    modules: 5,
    lessons: 30,
    price: 1199,
  },
  {
    slug: "money-basics",
    title: "Money Without the Ick",
    blurb: "Budgets, savings, investing basics. Explained like a friend would.",
    tutor: "Priya Nair",
    img: u("photo-1633158829585-23ba8f7c8caf"),
    tone: "lilac",
    badge: "NEW",
    tags: ["Finance", "Life skills"],
    modules: 4,
    lessons: 20,
    price: 799,
  },
  {
    slug: "phone-to-pro-photography",
    title: "Phone to Pro Photos",
    blurb: "Light, framing and editing so your camera roll looks intentional.",
    tutor: "Sana Iqbal",
    img: u("photo-1516035069371-29a1b244cc32"),
    tone: "tangerine",
    badge: "BESTSELLER",
    tags: ["Photography", "All levels"],
    modules: 5,
    lessons: 28,
    price: 1299,
  },
  {
    slug: "chemistry-made-visual",
    title: "Chemistry, Made Visual",
    blurb: "Exam-ready chemistry with experiments you can actually picture.",
    tutor: "Dr. Vikram Iyer",
    img: u("photo-1614935151651-0bea6508db6b"),
    tone: "blue",
    badge: "NEW",
    tags: ["Science", "Exam prep"],
    modules: 8,
    lessons: 56,
    price: 1599,
  },
  {
    slug: "start-a-podcast",
    title: "Start a Podcast",
    blurb: "From a voice memo to a published show, with gear on any budget.",
    tutor: "Rhea Kapoor",
    img: u("photo-1478737270239-2f02b77fc618"),
    tone: "bubblegum",
    badge: "JUST DROPPED",
    tags: ["Creator", "Beginner"],
    modules: 4,
    lessons: 22,
    price: 899,
  },
];

export const steps = [
  {
    title: "Pick a course",
    body: "Browse by topic, level or price. Every course shows its full curriculum up front.",
    tone: "aqua" as Tone,
    icon: "search",
  },
  {
    title: "Watch the first video free",
    body: "No card, no commitment. If the tutor clicks with you, keep going.",
    tone: "magenta" as Tone,
    icon: "play",
  },
  {
    title: "Unlock & pass the tests",
    body: "Buy once to open every module. Short tests between lessons keep it sticking.",
    tone: "sun" as Tone,
    icon: "check",
  },
  {
    title: "Earn your certificate",
    body: "Finish every lesson and test, then grab a certificate with a shareable code.",
    tone: "lilac" as Tone,
    icon: "badge",
  },
];

/**
 * Folder-tab feature stack (Krackerz mechanics, Maxima colour fields).
 * `tab` must stay short (it sits in a fixed-width folder tab), `tone` is the
 * panel field colour (white text on all of them).
 */
export const features: {
  tab: string;
  icon: "play" | "check" | "chart" | "tutor";
  title: string;
  bullets: string[];
  img: string;
  tone: Tone;
  cta: { label: string; href: string };
}[] = [
  {
    tab: "Video lessons",
    icon: "play",
    title: "Bite‑size video modules",
    bullets: [
      "Lessons grouped into clear modules",
      "Resume exactly where you left off",
      "Speed controls and notes",
    ],
    img: u("photo-1588196749597-9ff075ee6b5b"),
    tone: "blue",
    cta: { label: "Watch a free lesson", href: "/courses" },
  },
  {
    tab: "Quick tests",
    icon: "check",
    title: "Tests between lessons",
    bullets: [
      "Quick quizzes after key videos",
      "A pass mark unlocks the next part",
      "Explanations for every answer",
    ],
    img: u("photo-1514369118554-e20d93546b30"),
    tone: "green",
    cta: { label: "See how tests work", href: "/#how" },
  },
  {
    tab: "Progress",
    icon: "chart",
    title: "Progress you can see",
    bullets: [
      "Progress bars on every course",
      "Pick up where you left off",
      "Certificates with a shareable code",
    ],
    img: u("photo-1601097874965-f940d4f012b5"),
    tone: "flame",
    cta: { label: "Start learning free", href: "/signup" },
  },
  {
    tab: "Real tutors",
    icon: "tutor",
    title: "Taught by real tutors",
    bullets: [
      "Vetted, approved tutors",
      "Ask questions under each lesson",
      "New courses every month",
    ],
    img: u("photo-1664382953518-4a664ab8a8c9"),
    tone: "purple",
    cta: { label: "Browse courses", href: "/courses" },
  },
];

/**
 * Aardvark genre list as course categories (~8 + "and more!"). `thumbs` are the
 * four course covers that pop into the panel corners when the row is hovered.
 */
export const categories: { name: string; thumbs: [string, string, string, string] }[] = [
  {
    name: "Coding",
    thumbs: [
      u("photo-1461749280684-dccba630e2f6"),
      u("photo-1513258496099-48168024aec0"),
      u("photo-1588196749597-9ff075ee6b5b"),
      u("photo-1601097874965-f940d4f012b5"),
    ],
  },
  {
    name: "Design",
    thumbs: [
      u("photo-1561070791-2526d30994b5"),
      u("photo-1611241893603-3c359704e0ee"),
      u("photo-1516035069371-29a1b244cc32"),
      u("photo-1514369118554-e20d93546b30"),
    ],
  },
  {
    name: "Business",
    thumbs: [
      u("photo-1554224155-6726b3ff858f"),
      u("photo-1633158829585-23ba8f7c8caf"),
      u("photo-1664382953518-4a664ab8a8c9"),
      u("photo-1513258496099-48168024aec0"),
    ],
  },
  {
    name: "Music",
    thumbs: [
      u("photo-1525201548942-d8732f6617a0"),
      u("photo-1510915361894-db8b60106cb1"),
      u("photo-1478737270239-2f02b77fc618"),
      u("photo-1522202176988-66273c2fd55f"),
    ],
  },
  {
    name: "Languages",
    thumbs: [
      u("photo-1522202176988-66273c2fd55f"),
      u("photo-1588196749597-9ff075ee6b5b"),
      u("photo-1664382953518-4a664ab8a8c9"),
      u("photo-1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Photography",
    thumbs: [
      u("photo-1516035069371-29a1b244cc32"),
      u("photo-1561070791-2526d30994b5"),
      u("photo-1611241893603-3c359704e0ee"),
      u("photo-1510915361894-db8b60106cb1"),
    ],
  },
  {
    name: "Exam Prep",
    thumbs: [
      u("photo-1614935151651-0bea6508db6b"),
      u("photo-1514369118554-e20d93546b30"),
      u("photo-1601097874965-f940d4f012b5"),
      u("photo-1522202176988-66273c2fd55f"),
    ],
  },
  {
    name: "Cooking",
    thumbs: [
      u("photo-1507048331197-7d4ac70811cf"),
      u("photo-1554224155-6726b3ff858f"),
      u("photo-1522202176988-66273c2fd55f"),
      u("photo-1516035069371-29a1b244cc32"),
    ],
  },
];

/**
 * Why-panel pill stickers (Aardvark). At >=1024 they flank the emblem: `side`
 * picks the column, `overlap` is how far (fraction of the emblem width) the pill
 * reaches over the ring; tuned so the ring is overlapped but the arc title never.
 * `rotate` = resting tilt (inline, never Tailwind rotate classes). A "\n" in the
 * label forces a two-line pill.
 */
export const whyStickers: {
  label: string;
  tone: Tone;
  rotate: number;
  side: "left" | "right";
  overlap: number;
  /** 2 = two-line sticker (label split at the space nearest its middle) */
  lines?: 1 | 2;
}[] = [
  { label: "First lesson free", tone: "hotpink", rotate: -5, side: "left", overlap: 0.24 },
  { label: "Expert tutors", tone: "tangerine", rotate: 4, side: "right", overlap: 0.24 },
  { label: "Fair prices", tone: "lilac", rotate: 3, side: "left", overlap: 0.3 },
  { label: "Learn anywhere", tone: "aqua", rotate: 5, side: "right", overlap: 0.3, lines: 2 },
  { label: "Real certificates", tone: "olive", rotate: -4, side: "left", overlap: 0.12 },
];

// TODO(before launch): these are illustrative sample reviews written for the design.
// Replace them with real, consented student reviews (reviews table, milestone 9).
// Avatars are flat illustrated faces (no photos of real people next to sample quotes).
export const testimonials: {
  quote: string;
  name: string;
  role: string;
  /** badge colour + avatar colours (flat Maxima block faces) */
  tone: Tone;
  avatar: { head: string; hair: string; bg: string };
}[] = [
  {
    quote:
      "I'd bought three courses elsewhere and finished none. The tests between lessons kept me going.",
    name: "Ananya R.",
    role: "UI design · Pune",
    tone: "sun",
    avatar: { head: "#f4b183", hair: "#161616", bg: "#2668fd" },
  },
  {
    quote:
      "The free first video made it easy to pick a tutor whose style actually suits me.",
    name: "Kabir S.",
    role: "Spoken English · Lucknow",
    tone: "bubblegum",
    avatar: { head: "#c98a5e", hair: "#3b308f", bg: "#ffcf3f" },
  },
  {
    quote:
      "Short lessons, clear modules. I learn on the metro and pick up exactly where I stopped.",
    name: "Meera J.",
    role: "Excel for work · Kochi",
    tone: "white",
    avatar: { head: "#e7a77a", hair: "#fd4401", bg: "#a7eb98" },
  },
  {
    quote:
      "The certificate felt like a real win, and the verification code makes it easy to share.",
    name: "Rohan D.",
    role: "Guitar basics · Jaipur",
    tone: "mint",
    avatar: { head: "#b9784f", hair: "#161616", bg: "#f780d4" },
  },
];

export const tutorPhotos = [
  u("photo-1580894732930-0babd100d356"),
  u("photo-1522881193457-37ae97c905bf"),
  u("photo-1664382953647-5c6c76dd63b9"),
];

export const pricing = [
  {
    name: "Just looking",
    note: "Try before you buy",
    price: "Free",
    per: "to start",
    cta: "Watch a free lesson",
    href: "/courses",
    perks: [
      "First video of every course",
      "Full curriculum preview",
      "Save courses to your wishlist",
    ],
  },
  {
    name: "Buy a course",
    note: "Own it for life",
    price: "₹799+",
    per: "/ course",
    cta: "Browse courses",
    href: "/courses",
    featured: true,
    perks: [
      "Every module & video unlocked",
      "Tests between lessons",
      "Lifetime access, no subscription",
      "Certificate on completion",
    ],
  },
  {
    name: "Teach",
    note: "For tutors",
    price: "₹0",
    per: "to publish",
    cta: "Become a tutor",
    href: "/become-tutor",
    perks: [
      "Upload videos & build modules",
      "Add tests anywhere",
      "Earn on every sale",
      "Tutor analytics",
    ],
  },
];

export const faqs = [
  {
    q: "Is the first video really free?",
    a: "Yes. The first video of every course is free to watch, no card needed. If you like it, buy the course to unlock everything else.",
  },
  {
    q: "Do I pay monthly?",
    a: "No subscriptions. You pay once per course and keep access to it, including future updates the tutor adds.",
  },
  {
    q: "What are the tests between lessons?",
    a: "Short quizzes that tutors place between videos. Some are checkpoints you need to pass before the next part unlocks, and you see explanations after each attempt.",
  },
  {
    q: "Do I get a certificate?",
    a: "When you finish every lesson and pass the tests, you get a certificate with a unique verification code you can share.",
  },
  {
    q: "How do I become a tutor?",
    a: "Create an account and apply on the Become a tutor page. Once our team approves you, you can build courses, upload videos and submit them for review.",
  },
  {
    q: "Can I watch on my phone?",
    a: "Yes. Courses work in any modern browser on phone, tablet or laptop, and your progress syncs across all of them.",
  },
];

/** Footer link columns (all internal: the route curtain handles them). */
export const footerLinks: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Learn",
    links: [
      { label: "All courses", href: "/courses" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Teach",
    links: [
      { label: "Become a tutor", href: "/become-tutor" },
      { label: "Tutor login", href: "/login" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Admin", href: "/admin" },
    ],
  },
];
