import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  DemoAccounts,
  DemoQuickStrip,
  SessionBanner,
} from "@/components/auth/DemoAccounts";
import { HighlightBox } from "@/components/decor/Bits";
import { backFor, describeNext, safeNext } from "@/lib/mock/extra/auth";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to Tamada Media to pick up your next lesson, or try a one-click demo account.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const nextName = next ? describeNext(next) : null;
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";
  return (
    <AuthSplit
      scene="login"
      eyebrow="Log in"
      back={backFor(next)}
      title={
        <>
          Welcome back,{" "}
          <HighlightBox tone="sun" rotate={-3}>
            curious human.
          </HighlightBox>
        </>
      }
      body="Your next lesson is closer than you think."
      topAction={
        <p>
          New here?{" "}
          <Link
            href={signupHref}
            className="font-bold text-ink underline decoration-hotpink decoration-2 underline-offset-4 hf:decoration-ink"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <SessionBanner className="mb-5" />
      {next && (
        <p className="app-fade mb-5 flex items-start gap-2.5 rounded-card bg-cyan/60 px-4 py-3 text-[14px] font-semibold">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {nextName ? (
            <span>
              Log in to continue to{" "}
              <span className="font-bold [overflow-wrap:anywhere]">
                {nextName}
              </span>
              .
            </span>
          ) : (
            <span>Log in and we&apos;ll bring you right back.</span>
          )}
        </p>
      )}
      {/* phones + tablets: the demo accounts are one tap away, above the form */}
      <DemoQuickStrip next={next} className="mb-5 lg:hidden" />
      <div className="app-enter rounded-card-lg bg-white p-5 shadow-soft sm:p-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <h2 className="t-chunky-card">Log in to Tamada</h2>
          <a
            href="#demo"
            className="hidden shrink-0 text-[13px] font-bold text-ink underline decoration-blue decoration-2 underline-offset-4 lg:inline hf:decoration-ink"
          >
            Skip to demo
          </a>
        </div>
        <LoginForm next={next} />
      </div>
      <div className="mt-5">
        <DemoAccounts next={next} />
      </div>
      <p className="mt-6 text-center text-[14px] text-ink/65">
        No account yet?{" "}
        <Link
          href={signupHref}
          className="font-bold text-ink underline decoration-hotpink decoration-2 underline-offset-4"
        >
          Start learning free
        </Link>
      </p>
    </AuthSplit>
  );
}
