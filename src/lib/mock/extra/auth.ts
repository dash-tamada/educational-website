/* =============================================================================
   Extra mock content for the auth + info pages (login, signup, become-tutor,
   about, contact, legal). Deterministic, sample data only. Built on the
   foundation types; never mutates SEED_DB.
   ============================================================================= */

import type { Role } from "@/lib/mock/types";
import { SEED_DB } from "@/lib/mock";

/* ----------------------------------------------------------------------------- demo login */
interface DemoAccountCard {
  role: Role;
  name: string;
  label: string;
  /** what you will see after logging in */
  blurb: string;
  lands: string;
}

export const DEMO_ACCOUNT_CARDS: DemoAccountCard[] = [
  {
    role: "student",
    name: "Priya Nair",
    label: "Student",
    blurb:
      "Module 5 of AI Filmmaking, a 5-day streak, a lesson paused at 7:40.",
    lands: "Student space",
  },
  {
    role: "tutor",
    name: "Arjun Rao",
    label: "Tutor",
    blurb: "The flagship course live, a bonus pack in review, a draft in the builder.",
    lands: "Tutor studio",
  },
  {
    role: "admin",
    name: "Admin",
    label: "Admin",
    blurb: "Team applications, a course review, refunds and reports to clear.",
    lands: "Admin control room",
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

/** Friendly name for a ?next= target, e.g. "your wishlist" or "checkout for AI Filmmaking: Prompt to Premiere".
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
    "/courses": "the course",
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
export const TUTOR_PROCESS: { title: string; body: string; when: string }[] = [
  {
    title: "Apply",
    body: "Tell us which part of the pipeline you teach and share a short sample.",
    when: "10 minutes",
  },
  {
    title: "Get reviewed",
    body: "A human on our team watches your sample and reads your idea.",
    when: "Within 5 working days",
  },
  {
    title: "Build your first course",
    body: "Open the course studio, record, upload and add checkpoints.",
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
    a: "Filmmakers, editors, colourists, sound designers and AI artists who can teach one part of the pipeline clearly. You don't need a film-school degree, you need finished work and the patience to explain it.",
  },
  {
    q: "How long is review?",
    a: "Usually two to five working days. Someone on the team watches your sample lesson and reads your outline. If something is missing we'll ask for changes instead of saying no.",
  },
  {
    q: "What equipment do I need?",
    a: "A screen recorder, a quiet room and a decent clip-on mic (around ₹600) is honestly enough to start. Good sound and clear examples matter more than a fancy camera.",
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

/* ----------------------------------------------------------------------------- contact */
export const CONTACT_TOPICS = [
  { value: "learner", label: "Learner support" },
  { value: "payments", label: "Payments and refunds" },
  { value: "certificate", label: "Certificates" },
  { value: "tutor", label: "Team and mentors" },
  { value: "partnership", label: "Partnerships" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

/** Reply promise per topic (learner 1, team 2, partnerships 3, press 2 working days). */
export const CONTACT_TOPIC_REPLY: Record<string, string> = {
  learner: "one working day",
  payments: "one working day",
  certificate: "one working day",
  tutor: "two working days",
  partnership: "three working days",
  press: "two working days",
  other: "two working days",
};

/** Deterministic support ticket number from the message contents. */
export function ticketNumber(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return `SUP-${(Math.abs(h) % 90000) + 10000}`;
}
