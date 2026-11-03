import type { Metadata } from "next";
import { AuthNote, AuthSplit, AuthSwitch } from "@/components/auth/AuthSplit";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoAccounts, DemoQuickStrip, SessionBanner } from "@/components/auth/DemoAccounts";
import { backFor, describeNext, safeNext } from "@/lib/mock/extra/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Tamada Media to pick up your next lesson, or try a one-click demo account.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const nextName = next ? describeNext(next) : null;
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  return (
    <AuthSplit
      scene="login"
      eyebrow="Log in"
      title="Welcome back."
      intro="Your next scene is right where you cut it. Log in, or open a demo account."
      back={backFor(next)}
      topAction={<AuthSwitch prompt="New here?" label="Create an account" href={signupHref} />}
    >
      <SessionBanner className="mb-8" />
      {next && (
        <AuthNote className="mb-8">
          {nextName ? (
            <>
              Log in to continue to <strong className="font-semibold [overflow-wrap:anywhere]">{nextName}</strong>.
            </>
          ) : (
            <>Log in and we&apos;ll bring you right back.</>
          )}
        </AuthNote>
      )}
      {/* phones + tablets: the demo accounts are one tap away, above the form */}
      <DemoQuickStrip next={next} className="mb-10 lg:hidden" />
      <LoginForm next={next} />
      <DemoAccounts next={next} className="mt-14 max-lg:hidden" />
    </AuthSplit>
  );
}
