import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { HighlightBox } from "@/components/decor/Bits";

export const metadata: Metadata = {
  title: "Reset password",
  description:
    "Forgot your Tamada Media password? We'll email you a reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthSplit
      scene="forgot"
      eyebrow="Reset password"
      title={
        <>
          Forgot your{" "}
          <HighlightBox tone="lime" rotate={-3}>
            password?
          </HighlightBox>
        </>
      }
      body="It happens. Pop in your email and we'll send you a fresh link."
      topAction={
        <p>
          New here?{" "}
          <Link
            href="/signup"
            className="font-bold text-ink underline decoration-hotpink decoration-2 underline-offset-4 hf:decoration-ink"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <div className="app-enter rounded-card-lg bg-white p-5 shadow-soft sm:p-8">
        <ForgotForm />
      </div>
      <p className="mt-6 text-center text-[14px] text-ink/65">
        Still stuck?{" "}
        <Link
          href="/contact"
          className="font-bold text-ink underline decoration-blue decoration-2 underline-offset-4"
        >
          Ask a human
        </Link>
      </p>
    </AuthSplit>
  );
}
