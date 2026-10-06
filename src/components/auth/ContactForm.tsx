"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Field,
  Icon,
  Input,
  Select,
  Textarea,
  toast,
} from "@/components/app";
import { useDemoUser } from "@/lib/demo/session-client";
import {
  CONTACT_TOPIC_REPLY,
  CONTACT_TOPICS,
  EMAIL_RE,
  ticketNumber,
} from "@/lib/mock/extra/auth";
import { EmailText } from "@/components/auth/EmailText";
import { focusField } from "./fields";

type Errors = Partial<
  Record<"name" | "email" | "topic" | "message" | "reference", string>
>;

const NEEDS_REF = new Set(["payments", "certificate", "learner"]);

/** Orders / learner issues: an order number, a certificate code or a link. */
const ORDER_REF_RE =
  /^(TM-\d{5}|TM-[A-Z0-9]{4}-[A-Z0-9]{4}|https?:\/\/\S+|\/\S+)$/i;
/** Certificates: whatever the verifier has, typos included (that's why they write). */
const CERT_REF_RE =
  /^([A-Z0-9][A-Z0-9 -]{2,38}[A-Z0-9]|https?:\/\/\S+|\/\S+)$/i;

const REF_COPY: Record<
  string,
  { label: string; placeholder: string; hint: string; error: string }
> = {
  certificate: {
    label: "Certificate code or link",
    placeholder: "TM-7QK4-M2XD",
    hint: "Certificate codes look like TM-7QK4-M2XD (top right of the certificate). Send it even if it looks off, we'll dig.",
    error:
      "Paste the code as printed (letters, numbers and dashes) or the certificate link.",
  },
  payments: {
    label: "Order number or course link",
    placeholder: "TM-25471",
    hint: "Find order numbers under Dashboard → Orders. They look like TM-25471.",
    error: "Paste an order number (TM-25471) or a course link.",
  },
  learner: {
    label: "Order number, certificate code or course link",
    placeholder: "TM-25471",
    hint: "Find order numbers under Dashboard → Orders. They look like TM-25471.",
    error:
      "Paste an order number (TM-25471), a certificate code or a course link.",
  },
};

function refValid(topic: string, ref: string) {
  return (topic === "certificate" ? CERT_REF_RE : ORDER_REF_RE).test(ref);
}

/**
 * Contact form with a subject select, validation and a success state that swaps
 * in without a reload. Nothing is sent in the demo: the "ticket" number is made
 * up from the message so it is stable for the same text.
 */
export function ContactForm({
  initialTopic,
  initialReference,
}: {
  initialTopic?: string;
  /** ?ref= from links like the "not verified" certificate card */
  initialReference?: string;
}) {
  const user = useDemoUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(
    CONTACT_TOPICS.some((t) => t.value === initialTopic)
      ? (initialTopic as string)
      : "",
  );
  // A prefilled ?ref= the field would refuse (e.g. "hello world!" from the certificate
  // "Ask us to check" link) goes into the message instead, so Send never fights it.
  const [prefill] = useState(() => {
    const raw = (initialReference ?? "").trim().slice(0, 120);
    const t = initialTopic ?? "";
    if (!raw || !NEEDS_REF.has(t)) return { reference: "", message: "" };
    if (refValid(t, raw)) return { reference: raw, message: "" };
    return {
      reference: "",
      message:
        t === "certificate"
          ? `Please check this certificate code: ${raw}`
          : `About: ${raw}`,
    };
  });
  const [reference, setReference] = useState(prefill.reference);
  const [message, setMessage] = useState(prefill.message);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{
    ticket: string;
    email: string;
    topic: string;
    reply: string;
  } | null>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const formHeadRef = useRef<HTMLHeadingElement>(null);
  const [again, setAgain] = useState(false);
  const needsRef = NEEDS_REF.has(topic);
  const refCopy = REF_COPY[topic] ?? REF_COPY.learner;

  // Logged-in demo users get their name + email filled in (only if still empty).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setName((n) => n || user.profile.name);
    setEmail((e) => e || user.profile.email);
  }, [user]);

  useEffect(() => {
    if (sent) doneRef.current?.focus();
    // "Send another": put focus back at the top of the fresh form, not on <body>
    else if (again) formHeadRef.current?.focus();
  }, [sent, again]);

  const clear = (k: keyof Errors) =>
    errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "What should we call you?";
    if (!EMAIL_RE.test(email.trim()))
      e.email = "We reply by email, so this needs to be valid.";
    if (!topic) e.topic = "Pick the closest topic so the right human sees it.";
    if (needsRef && reference.trim() && !refValid(topic, reference.trim()))
      e.reference = refCopy.error;
    if (message.trim().length < 20)
      e.message = `A little more detail helps (${Math.max(0, 20 - message.trim().length)} more characters).`;
    setErrors(e);
    const first = (
      ["name", "email", "topic", "reference", "message"] as const
    ).find((k) => e[k]);
    if (first) {
      focusField(document.getElementById(`contact-${first}`));
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSent({
        ticket: ticketNumber(
          `${email}|${topic}|${needsRef ? reference.trim() : ""}|${message}`,
        ),
        email: email.trim(),
        topic: CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? "",
        reply: CONTACT_TOPIC_REPLY[topic] ?? "two working days",
      });
      toast.success("Message sent.", {
        description: "Demo: nothing actually left this browser.",
      });
    }, 700);
  };

  if (sent)
    return (
      <Card padding="lg" className="app-enter self-start">
        <div className="flex flex-col items-start">
          <span
            className="grid size-14 place-items-center rounded-full bg-mint text-forest"
            aria-hidden
          >
            <Icon name="check" className="size-7" strokeWidth={3} />
          </span>
          <h2
            ref={doneRef}
            tabIndex={-1}
            className="mt-5 t-chunky-card outline-none"
          >
            Message sent.
          </h2>
          <p className="mt-3 max-w-[44ch] t-body text-ink/75">
            A human will get back to you at{" "}
            <EmailText email={sent.email} className="text-ink" /> within{" "}
            {sent.reply}.
          </p>
          <dl className="mt-6 grid w-full gap-3 rounded-card bg-cream p-4 sm:grid-cols-2">
            <div>
              <dt className="t-micro text-ink/70 uppercase">Ticket</dt>
              <dd className="mt-1 font-mono text-[15px] font-bold">
                {sent.ticket}
              </dd>
            </div>
            <div>
              <dt className="t-micro text-ink/70 uppercase">Topic</dt>
              <dd className="mt-1 text-[15px] font-bold">{sent.topic}</dd>
            </div>
          </dl>
          <p className="mt-4 t-small text-ink/70">
            Quote the ticket number if you write again, it saves everyone a
            scroll.
          </p>
          <div className="mt-6 flex w-full flex-wrap gap-2 max-sm:flex-col-reverse max-sm:[&>*]:w-full">
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => {
                setAgain(true);
                setSent(null);
                setMessage("");
                setReference("");
              }}
            >
              Send another
            </Button>
            <Button href="/courses" iconRight="arrow-right">
              Back to learning
            </Button>
          </div>
        </div>
      </Card>
    );

  return (
    <Card padding="lg">
      <h2 ref={formHeadRef} tabIndex={-1} className="t-app-h2 outline-none">
        Send us a message
      </h2>
      <p className="mt-1.5 t-small text-ink/65">
        Every message is read by a person. Fields marked * are required.
      </p>
      <form noValidate onSubmit={onSubmit} className="mt-6 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="contact-name" label="Name" error={errors.name} required>
            <Input
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clear("name");
              }}
              maxLength={60}
            />
          </Field>
          <Field id="contact-email" label="Email" error={errors.email} required>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clear("email");
              }}
            />
          </Field>
        </div>
        <Field
          id="contact-topic"
          label="I'm contacting about"
          error={errors.topic}
          required
        >
          <Select
            placeholder="Choose a topic"
            value={topic}
            onChange={(e) => {
              const t = e.target.value;
              setTopic(t);
              // the reference field only exists for some topics: drop its value + error when it hides
              if (!NEEDS_REF.has(t)) setReference("");
              setErrors((x) => ({
                ...x,
                topic: undefined,
                // a reference error from another topic's rules no longer applies
                reference:
                  x.reference &&
                  NEEDS_REF.has(t) &&
                  reference.trim() &&
                  !refValid(t, reference.trim())
                    ? (REF_COPY[t] ?? REF_COPY.learner).error
                    : undefined,
              }));
            }}
            options={CONTACT_TOPICS}
          />
        </Field>
        {needsRef && (
          <Field
            id="contact-reference"
            label={refCopy.label}
            optional
            error={errors.reference}
            hint={refCopy.hint}
          >
            <Input
              icon="link"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder={refCopy.placeholder}
              maxLength={120}
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                clear("reference");
              }}
              className="app-fade"
            />
          </Field>
        )}
        <Field
          id="contact-message"
          label="Message"
          error={errors.message}
          required
        >
          <Textarea
            rows={6}
            showCount
            maxLength={1500}
            placeholder="What happened, what you expected, and anything you've already tried."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              clear("message");
            }}
          />
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink/70">
            We only use your email to reply. See our{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacy policy
            </Link>
            .
          </p>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={busy}
            iconRight={busy ? undefined : "arrow-right"}
            className="max-sm:w-full"
          >
            {busy ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
