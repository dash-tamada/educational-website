import type { MediaKey } from "@/lib/media";
import { CLOCK, FLAGSHIP, SITE, SOCIALS } from "./site";
import { STUDIO_PLACE } from "./team";

/* =============================================================================
   CONTACT PAGE (/contact -> src/components/contact/*). Server- and client-safe.
   The conversational form is UI only (validates, then shows a success state; no
   network). Other pages deep-link a topic: /contact?topic=<key>[&ref=…]#message
   (terms: payments, privacy/legal: other, certificates: certificate + ref, tutor
   application: tutor, about page: workshop | studio | tutor | press). Unknown
   topics fall back to the first intent. Address, phone-free by design.
   ============================================================================= */

export type Intent = { key: string; label: string };

export const CONTACT = {
  label: "Contact",
  title: "Let's talk.",
  lede: "A question about the course, a workshop for your team, a film you want made, or just a hello. Fill in the sentence; a human replies within one working day.",
  /** the same inbox as the footer and home enquiry (placeholder until launch) */
  email: SITE.email,
  sentence: {
    hey: "Hey Tamada, my name is",
    role: "and I'm a",
    intent: ". I'd like to",
    reach: ". You can reach me at",
    end: ".",
  },
  roles: [
    "first-time filmmaker",
    "working editor",
    "content creator",
    "student",
    "brand or agency",
    "teacher or school",
    "journalist",
  ],
  intents: [
    { key: "course", label: "take the course" },
    { key: "mentor", label: "join the mentor cohort" },
    { key: "workshop", label: "bring a workshop to my team" },
    { key: "studio", label: "commission a film" },
    { key: "tutor", label: "teach or mentor with you" },
    { key: "payments", label: "sort out a payment" },
    { key: "certificate", label: "check a certificate" },
    { key: "press", label: "talk about press or speaking" },
    { key: "other", label: "just say hello" },
  ] satisfies Intent[],
  message: { label: "Anything else we should know?", optional: "Optional", placeholder: "A link to your work, the size of your team, a deadline…" },
  refLabel: "Reference",
  send: "Send",
  consent: "By sending this you agree to our",
  done: {
    title: (name: string) => `Thank you${name ? `, ${name}` : ""}.`,
    body: (email: string, intent: string) =>
      `Your note is in. We'll reply to ${email} about ${intent} within one working day (Monday to Saturday, IST).`,
    again: "Send another note",
    next: { label: "While you wait, watch the free lesson", href: FLAGSHIP.freeLessonHref },
  },
  side: {
    question: "Rather write an email?",
    cta: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
  },
} as const;

/** Contact details block (Mobius "photo + card"). */
export const STUDIO = {
  label: "The studio",
  image: "bts-crew-location" as MediaKey,
  caption: "Remote-first: the course is online, the studio is wherever the shoot is.",
  /** from the clock (site.ts CLOCK), the same place About uses */
  city: STUDIO_PLACE,
  timezone: CLOCK.label,
  hours: "Monday to Saturday, 10am to 7pm IST",
  reply: "Within one working day",
  socials: SOCIALS.filter((s) => s.label === "Instagram" || s.label === "YouTube"),
} as const;

/** FAQ-lite: four quick answers, no accordion. */
export const CONTACT_FAQ = {
  label: "Before you write",
  title: "Quick answers.",
  more: { label: "All questions", href: "/#faq" },
  items: [
    {
      q: "Is the first lesson really free?",
      a: "Yes. Lesson one of module one is open to everyone, no card and no account needed.",
      link: { label: "Watch it", href: FLAGSHIP.freeLessonHref },
    },
    {
      q: "I'm stuck on a lesson. Where do I ask?",
      a: "Use the questions tab under the lesson: mentors answer there within a day. Write here for anything about your account or a payment.",
    },
    {
      q: "Do you run workshops for teams and colleges?",
      a: "Yes: half-day and two-day formats, online or in person. Pick “bring a workshop to my team” in the form above and tell us the size of the group.",
    },
    {
      q: "Can I pay in instalments?",
      a: "Yes. Three no-cost EMIs on supported cards and UPI apps, chosen at checkout.",
      link: { label: "See pricing", href: "/#pricing" },
    },
  ],
} as const;
