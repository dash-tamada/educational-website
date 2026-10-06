import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/auth/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for learning and teaching on Tamada Media: accounts, free previews, purchases, refunds, certificates and tutor terms. Sample placeholder copy.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "Who we are",
    body: (
      <>
        <p>
          Tamada Media (&ldquo;Tamada&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) runs a marketplace for short video courses made by
          independent tutors. These terms apply when you browse the site, make
          an account, buy a course or teach one.
        </p>
        <p>
          By using Tamada you agree to these terms. If you don&apos;t agree,
          please don&apos;t use the service. Plain English is the goal; if
          something is unclear, ask us and we&apos;ll explain it.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <>
        <ul>
          <li>
            You need to be at least 13 to make an account. If you&apos;re under
            18, a parent or guardian should agree to these terms with you.
          </li>
          <li>
            Give us a real email address. It&apos;s where receipts, certificates
            and password resets go.
          </li>
          <li>
            Keep your password to yourself. You&apos;re responsible for what
            happens on your account, so tell us quickly if you think someone
            else got in.
          </li>
          <li>
            One person per account. Sharing a login with friends or a whole
            classroom isn&apos;t allowed; ask us about team access instead.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "previews-purchases",
    title: "Free previews and purchases",
    body: (
      <>
        <p>
          The <strong>first video of every published course is free</strong> to
          watch, with or without an account. Tutors may open extra preview
          lessons.
        </p>
        <p>
          When you buy a course you pay once, in Indian rupees (₹), and get
          access to every lesson, test and resource in that course for as long
          as Tamada operates it. Prices include GST where it applies; your
          receipt shows the breakdown.
        </p>
        <ul>
          <li>
            Payments are processed by our payment partners (for example Razorpay
            for UPI, cards, netbanking and wallets). We never see or store your
            full card number.
          </li>
          <li>
            Coupons have their own dates and limits, and can&apos;t be swapped
            for cash.
          </li>
          <li>
            If a tutor updates a course, you get the new version at no extra
            cost.
          </li>
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
          Didn&apos;t click? You can ask for a full refund within{" "}
          <strong>7 days of purchase</strong>, as long as you&apos;ve watched
          less than 25% of the course and haven&apos;t earned its certificate.
        </p>
        <ol>
          <li>
            Open the order in{" "}
            <Link href="/dashboard/orders">Dashboard &gt; Orders</Link> and
            press <strong>Request a refund</strong>. Or write to us from the{" "}
            <Link href="/contact?topic=payments">contact page</Link> with your
            order number (it looks like TM-25471).
          </li>
          <li>
            We usually reply within two working days. Approved refunds go back
            to the original payment method, usually within 5 to 7 working days.
          </li>
          <li>Once refunded, your access to that course ends.</li>
        </ol>
        <p>
          We may decline repeated refund requests that look like using courses
          for free.
        </p>
      </>
    ),
  },
  {
    id: "using-courses",
    title: "Using courses",
    body: (
      <>
        <p>
          Buying a course gives you a personal, non-transferable licence to
          watch it for your own learning. Please don&apos;t:
        </p>
        <ul>
          <li>
            record, download, re-upload or resell videos, tests or resources
            (unless a resource is clearly marked as downloadable);
          </li>
          <li>share your access or post quiz answers publicly;</li>
          <li>
            use bots, scrapers or anything that tries to get around paid access.
          </li>
        </ul>
        <p>
          Paid videos are delivered through short-lived signed links, and
          breaking these rules can get an account suspended.
        </p>
      </>
    ),
  },
  {
    id: "certificates",
    title: "Certificates",
    body: (
      <>
        <p>
          When you finish every lesson and pass every required test in a course
          that offers one, we issue a certificate with a unique code. Anyone can
          check it at{" "}
          <Link href="/certificates/TM-7QK4-M2XD">
            tamada&apos;s verification page
          </Link>
          .
        </p>
        <p>
          Certificates show that you completed a Tamada course. They aren&apos;t
          a degree, diploma or government-recognised qualification. We may
          revoke a certificate earned by breaking these terms.
        </p>
      </>
    ),
  },
  {
    id: "tutors",
    title: "Teaching on Tamada",
    body: (
      <>
        <p>
          Anyone can <Link href="/become-tutor">apply to teach</Link>. A person
          on our team reviews every application and every course before it goes
          live. If you teach with us:
        </p>
        <ul>
          <li>
            You keep ownership of your content and give Tamada a worldwide
            licence to host, stream, promote and sell it while it&apos;s listed,
            plus for learners who already bought it.
          </li>
          <li>
            You set the price. You receive 70% of each sale after GST and
            payment fees; Tamada keeps 30% to run the platform, payments,
            support and marketing.
          </li>
          <li>
            Payouts are made monthly, around the 10th, for the previous
            month&apos;s sales, minus any refunds. We may hold a payout while we
            look into chargebacks or a breach of these terms.
          </li>
          <li>
            Your content must be your own (or properly licensed), accurate, and
            free of hate, harassment, unsafe advice and &ldquo;guaranteed
            returns&rdquo; promises.
          </li>
          <li>
            You&apos;re responsible for your own taxes. We&apos;ll ask for the
            details we need to pay you (and deduct TDS where Indian law
            requires) only after you&apos;re approved.
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
          Reviews and lesson questions help everyone, so keep them honest and
          kind. Don&apos;t post spam, personal information about others, or
          anything abusive.
        </p>
        <p>
          Tutors can reply to reviews but can&apos;t delete them. We may hide
          content that breaks these rules, and you can report anything that
          looks wrong from the course page.
        </p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and closing your account",
    body: (
      <>
        <p>
          You can close your account at any time from your settings. We may
          suspend or close accounts that break these terms, misuse payments or
          put other people at risk. Where we can, we&apos;ll tell you why and
          give you a chance to respond.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          Courses are made by independent tutors. We review them, but we
          can&apos;t promise any particular result from taking one, and nothing
          on Tamada is professional financial, medical or legal advice.
        </p>
        <p>
          To the extent the law allows, Tamada&apos;s total liability to you for
          any claim is limited to the amount you paid us in the 12 months before
          the claim. Nothing here limits rights you have under Indian consumer
          protection law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and governing law",
    body: (
      <>
        <p>
          We&apos;ll update these terms as the product grows, and email you
          about important changes at least 14 days before they apply.
        </p>
        <p>
          These terms are governed by the laws of India. Courts in Hyderabad,
          Telangana have jurisdiction, though we&apos;d always rather sort
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
        Questions about these terms? Write to{" "}
        <a href="mailto:legal@tamada.demo">legal@tamada.demo</a> or use the{" "}
        <Link href="/contact">contact page</Link>. A human will reply within two
        working days.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of use"
      title="The rules of the club."
      intro="How learning and teaching on Tamada works: accounts, free previews, purchases, refunds, certificates and what tutors agree to. Short sentences, no traps."
      updated="1 September 2026"
      sections={SECTIONS}
      other={{ label: "privacy policy", href: "/privacy" }}
    />
  );
}
