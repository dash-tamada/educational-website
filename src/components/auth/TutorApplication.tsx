"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DescriptionList,
  EmptyState,
  Field,
  Icon,
  Input,
  ProgressBar,
  RadioGroup,
  Select,
  Skeleton,
  StatusPill,
  StickyActionBar,
  Textarea,
  toast,
} from "@/components/app";
import {
  useDemoAuth,
  useDemoSession,
  useDemoUser,
} from "@/lib/demo/session-client";
import { demo, useDb, useStoreHydrated } from "@/lib/demo/store";
import {
  formatDate,
  getCategories,
  getApplicationDetails,
  getCategory,
  type TutorApplication as TutorApp,
} from "@/lib/mock";
import {
  EMAIL_RE,
  EXPERIENCE_LEVELS,
  PAYOUT_COUNTRIES,
  TEACH_LANGUAGES,
} from "@/lib/mock/extra/auth";
import { scrollToTarget } from "@/lib/lenis";
import { SIGNUP_DRAFT_KEY } from "./SignupForm";
import { CHECKBOX_INVALID, FormError } from "./FormError";
import { EmailText, LinkText } from "@/components/auth/EmailText";

/* =============================================================================
   Tutor application (multi-step) for /become-tutor.
   - logged out: prompt to log in / sign up (or use the student demo)
   - tutor / admin sessions: a friendly "not for you" state with the right link
   - an existing application: its status (pending / changes requested / rejected /
     approved), with "update and resubmit" where it makes sense
   - otherwise a 5-step wizard (about you, expertise, course idea, payouts, review)
     that autosaves a draft in this browser and submits to the demo store
     (demo.submitTutorApplication), so it shows up in /admin/tutors.
     "Update my application" (changes requested) resubmits the same row
     (demo.resubmitTutorApplication): no duplicates in the admin queue.
   ============================================================================= */

type Form = {
  name: string;
  email: string;
  city: string;
  website: string;
  languages: string[];
  categoryId: string;
  subject: string;
  years: string;
  experience: string;
  courseTitle: string;
  courseOutline: string;
  sampleUrl: string;
  why: string;
  country: string;
  method: string;
  gst: "yes" | "no" | "unsure";
  agree: boolean;
};
type Key = keyof Form;
type Errors = Partial<Record<Key, string>>;

const EMPTY: Form = {
  name: "",
  email: "",
  city: "",
  website: "",
  languages: ["English"],
  categoryId: "",
  subject: "",
  years: "",
  experience: "",
  courseTitle: "",
  courseOutline: "",
  sampleUrl: "",
  why: "",
  country: "IN",
  method: "UPI",
  gst: "unsure",
  agree: false,
};

const STEPS = [
  {
    id: "about",
    label: "About you",
    title: "First, a little about you.",
    body: "So we know who to cheer for.",
  },
  {
    id: "expertise",
    label: "Expertise",
    title: "What do you know really well?",
    body: "The thing friends already ask you to explain.",
  },
  {
    id: "course",
    label: "Course idea",
    title: "Pitch your first course.",
    body: "Rough is fine. We care about the idea and a sample of you teaching.",
  },
  {
    id: "payout",
    label: "Payouts",
    title: "Where should the money go?",
    body: "Just the country and method for now. Bank details come after approval.",
  },
  {
    id: "review",
    label: "Review",
    title: "Look it over.",
    body: "Edit anything, then send it to a human.",
  },
] as const;

const DRAFT_KEY = "tm-tutor-app-draft";
/** sessionStorage flag: the "draft saved" toast shows once per visit, not on every keystroke */
const DRAFT_TOAST_KEY = "tm-tutor-app-draft-toast";

/**
 * A view was swapped in by a button: if its top is hidden under the fixed header
 * (or sits low in the viewport), glide it into view first. Focus is moved by the
 * caller with preventScroll, so the screen never jumps to an off-screen heading.
 */
function bringIntoView(el: HTMLElement | null) {
  if (!el) return;
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--header-offset",
    ),
  );
  const header = Number.isFinite(v) ? v : 96;
  const top = el.getBoundingClientRect().top;
  if (top < header || top > window.innerHeight * 0.6)
    scrollToTarget(el, { duration: 0.6 });
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** Same answers? (the consent tick never counts: it is never restored) */
function sameForm(a: Form, b: Form) {
  return (
    JSON.stringify({ ...a, agree: false }) ===
    JSON.stringify({ ...b, agree: false })
  );
}
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

function validate(step: number, f: Form): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (f.name.trim().length < 2) e.name = "Your full name, please.";
    if (!EMAIL_RE.test(f.email.trim()))
      e.email = "We'll email the decision here, so it needs to be valid.";
    if (f.city.trim().length < 2) e.city = "Which city are you in?";
    if (f.website.trim() && !URL_RE.test(f.website.trim()))
      e.website = "Start the link with https://";
    if (!f.languages.length) e.languages = "Pick at least one language.";
  }
  if (step === 1) {
    if (!f.categoryId) e.categoryId = "Choose the closest category.";
    if (f.subject.trim().length < 3)
      e.subject = "Describe your subject in a few words.";
    if (!f.years) e.years = "Pick one.";
    if (f.experience.trim().length < 40)
      e.experience = `Tell us a bit more (${Math.max(0, 40 - f.experience.trim().length)} more characters).`;
  }
  if (step === 2) {
    if (f.courseTitle.trim().length < 5)
      e.courseTitle = "Give it a working title.";
    if (f.courseOutline.trim().length < 30)
      e.courseOutline = "List a few modules or lessons (30+ characters).";
    if (!URL_RE.test(f.sampleUrl.trim()))
      e.sampleUrl =
        "Paste a link to a 2 to 5 minute video of you teaching (https://…).";
    if (f.why.trim().length < 20) e.why = "One or two sentences is plenty.";
  }
  if (step === 3) {
    if (!f.country) e.country = "Choose a country.";
    if (!f.method) e.method = "Choose a payout method.";
    if (!f.agree) e.agree = "Please accept the tutor terms.";
  }
  return e;
}

/** The working title of the planned course. Older demo rows kept "Title: outline" in one string. */
function planTitle(app: TutorApp) {
  return app.courseOutline?.length
    ? app.plannedCourse
    : app.plannedCourse.split(": ")[0];
}

/** The outline as editable text ("1. ..." per line), from the row's courseOutline or the legacy tail. */
function planOutline(app: TutorApp) {
  if (app.courseOutline?.length)
    return app.courseOutline.map((step, i) => `${i + 1}. ${step}`).join("\n");
  return app.plannedCourse.split(": ").slice(1).join(": ");
}

const FIELD_ORDER: Key[] = [
  "name",
  "email",
  "city",
  "website",
  "languages",
  "categoryId",
  "subject",
  "years",
  "experience",
  "courseTitle",
  "courseOutline",
  "sampleUrl",
  "why",
  "country",
  "method",
  "agree",
];

/* ============================================================================= root */
export function TutorApplication() {
  const session = useDemoSession();
  const user = useDemoUser();
  const hydrated = useStoreHydrated();
  const db = useDb();
  const [sent, setSent] = useState<TutorApp | null>(null);
  const [editing, setEditing] = useState<TutorApp | "new" | null>(null);
  /** set by buttons that swap this card for another view: the new view takes focus on mount */
  const [arrived, setArrived] = useState(false);

  const existing = useMemo(
    () =>
      session
        ? ([...db.tutorApplications]
            .filter((a) => a.userId === session.userId)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ??
          null)
        : null,
    [db.tutorApplications, session],
  );

  if (!session || !user)
    return <LoginPrompt onAction={() => setArrived(true)} />;
  if (session.role === "tutor")
    return <NotForYou kind="tutor" name={user.profile.name} />;
  if (session.role === "admin")
    return (
      <NotForYou
        kind="admin"
        name={user.profile.name}
        onAction={() => setArrived(true)}
      />
    );
  if (!hydrated) return <WizardSkeleton />;
  if (sent) return <Submitted app={sent} />;
  if (existing && !editing)
    return (
      <Status
        app={existing}
        focusOnMount={arrived}
        onEdit={() => {
          setArrived(true);
          setEditing(existing);
        }}
      />
    );
  return (
    <Wizard
      key={editing && editing !== "new" ? editing.id : "new"}
      focusOnMount={arrived}
      prefillFrom={editing && editing !== "new" ? editing : null}
      profile={{
        id: user.profile.id,
        name: user.profile.name,
        email: user.profile.email,
        city: user.profile.city,
      }}
      onCancel={
        existing
          ? () => {
              setArrived(true);
              setEditing(null);
            }
          : undefined
      }
      onSubmitted={(a) => {
        setEditing(null);
        setSent(a);
      }}
    />
  );
}

/* ============================================================================= wizard */
function Wizard({
  profile,
  prefillFrom,
  focusOnMount,
  onSubmitted,
  onCancel,
}: {
  profile: { id: string; name: string; email: string; city: string };
  prefillFrom: TutorApp | null;
  /** mounted by a button that replaced its own card: move focus to the step heading */
  focusOnMount?: boolean;
  onSubmitted: (a: TutorApp) => void;
  onCancel?: () => void;
}) {
  const db = useDb();
  const categories = getCategories(db);
  const [step, setStep] = useState(0);
  /** furthest step reached: every step up to it stays clickable (editing from Review doesn't "undo" later steps) */
  const [maxStep, setMaxStep] = useState(() =>
    prefillFrom && prefillFrom.status !== "rejected" ? STEPS.length - 1 : 0,
  );
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  /** signed up with a name that isn't the demo account's: say whose account this is */
  const [signupName, setSignupName] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  /** the prefilled answers (profile / signup / previous application), before any draft */
  const baseRef = useRef<Form | null>(null);
  /** only a real edit by the visitor starts autosaving */
  const dirtyRef = useRef(false);
  /** the inline Back / Continue row: the phone action bar mirrors it once it scrolls away */
  const actionsRef = useRef<HTMLDivElement>(null);
  /** a draft was written to this browser during this visit (phone action bar status) */
  const [draftSaved, setDraftSaved] = useState(false);

  // Prefill once: saved draft > previous application > signup draft > profile.
  useEffect(() => {
    let draft: Partial<Form> | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { userId: string; form: Partial<Form> })
        : null;
      if (parsed && parsed.userId === profile.id) draft = parsed.form;
    } catch {}
    let signup: { name?: string; email?: string } = {};
    try {
      signup = JSON.parse(sessionStorage.getItem(SIGNUP_DRAFT_KEY) ?? "{}");
    } catch {}
    const base: Form = {
      ...EMPTY,
      name: signup.name || profile.name,
      email: signup.email || profile.email,
      city: profile.city,
    };
    if (prefillFrom) {
      const d = getApplicationDetails(prefillFrom);
      const years =
        EXPERIENCE_LEVELS.find(
          (l) => l.value === prefillFrom.years || l.label === d.years,
        )?.value ?? "";
      const languages = d.languages.filter((x) => TEACH_LANGUAGES.includes(x));
      const payout = d.payout;
      const country = PAYOUT_COUNTRIES.find((c) => c.value === payout?.country);
      // "Apply with a new idea" (rejected) keeps who you are, but starts the course pitch fresh
      const fresh = prefillFrom.status === "rejected";
      Object.assign(base, {
        name: prefillFrom.name,
        email: prefillFrom.email,
        city: prefillFrom.city,
        website: d.website ?? "",
        categoryId: prefillFrom.categoryId,
        subject: prefillFrom.subject,
        experience: d.experience,
        years,
        languages: languages.length ? languages : base.languages,
        courseTitle: fresh ? "" : planTitle(prefillFrom),
        courseOutline: fresh ? "" : planOutline(prefillFrom),
        sampleUrl: fresh ? "" : prefillFrom.sampleUrl,
        why: fresh ? "" : prefillFrom.why,
        ...(country && payout
          ? {
              country: country.value,
              method: country.methods.includes(payout.method)
                ? payout.method
                : country.methods[0],
              gst: payout.gst ?? base.gst,
            }
          : {}),
      });
    }
    baseRef.current = base;
    const merged =
      draft && !prefillFrom ? { ...base, ...draft, agree: false } : base;
    // a stored draft that only repeats the prefill is not a draft
    const realDraft = merged !== base && !sameForm(merged, base);
    if (draft && !prefillFrom && !realDraft) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
    setF(merged);
    setRestored(realDraft);
    setSignupName(
      !prefillFrom &&
        signup.name &&
        signup.name.trim().toLowerCase() !== profile.name.trim().toLowerCase()
        ? signup.name.trim()
        : null,
    );
  }, [profile.id, profile.name, profile.email, profile.city, prefillFrom]);

  // Swapped in by a button (Update my application, Apply as Priya...): don't drop focus on <body>.
  useEffect(() => {
    if (!focusOnMount) return;
    const raf = window.requestAnimationFrame(() => {
      bringIntoView(rootRef.current);
      headRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (per-viewer convenience only), after the visitor has actually typed or picked
  // something. Back at the prefilled answers? Then there is nothing worth restoring.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = window.setTimeout(() => {
      try {
        if (baseRef.current && sameForm(f, baseRef.current)) {
          localStorage.removeItem(DRAFT_KEY);
          setDraftSaved(false);
        } else {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              userId: profile.id,
              form: { ...f, agree: false },
            }),
          );
          setDraftSaved(true);
          // once per visit: say where the draft lives, then stay quiet
          if (!sessionStorage.getItem(DRAFT_TOAST_KEY)) {
            sessionStorage.setItem(DRAFT_TOAST_KEY, "1");
            toast.success("Draft saved in this browser.", {
              description: "Close the tab if you like. It'll be here when you're back.",
            });
          }
        }
      } catch {}
    }, 400);
    return () => window.clearTimeout(t);
  }, [f, profile.id]);

  const set = <K extends Key>(k: K, v: Form[K]) => {
    dirtyRef.current = true;
    setF((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const goTo = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setErrors({});
    window.requestAnimationFrame(() => {
      if (rootRef.current && rootRef.current.getBoundingClientRect().top < 0)
        scrollToTarget(rootRef.current, { duration: 0.6 });
      headRef.current?.focus({ preventScroll: true });
    });
  };

  /** Validate the current step, then move to `to` (forward moves only; going back never blocks). */
  const advance = (to: number) => {
    if (to <= step) return goTo(to);
    const e = validate(step, f);
    setErrors(e);
    const first = FIELD_ORDER.find((k) => e[k]);
    if (first) {
      document.getElementById(`ta-${first}`)?.focus();
      return;
    }
    goTo(to);
  };
  const next = () => advance(step + 1);
  const reviewReached = maxStep === STEPS.length - 1;

  const resubmitting = !!prefillFrom && prefillFrom.status !== "rejected";
  const submit = () => {
    for (let s = 0; s < 4; s++) {
      const e = validate(s, f);
      if (Object.keys(e).length) {
        goTo(s);
        window.setTimeout(() => setErrors(e), 0);
        toast.error("Something needs a look.", {
          description: `Check the ${STEPS[s].label.toLowerCase()} step.`,
        });
        return;
      }
    }
    setBusy(true);
    window.setTimeout(() => {
      const fields = {
        name: f.name.trim(),
        email: f.email.trim(),
        city: f.city.trim(),
        subject: f.subject.trim(),
        categoryId: f.categoryId,
        experience: f.experience.trim(),
        sampleUrl: f.sampleUrl.trim(),
        why: f.why.trim(),
        plannedCourse: f.courseTitle.trim(),
        courseOutline: f.courseOutline.trim(),
        website: f.website.trim() || undefined,
        languages: f.languages,
        years: f.years,
        payout: {
          country: f.country,
          method: f.method,
          ...(f.country === "IN" ? { gst: f.gst } : {}),
        },
      };
      // Changes requested (or a pending edit): update the same row, never a second copy.
      // A rejected application + "Apply with a new idea" is a genuinely new row.
      const row =
        (resubmitting && prefillFrom
          ? demo.resubmitTutorApplication(prefillFrom.id, fields)
          : null) ??
        demo.submitTutorApplication({ userId: profile.id, ...fields });
      try {
        localStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      } catch {}
      setBusy(false);
      toast.success(resubmitting ? "Changes sent." : "Application sent.", {
        description: resubmitting
          ? "Your application is back in the admin review queue."
          : "It's now in the admin review queue.",
      });
      onSubmitted(row);
    }, 700);
  };

  const country =
    PAYOUT_COUNTRIES.find((c) => c.value === f.country) ?? PAYOUT_COUNTRIES[0];
  const meta = STEPS[step];

  return (
    <div ref={rootRef} id="application" className="scroll-mt-28">
      <Card padding="none" className="overflow-hidden">
        {/* progress */}
        <div className="border-b border-ink/[0.07] px-5 pt-5 pb-4 md:px-8 md:pt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="t-micro text-ink/70 uppercase" aria-live="polite">
              Step {step + 1} of {STEPS.length} · {meta.label}
            </p>
            {restored && step === 0 && (
              <Badge tone="mint" size="sm">
                Draft restored
              </Badge>
            )}
          </div>
          <ol
            className="mt-4 flex items-center gap-1.5 sm:gap-2"
            aria-label="Application steps"
          >
            {STEPS.map((s, i) => {
              const current = i === step;
              const reachable = i <= maxStep;
              const done =
                !current &&
                reachable &&
                i < STEPS.length - 1 &&
                Object.keys(validate(i, f)).length === 0;
              const open = reachable && !current && !done;
              return (
                <li
                  key={s.id}
                  className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
                >
                  <button
                    type="button"
                    disabled={!reachable || current}
                    onClick={() => advance(i)}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Step ${i + 1}, ${s.label}${current ? " (current)" : done ? " (done)" : open ? (i === STEPS.length - 1 ? " (ready)" : " (needs a look)") : " (not started)"}`}
                    className={clsx(
                      "hit grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors duration-200",
                      done && "bg-green text-white hf:bg-forest",
                      current && "bg-ink text-cream",
                      open &&
                        "bg-white text-ink ring-2 ring-ink/25 hf:ring-ink",
                      !reachable && "bg-ink/[0.07] text-ink/70",
                    )}
                  >
                    {done ? (
                      <Icon name="check" className="size-4" strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </button>
                  {/* the inline label only where the track has room (the "Step x of 5" line always names it) */}
                  {current && (
                    <span
                      className="hidden shrink-0 text-[13px] font-bold whitespace-nowrap text-ink sm:block lg:hidden xl:block"
                      aria-hidden
                    >
                      {s.label}
                    </span>
                  )}
                  {i < STEPS.length - 1 && (
                    <span
                      className={clsx(
                        "h-0.5 min-w-2 flex-1 rounded-full",
                        done ? "bg-green" : "bg-ink/[0.08]",
                      )}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <ProgressBar
            value={(step / (STEPS.length - 1)) * 100}
            tone="green"
            size="sm"
            className="sr-only"
            label="Application progress"
          />
        </div>

        <div key={step} className="app-enter px-5 py-6 md:px-8 md:py-8">
          {prefillFrom?.decisionNote && (
            <aside
              aria-label="Note from the reviewer"
              className="mb-6 flex gap-3 rounded-card bg-butter p-4"
            >
              <Icon
                name="chat"
                className="mt-0.5 size-5 shrink-0 text-[#8a5300]"
              />
              <div className="min-w-0 text-[14px] leading-relaxed">
                <p className="font-bold">
                  {prefillFrom.status === "changes_requested"
                    ? "What the reviewer asked for"
                    : "Why it wasn't a fit last time"}
                </p>
                <p className="mt-0.5 text-ink/75">{prefillFrom.decisionNote}</p>
              </div>
            </aside>
          )}
          <h3 ref={headRef} tabIndex={-1} className="t-app-h2 outline-none">
            {meta.title}
          </h3>
          <p className="mt-1.5 t-small text-ink/65">{meta.body}</p>

          <div className="mt-6 grid gap-5">
            {step === 0 && signupName && (
              <p className="app-fade flex gap-2.5 rounded-card bg-cyan/40 p-3.5 text-[14px] leading-snug">
                <Icon
                  name="info"
                  className="mt-0.5 size-4 shrink-0 text-blue-deep"
                />
                <span>
                  <strong className="font-bold">
                    Applying from {firstName(profile.name)}&apos;s demo account.
                  </strong>{" "}
                  We filled in the name and email you signed up with,{" "}
                  {firstName(signupName)}. The application is saved under this
                  demo account.
                </span>
              </p>
            )}
            {step === 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="ta-name"
                    label="Full name"
                    error={errors.name}
                    required
                  >
                    <Input
                      autoComplete="name"
                      value={f.name}
                      onChange={(e) => set("name", e.target.value)}
                      maxLength={60}
                    />
                  </Field>
                  <Field
                    id="ta-email"
                    label="Email"
                    error={errors.email}
                    required
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      value={f.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="ta-city" label="City" error={errors.city} required>
                    <Input
                      autoComplete="address-level2"
                      placeholder="Jaipur"
                      value={f.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                  <Field
                    id="ta-website"
                    label="Website or social"
                    optional
                    error={errors.website}
                  >
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="https://instagram.com/you"
                      value={f.website}
                      onChange={(e) => set("website", e.target.value)}
                    />
                  </Field>
                </div>
                <fieldset
                  aria-describedby={
                    errors.languages ? "ta-languages-err" : "ta-languages-hint"
                  }
                >
                  <legend className="mb-1.5 text-[14px] font-bold">
                    Languages you can teach in{" "}
                    <span className="text-flame" aria-hidden>
                      *
                    </span>
                  </legend>
                  <p
                    id="ta-languages-hint"
                    className="mb-3 text-[13px] text-ink/70"
                  >
                    Pick all that apply. Teaching in Hinglish? Pick English and
                    Hindi.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEACH_LANGUAGES.map((l, li) => {
                      const on = f.languages.includes(l);
                      return (
                        <label
                          key={l}
                          className={clsx(
                            "tap inline-flex h-10 cursor-pointer items-center rounded-full px-3.5 text-[14px] font-bold transition-colors coarse:h-11 coarse:px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue",
                            on
                              ? "bg-ink text-cream ring-1 ring-ink"
                              : errors.languages
                                ? "bg-white text-ink ring-2 ring-flame"
                                : "bg-white text-ink ring-1 ring-ink/[0.14] hf:ring-ink/30",
                            // the first chip takes focus when the group has an error: show it even after a mouse click
                            li === 0 &&
                              errors.languages &&
                              "has-[:focus]:outline-3 has-[:focus]:outline-offset-2 has-[:focus]:outline-blue",
                          )}
                        >
                          <input
                            id={li === 0 ? "ta-languages" : undefined}
                            type="checkbox"
                            className="sr-only"
                            aria-invalid={errors.languages ? true : undefined}
                            checked={on}
                            onChange={() =>
                              set(
                                "languages",
                                on
                                  ? f.languages.filter((x) => x !== l)
                                  : [...f.languages, l],
                              )
                            }
                          />
                          {on && (
                            <Icon
                              name="check"
                              className="mr-1 -ml-0.5 size-3.5"
                              strokeWidth={3}
                            />
                          )}
                          {l}
                        </label>
                      );
                    })}
                  </div>
                  {errors.languages && (
                    <FormError id="ta-languages-err" className="mt-2">
                      {errors.languages}
                    </FormError>
                  )}
                </fieldset>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="ta-categoryId"
                    label="Category"
                    error={errors.categoryId}
                    required
                  >
                    <Select
                      placeholder="Choose a category"
                      value={f.categoryId}
                      onChange={(e) => set("categoryId", e.target.value)}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    />
                  </Field>
                  <Field
                    id="ta-years"
                    label="How long have you been doing it?"
                    error={errors.years}
                    required
                  >
                    <Select
                      placeholder="Choose one"
                      value={f.years}
                      onChange={(e) => set("years", e.target.value)}
                      options={EXPERIENCE_LEVELS}
                    />
                  </Field>
                </div>
                <Field
                  id="ta-subject"
                  label="What do you teach?"
                  hint="Short and specific beats broad: “Excel for finance freshers” over “Computers”."
                  error={errors.subject}
                  required
                >
                  <Input
                    placeholder="e.g. Carnatic vocals for absolute beginners"
                    value={f.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    maxLength={80}
                  />
                </Field>
                <Field
                  id="ta-experience"
                  label="Your experience"
                  hint="Where you learned it, who you've taught, anything you've made with it."
                  error={errors.experience}
                  required
                >
                  <Textarea
                    rows={5}
                    showCount
                    maxLength={600}
                    placeholder="I've taught weekend batches of 20 kids and adults in Jaipur for six years…"
                    value={f.experience}
                    onChange={(e) => set("experience", e.target.value)}
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field
                  id="ta-courseTitle"
                  label="Working title"
                  error={errors.courseTitle}
                  required
                >
                  <Input
                    placeholder="e.g. Kathak Foundations: Tatkar to Your First Piece"
                    value={f.courseTitle}
                    onChange={(e) => set("courseTitle", e.target.value)}
                    maxLength={90}
                  />
                </Field>
                <Field
                  id="ta-courseOutline"
                  label="Rough outline"
                  hint="Three to six modules is a great first course. Tests can sit between any two videos."
                  error={errors.courseOutline}
                  required
                >
                  <Textarea
                    rows={5}
                    showCount
                    maxLength={800}
                    placeholder={
                      "1. Posture and basic footwork\n2. Counting taal\n3. Hand movements…"
                    }
                    value={f.courseOutline}
                    onChange={(e) => set("courseOutline", e.target.value)}
                  />
                </Field>
                <Field
                  id="ta-sampleUrl"
                  label="Intro or sample video link"
                  hint="YouTube (unlisted is fine), Google Drive or Vimeo. 2 to 5 minutes of you teaching anything."
                  error={errors.sampleUrl}
                  required
                >
                  <Input
                    type="url"
                    inputMode="url"
                    icon="video"
                    placeholder="https://youtu.be/…"
                    value={f.sampleUrl}
                    onChange={(e) => set("sampleUrl", e.target.value)}
                  />
                </Field>
                <Field
                  id="ta-why"
                  label="Why Tamada?"
                  error={errors.why}
                  required
                >
                  <Textarea
                    rows={3}
                    showCount
                    maxLength={300}
                    placeholder="Most online classes skip the basics. I want to…"
                    value={f.why}
                    onChange={(e) => set("why", e.target.value)}
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field
                  id="ta-country"
                  label="Payout country"
                  hint={`Payouts are made in ${country.currency} on the 10th of each month.`}
                  error={errors.country}
                  required
                >
                  <Select
                    value={f.country}
                    onChange={(e) => {
                      const c =
                        PAYOUT_COUNTRIES.find(
                          (x) => x.value === e.target.value,
                        ) ?? PAYOUT_COUNTRIES[0];
                      dirtyRef.current = true;
                      setF((x) => ({
                        ...x,
                        country: c.value,
                        method: c.methods[0],
                      }));
                    }}
                    options={PAYOUT_COUNTRIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                  />
                </Field>
                <div id="ta-method" tabIndex={-1} className="outline-none">
                  <RadioGroup
                    label="Preferred payout method"
                    name="method"
                    value={f.method}
                    onChange={(v) => set("method", v)}
                    variant="cards"
                    orientation="horizontal"
                    options={country.methods.map((m) => ({
                      value: m,
                      label: m,
                      description:
                        m === "UPI"
                          ? "Fastest. Lands the same day."
                          : m.startsWith("PayPal")
                            ? "PayPal fees apply."
                            : "1 to 2 working days.",
                    }))}
                  />
                </div>
                {f.country === "IN" && (
                  <RadioGroup
                    label="Are you registered for GST?"
                    name="gst"
                    value={f.gst}
                    onChange={(v) => set("gst", v)}
                    orientation="horizontal"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                      { value: "unsure", label: "Not sure" },
                    ]}
                  />
                )}
                <div className="rounded-card bg-butter p-4 text-[14px] leading-relaxed">
                  <p className="font-bold">How the money works</p>
                  <p className="mt-1 text-ink/75">
                    You set the price. You keep 70% of each sale after GST and
                    payment fees. We only ask for bank or UPI details after
                    you&apos;re approved, never in this form.
                  </p>
                </div>
                <div>
                  <Checkbox
                    id="ta-agree"
                    className={CHECKBOX_INVALID}
                    checked={f.agree}
                    onChange={(e) => set("agree", e.target.checked)}
                    aria-invalid={errors.agree ? true : undefined}
                    aria-describedby={errors.agree ? "ta-agree-err" : undefined}
                    label={
                      <>
                        I&apos;ve read the{" "}
                        <a
                          href="/terms#tutors"
                          target="_blank"
                          className="underline underline-offset-2"
                        >
                          tutor terms
                        </a>{" "}
                        and own the rights to what I&apos;ll teach.
                      </>
                    }
                  />
                  {errors.agree && (
                    <FormError id="ta-agree-err" className="ml-8">
                      {errors.agree}
                    </FormError>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <div className="grid gap-4">
                <ReviewBlock title="About you" onEdit={() => goTo(0)}>
                  <DescriptionList
                    items={[
                      { label: "Name", value: f.name },
                      {
                        label: "Email",
                        value: <EmailText as="span" email={f.email} />,
                      },
                      { label: "City", value: f.city },
                      { label: "Languages", value: f.languages.join(", ") },
                      ...(f.website
                        ? [
                            {
                              label: "Link",
                              value: <LinkText url={f.website} />,
                            },
                          ]
                        : []),
                    ]}
                  />
                </ReviewBlock>
                <ReviewBlock title="Expertise" onEdit={() => goTo(1)}>
                  <DescriptionList
                    items={[
                      {
                        label: "Category",
                        value: getCategory(f.categoryId, db)?.name ?? "—",
                      },
                      { label: "Subject", value: f.subject },
                      {
                        label: "Experience",
                        value:
                          EXPERIENCE_LEVELS.find((l) => l.value === f.years)
                            ?.label ?? "—",
                      },
                    ]}
                  />
                  <p className="mt-3 rounded-tag bg-cream px-3 py-2.5 t-small whitespace-pre-line text-ink/75">
                    {f.experience}
                  </p>
                </ReviewBlock>
                <ReviewBlock title="Course idea" onEdit={() => goTo(2)}>
                  <p className="t-app-h3">{f.courseTitle}</p>
                  <p className="mt-2 t-small whitespace-pre-line text-ink/75">
                    {f.courseOutline}
                  </p>
                  <p className="mt-3 flex items-start gap-1.5 t-small font-semibold text-blue-deep">
                    <Icon name="video" className="mt-0.5 size-4 shrink-0" />
                    <LinkText url={f.sampleUrl} className="min-w-0" />
                  </p>
                </ReviewBlock>
                <ReviewBlock title="Payouts" onEdit={() => goTo(3)}>
                  <DescriptionList
                    items={[
                      {
                        label: "Country",
                        value: `${country.label} (${country.currency})`,
                      },
                      { label: "Method", value: f.method },
                      ...(f.country === "IN"
                        ? [
                            {
                              label: "GST registered",
                              value: {
                                yes: "Yes",
                                no: "No",
                                unsure: "Not sure",
                              }[f.gst],
                            },
                          ]
                        : []),
                    ]}
                  />
                </ReviewBlock>
              </div>
            )}
          </div>
        </div>

        {/* footer actions */}
        <div
          ref={actionsRef}
          className="flex flex-col-reverse gap-3 border-t border-ink/[0.07] bg-cream/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8"
        >
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                icon="arrow-left"
                onClick={() => goTo(step - 1)}
                disabled={busy}
              >
                Back
              </Button>
            ) : onCancel ? (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink/70">
                <Icon name="check-circle" className="size-4 text-green" />{" "}
                Autosaves in this browser
              </p>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {reviewReached && step < STEPS.length - 2 && (
                <Button
                  variant="secondary"
                  onClick={next}
                  fullWidth
                  className="sm:w-auto"
                >
                  Continue
                </Button>
              )}
              <Button
                variant="primary"
                iconRight="arrow-right"
                onClick={() =>
                  reviewReached ? advance(STEPS.length - 1) : next()
                }
                fullWidth
                className="sm:w-auto"
              >
                {reviewReached
                  ? "Back to review"
                  : step === STEPS.length - 2
                    ? "Review my application"
                    : "Continue"}
              </Button>
            </div>
          ) : (
            <Button
              variant="accent"
              size="lg"
              iconRight={busy ? undefined : "arrow-right"}
              loading={busy}
              onClick={submit}
              fullWidth
              className="sm:w-auto"
            >
              {busy ? "Sending…" : "Send my application"}
            </Button>
          )}
        </div>
      </Card>
      <WizardBar
        watch={actionsRef}
        step={step}
        label={meta.label}
        draftSaved={draftSaved}
        busy={busy}
        reviewReached={reviewReached}
        onBack={() => goTo(step - 1)}
        onNext={() => (reviewReached ? advance(STEPS.length - 1) : next())}
        onSubmit={submit}
      />
    </div>
  );
}

/** Phone action bar for the wizard: step + draft status on the left, Back + the next move on the right. */
function WizardBar({
  watch,
  step,
  label,
  draftSaved,
  busy,
  reviewReached,
  onBack,
  onNext,
  onSubmit,
}: {
  watch: React.RefObject<HTMLDivElement | null>;
  step: number;
  label: string;
  draftSaved: boolean;
  busy: boolean;
  reviewReached: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const last = step === STEPS.length - 1;
  return (
    <StickyActionBar
      watch={watch}
      label="Application steps"
      title={`Step ${step + 1} of ${STEPS.length} · ${label}`}
      sub={draftSaved ? "Draft saved" : "Autosaves in this browser"}
    >
      {step > 0 && (
        <Button
          variant="secondary"
          iconOnly
          icon="arrow-left"
          aria-label="Back to the previous step"
          onClick={onBack}
          disabled={busy}
        />
      )}
      {last ? (
        <Button
          variant="accent"
          className="h-12"
          iconRight={busy ? undefined : "arrow-right"}
          loading={busy}
          onClick={onSubmit}
        >
          {busy ? "Sending…" : "Send"}
        </Button>
      ) : (
        <Button
          variant="primary"
          className="h-12"
          iconRight="arrow-right"
          onClick={onNext}
        >
          {reviewReached || step === STEPS.length - 2 ? "Review" : "Next"}
        </Button>
      )}
    </StickyActionBar>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-card p-4 ring-1 ring-ink/[0.08]"
      aria-label={title}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="t-app-h3">{title}</h4>
        <Button
          size="sm"
          variant="ghost"
          icon="edit"
          onClick={onEdit}
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

/* ============================================================================= states */
function WizardSkeleton() {
  return (
    <Card padding="lg" aria-busy="true" aria-label="Loading your application">
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} variant="circle" className="size-8 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-8 h-7 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <Skeleton className="mt-5 h-11" />
    </Card>
  );
}

function LoginPrompt({ onAction }: { onAction?: () => void }) {
  const { loginAs } = useDemoAuth();
  return (
    <div className="grid gap-4">
      <Card padding="lg" className="text-center">
        <EmptyState
          art="buddies"
          tone="mint"
          title="Log in to apply."
          body="Your application is linked to your account, so we can email you the decision and open your course studio when you're approved."
          action={
            <>
              <Button
                href="/signup?intent=teach"
                variant="accent"
                iconRight="arrow-right"
              >
                Create an account
              </Button>
              <Button
                href="/login?next=/become-tutor%23apply"
                variant="secondary"
              >
                Log in
              </Button>
            </>
          }
          className="!py-6"
        />
        <p className="mt-2 text-[14px] text-ink/70">
          Just exploring?{" "}
          <button
            type="button"
            onClick={() => {
              onAction?.();
              loginAs("student");
            }}
            className="font-bold text-ink underline decoration-green decoration-2 underline-offset-4"
          >
            Apply as Priya (student demo)
          </button>
        </p>
      </Card>
      <StepsPreview />
    </div>
  );
}

/** Logged out: what the form will ask, so the column isn't a lonely prompt (and the form sells itself). */
function StepsPreview() {
  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="t-app-h2">What the form asks</h3>
        <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink/70">
          <Icon name="clock" className="size-4" /> About ten minutes
        </p>
      </div>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={clsx(
              "flex gap-3",
              i === STEPS.length - 1 && "sm:col-span-2",
            )}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-mint text-[13px] font-bold text-forest"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-bold">
                <span className="sr-only">Step {i + 1}: </span>
                {s.label}
              </p>
              <p className="mt-0.5 t-small text-ink/65">{PREVIEW[s.id]}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-tag bg-cream px-4 py-3 t-small text-ink/70">
        Your draft saves in this browser as you type, so you can stop and come
        back. Bank details are only asked for after you&apos;re approved.
      </p>
    </Card>
  );
}

const PREVIEW: Record<(typeof STEPS)[number]["id"], string> = {
  about: "Name, city and the languages you can teach in.",
  expertise: "Your subject, category and how long you've been doing it.",
  course:
    "A working title, a rough outline and a 2 to 5 minute sample video link.",
  payout: "Payout country and method. No bank details yet.",
  review:
    "Check everything on one page, edit anything, then send it to a human.",
};

function NotForYou({
  kind,
  name,
  onAction,
}: {
  kind: "tutor" | "admin";
  name: string;
  onAction?: () => void;
}) {
  const { loginAs } = useDemoAuth();
  return (
    <Card padding="lg">
      <EmptyState
        art={kind === "tutor" ? "tami" : "buddy"}
        tone={kind === "tutor" ? "mint" : "lilac"}
        title={
          kind === "tutor"
            ? `You're already teaching, ${name.split(" ")[0]}.`
            : "Admins review applications, they don't send them."
        }
        body={
          kind === "tutor"
            ? "Your tutor account is approved. Head to the studio to start or finish a course."
            : "New applications land in the tutor approvals queue. Want to see the form a learner fills in? Switch to the student demo."
        }
        action={
          kind === "tutor" ? (
            <Button href="/tutor" variant="success" iconRight="arrow-right">
              Open course studio
            </Button>
          ) : (
            <>
              <Button href="/admin/tutors" iconRight="arrow-right">
                Review queue
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onAction?.();
                  loginAs("student");
                }}
              >
                Switch to student demo
              </Button>
            </>
          )
        }
        className="!py-6"
      />
    </Card>
  );
}

const STATUS_COPY: Record<
  TutorApp["status"],
  { title: string; body: string; tone: "butter" | "mint" | "blush" | "cyan" }
> = {
  pending: {
    title: "Your application is with a human.",
    body: "We'll read it with human eyes and email you within five working days.",
    tone: "cyan",
  },
  changes_requested: {
    title: "Nearly there. A few changes, please.",
    body: "The reviewer liked it and asked for a little more. Update your application and send it again.",
    tone: "butter",
  },
  rejected: {
    title: "Not this time.",
    body: "This one wasn't a fit for the catalogue right now. You're welcome to apply again with a different idea.",
    tone: "blush",
  },
  approved: {
    title: "You're in. Welcome, tutor!",
    body: "Your account has been upgraded. The course studio is ready for your first draft.",
    tone: "mint",
  },
};

function Timeline({ app }: { app: TutorApp }) {
  const decided = app.status !== "pending";
  const steps = [
    {
      label: app.history?.length ? "Changes sent" : "Application sent",
      meta: app.history?.length
        ? `${formatDate(app.submittedAt, "medium")} · first sent ${formatDate(app.history[0].submittedAt, "medium")}`
        : formatDate(app.submittedAt, "medium"),
      state: "done" as const,
    },
    {
      label: "Human review",
      meta: decided ? "Done" : "Usually 2 to 5 working days",
      state: decided ? ("done" as const) : ("current" as const),
    },
    {
      label: "Decision",
      meta: app.decidedAt
        ? formatDate(app.decidedAt, "medium")
        : "We'll email you",
      state: decided ? ("done" as const) : ("todo" as const),
    },
    {
      approved: {
        label: "Build your first course",
        meta: "The course studio is open",
        state: "current" as const,
      },
      pending: {
        label: "Build your first course",
        meta: "In the course studio, once approved",
        state: "todo" as const,
      },
      changes_requested: {
        label: "Update and send it again",
        meta: app.decisionNote
          ? "See the reviewer's note above"
          : "Edit it and resend below",
        state: "current" as const,
      },
      rejected: {
        label: "Try again with a new idea",
        meta: "Whenever you're ready",
        state: "todo" as const,
      },
    }[app.status],
  ];
  return (
    <ol className="grid gap-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={clsx(
                "absolute top-8 bottom-0 left-[15px] w-0.5",
                s.state === "done" ? "bg-green" : "bg-ink/[0.1]",
              )}
              aria-hidden
            />
          )}
          <span
            className={clsx(
              "relative grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold",
              s.state === "done" && "bg-green text-white",
              s.state === "current" && "bg-ink text-cream",
              s.state === "todo" && "bg-ink/[0.07] text-ink/70",
            )}
            aria-hidden
          >
            {s.state === "done" ? (
              <Icon name="check" className="size-4" strokeWidth={3} />
            ) : s.state === "current" ? (
              <span className="size-2 animate-pulse rounded-full bg-sun" />
            ) : (
              i + 1
            )}
          </span>
          <div className="pt-1">
            <p className="text-[15px] font-bold">
              {s.label}
              <span className="sr-only">
                {s.state === "done"
                  ? " (done)"
                  : s.state === "current"
                    ? " (in progress)"
                    : " (to do)"}
              </span>
            </p>
            <p className="t-small text-ink/70">{s.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function AppSummary({ app }: { app: TutorApp }) {
  const db = useDb();
  const title = planTitle(app);
  return (
    <DescriptionList
      items={[
        { label: "Subject", value: app.subject },
        {
          label: "Category",
          value: getCategory(app.categoryId, db)?.name ?? "—",
        },
        { label: "First course", value: title },
        {
          label: "Sample",
          value: (
            <a
              href={app.sampleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 break-all text-blue-deep underline-offset-2 hf:underline"
            >
              Open link <Icon name="external" className="size-3.5" />
            </a>
          ),
        },
      ]}
    />
  );
}

function Status({
  app,
  onEdit,
  focusOnMount,
}: {
  app: TutorApp;
  onEdit: () => void;
  focusOnMount?: boolean;
}) {
  const { loginAs } = useDemoAuth();
  const c = STATUS_COPY[app.status];
  const headRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const resent = (app.history?.length ?? 0) > 0;
  // Swapped in by a button (Cancel from the wizard...): the status card is shorter than the
  // wizard, so its top may already be above the viewport. Bring it back, then focus.
  useEffect(() => {
    if (!focusOnMount) return;
    const raf = window.requestAnimationFrame(() => {
      bringIntoView(rootRef.current);
      headRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={rootRef} id="application-status" className="scroll-mt-28">
      <Card padding="none" className="app-enter overflow-hidden">
        <div
          className={clsx(
            "px-5 py-6 md:px-8 md:py-7",
            {
              butter: "bg-butter",
              mint: "bg-mint",
              blush: "bg-blush",
              cyan: "bg-cyan",
            }[c.tone],
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={app.status} />
            <span className="t-micro text-ink/70">
              {resent ? "Resent" : "Sent"}{" "}
              {formatDate(app.submittedAt, "medium")}
            </span>
          </div>
          <h3
            ref={headRef}
            tabIndex={-1}
            className="mt-3 t-app-h2 outline-none"
          >
            {resent && app.status === "pending"
              ? "Your changes are with a human."
              : c.title}
          </h3>
          <p className="mt-1.5 max-w-[48ch] t-small text-ink/75">{c.body}</p>
          {app.decisionNote && (
            <blockquote className="mt-4 rounded-card bg-white/70 p-4 text-[15px] leading-relaxed">
              <p className="mb-1 t-micro text-ink/70 uppercase">
                Note from the reviewer
              </p>
              {app.decisionNote}
            </blockquote>
          )}
        </div>
        <div className="grid gap-6 px-5 py-6 md:grid-cols-2 md:gap-8 md:px-8 md:py-7">
          <div>
            <h4 className="mb-4 t-app-h3">Where it&apos;s at</h4>
            <Timeline app={app} />
          </div>
          <div>
            <h4 className="mb-4 t-app-h3">What you sent</h4>
            <AppSummary app={app} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-ink/[0.07] bg-cream/60 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end md:px-8">
          {app.status === "pending" && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  loginAs("admin", { redirectTo: "/admin/tutors" })
                }
                icon="eye"
              >
                Peek at the admin queue (demo)
              </Button>
              <Button href="/courses" variant="primary" iconRight="arrow-right">
                Browse courses while you wait
              </Button>
            </>
          )}
          {(app.status === "changes_requested" ||
            app.status === "rejected") && (
            <>
              <Button href="/contact?topic=tutor#message" variant="ghost">
                Ask a question
              </Button>
              <Button variant="accent" icon="edit" onClick={onEdit}>
                {app.status === "changes_requested"
                  ? "Update my application"
                  : "Apply with a new idea"}
              </Button>
            </>
          )}
          {app.status === "approved" && (
            <Button
              variant="success"
              iconRight="arrow-right"
              onClick={() =>
                loginAs("tutor", { userId: app.userId, redirectTo: "/tutor" })
              }
            >
              Open course studio
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Submitted({ app }: { app: TutorApp }) {
  const { loginAs } = useDemoAuth();
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const root = ref.current?.closest("section");
    if (root && root.getBoundingClientRect().top < 0)
      scrollToTarget(root as HTMLElement, { duration: 0.6 });
  }, []);
  return (
    <Card padding="none" className="app-enter overflow-hidden">
      <div
        className="relative bg-forest px-5 py-8 text-white md:px-8 md:py-10"
        data-field="dark"
      >
        <span
          className="grid size-14 place-items-center rounded-full bg-mint text-forest"
          aria-hidden
        >
          <Icon name="check" className="size-7" strokeWidth={3} />
        </span>
        <h3
          ref={ref}
          tabIndex={-1}
          className="mt-5 t-display-m text-mint outline-none"
        >
          {app.history?.length ? "Changes sent." : "Application sent."}
        </h3>
        <p className="mt-3 max-w-[46ch] t-body text-white">
          We&apos;ll read it with human eyes and email{" "}
          <EmailText email={app.email} /> within five working days.
        </p>
      </div>
      <div className="grid gap-6 px-5 py-6 md:grid-cols-2 md:gap-8 md:px-8 md:py-7">
        <div>
          <h4 className="mb-4 t-app-h3">What happens next</h4>
          <Timeline app={app} />
        </div>
        <div>
          <h4 className="mb-4 t-app-h3">While you wait</h4>
          <ul className="grid gap-3 text-[15px]">
            {[
              "Watch two or three free first videos to see how other tutors open a course.",
              "Jot down your module list. Six to ten minute videos work best.",
              "Record a test clip on your phone and check the sound in earphones.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon
                  name="sparkles"
                  className="mt-0.5 size-4 shrink-0 text-tangerine"
                />
                <span className="text-ink/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-ink/[0.07] bg-cream/60 px-5 py-4 sm:flex-row sm:justify-end md:px-8">
        <Button
          variant="ghost"
          icon="eye"
          onClick={() => loginAs("admin", { redirectTo: "/admin/tutors" })}
        >
          See it in the admin queue (demo)
        </Button>
        <Button href="/courses" iconRight="arrow-right">
          Browse free first videos
        </Button>
      </div>
    </Card>
  );
}
