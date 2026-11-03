"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CONTACT } from "@/lib/content/contact";
import { ArrowLink, Button, Eyebrow, SplitReveal } from "@/components/editorial";
import { Reveal } from "@/components/motion/Reveal";

/* =============================================================================
   CONTACT HERO + CONVERSATIONAL FORM (Mobius "Let's Talk!"). Cream.
   Left column: the eyebrow, then "Rather write an email?" + the address and the
   free-lesson link at the bottom. Right: the giant headline, a lede, then the
   sentence you fill in:
     Hey Tamada, my name is [name] and I'm a [role]. I'd like to [intent].
     You can reach me at [email].
   + an optional message box and a red Send. UI only: it validates (name, email),
   focuses the first problem, then swaps to a success note (focus moves to it).
   Deep links preselect the intent: /contact?topic=workshop&ref=TM-123#message.
   <ContactFormFromUrl /> reads the URL (wrap in <Suspense>), <ContactForm /> is the
   static fallback.
   ============================================================================= */

type Errors = Partial<Record<"name" | "email", string>>;

export function ContactFormFromUrl() {
  const p = useSearchParams();
  return <ContactForm topic={p.get("topic")} refCode={p.get("ref")} />;
}

export function ContactForm({ topic, refCode }: { topic?: string | null; refCode?: string | null }) {
  const id = useId();
  const c = CONTACT;
  const intent = c.intents.find((i) => i.key === topic?.toLowerCase()) ?? c.intents[0];
  const reference = refCode?.slice(0, 80) ?? "";
  const [sent, setSent] = useState<{ name: string; email: string; intent: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const form = useRef<HTMLFormElement>(null);
  const done = useRef<HTMLDivElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const name = String(d.get("name") ?? "").trim();
    const email = String(d.get("email") ?? "").trim();
    const chosen = c.intents.find((i) => i.key === d.get("intent"))?.label ?? intent.label;
    const next: Errors = {};
    if (!name) next.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Add an email we can reply to, like name@example.com.";
    setErrors(next);
    if (next.name || next.email) {
      form.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${next.name ? "name" : "email"}`)}`)?.focus();
      return;
    }
    setSent({ name: name.split(/\s+/)[0], email, intent: chosen });
    requestAnimationFrame(() => done.current?.focus());
  };

  const err = (k: keyof Errors) => (errors[k] ? `${id}-${k}-err` : undefined);

  return (
    <div className="edit-grid gap-y-12 pt-[calc(var(--header-offset)+var(--sat)+clamp(40px,8vh,112px))] pb-section">
      <div className="col-span-12 flex flex-col justify-between gap-10 lg:col-span-3">
        <Eyebrow index="01">{c.label}</Eyebrow>
        <div className="max-lg:hidden">
          <p className="t-small text-muted">{c.side.question}</p>
          <a href={`mailto:${c.email}`} className="link-draw mt-2 inline-block font-heading text-[19px] font-semibold tracking-[-0.02em]">
            {c.email}
          </a>
          <div className="mt-8">
            <ArrowLink href={c.side.cta.href} size="lg">
              {c.side.cta.label}
            </ArrowLink>
          </div>
        </div>
      </div>

      <div id="message" className="col-span-12 scroll-mt-[calc(var(--header-offset)+24px)] lg:col-span-8 lg:col-start-4">
        <SplitReveal as="h1" immediate className="font-heading text-[clamp(4rem,1.4rem+9vw,11.5rem)] leading-[0.88] font-bold tracking-[-0.06em]">
          {c.title}
        </SplitReveal>
        <Reveal as="p" className="t-body-l mt-8 max-w-[36rem] text-muted">
          {c.lede}
        </Reveal>

        {sent ? (
          <div ref={done} tabIndex={-1} role="status" className="mt-14 max-w-[44rem] border-t border-line pt-10 focus:outline-none">
            <p className="t-label flex items-center gap-3">
              <span aria-hidden className="block size-[7px] bg-red" />
              Sent
            </p>
            <p className="t-statement-xl mt-6">{c.done.title(sent.name)}</p>
            <p className="t-body-l mt-5 max-w-[36rem] text-muted">{c.done.body(sent.email, `“${sent.intent}”`)}</p>
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <Button href={c.done.next.href} arrow>
                {c.done.next.label}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setErrors({});
                }}
                className="t-label link-draw self-start py-2 sm:self-auto"
              >
                {c.done.again}
              </button>
            </div>
          </div>
        ) : (
          <form ref={form} noValidate onSubmit={submit} aria-label="Contact Tamada Media" className="mt-14 border-t border-line pt-10">
            <div className="conv-sentence t-statement-l max-w-[52rem] leading-[1.9]">
              {c.sentence.hey}{" "}
              <label htmlFor={`${id}-name`} className="sr-only">
                Your name
              </label>
              <input
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                placeholder="your name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={err("name")}
                className="conv-field w-[8.5em] aria-[invalid=true]:border-red-deep max-sm:w-full"
              />{" "}
              {c.sentence.role}{" "}
              <label htmlFor={`${id}-role`} className="sr-only">
                What you do
              </label>
              <select id={`${id}-role`} name="role" defaultValue={c.roles[0]} className="conv-field max-sm:w-full">
                {c.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {c.sentence.intent}{" "}
              <label htmlFor={`${id}-intent`} className="sr-only">
                What you would like to do
              </label>
              <select key={intent.key} id={`${id}-intent`} name="intent" defaultValue={intent.key} className="conv-field max-sm:w-full">
                {c.intents.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              {c.sentence.reach}{" "}
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
                aria-describedby={err("email")}
                className="conv-field w-[10em] aria-[invalid=true]:border-red-deep max-sm:w-full"
              />
              <span className="max-sm:hidden">{c.sentence.end}</span>
            </div>

            {(errors.name || errors.email) && (
              <ul className="mt-6 grid gap-1" aria-live="assertive">
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

            <div className="mt-12 grid max-w-[44rem] gap-3">
              <label htmlFor={`${id}-msg`} className="t-label flex items-center justify-between gap-4">
                {c.message.label}
                <span className="t-timecode text-muted">{c.message.optional}</span>
              </label>
              <textarea
                key={reference}
                id={`${id}-msg`}
                name="message"
                rows={4}
                defaultValue={reference ? `${c.refLabel}: ${reference}\n` : undefined}
                placeholder={c.message.placeholder}
                className="t-body min-h-32 w-full resize-y border border-line-strong bg-cream-2/60 px-4 py-3.5 transition-colors outline-none placeholder:text-muted focus:border-red"
              />
            </div>

            <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Button type="submit" size="lg" arrow>
                {c.send}
              </Button>
              <p className="t-caption max-w-[24rem]">
                {c.consent}{" "}
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

        <div className="mt-12 lg:hidden">
          <p className="t-small text-muted">{c.side.question}</p>
          <a href={`mailto:${c.email}`} className="link-draw mt-2 inline-block font-heading text-[19px] font-semibold tracking-[-0.02em]">
            {c.email}
          </a>
        </div>
      </div>
    </div>
  );
}
