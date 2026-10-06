import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { SignupForm } from "@/components/auth/SignupForm";
import { SessionBanner } from "@/components/auth/DemoAccounts";
import { HighlightBox } from "@/components/decor/Bits";
import { backFor, describeNext, safeNext } from "@/lib/mock/extra/auth";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Make a free Tamada Media account, save your progress and keep every tiny win.",
};

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const nextName = next ? describeNext(next) : null;
  const intent = sp.intent === "teach" ? "teach" : "learn";
  return (
    <AuthSplit
      scene="signup"
      eyebrow="Sign up"
      back={backFor(next)}
      title={
        <>
          Your curiosity{" "}
          <HighlightBox tone="sun" rotate={-3}>
            called.
          </HighlightBox>
        </>
      }
      body="Make an account, save your progress, and keep every tiny win."
      topAction={
        <p>
          Been here before?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-bold text-ink underline decoration-blue decoration-2 underline-offset-4 hf:decoration-ink"
          >
            Log in
          </Link>
        </p>
      }
    >
      <SessionBanner className="mb-5" />
      <SignupForm initialIntent={intent} next={next} nextName={nextName} />
      <ul className="mt-6 grid gap-2.5 text-[14px] font-semibold text-ink/75 sm:grid-cols-3 sm:gap-3">
        {[
          "First video of every course free",
          "Pay per course, in ₹",
          "Certificates you can verify",
        ].map((t) => (
          <li
            key={t}
            className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5"
          >
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-forest"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            {t}
          </li>
        ))}
      </ul>
    </AuthSplit>
  );
}
