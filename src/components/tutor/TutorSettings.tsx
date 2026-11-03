"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { formatDate, formatNumber } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { COURSE_LANGUAGES, getPayoutAccount } from "@/lib/mock/extra/tutor";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Icon,
  Input,
  PageHeader,
  Rating,
  Section,
  Skeleton,
  StickyActionBar,
  Switch,
  Textarea,
  UnsavedChangesGuard,
  toast,
  useIsClient,
  useIsPhone,
} from "@/components/app";
import { MonoMeta, RuleNote } from "./editorial";
import { useTutorContext, type TutorCtx } from "./shared";

/* Tutor profile + preferences (design system v2: Mobius split sections, fields on the
   right, a live preview card beside the public fields, a ruled footer and a square ink
   save bar while there are edits).
   - Name, city and headline save with demo.updateProfile; bio, expertise, languages and links save
     with demo.updateTutorProfile. Both live in the demo store, so the public tutor page, the learn
     sidebar, course pages and the shell pick them up straight away (getTutor(..., db)).
   - Only the backup UPI ID and email preferences have no store field, so they are kept in this
     browser (localStorage) and labelled that way. */

interface ProfileDraft {
  name: string;
  city: string;
  headline: string;
  bio: string;
  expertise: string;
  languages: string[];
  website: string;
  youtube: string;
  instagram: string;
  linkedin: string;
  upi: string;
  notify: {
    questions: boolean;
    reviews: boolean;
    sales: boolean;
    weekly: boolean;
  };
}
type LocalPart = Pick<ProfileDraft, "upi" | "notify">;
/** The four link fields and how each maps to a public social label. */
const LINKS = [
  {
    key: "website",
    label: "Website",
    match: (l: string) => l.includes("site") || l.includes("web"),
  },
  {
    key: "youtube",
    label: "YouTube",
    match: (l: string) => l.includes("youtube"),
  },
  {
    key: "instagram",
    label: "Instagram",
    match: (l: string) => l.includes("instagram"),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    match: (l: string) => l.includes("linkedin"),
  },
] as const;
const KEY = (uid: string) => `tm-tutor-profile:${uid}`;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const FORM_ID = "tutor-settings-form";

export function TutorSettings() {
  const ctx = useTutorContext();
  // the form re-initialises once the demo store has hydrated, so it starts from the live profile
  return (
    <SettingsForm
      key={ctx.hydrated ? `live-${ctx.userId}` : "seed"}
      ctx={ctx}
    />
  );
}

function readLocal(uid: string): Partial<LocalPart> | null {
  try {
    const raw = window.localStorage.getItem(KEY(uid));
    return raw ? (JSON.parse(raw) as Partial<LocalPart>) : null;
  } catch {
    return null;
  }
}

function SettingsForm({ ctx }: { ctx: TutorCtx }) {
  const { userId, tutor, profile, hydrated, db } = ctx;
  const isClient = useIsClient();
  const phone = useIsPhone();
  /** phones: the preview card is collapsed behind a toggle */
  const [previewOpen, setPreviewOpen] = useState(false);
  const account = getPayoutAccount(
    userId,
    tutor?.name ?? profile?.name ?? "tutor",
  );
  const social = (key: (typeof LINKS)[number]["key"]) => {
    const link = LINKS.find((l) => l.key === key)!;
    return (
      tutor?.socials.find((s) => link.match(s.label.toLowerCase()))?.href ?? ""
    );
  };
  // links we don't have a field for (e.g. GitHub) are kept as they are on save
  const otherSocials = (tutor?.socials ?? []).filter(
    (s) => !LINKS.some((l) => l.match(s.label.toLowerCase())),
  );

  const [base] = useState<ProfileDraft>(() => {
    const seed: ProfileDraft = {
      name: profile?.name ?? tutor?.name ?? "",
      city: profile?.city ?? "",
      headline: tutor?.headline ?? profile?.headline ?? "",
      bio: tutor?.bio ?? "",
      expertise: (tutor?.expertise ?? []).join(", "),
      languages: tutor?.languages ?? ["English"],
      website: social("website"),
      youtube: social("youtube"),
      instagram: social("instagram"),
      linkedin: social("linkedin"),
      upi: account.upi,
      notify: { questions: true, reviews: true, sales: false, weekly: true },
    };
    // browser-only fields (only after hydration, so server and first client render match)
    const local = hydrated ? readLocal(userId) : null;
    return local
      ? {
          ...seed,
          ...(local.upi ? { upi: local.upi } : {}),
          ...(local.notify
            ? { notify: { ...seed.notify, ...local.notify } }
            : {}),
        }
      : seed;
  });
  const [d, setD] = useState<ProfileDraft>(base);
  const [saved, setSaved] = useState<ProfileDraft>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  /** the last "fix these fields" toast: taken away once a save goes through (or on discard) */
  const errorToast = useRef<number | null>(null);
  const clearErrorToast = () => {
    if (errorToast.current != null) toast.dismiss(errorToast.current);
    errorToast.current = null;
  };

  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => {
    const next = { ...d, [k]: v };
    setD(next);
    // after a failed save, errors refresh as you fix them
    if (submitted) {
      const errs = validate(next);
      setErrors(errs);
      // everything fixed: the "fields need a look" toast is no longer true
      if (!Object.keys(errs).length) clearErrorToast();
    }
  };

  // lift toasts above the floating save bar while it's showing (tablets and desktops; phones
  // use the kit's sticky action bar, which handles this itself)
  useEffect(() => {
    if (!dirty) return;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      mq.matches
        ? document.documentElement.style.setProperty("--toast-offset", "76px")
        : document.documentElement.style.removeProperty("--toast-offset");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--toast-offset");
    };
  }, [dirty]);

  // the save bar is portalled to <body>: line it up with the content column, not the whole
  // viewport, so it never sits over the sidebar (lg) and follows the sidebar collapsing
  const [barInset, setBarInset] = useState<{
    left: number;
    right: number;
  } | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const main = document.getElementById("main");
    if (!main) return;
    const measure = () => {
      const r = main.getBoundingClientRect();
      setBarInset({
        left: Math.max(0, r.left),
        right: Math.max(0, window.innerWidth - r.right),
      });
    };
    // ResizeObserver reports once on observe, so this also takes the first measurement
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [dirty]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(d);
    setErrors(errs);
    if (Object.keys(errs).length) {
      clearErrorToast();
      errorToast.current = toast.error("A few fields need a look", {
        description: Object.values(errs)[0],
      });
      focusFirstError();
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      try {
        // public fields: the demo store (shows on /tutors/<slug>, course pages, the learn sidebar and the shell)
        const tutorChanged =
          d.bio !== saved.bio ||
          d.expertise !== saved.expertise ||
          d.languages.join("|") !== saved.languages.join("|") ||
          LINKS.some((l) => d[l.key] !== saved[l.key]);
        if (tutorChanged)
          demo.updateTutorProfile(userId, {
            bio: d.bio,
            expertise: d.expertise.split(","),
            languages: d.languages,
            socials: [
              ...LINKS.map((l) => ({
                label: l.label,
                href: d[l.key].trim(),
              })).filter((x) => x.href),
              ...otherSocials,
            ],
          });
        if (
          d.name !== saved.name ||
          d.city !== saved.city ||
          d.headline !== saved.headline
        )
          demo.updateProfile(userId, {
            name: d.name,
            city: d.city,
            headline: d.headline,
          });
      } catch (err) {
        setSaving(false);
        clearErrorToast();
        errorToast.current = toast.error("Couldn't save your profile", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
      try {
        const local: LocalPart = { upi: d.upi.trim(), notify: d.notify };
        window.localStorage.setItem(KEY(userId), JSON.stringify(local));
      } catch {}
      const expertise = d.expertise
        .split(",")
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(", ");
      const clean: ProfileDraft = {
        ...d,
        name: d.name.replace(/\s+/g, " ").trim(),
        city: d.city.trim(),
        headline: d.headline.replace(/\s+/g, " ").trim(),
        bio: d.bio.trim(),
        expertise,
        upi: d.upi.trim(),
        website: d.website.trim(),
        youtube: d.youtube.trim(),
        instagram: d.instagram.trim(),
        linkedin: d.linkedin.trim(),
      };
      setD(clean);
      setSaved(clean);
      setSaving(false);
      clearErrorToast();
      toast.success("Profile saved", {
        description:
          "Your public tutor page, course pages and the studio show the new details now.",
      });
    }, 350);
  };
  /** Focus the first field that needs fixing and bring it (and its error) into view, clear of the
   *  sticky save bar and the error toast on phones. */
  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `#${FORM_ID} [aria-invalid=true]`,
      );
      if (!el) return;
      el.focus({ preventScroll: true });
      (el.closest("fieldset") ?? el).scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  const discard = () => {
    setD(saved);
    clearErrorToast();
    setErrors({});
    setSubmitted(false);
  };

  const name = d.name.trim() || tutor?.name || profile?.name || "Tutor";
  // "Tutor since" is the day the tutor application was approved; the account may be older.
  const approvedAt = db.tutorApplications
    .filter(
      (a) => a.userId === userId && a.status === "approved" && a.decidedAt,
    )
    .map((a) => a.decidedAt!)
    .sort()
    .at(-1);
  const tutorSince = approvedAt ?? profile?.joinedAt;
  const edited = changedCount(d, saved);

  return (
    <div className="app-enter">
      <UnsavedChangesGuard when={dirty && !saving} />
      <PageHeader
        eyebrow="Tutor studio"
        title={
          <>
            How learners <em>see</em> you.
          </>
        }
        description="Your public tutor page, payout details and the emails we send you."
        breadcrumbs={[
          { label: "Studio", href: "/tutor" },
          { label: "Profile" },
        ]}
        actions={
          tutor && (
            <Button
              href={`/tutors/${tutor.slug}`}
              variant="outline"
              icon="external"
            >
              View public profile
            </Button>
          )
        }
      />

      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="space-y-14 md:space-y-20">
          <Section
            index="01"
            label="Public profile"
            note="Shown on your tutor page and next to every course."
            title="Who you are"
          >
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_270px] xl:gap-10">
              <div className="flex min-w-0 flex-col gap-6">
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
                  <Field
                    label="Name"
                    required
                    hint="As learners see it on courses and certificates."
                    error={errors.name}
                  >
                    <Input
                      value={d.name}
                      onChange={(e) => set("name", e.target.value)}
                      maxLength={60}
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                    />
                  </Field>
                  <Field
                    label="City"
                    optional
                    hint="Helps learners nearby find you."
                  >
                    <Input
                      value={d.city}
                      onChange={(e) => set("city", e.target.value)}
                      maxLength={40}
                      icon="globe"
                      autoComplete="address-level2"
                      autoCapitalize="words"
                      enterKeyHint="next"
                    />
                  </Field>
                </div>
                <Field
                  label="Headline"
                  required
                  hint="One line about what you teach and why you."
                  error={errors.headline}
                >
                  <Input
                    value={d.headline}
                    onChange={(e) => set("headline", e.target.value)}
                    maxLength={90}
                  />
                </Field>
                <Field
                  label="Email"
                  hint="Where we send review results and payouts. Email changes go through support in this demo."
                >
                  <Input value={profile?.email ?? ""} disabled icon="mail" />
                </Field>
                <RuleNote tone="quiet" label="Where this saves" icon="info">
                  Everything in this section and your links save to your public
                  profile, so your tutor page, course pages and the studio pick
                  them up. Only the backup UPI ID and email preferences stay in
                  this browser for the demo.
                </RuleNote>
                <Field label="Bio" required error={errors.bio}>
                  <Textarea
                    value={d.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    rows={5}
                    maxLength={800}
                    showCount
                  />
                </Field>
                <Field
                  label="Expertise"
                  hint="Comma separated, e.g. Prompting, Colour grading, Sound design"
                >
                  <Input
                    value={d.expertise}
                    onChange={(e) => set("expertise", e.target.value)}
                    enterKeyHint="next"
                  />
                </Field>
                <fieldset
                  aria-describedby={errors.languages ? "lang-err" : undefined}
                >
                  <legend className="mb-3 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase">
                    Languages you teach in
                  </legend>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-4 sm:grid-cols-3">
                    {COURSE_LANGUAGES.map((l) => (
                      <Checkbox
                        key={l}
                        label={l}
                        checked={d.languages.includes(l)}
                        aria-invalid={errors.languages ? true : undefined}
                        aria-describedby={
                          errors.languages ? "lang-err" : undefined
                        }
                        onChange={(e) =>
                          set(
                            "languages",
                            e.target.checked
                              ? [...d.languages, l]
                              : d.languages.filter((x) => x !== l),
                          )
                        }
                      />
                    ))}
                  </div>
                  {errors.languages && (
                    <p
                      id="lang-err"
                      role="alert"
                      className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep"
                    >
                      <span
                        aria-hidden
                        className="mt-[5px] size-[6px] shrink-0 bg-current"
                      />
                      {errors.languages}
                    </p>
                  )}
                </fieldset>
              </div>

              {/* live preview: beside the fields from xl, after them below that; phones fold it away */}
              <aside className="min-w-0" aria-label="Profile preview">
                <Card padding="sm" className="sm:p-5 xl:sticky xl:top-[88px]">
                  <div className="flex items-center justify-between gap-3">
                    <MonoMeta as="span">Preview · public page</MonoMeta>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen((o) => !o)}
                      aria-expanded={previewOpen}
                      aria-controls="tutor-preview-body"
                      className="tap -my-2 -mr-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[11px] font-semibold tracking-[0.13em] uppercase sm:hidden"
                    >
                      {previewOpen ? "Hide" : "Show"}
                      <Icon
                        name={previewOpen ? "chevron-up" : "chevron-down"}
                        className="size-4"
                        strokeWidth={1.8}
                      />
                    </button>
                  </div>
                  <div
                    id="tutor-preview-body"
                    className={clsx(!previewOpen && "max-sm:hidden")}
                  >
                    {!hydrated ? (
                      <div className="mt-4" aria-hidden>
                        <Skeleton variant="row" />
                        <Skeleton variant="text" lines={3} className="mt-4" />
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 flex items-center gap-3.5 border-t border-line pt-4">
                          <Avatar
                            name={name}
                            src={profile?.avatar ?? tutor?.avatar}
                            tone={profile?.tone}
                            size="lg"
                            decorative
                          />
                          <div className="min-w-0">
                            <p className="truncate t-app-h3">{name}</p>
                            <MonoMeta className="mt-0.5 truncate">
                              {d.city || "City not set"}
                            </MonoMeta>
                          </div>
                        </div>
                        <p className="mt-4 font-heading text-[16px] leading-snug font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">
                          {d.headline || "Your headline"}
                        </p>
                        <p className="mt-2 line-clamp-5 t-small [overflow-wrap:anywhere] text-muted">
                          {d.bio || "Your bio shows here."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {d.expertise
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)
                            .slice(0, 6)
                            .map((x) => (
                              <Badge key={x} tone="neutral" size="sm">
                                {x}
                              </Badge>
                            ))}
                        </div>
                        {tutor && (
                          <dl className="mt-5 grid grid-cols-2 border-t border-line pt-4">
                            <div className="min-w-0 pr-3">
                              <dt className="sr-only">Rating</dt>
                              <dd>
                                <Rating value={tutor.rating} size="sm" />
                                <MonoMeta className="mt-1">
                                  {formatNumber(tutor.reviewCount)} reviews
                                </MonoMeta>
                              </dd>
                            </div>
                            <div className="min-w-0 border-l border-line pl-3">
                              <dt className="sr-only">Learners</dt>
                              <dd>
                                <span className="font-heading text-[16px] font-semibold tracking-[-0.02em] tabular-nums">
                                  {formatNumber(tutor.learners)}
                                </span>
                                <MonoMeta className="mt-1">Learners</MonoMeta>
                              </dd>
                            </div>
                          </dl>
                        )}
                        <MonoMeta className="mt-4 border-t border-line pt-3">
                          Tutor since{" "}
                          {tutorSince ? formatDate(tutorSince, "long") : "–"}
                        </MonoMeta>
                      </>
                    )}
                  </div>
                </Card>
              </aside>
            </div>
          </Section>

          <Section
            index="02"
            label="Links"
            note={`Optional. Shown on your public tutor page.${otherSocials.length ? ` Your ${otherSocials.map((x) => x.label).join(" and ")} link stays as it is.` : ""}`}
            title="Your work outside the course"
          >
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
              {(
                [
                  ["website", "Website", "globe"],
                  ["youtube", "YouTube", "play-circle"],
                  ["instagram", "Instagram", "camera"],
                  ["linkedin", "LinkedIn", "briefcase"],
                ] as const
              ).map(([k, label, icon]) => (
                <Field key={k} label={label} optional error={errors[k]}>
                  <Input
                    type="url"
                    icon={icon}
                    value={d[k]}
                    onChange={(e) => set(k, e.target.value)}
                    placeholder="https://"
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section
            id="payouts"
            index="03"
            label="Payouts"
            note={`Monthly bank transfer on the ${account.payoutDay}th. UPI is the backup if the bank transfer bounces.`}
            title="Where the money goes"
            className="scroll-mt-24"
          >
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
              <Field
                label="Bank account"
                hint="Change it with a cancelled cheque via support."
              >
                <Input
                  value={`${account.bank} ••${account.last4}`}
                  disabled
                  icon="wallet"
                />
              </Field>
              <Field
                label="Backup UPI ID"
                hint="Kept in this browser for the demo."
                error={errors.upi}
              >
                <Input
                  value={d.upi}
                  onChange={(e) => set("upi", e.target.value)}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="email"
                  enterKeyHint="done"
                />
              </Field>
            </div>
            <MonoMeta className="mt-5">
              PAN on file {account.panMasked}
            </MonoMeta>
          </Section>

          <Section
            index="04"
            label="Notifications"
            note="Kept in this browser for the demo."
            title="Email me when…"
          >
            <div className="divide-y divide-line border-y border-line border-t-fg">
              <Switch
                className="py-5"
                label="A learner asks a question"
                description="Instant, so you can answer within a day."
                checked={d.notify.questions}
                onChange={(v) => set("notify", { ...d.notify, questions: v })}
              />
              <Switch
                className="py-5"
                label="Someone leaves a review"
                checked={d.notify.reviews}
                onChange={(v) => set("notify", { ...d.notify, reviews: v })}
              />
              <Switch
                className="py-5"
                label="Every sale"
                description="Can get busy on launch day."
                checked={d.notify.sales}
                onChange={(v) => set("notify", { ...d.notify, sales: v })}
              />
              <Switch
                className="py-5"
                label="Weekly studio summary"
                description="Mondays: learners, completion and earnings in one email."
                checked={d.notify.weekly}
                onChange={(v) => set("notify", { ...d.notify, weekly: v })}
              />
            </div>
          </Section>

          {tutor && (
            <Section
              index="05"
              label="Visibility"
              note="Who can see your tutor page."
              title="Your page is public"
            >
              <RuleNote
                label={`Live at /tutors/${tutor.slug}`}
                icon="globe"
                action={
                  <Button
                    href={`/tutors/${tutor.slug}`}
                    variant="arrow"
                    size="sm"
                  >
                    Open your tutor page
                  </Button>
                }
              >
                Anyone can find it from your courses and the catalog. Courses
                you archive leave the catalog, but your page and your published
                courses stay up.
              </RuleNote>
            </Section>
          )}
        </div>

        {/* ruled footer: the save lives here too, for keyboard users who tab to the end */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-fg pt-5 md:mt-20">
          <p
            className={clsx(
              "flex items-center gap-2.5 font-mono text-[11px] tracking-[0.08em] uppercase",
              dirty ? "text-fg" : "text-muted",
            )}
            aria-live="polite"
          >
            <span
              aria-hidden
              className={clsx(
                "size-[6px] shrink-0",
                dirty ? "bg-red" : "bg-current",
              )}
            />
            {dirty
              ? `${edited} ${edited === 1 ? "field" : "fields"} edited · not saved yet`
              : "All changes saved"}
          </p>
          <div className="flex items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
            {dirty && (
              <Button variant="ghost" onClick={discard}>
                Discard
              </Button>
            )}
            <Button
              type="submit"
              variant={dirty ? "red" : "outline"}
              loading={saving}
              disabled={!dirty}
              icon="check"
            >
              {dirty ? "Save changes" : "All saved"}
            </Button>
          </div>
        </div>
      </form>

      {/* phones: the kit's sticky action bar (safe area, --bottom-ui, hides the dock) */}
      <StickyActionBar
        show={dirty}
        label="Unsaved changes"
        title="Not saved yet"
        sub={`${edited} ${edited === 1 ? "field" : "fields"} edited`}
      >
        <Button variant="ghost" onClick={discard} className="h-12 px-2.5">
          Discard
        </Button>
        <Button
          type="submit"
          form={FORM_ID}
          variant="red"
          icon="check"
          loading={saving}
          className="h-12 px-4"
        >
          Save
        </Button>
      </StickyActionBar>
      {/* tablets and desktops: a square ink bar keeps Save in reach while there are edits */}
      {isClient &&
        dirty &&
        !phone &&
        createPortal(
          <div
            className="app-enter fixed inset-x-0 bottom-0 z-[60] px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
            style={
              barInset
                ? { left: barInset.left, right: barInset.right }
                : undefined
            }
            role="region"
            aria-label="Unsaved changes"
          >
            <div
              data-field="dark"
              className="mx-auto flex max-w-[760px] items-center gap-2 border border-white/[0.08] bg-ink py-2 pr-2 pl-5 text-cream shadow-lift sm:gap-3"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate text-[11px] font-semibold tracking-[0.16em] uppercase">
                <span aria-hidden className="size-[6px] shrink-0 bg-red" />
                Unsaved changes
                <span className="font-mono font-medium tracking-[0.06em] text-ash normal-case max-md:hidden">
                  · {edited} {edited === 1 ? "field" : "fields"}
                </span>
              </span>
              <button
                type="button"
                onClick={discard}
                className="tap h-9 shrink-0 px-3.5 text-[11px] font-semibold tracking-[0.13em] text-cream/75 uppercase transition-colors focus-visible:outline-2 focus-visible:outline-cream hf:text-cream"
              >
                Discard
              </button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="red"
                size="sm"
                icon="check"
                loading={saving}
              >
                Save changes
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** How many top-level fields differ from the saved profile (email preferences count as one each). */
function changedCount(d: ProfileDraft, saved: ProfileDraft) {
  let n = 0;
  for (const k of Object.keys(d) as (keyof ProfileDraft)[]) {
    if (k === "notify")
      n += (Object.keys(d.notify) as (keyof ProfileDraft["notify"])[]).filter(
        (x) => d.notify[x] !== saved.notify[x],
      ).length;
    else if (JSON.stringify(d[k]) !== JSON.stringify(saved[k])) n++;
  }
  return Math.max(1, n);
}

function validate(d: ProfileDraft) {
  const errs: Record<string, string> = {};
  const n = d.name.replace(/\s+/g, " ").trim();
  if (n.length < 2) errs.name = "Your name needs at least 2 characters.";
  if (d.headline.trim().length < 10)
    errs.headline = "Write a headline of at least 10 characters.";
  if (d.bio.trim().length < 60)
    errs.bio = "Tell learners a bit more: at least 60 characters.";
  for (const k of ["website", "youtube", "instagram", "linkedin"] as const)
    if (d[k].trim() && !URL_RE.test(d[k].trim()))
      errs[k] = "Use a full link starting with https://";
  if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(d.upi.trim()))
    errs.upi = "That doesn't look like a UPI ID (name@bank).";
  if (!d.languages.length) errs.languages = "Pick at least one language.";
  return errs;
}
