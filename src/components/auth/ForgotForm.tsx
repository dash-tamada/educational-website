"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Icon, Input, toast } from "@/components/app";
import { EMAIL_RE } from "@/lib/mock/extra/auth";
import { EmailText } from "@/components/auth/EmailText";
import { focusField } from "./fields";

/**
 * Reset request -> "check your inbox". Nothing is sent in the demo; the copy
 * never reveals whether an email has an account (same answer either way).
 */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!cooldown) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (sentTo) doneRef.current?.focus();
  }, [sentTo]);

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = email.trim();
    const e = !v
      ? "Enter the email you use for Tamada."
      : !EMAIL_RE.test(v)
        ? "That doesn't look like an email. Check for a typo?"
        : undefined;
    setError(e);
    if (e) return focusField(inputRef.current);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSentTo(v);
      setCooldown(30);
    }, 600);
  };

  const resend = () => {
    setCooldown(30);
    toast.success("Sent again.", {
      description: `Another reset link is on its way to ${sentTo}.`,
    });
  };

  if (sentTo)
    return (
      <div className="app-enter text-center">
        <div
          className="mx-auto grid size-20 place-items-center rounded-full bg-cyan"
          aria-hidden
        >
          <Icon name="mail" className="size-9 text-ink" strokeWidth={1.8} />
        </div>
        <h2
          ref={doneRef}
          tabIndex={-1}
          className="mt-5 t-chunky-card outline-none"
        >
          Check your inbox.
        </h2>
        <p className="mx-auto mt-3 max-w-[34ch] t-body text-ink/70">
          A reset link is on its way to{" "}
          <EmailText email={sentTo} className="text-ink" />, if it has a Tamada
          account. It works for 30 minutes.
        </p>
        <ul className="mx-auto mt-6 grid max-w-[340px] gap-2 text-left text-[14px] text-ink/70">
          <li className="flex gap-2.5">
            <Icon
              name="check-circle"
              className="mt-0.5 size-4 shrink-0 text-green"
            />{" "}
            Look in Promotions or Spam if it isn&apos;t there in a minute.
          </li>
          <li className="flex gap-2.5">
            <Icon
              name="check-circle"
              className="mt-0.5 size-4 shrink-0 text-green"
            />{" "}
            <span>
              The email comes from{" "}
              <span className="whitespace-nowrap">no-reply@tamada.demo</span>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue" />{" "}
            Demo: no email is actually sent. Use a demo account to log in.
          </li>
        </ul>
        <div className="mt-7 grid gap-2.5">
          <Button
            href="/login"
            variant="accent"
            size="lg"
            fullWidth
            iconRight="arrow-right"
          >
            Back to log in
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={resend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the link"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="mt-1 justify-self-center rounded-full px-3 text-[14px] font-bold text-ink/70 underline-offset-2 coarse:min-h-11 hf:text-ink hf:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );

  return (
    <>
      <h2 className="t-chunky-card">Reset your password</h2>
      <p className="mt-2 mb-6 t-small text-ink/65">
        Enter the email on your account. The link expires in 30 minutes.
      </p>
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <Field
          label="Email"
          error={error}
          hint="We'll send a link to choose a new password."
        >
          <Input
            ref={inputRef}
            type="email"
            icon="mail"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="send"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(undefined);
            }}
            inputSize="lg"
          />
        </Field>
        <Button
          type="submit"
          variant="accent"
          size="lg"
          fullWidth
          loading={busy}
          iconRight={busy ? undefined : "arrow-right"}
        >
          {busy ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-center text-[14px] text-ink/65">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-bold text-blue-deep underline-offset-2 hf:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}
