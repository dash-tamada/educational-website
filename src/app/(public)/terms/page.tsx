import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/auth/LegalPage";
import { FLAGSHIP, SITE } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for learning with Tamada Media: accounts, the free first lesson, purchases, refunds, your films and AI tools, certificates and guest instructors. Sample placeholder copy.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "Who we are",
    body: (
      <>
        <p>
          Tamada Media (&ldquo;Tamada&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) runs an online school for AI filmmaking. Our course,{" "}
          <Link href={FLAGSHIP.href}>{FLAGSHIP.title}</Link>, is made by director {FLAGSHIP.director} and the Tamada team, sometimes with guest
          instructors. These terms apply when you browse the site, make an account, buy the course or an add-on (such as mentor feedback), or
          teach with us.
        </p>
        <p>
          By using Tamada you agree to these terms. If you don&apos;t agree, please don&apos;t use the service. Plain English is the goal; if
          something is unclear, ask us and we&apos;ll explain it.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>You need to be at least 13 to make an account. If you&apos;re under 18, a parent or guardian should agree to these terms with you.</li>
        <li>Give us a real email address. It&apos;s where receipts, certificates and password resets go.</li>
        <li>
          Keep your password to yourself. You&apos;re responsible for what happens on your account, so tell us quickly if you think someone else
          got in.
        </li>
        <li>One person per account. Sharing a login with friends or a whole class isn&apos;t allowed; ask us about workshop access instead.</li>
      </ul>
    ),
  },
  {
    id: "previews-purchases",
    title: "The free lesson and purchases",
    body: (
      <>
        <p>
          The <strong>first lesson of the course is free</strong> to watch, with or without an account. We may open other preview lessons from
          time to time.
        </p>
        <p>
          When you buy the course you pay once, in Indian rupees (₹), and get access to every lesson, checkpoint and resource in it for as long
          as Tamada operates it. Prices include GST where it applies; your receipt shows the breakdown.
        </p>
        <ul>
          <li>
            Payments are processed by our payment partners (for example Razorpay for UPI, cards, netbanking, wallets and no-cost EMIs). We never
            see or store your full card number.
          </li>
          <li>Coupons have their own dates and limits, and can&apos;t be swapped for cash.</li>
          <li>When a tool changes in a way that matters, we update or re-shoot the lessons that depend on it, at no extra cost to you.</li>
        </ul>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <p>
          Not for you? You can ask for a full refund within <strong>7 days of purchase</strong>, as long as you&apos;ve watched less than 25% of
          the course and haven&apos;t earned its certificate. Mentor-feedback seats are refundable until your first live review.
        </p>
        <ol>
          <li>
            Open the order in <Link href="/dashboard/orders">Dashboard &gt; Orders</Link> and press <strong>Request a refund</strong>. Or write
            to us from the <Link href="/contact?topic=payments">contact page</Link> with your order number (it looks like TM-25471).
          </li>
          <li>We usually reply within two working days. Approved refunds go back to the original payment method, usually within 5 to 7 working days.</li>
          <li>Once refunded, your access to the course ends.</li>
        </ol>
        <p>We may decline repeated refund requests that look like using the course for free.</p>
      </>
    ),
  },
  {
    id: "using-courses",
    title: "Using the course",
    body: (
      <>
        <p>Buying the course gives you a personal, non-transferable licence to watch it for your own learning. Please don&apos;t:</p>
        <ul>
          <li>record, download, re-upload or resell lessons, checkpoints or resources (unless a resource is clearly marked as downloadable);</li>
          <li>share your access or post checkpoint answers publicly;</li>
          <li>use bots, scrapers or anything that tries to get around paid access.</li>
        </ul>
        <p>Paid videos are delivered through short-lived signed links, and breaking these rules can get an account suspended.</p>
      </>
    ),
  },
  {
    id: "your-films",
    title: "Your films and AI tools",
    body: (
      <>
        <p>
          <strong>You own the films you make in the course</strong>, including your capstone, subject to the terms of the tools you used to make
          them.
        </p>
        <ul>
          <li>
            The course teaches third-party AI tools (for example Veo, Kling, Runway, Midjourney and ElevenLabs). They have their own terms,
            prices and content rules. You&apos;re responsible for following them and for any credits you buy.
          </li>
          <li>
            Don&apos;t use what you learn to make unlawful, deceptive or infringing work, or to depict a real person without their consent.
            Label AI-generated work where a platform, festival or the law asks you to.
          </li>
          <li>
            If you share work with us (a capstone for feedback, a film for the showcase), you give us permission to show it with your credit. You
            can ask us to take it down at any time.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "certificates",
    title: "Certificates",
    body: (
      <>
        <p>
          When you finish every lesson, pass every required checkpoint and complete the capstone, we issue a{" "}
          <strong>{FLAGSHIP.certificateTitle}</strong> certificate with a unique code. Anyone can check it on its{" "}
          <Link href="/certificates/TM-7QK4-M2XD">verification page</Link>.
        </p>
        <p>
          Certificates show that you completed a Tamada course. They aren&apos;t a degree, diploma or government-recognised qualification. We may
          revoke a certificate earned by breaking these terms.
        </p>
      </>
    ),
  },
  {
    id: "tutors",
    title: "Guest instructors",
    body: (
      <>
        <p>
          Working filmmakers can <Link href="/become-tutor">apply to teach</Link> a part of the pipeline. A person on our team reviews every
          application and every lesson before it goes live. If you teach with us:
        </p>
        <ul>
          <li>
            You keep ownership of your lessons and give Tamada a worldwide licence to host, stream, promote and sell them while they&apos;re
            listed, plus for learners who already bought them.
          </li>
          <li>
            You receive 70% of the revenue from your lessons after GST and payment fees; Tamada keeps 30% to run the school, payments, support
            and marketing.
          </li>
          <li>
            Payouts are made monthly, around the 10th, for the previous month, minus any refunds. We may hold a payout while we look into
            chargebacks or a breach of these terms.
          </li>
          <li>Your lessons must be your own (or properly licensed), accurate, and free of hate, harassment, unsafe advice and income promises.</li>
          <li>
            You&apos;re responsible for your own taxes. We&apos;ll ask for the details we need to pay you (and deduct TDS where Indian law requires)
            only after you&apos;re approved.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "community",
    title: "Reviews, Q&A and community",
    body: (
      <>
        <p>
          Reviews, lesson questions and cut feedback help everyone, so keep them honest and kind. Don&apos;t post spam, other people&apos;s
          personal information or anything abusive.
        </p>
        <p>We may hide content that breaks these rules, and you can report anything that looks wrong from the lesson page.</p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and closing your account",
    body: (
      <p>
        You can close your account at any time from your settings. We may suspend or close accounts that break these terms, misuse payments or
        put other people at risk. Where we can, we&apos;ll tell you why and give you a chance to respond.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          We can&apos;t promise any particular result from the course: views, festival selections, clients or income. AI tools change quickly; we
          keep lessons current, but we can&apos;t guarantee a third-party tool stays available or priced the same.
        </p>
        <p>
          To the extent the law allows, Tamada&apos;s total liability to you for any claim is limited to the amount you paid us in the 12 months
          before the claim. Nothing here limits rights you have under Indian consumer protection law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and governing law",
    body: (
      <>
        <p>We&apos;ll update these terms as the school grows, and email you about important changes at least 14 days before they apply.</p>
        <p>
          These terms are governed by the laws of India. Courts in Bengaluru, Karnataka have jurisdiction, though we&apos;d always rather sort
          things out over email first.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these terms? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or use the{" "}
        <Link href="/contact">contact page</Link>. A human will reply within two working days.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      index="01"
      eyebrow="Legal"
      title="Terms of use."
      intro="How learning with Tamada works: your account, the free first lesson, purchases and refunds, the films you make, certificates, and what guest instructors agree to. Short sentences, no traps."
      updated="01.09.2026"
      sections={SECTIONS}
      other={{ label: "Privacy policy", href: "/privacy" }}
    />
  );
}
