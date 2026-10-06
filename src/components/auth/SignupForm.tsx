"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import clsx from "clsx";
import {
  Button,
  Checkbox,
  Field,
  Input,
  RadioGroup,
  toast,
} from "@/components/app";
import { useDemoAuth } from "@/lib/demo/session-client";
import {
  EMAIL_RE,
  findSeedUserByEmail,
  passwordStrength,
  signupLanding,
} from "@/lib/mock/extra/auth";
import { PasswordInput, StrengthMeter } from "./PasswordInput";
import { GoogleGlyph, OrDivider } from "./AuthSplit";
import { CHECKBOX_INVALID, FormError } from "./FormError";
import { enterToNext, focusField } from "./fields";

type Intent = "learn" | "teach";
type Errors = Partial<
  Record<"name" | "email" | "password" | "terms", React.ReactNode>
>;

/** sessionStorage key the tutor application reads to prefill name + email. */
export const SIGNUP_DRAFT_KEY = "tm-signup-draft";

/**
 * Learner signup. No real accounts exist in the demo, so a valid submit opens
 * the student demo session (Priya) and lands on /dashboard, or on
 * /become-tutor when "Teach" was picked (the name + email are handed to the
 * application form so the visitor doesn't type them twice).
 */
export function SignupForm({
  initialIntent = "learn",
  next,
  nextName = null,
}: {
  initialIntent?: Intent;
  next: string | null;
  /** readable name of `next` (e.g. a course title) for the "where you'll land" banner */
  nextName?: string | null;
}) {
  const { loginAs } = useDemoAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [terms, setTerms] = useState(false);
  const [news, setNews] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const clear = (k: keyof Errors) =>
    errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  // next is already canonical (safeNext on the server); signupLanding only drops other roles' areas
  const destination = () =>
    intent === "teach" ? "/become-tutor#apply" : signupLanding(next);

  const finish = (first: string) => {
    loginAs("student", { redirectTo: destination() });
    toast.success(`Welcome aboard, ${first}.`, {
      description:
        intent === "teach"
          ? "Demo mode: you're in Priya's student account. Next up: your tutor application."
          : "Demo mode: you're exploring Priya's student space.",
    });
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    const n = name.trim();
    if (n.length < 2) e.name = "Tell us what to call you (2+ characters).";
    if (!email.trim()) e.email = "We need an email to save your progress.";
    else if (!EMAIL_RE.test(email.trim()))
      e.email = "That doesn't look like an email. Check for a typo?";
    else if (findSeedUserByEmail(email))
      e.email = (
        // one element: the Field error row is a flex line, so bare text + link would split into columns
        <span>
          That email already has an account.{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-bold whitespace-nowrap underline underline-offset-2"
          >
            Log in instead
          </Link>
        </span>
      );
    if (passwordStrength(password).score === 0)
      e.password = "Use at least 8 characters.";
    if (!terms) e.terms = "Please accept the terms to continue.";
    setErrors(e);
    const order = [
      ["name", nameRef],
      ["email", emailRef],
      ["password", pwRef],
      ["terms", termsRef],
    ] as const;
    const first = order.find(([k]) => e[k]);
    // focus + glide the first problem to mid-screen, so its inline message shows too
    if (first) return focusField(first[1].current);

    setBusy("form");
    try {
      sessionStorage.setItem(
        SIGNUP_DRAFT_KEY,
        JSON.stringify({ name: n, email: email.trim() }),
      );
    } catch {}
    window.setTimeout(() => finish(n.split(" ")[0]), 500);
  };

  const google = () => {
    setBusy("google");
    window.setTimeout(() => finish("Priya"), 550);
  };

  return (
    <>
      {/* the ?next banner follows the live "I'm here to" choice: Teach lands on the
          tutor application, so it must not promise the course */}
      {next && (
        <p
          aria-live="polite"
          className="app-fade mb-5 rounded-card bg-cyan/60 px-4 py-3 text-[14px] font-semibold"
        >
          {intent === "teach" ? (
            nextName ? (
              <>
                Next up: your tutor application.{" "}
                <span className="font-bold [overflow-wrap:anywhere]">
                  {nextName}
                </span>{" "}
                will still be there.
              </>
            ) : (
              <>Next up: your tutor application. We&apos;ll keep your place.</>
            )
          ) : nextName ? (
            <>
              Make a free account and we&apos;ll take you straight to{" "}
              <span className="font-bold [overflow-wrap:anywhere]">
                {nextName}
              </span>
              .
            </>
          ) : (
            <>Make a free account and we&apos;ll bring you right back.</>
          )}
        </p>
      )}
      <div className="app-enter rounded-card-lg bg-white p-5 shadow-soft sm:p-8">
        <h2 className="t-chunky-card">Create your account</h2>
        <p className="mt-2 mb-6 t-small text-ink/65">
          Free forever for previews. You only pay for the courses you unlock.
        </p>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={google}
          loading={busy === "google"}
          disabled={busy !== null}
        >
          {busy !== "google" && <GoogleGlyph className="size-5" />}
          Sign up with Google
        </Button>
        <OrDivider label="or with email" />

        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <Field label="Your name" error={errors.name}>
            <Input
              ref={nameRef}
              icon="user"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              onKeyDown={(e) => enterToNext(emailRef)(e)}
              placeholder="Aarav Sharma"
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value);
                clear("name");
              }}
              inputSize="lg"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              ref={emailRef}
              type="email"
              icon="mail"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              onKeyDown={(e) => enterToNext(pwRef)(e)}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clear("email");
              }}
              inputSize="lg"
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput
              ref={pwRef}
              autoComplete="new-password"
              enterKeyHint="go"
              placeholder="8+ characters"
              value={password}
              aria-describedby="pw-strength"
              onChange={(e) => {
                setPassword(e.target.value);
                clear("password");
              }}
              inputSize="lg"
            />
          </Field>
          <StrengthMeter
            password={password}
            id="pw-strength"
            hideTip={!!errors.password}
          />

          <RadioGroup<Intent>
            label="I'm here to"
            name="intent"
            value={intent}
            onChange={setIntent}
            variant="cards"
            orientation="horizontal"
            className="mt-1"
            options={[
              {
                value: "learn",
                label: <span className="max-sm:text-base">Learn</span>,
                description: "Watch, test, collect certificates.",
              },
              {
                value: "teach",
                label: <span className="max-sm:text-base">Teach</span>,
                description: "Apply to publish your own course.",
              },
            ]}
          />

          <div className="grid gap-3 pt-1">
            <div>
              <Checkbox
                ref={termsRef}
                className={clsx(CHECKBOX_INVALID, "coarse:min-h-11 coarse:py-2.5")}
                checked={terms}
                aria-invalid={errors.terms ? true : undefined}
                aria-describedby={errors.terms ? "terms-err" : undefined}
                onChange={(e) => {
                  setTerms(e.target.checked);
                  clear("terms");
                }}
                label={
                  <>
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      privacy policy
                    </Link>
                    .
                  </>
                }
              />
              {errors.terms && (
                <FormError id="terms-err" className="ml-8">
                  {errors.terms}
                </FormError>
              )}
            </div>
            <Checkbox
              label="Send me the occasional good stuff"
              className="coarse:min-h-11 coarse:py-2.5"
              description="New courses on the 1st of the month. Zero inbox drama."
              checked={news}
              onChange={(e) => setNews(e.target.checked)}
            />
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            fullWidth
            loading={busy === "form"}
            disabled={busy !== null}
            iconRight={busy === "form" ? undefined : "arrow-right"}
            className="mt-1"
          >
            {busy === "form"
              ? "Setting things up…"
              : intent === "teach"
                ? "Create account and apply"
                : "Start learning"}
          </Button>
          <p className="text-center text-[13px] leading-snug text-ink/70">
            You can browse and watch free previews before buying anything.
          </p>
        </form>
      </div>
    </>
  );
}
