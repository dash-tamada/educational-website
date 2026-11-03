"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, toast } from "@/components/app";
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
      <div className="app-enter">
        <p className="t-label flex items-center gap-2.5 text-muted">
          <span aria-hidden className="size-[7px] rounded-full bg-red" />
          Link sent
        </p>
        <h2
          ref={doneRef}
          tabIndex={-1}
          className="mt-4 font-heading text-[clamp(1.75rem,1.4rem+1.2vw,2.375rem)] leading-[1.02] font-semibold tracking-[-0.04em] outline-none"
        >
          Check your inbox.
        </h2>
        <p className="t-body mt-3 max-w-[38ch] text-muted">
          A reset link is on its way to{" "}
          <EmailText email={sentTo} className="font-semibold text-fg" />, if it
          has a Tamada account. It works for 30 minutes.
        </p>
        <ol className="mt-8 border-t border-line text-[14px] leading-snug">
          {[
            <>Look in Promotions or Spam if it isn&apos;t there in a minute.</>,
            <>
              It comes from{" "}
              <span className="font-mono text-[13px] whitespace-nowrap">no-reply@tamada.demo</span>.
            </>,
            <>Demo: no email is actually sent. Use a demo account to log in.</>,
          ].map((t, i) => (
            <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-b border-line py-3">
              <span className="t-timecode pt-[3px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-fg/80">{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-2.5">
          <Button href="/login" variant="accent" size="lg" fullWidth iconRight="arrow-right">
            Back to log in
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? (
              <span>
                Resend in <span className="font-mono tabular-nums">{cooldown}s</span>
              </span>
            ) : (
              "Resend the link"
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="t-label mt-2 inline-flex min-h-11 items-center justify-self-start text-muted transition-colors hf:text-fg"
          >
            <span className="link-draw">Use a different email</span>
          </button>
        </div>
      </div>
    );

  return (
    <>
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <Field
          label="Email"
          error={error}
          hint="We'll send a link to choose a new password. It expires in 30 minutes."
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
      </form>
    </>
  );
}
