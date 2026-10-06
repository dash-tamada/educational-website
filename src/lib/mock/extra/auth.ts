/* =============================================================================
   Extra mock content for the auth + info pages (login, signup, become-tutor,
   about, contact, legal). Deterministic, sample data only. Built on the
   foundation types; never mutates SEED_DB.
   ============================================================================= */

import type { Role } from "@/lib/mock/types";
import type { Tone } from "@/lib/landing-data";
import type { IconName } from "@/components/app/icons";
import { SEED_DB } from "@/lib/mock";

/* ----------------------------------------------------------------------------- demo login */
export interface DemoAccountCard {
  role: Role;
  name: string;
  label: string;
  /** light chip (label + arrow) that keeps small text at AA contrast */
  chip: string;
  /** what you will see after logging in */
  blurb: string;
  lands: string;
  tone: Tone;
  icon: IconName;
  buddy: { body: string; head: string; hat?: string };
}

export const DEMO_ACCOUNT_CARDS: DemoAccountCard[] = [
  {
    role: "student",
    name: "Priya Nair",
    label: "Student",
    chip: "bg-blush text-ink",
    blurb:
      "Halfway through Web Dev From Zero, a 5-day streak, two certificates.",
    lands: "Student space",
    tone: "hotpink",
    icon: "book",
    buddy: { body: "#ff008c", head: "#ffcf3f", hat: "#2668fd" },
  },
  {
    role: "tutor",
    name: "Arjun Rao",
    label: "Tutor",
    chip: "bg-mint text-forest",
    blurb: "Two published courses, one in review, a draft in the builder.",
    lands: "Tutor studio",
    tone: "green",
    icon: "video",
    buddy: { body: "#00b351", head: "#f780d4" },
  },
  {
    role: "admin",
    name: "Admin",
    label: "Admin",
    chip: "bg-purple text-white",
    blurb: "Tutor applications, course reviews, refunds and reports to clear.",
    lands: "Admin control room",
    tone: "purple",
    icon: "shield",
    buddy: { body: "#3b308f", head: "#ffcf3f" },
  },
];

/** Seeded account lookup for the email form (case-insensitive). */
export function findSeedUserByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return SEED_DB.users.find((u) => u.email.toLowerCase() === e) ?? null;
}

const NEXT_BASE = "http://tm.local";

/**
 * Only same-origin paths are allowed as ?next= targets. Anything with a control
 * character, DEL or a backslash is refused outright (browsers strip tabs and
 * newlines and treat a backslash as "/", which turns "/<TAB>/evil.com" into "//evil.com").
 * The value is then canonicalised through the URL parser and only the
 * path + query + hash of a same-origin result is returned.
 */
export function safeNext(
  next: string | string[] | undefined | null,
): string | null {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || typeof v !== "string" || v.length > 512) return null;
  if (/[\u0000-\u001F\u007F\\]/.test(v)) return null;
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  let u: URL;
  try {
    u = new URL(v, NEXT_BASE);
  } catch {
    return null;
  }
  if (u.origin !== NEXT_BASE) return null;
  const out = u.pathname + u.search + u.hash;
  // "/.//evil.com" canonicalises to "//evil.com": never hand back a protocol-relative URL
  if (!out.startsWith("/") || out.startsWith("//")) return null;
  if (/^\/(login|signup|forgot-password)(\/|$)/.test(u.pathname)) return null;
  return out;
}

const AREA_OWNER = {
  dashboard: "student",
  tutor: "tutor",
  admin: "admin",
} as const;
const areaOfNext = (next: string) =>
  next.match(/^\/(dashboard|tutor|admin)(\/|\?|#|$)/)?.[1] as
    keyof typeof AREA_OWNER | undefined;

/** Where a role should land given a (canonical, safeNext'ed) ?next= (ignore next if it points at another role's area). */
export function landingFor(role: Role, next: string | null): string | "home" {
  if (!next) return "home";
  const area = areaOfNext(next);
  if (!area) return next;
  return AREA_OWNER[area] === role ? next : "home";
}

/** Signup always opens the student demo: same rule as landingFor, but "home" is /dashboard. */
export function signupLanding(next: string | null): string {
  const to = landingFor("student", next);
  return to === "home" ? "/dashboard" : to;
}

/** Friendly name for a ?next= target, e.g. "your wishlist" or "checkout for Web Dev From Zero".
 *  null for pages we have no nice name for: callers then use neutral copy, never the raw path. */
export function describeNext(next: string): string | null {
  const path = next.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const DASH: Record<string, string> = {
    "/dashboard": "your student space",
    "/dashboard/courses": "your courses",
    "/dashboard/wishlist": "your wishlist",
    "/dashboard/certificates": "your certificates",
    "/dashboard/orders": "your orders",
    "/dashboard/settings": "your settings",
    "/tutor": "the tutor studio",
    "/admin": "the admin control room",
    "/courses": "the course catalogue",
    "/become-tutor": "your tutor application",
    "/certificates": "certificate check",
    "/about": "our story",
    "/contact": "the contact page",
    "/terms": "the terms",
    "/privacy": "the privacy policy",
    "/faq": "the help centre",
    "/community": "the community page",
    "/tutors": "our tutors",
    "/": "the home page",
  };
  if (DASH[path]) return DASH[path];
  const [, a, slug] = path.split("/");
  const course = slug
    ? SEED_DB.courses.find((c) => c.slug === slug)
    : undefined;
  if (course && a === "checkout") return `checkout for ${course.title}`;
  if (course && a === "courses") return course.title;
  if (course && a === "learn") return `your lesson in ${course.title}`;
  if (a === "tutor") return "the tutor studio";
  if (a === "admin") return "the admin control room";
  if (a === "dashboard") return "your student space";
  if (a === "tutors" && slug) {
    const t = SEED_DB.tutorProfiles.find((p) => p.slug === slug);
    const u = t ? SEED_DB.users.find((x) => x.id === t.userId) : undefined;
    if (u) return `${u.name}'s profile`;
  }
  if (a === "certificates" && slug) {
    const code = normaliseCode(safeDecode(slug));
    if (CERT_CODE_RE.test(code)) return `certificate ${code}`;
  }
  return null;
}

/**
 * "Back" link for the auth colour field: return to the page the visitor came
 * from (a course, checkout, a lesson) unless that page is an app area they
 * can't open logged out. Falls back to the home page.
 */
export function backFor(next: string | null): { href: string; label: string } {
  if (!next || areaOfNext(next)) return { href: "/", label: "to site" };
  const a = next.split(/[/?#]/)[1];
  const label =
    a === "courses"
      ? "to course"
      : a === "checkout"
        ? "to checkout"
        : a === "learn"
          ? "to lesson"
          : a === "certificates"
            ? "to certificate"
            : a === "become-tutor"
              ? "to teaching"
              : "";
  return { href: next, label };
}

/* ----------------------------------------------------------------------------- certificate codes */
/** Canonical certificate code shape, e.g. TM-7QK4-M2XD. */
export const CERT_CODE_RE = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Normalise "tm7qk4m2xd" / "tm 7qk4 m2xd" / "tm-7qk4-m2xd " -> "TM-7QK4-M2XD".
 *  Anything that isn't 8 characters after the TM prefix comes back trimmed and upper-cased. */
export function normaliseCode(raw: string) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = s.startsWith("TM") ? s.slice(2) : s;
  if (body.length !== 8) return raw.trim().toUpperCase();
  return `TM-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** decodeURIComponent that never throws (a stray "%" in a hand-typed URL). */
export function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/* ----------------------------------------------------------------------------- password strength */
const KINDS: { re: RegExp; name: string }[] = [
  { re: /[A-Z]/, name: "a capital" },
  { re: /\d/, name: "a number" },
  { re: /[^A-Za-z0-9]/, name: "a symbol" },
  { re: /[a-z]/, name: "a lowercase letter" },
];
const BLOCKED = /password|qwerty|12345678|abcdefgh|tamada|iloveyou|letmein/i;

/** Score + a tip built from what is actually missing (no generic advice). */
export function passwordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tip: string;
} {
  if (!pw) return { score: 0, label: "", tip: "Use 8 or more characters." };
  if (pw.length < 8)
    return {
      score: 0,
      label: "Too short",
      tip: `${8 - pw.length} more character${pw.length === 7 ? "" : "s"} to go.`,
    };
  if (/^(.)\1+$/.test(pw))
    return {
      score: 1,
      label: "Weak",
      tip: "One character on repeat is easy to guess. Mix it up.",
    };
  if (BLOCKED.test(pw))
    return {
      score: 1,
      label: "Weak",
      tip: "Avoid obvious words and runs like the site name, “password” or 12345678.",
    };
  const missing = KINDS.filter((k) => !k.re.test(pw)).map((k) => k.name);
  const kinds = KINDS.length - missing.length;
  let s = 1;
  if (pw.length >= 12) s++;
  if (kinds >= 3) s++;
  if (kinds === 4 && pw.length >= 10) s++;
  const score = Math.min(4, s) as 1 | 2 | 3 | 4;
  const list =
    missing.length > 1
      ? `${missing.slice(0, -1).join(", ")} or ${missing[missing.length - 1]}`
      : missing[0];
  const improve = missing.length
    ? pw.length < 12
      ? `Add ${list}, or make it longer.`
      : `Add ${list}.`
    : "Longer is stronger. Try a short phrase.";
  const meta = {
    1: { label: "Weak", tip: improve },
    2: { label: "Okay", tip: improve },
    3: { label: "Strong", tip: "Nice. That will do nicely." },
    4: { label: "Excellent", tip: "Chef's kiss. Very hard to guess." },
  }[score];
  return { score, ...meta };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ----------------------------------------------------------------------------- become a tutor */
export const TUTOR_BENEFITS: {
  title: string;
  body: string;
  tone: Tone;
  icon: IconName;
}[] = [
  {
    title: "Build your way",
    body: "Add modules, videos, resources and tiny tests in any order. Put a quiz between any two videos.",
    tone: "sun",
    icon: "layers",
  },
  {
    title: "Reach curious humans",
    body: "Your first video is the free trailer. The right learners find it, try it and buy the rest.",
    tone: "cyan",
    icon: "users",
  },
  {
    title: "See what sticks",
    body: "Completion, quiz and replay data show you which lesson lands and which one needs a better example.",
    tone: "blush",
    icon: "chart",
  },
];

export const TUTOR_PROCESS: { title: string; body: string; when: string }[] = [
  {
    title: "Apply",
    body: "Tell us what you teach and share a short sample.",
    when: "10 minutes",
  },
  {
    title: "Get reviewed",
    body: "A human on our team watches your sample and reads your idea.",
    when: "Within 5 working days",
  },
  {
    title: "Build your first course",
    body: "Open the course studio, record, upload and add tests.",
    when: "Your pace",
  },
  {
    title: "Publish and teach",
    body: "We check the course once, then it goes live and you start earning.",
    when: "Payouts monthly",
  },
];

export const TUTOR_FAQ: { q: string; a: string }[] = [
  {
    q: "Who can apply?",
    a: "Anyone who can teach one practical thing clearly. School teachers, working engineers, home cooks, musicians and accountants all teach here. You don't need a degree in it, you need to have done it.",
  },
  {
    q: "How long is review?",
    a: "Usually two to five working days. A real person watches your sample video and reads your course idea. If something is missing we'll ask for changes instead of saying no.",
  },
  {
    q: "What equipment do I need?",
    a: "A phone that records in 1080p, a quiet room and a cheap clip-on mic (around ₹600) is honestly enough to start. Good sound matters more than a fancy camera.",
  },
  {
    q: "How do payments work?",
    a: "You set the course price. You keep 70% of every sale after GST and payment fees, and payouts land in your account on the 10th of each month for the previous month's sales.",
  },
  {
    q: "Do I keep the rights to my videos?",
    a: "Yes. You own your content. You give Tamada Media a licence to host and sell it while it's listed, and you can unpublish any time (learners who bought it keep access).",
  },
];

export const TEACH_LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
];

export const EXPERIENCE_LEVELS = [
  { value: "lt1", label: "Less than a year" },
  { value: "1-3", label: "1 to 3 years" },
  { value: "3-7", label: "3 to 7 years" },
  { value: "7+", label: "7 years or more" },
];

export const PAYOUT_COUNTRIES = [
  {
    value: "IN",
    label: "India",
    currency: "INR",
    methods: ["UPI", "Bank transfer (NEFT/IMPS)"],
  },
  {
    value: "AE",
    label: "United Arab Emirates",
    currency: "AED",
    methods: ["Bank transfer", "PayPal"],
  },
  {
    value: "SG",
    label: "Singapore",
    currency: "SGD",
    methods: ["Bank transfer", "PayPal"],
  },
  {
    value: "GB",
    label: "United Kingdom",
    currency: "GBP",
    methods: ["Bank transfer", "PayPal"],
  },
  {
    value: "US",
    label: "United States",
    currency: "USD",
    methods: ["Bank transfer (ACH)", "PayPal"],
  },
  {
    value: "CA",
    label: "Canada",
    currency: "CAD",
    methods: ["Bank transfer", "PayPal"],
  },
  {
    value: "AU",
    label: "Australia",
    currency: "AUD",
    methods: ["Bank transfer", "PayPal"],
  },
  {
    value: "OTHER",
    label: "Somewhere else",
    currency: "USD",
    methods: ["PayPal"],
  },
];

/* ----------------------------------------------------------------------------- about */
export const ABOUT_VALUES: {
  title: string;
  body: string;
  tone: Tone;
  rotate: number;
}[] = [
  {
    title: "Useful over impressive",
    body: "If you can't use it by Sunday, it doesn't make the cut. We'd rather teach one thing well than ten things loudly.",
    tone: "sun",
    rotate: -2,
  },
  {
    title: "Curious over certain",
    body: "Good teachers say 'great question' and mean it. Asking is the whole point, so every lesson has a Q&A.",
    tone: "cyan",
    rotate: 1.5,
  },
  {
    title: "Progress over perfection",
    body: "Short videos, tiny tests and visible streaks. Five honest minutes beat a perfect plan you never start.",
    tone: "blush",
    rotate: -1.5,
  },
  {
    title: "Human over hype",
    body: "Real tutors who've done the thing, reviewed by real people. No AI-generated filler courses, ever.",
    tone: "mint",
    rotate: 2,
  },
];

export const ABOUT_TIMELINE: { when: string; title: string; body: string }[] = [
  {
    when: "2023",
    title: "A WhatsApp group",
    body: "Twelve friends in Hyderabad teaching each other Excel, guitar and filing taxes over voice notes.",
  },
  {
    when: "2024",
    title: "The first ten courses",
    body: "We filmed on phones in a borrowed office in Banjara Hills. The first free video idea came from a learner.",
  },
  {
    when: "2025",
    title: "Tests between videos",
    body: "Learners kept forgetting module two. Tiny quizzes fixed it and completion jumped.",
  },
  {
    when: "2026",
    title: "Tutors across India",
    body: "Chemistry from Chennai, guitar from Kochi, Excel from Lucknow. Every course still reviewed by humans.",
  },
];

export interface TeamMember {
  name: string;
  role: string;
  city: string;
  note: string;
  buddy: { body: string; head: string; hat?: string; wave?: boolean };
  tone: Tone;
}

export const ABOUT_TEAM: TeamMember[] = [
  {
    name: "Ananya Reddy",
    role: "Co-founder, learning",
    city: "Hyderabad",
    note: "Ex-maths teacher. Will turn anything into a 6-minute lesson.",
    buddy: { body: "#ff008c", head: "#ffcf3f", hat: "#2668fd" },
    tone: "blush",
  },
  {
    name: "Rohit Menon",
    role: "Co-founder, product",
    city: "Bengaluru",
    note: "Builds the player. Watches every course at 1.25x.",
    buddy: { body: "#2668fd", head: "#fd4401", wave: true },
    tone: "cyan",
  },
  {
    name: "Fatima Sheikh",
    role: "Tutor success",
    city: "Pune",
    note: "Reads every tutor application. Yes, every single one.",
    buddy: { body: "#00b351", head: "#f780d4" },
    tone: "mint",
  },
  {
    name: "Dev Malhotra",
    role: "Video & sound",
    city: "Delhi",
    note: "Has opinions about clip-on mics. Ask at your own risk.",
    buddy: { body: "#3b308f", head: "#ffcf3f", hat: "#fd4401" },
    tone: "lilac",
  },
  {
    name: "Kavya Iyer",
    role: "Learner support",
    city: "Chennai",
    note: "Answers your 'it says payment failed' emails before lunch.",
    buddy: { body: "#f9a220", head: "#2cd1d0", wave: true },
    tone: "butter",
  },
  {
    name: "Sameer Joshi",
    role: "Trust & safety",
    city: "Ahmedabad",
    note: "Checks quizzes, captions and refund requests. Fair and fast.",
    buddy: { body: "#fd4401", head: "#a7eb98" },
    tone: "sun",
  },
];

/* ----------------------------------------------------------------------------- contact */
export const CONTACT_CHANNELS: {
  title: string;
  body: string;
  email: string;
  reply: string;
  tone: Tone;
  icon: IconName;
}[] = [
  {
    title: "Learner support",
    body: "Stuck lesson, payment trouble, certificate missing or a refund question.",
    email: "support@tamada.demo",
    reply: "Replies within 1 working day",
    tone: "sun",
    icon: "book",
  },
  {
    title: "Tutor support",
    body: "Uploading, the course builder, payouts or your application status.",
    email: "tutors@tamada.demo",
    reply: "Replies within 2 working days",
    tone: "mint",
    icon: "video",
  },
  {
    title: "Partnerships",
    body: "Schools, colleges, companies and creators who want to team up.",
    email: "partners@tamada.demo",
    reply: "Replies within 3 working days",
    tone: "cyan",
    icon: "briefcase",
  },
  {
    title: "Press",
    body: "Stories, interviews and brand assets. We love a good headline.",
    email: "press@tamada.demo",
    reply: "Replies within 2 working days",
    tone: "blush",
    icon: "mic",
  },
];

export const CONTACT_TOPICS = [
  { value: "learner", label: "Learner support" },
  { value: "payments", label: "Payments and refunds" },
  { value: "certificate", label: "Certificates" },
  { value: "tutor", label: "Tutor support" },
  { value: "partnership", label: "Partnerships" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

/** Reply promise per topic: matches the channel cards (learner 1, tutor 2, partnerships 3, press 2 working days). */
export const CONTACT_TOPIC_REPLY: Record<string, string> = {
  learner: "one working day",
  payments: "one working day",
  certificate: "one working day",
  tutor: "two working days",
  partnership: "three working days",
  press: "two working days",
  other: "two working days",
};

export const CONTACT_QUICK: { q: string; a: string }[] = [
  {
    q: "Is the first lesson really free?",
    a: "Yes. The first video of every published course is free, no card needed.",
  },
  {
    q: "Can I get a refund?",
    a: "Within 7 days of purchase if you've watched less than a quarter of the course. Send your order number (it looks like TM-25471).",
  },
  {
    q: "My certificate didn't appear.",
    a: "Certificates unlock when every lesson is watched and every required test is passed. Check the course for a pending quiz.",
  },
];

/** Deterministic support ticket number from the message contents. */
export function ticketNumber(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return `SUP-${(Math.abs(h) % 90000) + 10000}`;
}
