import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/auth/LegalPage";
import { SITE } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Tamada Media collects, why, who we share it with and how to control your data. Sample placeholder copy.",

};

const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "The short version",
    body: (
      <ul>
        <li>We collect what we need to run your account, your course progress and your payments. That&apos;s it.</li>
        <li>We don&apos;t sell your personal data. Ever.</li>
        <li>Instructors see learning stats for their lessons, not your email or payment details.</li>
        <li>You can download or delete your data whenever you like.</li>
      </ul>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <h3>You give us</h3>
        <ul>
          <li>Account details: name, email, password (stored hashed, never in plain text), city and an optional photo.</li>
          <li>Instructor applications: subject, experience, sample links and payout country. Bank or UPI details only after approval.</li>
          <li>Things you post: reviews, lesson questions, notes and support messages.</li>
          <li>Work you share: capstone cuts and links you send for feedback or the showcase.</li>
        </ul>
        <h3>We collect as you learn</h3>
        <ul>
          <li>Progress: which lessons you watched, where you paused, checkpoint attempts and scores, streaks and certificates.</li>
          <li>Purchases: what you bought, amount, coupon and order status. Card and UPI details are handled by our payment partners, not us.</li>
          <li>Device basics: browser, rough location (city level), and logs that keep the service secure.</li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>To run your account, unlock what you bought and remember where you cut off.</li>
        <li>To issue and verify certificates (the public check shows your name, the course and the date, nothing else).</li>
        <li>To pay guest instructors and handle refunds, tax and accounting.</li>
        <li>To keep Tamada safe: spotting fraud, account sharing and abuse.</li>
        <li>To improve the course: the teaching team sees aggregated stats like completion and checkpoint pass rates.</li>
        <li>To send emails you&apos;d expect (receipts, resets, replies). Newsletters only if you opt in, with one-click unsubscribe.</li>
      </ul>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>We share the minimum needed with service providers who work for us under contract:</p>
        <ul>
          <li>Payment partners (for example Razorpay) to take payments and issue refunds.</li>
          <li>Video hosting and delivery networks to stream lessons through short-lived signed links.</li>
          <li>Email and customer support tools to talk to you.</li>
          <li>Analytics that we configure to avoid identifying you personally.</li>
        </ul>
        <p>We may also share data when the law requires it, for example a valid order from an Indian court or authority.</p>
      </>
    ),
  },
  {
    id: "tutors-see",
    title: "What instructors can see",
    body: (
      <p>
        The teaching team and guest instructors see your first name, avatar, your questions and reviews on their lessons, cuts you send for feedback, and anonymous aggregates (how many learners finished module 2, which checkpoint question trips people up). They don&apos;t see your email, phone or payment details.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <p>We use a small number of cookies and browser storage to keep you logged in, remember your playback position and settings, and measure what&apos;s working.</p>
        <p>
          <strong>In this demo</strong>, a cookie called <code>tm_demo</code> remembers which demo account you picked, and your demo changes live in this browser&apos;s local storage. Nothing is sent to a server.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    body: (
      <>
        <p>Under India&apos;s Digital Personal Data Protection Act, 2023, and similar laws where you live, you can:</p>
        <ul>
          <li>see and download the personal data we hold about you;</li>
          <li>correct anything that&apos;s wrong;</li>
          <li>withdraw consent for optional things like newsletters;</li>
          <li>ask us to delete your account and data (we keep invoices for as long as tax law requires);</li>
          <li>nominate someone to act for you, and complain to the Data Protection Board of India.</li>
        </ul>
        <p>
          Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we&apos;ll respond within 30 days, usually much sooner.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        We keep your account data while your account is open. If you delete it, we remove your personal data within 30 days, except records we must keep by law (like invoices, for 8 years) and anonymous stats that can&apos;t identify you.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Data is encrypted in transit and at rest, access inside the team is limited to people who need it, and passwords are hashed. No system is perfect, so if we ever have a breach that affects you, we&apos;ll tell you and the authorities promptly.
      </p>
    ),
  },
  {
    id: "children",
    title: "Learners under 18",
    body: (
      <p>Learners aged 13 to 17 can use Tamada with a parent or guardian&apos;s consent. We don&apos;t knowingly collect data from children under 13; if you think we have, tell us and we&apos;ll delete it.</p>
    ),
  },
  {
    id: "contact",
    title: "Changes and contact",
    body: (
      <p>
        We&apos;ll post updates here and email you about important changes. Our grievance officer (sample: Sameer Joshi) can be reached at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or through the <Link href="/contact?topic=other">contact page</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      index="02"
      eyebrow="Legal"
      title="Privacy policy."
      intro="What we collect, why we need it, who sees it and how to take it back. Your data, plainly: we'd rather tell you clearly than bury it."
      updated="01.09.2026"
      sections={SECTIONS}
      other={{ label: "Terms of use", href: "/terms" }}
    />
  );
}
