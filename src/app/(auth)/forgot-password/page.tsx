import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit, AuthSwitch } from "@/components/auth/AuthSplit";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Forgot your Tamada Media password? We'll email you a reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthSplit
      scene="forgot"
      eyebrow="Reset password"
      title="Forgot your password?"
      intro="It happens on every set. Enter your email and we'll send a fresh link."
      topAction={<AuthSwitch prompt="Remembered it?" label="Log in" href="/login" />}
    >
      <ForgotForm />
      <p className="mt-10 border-t border-line pt-4 text-[13.5px] text-muted">
        Still stuck?{" "}
        <Link href="/contact" className="link-draw font-medium text-fg">
          Ask a human
        </Link>
        . We reply within a working day.
      </p>
    </AuthSplit>
  );
}
