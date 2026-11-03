import type { Metadata } from "next";
import { AuthSplit, AuthSwitch } from "@/components/auth/AuthSplit";
import { SignupForm } from "@/components/auth/SignupForm";
import { SessionBanner } from "@/components/auth/DemoAccounts";
import { backFor, describeNext, safeNext } from "@/lib/mock/extra/auth";
import { FLAGSHIP } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Make a free Tamada Media account, save your progress and start AI Filmmaking: Prompt to Premiere with the free first lesson.",
};

const PERKS = ["First lesson free", "Pay once, in ₹", `${FLAGSHIP.certificateTitle} certificate`];

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const nextName = next ? describeNext(next) : null;
  const intent = sp.intent === "teach" ? "teach" : "learn";
  return (
    <AuthSplit
      scene="signup"
      eyebrow="Sign up"
      title="Create your account."
      intro="Save your progress, keep every cut, and start with the free first lesson."
      back={backFor(next)}
      topAction={<AuthSwitch prompt="Been here before?" label="Log in" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} />}
    >
      <SessionBanner className="mb-8" />
      <SignupForm initialIntent={intent} next={next} nextName={nextName} />
      <ol className="mt-12 grid border-t border-line sm:grid-cols-3">
        {PERKS.map((t, i) => (
          <li key={t} className="flex items-baseline gap-3 border-b border-line py-3 sm:flex-col sm:gap-1.5 sm:border-b-0 sm:py-4 sm:pr-3">
            <span className="t-timecode text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[13.5px] leading-snug font-medium">{t}</span>
          </li>
        ))}
      </ol>
    </AuthSplit>
  );
}
