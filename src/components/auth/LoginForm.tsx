"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Checkbox, Field, Input, toast } from "@/components/app";
import { useDemoAuth } from "@/lib/demo/session-client";
import {
  EMAIL_RE,
  findSeedUserByEmail,
  landingFor,
} from "@/lib/mock/extra/auth";
import { DEMO_USERS } from "@/lib/demo/session";
import { SITE } from "@/lib/content/site";
import { PasswordInput } from "./PasswordInput";
import { GoogleGlyph, OrDivider } from "./AuthSplit";
import { enterToNext, focusField } from "./fields";

type Errors = Partial<Record<"email" | "password" | "form", string>>;

/**
 * Email + password login. There is no real auth: the form validates, then logs
 * into the matching seeded demo account (any seeded email works, e.g.
 * arjun.rao@tamada.demo opens the tutor studio). Unknown emails open the
 * student demo. Suspended seeded accounts are refused, like the real thing would.
 */
export function LoginForm({ next }: { next: string | null }) {
  const { loginAs } = useDemoAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!email.trim()) e.email = "Enter the email you signed up with.";
    else if (!EMAIL_RE.test(email.trim()))
      e.email = "That doesn't look like an email. Check for a typo?";
    if (!password) e.password = "Enter your password.";
    else if (password.length < 8)
      e.password = "Passwords are at least 8 characters.";
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    const user = !e.email ? findSeedUserByEmail(email) : null;
    if (!e.email && user?.status === "suspended")
      e.form =
        `This account is suspended. Write to ${SITE.email} and a human will look into it.`;
    setErrors(e);
    if (e.email) return focusField(emailRef.current);
    if (e.password) return focusField(pwRef.current);
    if (e.form) return;

    setBusy("email");
    // a short, honest pause so the button state is visible
    window.setTimeout(() => {
      const role = user?.role ?? "student";
      const userId = user?.id ?? DEMO_USERS.student.userId;
      const name = user?.name ?? DEMO_USERS.student.name;
      loginAs(role, { userId, redirectTo: landingFor(role, next) });
      toast.success(`Welcome back, ${name.split(" ")[0]}.`, {
        description: user
          ? "Demo account: any 8+ character password works."
          : "Demo mode: new emails open Priya's student space.",
      });
    }, 450);
  };

  const google = () => {
    setBusy("google");
    window.setTimeout(() => {
      loginAs("student", { redirectTo: landingFor("student", next) });
      toast.info("Google sign-in is simulated.", {
        description: "You're exploring as Priya, the student demo.",
      });
    }, 550);
  };

  return (
    <div>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-describedby={errors.form ? "login-form-error" : undefined}
        className="grid gap-4"
      >
        {errors.form && (
          <p
            id="login-form-error"
            role="alert"
            className="border-l-2 border-red bg-red/[0.06] px-4 py-3 text-[14px] leading-snug font-medium text-red-deep"
          >
            {errors.form}
          </p>
        )}
        <Field label="Email" error={errors.email}>
          <Input
            ref={emailRef}
            type="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            onKeyDown={(e) => enterToNext(pwRef)(e)}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.form)
                setErrors((x) => ({ ...x, email: undefined, form: undefined }));
            }}
            inputSize="lg"
          />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          labelAction={
            <Link
              href="/forgot-password"
              className="hit link-draw text-[12.5px] text-muted transition-colors hf:text-fg"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            ref={pwRef}
            autoComplete="current-password"
            enterKeyHint="go"
            placeholder="8+ characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password)
                setErrors((x) => ({ ...x, password: undefined }));
            }}
            inputSize="lg"
          />
        </Field>
        <Checkbox
          label="Keep me logged in on this device"
          className="coarse:min-h-11 coarse:py-2.5"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <Button
          type="submit"
          variant="accent"
          size="lg"
          fullWidth
          loading={busy === "email"}
          disabled={busy !== null}
          iconRight={busy === "email" ? undefined : "arrow-right"}
          className="mt-1"
        >
          {busy === "email" ? "Logging you in…" : "Log in"}
        </Button>
      </form>

      <OrDivider />

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={google}
        loading={busy === "google"}
        disabled={busy !== null}
      >
        {busy !== "google" && <GoogleGlyph className="size-5" />}
        Continue with Google
      </Button>
      <p className="mt-4 text-[13px] leading-snug text-muted">
        <span className="t-label mr-2 text-fg">Demo tip</span>
        Try{" "}
        <button
          type="button"
          className="hit link-draw font-mono text-[12.5px] text-fg"
          onClick={() => {
            setEmail("arjun.rao@tamada.demo");
            setPassword("teachmore");
            setErrors({});
          }}
        >
          arjun.rao@tamada.demo
        </button>{" "}
        with any 8+ character password.
      </p>
    </div>
  );
}
