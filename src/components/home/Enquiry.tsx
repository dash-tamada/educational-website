"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ENQUIRY } from "@/lib/content/home";
import { FLAGSHIP, SITE } from "@/lib/content/site";
import { ArrowLink, Button, Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   13 CONVERSATIONAL ENQUIRY (Mobius contact form). Cream-2.
   A sentence you fill in: "Hey Tamada, my name is [__] and I'm a [select].
   I'd like to [select]. You can reach me at [email]." + red Send. UI only: it
   validates, then swaps to a success note (focus moves to it).
   ============================================================================= */

type Errors = Partial<Record<"name" | "email", string>>;

export function Enquiry() {
  const id = useId();
  const [sent, setSent] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const doneRef = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const name = String(d.get("name") ?? "").trim();
    const email = String(d.get("email") ?? "").trim();
    const next: Errors = {};
    if (!name) next.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Add an email we can reply to, like name@example.com.";
    setErrors(next);
    if (next.name || next.email) {
      form.current?.querySelector<HTMLElement>(next.name ? `#${CSS.escape(`${id}-name`)}` : `#${CSS.escape(`${id}-email`)}`)?.focus();
      return;
    }
    setSent(name.split(" ")[0]);
    requestAnimationFrame(() => doneRef.current?.focus());
  };

  const errId = (k: keyof Errors) => (errors[k] ? `${id}-${k}-err` : undefined);

  return (
    <section id="enquiry" aria-labelledby="enquiry-title" className="ground-cream-2 relative">
      <div className="container-wide edit-grid gap-y-12 py-section">
        <div className="col-span-12 flex flex-col justify-between gap-8 lg:col-span-3">
          <Eyebrow index="13">{ENQUIRY.label}</Eyebrow>
          <div className="max-lg:hidden">
            <p className="t-small text-muted">
              {ENQUIRY.side}{" "}
              <a href={`mailto:${SITE.email}`} className="link-draw text-fg">
                {SITE.email}
              </a>
            </p>
            <div className="mt-5">
              <ArrowLink href={FLAGSHIP.freeLessonHref} size="lg">
                Watch free lesson
              </ArrowLink>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 lg:col-start-4">
          <SplitReveal as="h2" id="enquiry-title" className="t-headline-xl">
            {ENQUIRY.title}
          </SplitReveal>

          {sent !== null ? (
            <div ref={doneRef} tabIndex={-1} role="status" className="mt-12 max-w-[40rem] focus:outline-none">
              <p className="t-statement-l">{ENQUIRY.done(sent)}</p>
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setErrors({});
                }}
                className="t-label link-draw mt-8 py-2"
              >
                {ENQUIRY.again}
              </button>
            </div>
          ) : (
            <form ref={form} noValidate onSubmit={submit} className="mt-12">
              <div className="conv-sentence t-statement-m max-w-[46rem] leading-[2.1]">
                Hey Tamada, my name is{" "}
                <label htmlFor={`${id}-name`} className="sr-only">
                  Your name
                </label>
                <input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  placeholder="your name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errId("name")}
                  className="conv-field w-[9.5em] max-sm:w-full"
                />{" "}
                and I&rsquo;m a{" "}
                <label htmlFor={`${id}-role`} className="sr-only">
                  What you do
                </label>
                <select id={`${id}-role`} name="role" defaultValue={ENQUIRY.roles[0]} className="conv-field max-sm:w-full">
                  {ENQUIRY.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                . I&rsquo;d like to{" "}
                <label htmlFor={`${id}-intent`} className="sr-only">
                  What you would like
                </label>
                <select id={`${id}-intent`} name="intent" defaultValue={ENQUIRY.intents[0]} className="conv-field max-sm:w-full">
                  {ENQUIRY.intents.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                . You can reach me at{" "}
                <label htmlFor={`${id}-email`} className="sr-only">
                  Email address
                </label>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errId("email")}
                  className="conv-field w-[11em] max-sm:w-full"
                />
                . Looking forward to your reply.
              </div>

              {(errors.name || errors.email) && (
                <ul className="mt-6 grid gap-1">
                  {errors.name && (
                    <li id={`${id}-name-err`} className="t-small text-red-deep">
                      {errors.name}
                    </li>
                  )}
                  {errors.email && (
                    <li id={`${id}-email-err`} className="t-small text-red-deep">
                      {errors.email}
                    </li>
                  )}
                </ul>
              )}

              <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <Button type="submit" size="lg" arrow>
                  {ENQUIRY.send}
                </Button>
                <p className="t-caption max-w-[24rem]">
                  By sending this you agree to our{" "}
                  <Link href="/terms" className="link-draw text-fg">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="link-draw text-fg">
                    Privacy policy
                  </Link>
                  . We never share your email.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
