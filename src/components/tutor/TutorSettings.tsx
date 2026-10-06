"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { formatDate, formatNumber } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { COURSE_LANGUAGES, getPayoutAccount } from "@/lib/mock/extra/tutor";
import { Avatar, Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, PageHeader, Rating, Skeleton, StickyActionBar, Switch, Textarea, UnsavedChangesGuard, toast, useIsClient, useIsPhone } from "@/components/app";
import { useTutorContext, type TutorCtx } from "./shared";

/* Tutor profile + preferences.
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
  notify: { questions: boolean; reviews: boolean; sales: boolean; weekly: boolean };
}
type LocalPart = Pick<ProfileDraft, "upi" | "notify">;
/** The four link fields and how each maps to a public social label. */
const LINKS = [
  { key: "website", label: "Website", match: (l: string) => l.includes("site") || l.includes("web") },
  { key: "youtube", label: "YouTube", match: (l: string) => l.includes("youtube") },
  { key: "instagram", label: "Instagram", match: (l: string) => l.includes("instagram") },
  { key: "linkedin", label: "LinkedIn", match: (l: string) => l.includes("linkedin") },
] as const;
const KEY = (uid: string) => `tm-tutor-profile:${uid}`;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const FORM_ID = "tutor-settings-form";

export function TutorSettings() {
  const ctx = useTutorContext();
  // the form re-initialises once the demo store has hydrated, so it starts from the live profile
  return <SettingsForm key={ctx.hydrated ? `live-${ctx.userId}` : "seed"} ctx={ctx} />;
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
  const account = getPayoutAccount(userId, tutor?.name ?? profile?.name ?? "tutor");
  const social = (key: (typeof LINKS)[number]["key"]) => {
    const link = LINKS.find((l) => l.key === key)!;
    return tutor?.socials.find((s) => link.match(s.label.toLowerCase()))?.href ?? "";
  };
  // links we don't have a field for (e.g. GitHub) are kept as they are on save
  const otherSocials = (tutor?.socials ?? []).filter((s) => !LINKS.some((l) => l.match(s.label.toLowerCase())));

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
    return local ? { ...seed, ...(local.upi ? { upi: local.upi } : {}), ...(local.notify ? { notify: { ...seed.notify, ...local.notify } } : {}) } : seed;
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

  // lift toasts above the mobile save bar while it's showing
  useEffect(() => {
    if (!dirty) return;
    const mq = window.matchMedia("(min-width: 640px) and (max-width: 1279.98px)");
    const apply = () => (mq.matches ? document.documentElement.style.setProperty("--toast-offset", "76px") : document.documentElement.style.removeProperty("--toast-offset"));
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--toast-offset");
    };
  }, [dirty]);

  // the save bar is portalled to <body>: line it up with the content column, not the whole
  // viewport, so it never sits over the sidebar (lg) and follows the sidebar collapsing
  const [barInset, setBarInset] = useState<{ left: number; right: number } | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const main = document.getElementById("main");
    if (!main) return;
    const measure = () => {
      const r = main.getBoundingClientRect();
      setBarInset({ left: Math.max(0, r.left), right: Math.max(0, window.innerWidth - r.right) });
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
      errorToast.current = toast.error("A few fields need a look", { description: Object.values(errs)[0] });
      focusFirstError();
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      try {
        // public fields: the demo store (shows on /tutors/<slug>, course pages, the learn sidebar and the shell)
        const tutorChanged =
          d.bio !== saved.bio || d.expertise !== saved.expertise || d.languages.join("|") !== saved.languages.join("|") || LINKS.some((l) => d[l.key] !== saved[l.key]);
        if (tutorChanged)
          demo.updateTutorProfile(userId, {
            bio: d.bio,
            expertise: d.expertise.split(","),
            languages: d.languages,
            socials: [...LINKS.map((l) => ({ label: l.label, href: d[l.key].trim() })).filter((x) => x.href), ...otherSocials],
          });
        if (d.name !== saved.name || d.city !== saved.city || d.headline !== saved.headline) demo.updateProfile(userId, { name: d.name, city: d.city, headline: d.headline });
      } catch (err) {
        setSaving(false);
        clearErrorToast();
        errorToast.current = toast.error("Couldn't save your profile", { description: err instanceof Error ? err.message : undefined });
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
      toast.success("Profile saved", { description: "Your public tutor page, course pages and the studio show the new details now." });
    }, 350);
  };
  /** Focus the first field that needs fixing and bring it (and its error) into view, clear of the
   *  sticky save bar and the error toast on phones. */
  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`#${FORM_ID} [aria-invalid=true]`);
      if (!el) return;
      el.focus({ preventScroll: true });
      (el.closest("fieldset") ?? el).scrollIntoView({ block: "center", behavior: "smooth" });
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
    .filter((a) => a.userId === userId && a.status === "approved" && a.decidedAt)
    .map((a) => a.decidedAt!)
    .sort()
    .at(-1);
  const tutorSince = approvedAt ?? profile?.joinedAt;

  return (
    <div className="app-enter">
      <UnsavedChangesGuard when={dirty && !saving} />
      <PageHeader
        eyebrow="Profile"
        eyebrowTone="green"
        title="How learners see you."
        description="Your public tutor page, payout details and the emails we send you."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Profile" }]}
        actions={
          tutor && (
            <Button href={`/tutors/${tutor.slug}`} variant="secondary" icon="external">
              View public profile
            </Button>
          )
        }
      />

      <form id={FORM_ID} onSubmit={submit} noValidate className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-5">
          <Card>
            <CardHeader title="Public profile" description="Shown on your tutor page and next to every course." />
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required hint="As learners see it on courses and certificates." error={errors.name}>
                  <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={60} autoComplete="name" autoCapitalize="words" enterKeyHint="next" />
                </Field>
                <Field label="City" optional hint="Helps learners nearby find you.">
                  <Input value={d.city} onChange={(e) => set("city", e.target.value)} maxLength={40} icon="globe" autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" />
                </Field>
              </div>
              <Field label="Headline" required hint="One line about what you teach and why you." error={errors.headline}>
                <Input value={d.headline} onChange={(e) => set("headline", e.target.value)} maxLength={90} />
              </Field>
              <Field label="Email" hint="Where we send review results and payouts. Email changes go through support in this demo.">
                <Input value={profile?.email ?? ""} disabled icon="mail" />
              </Field>
              <LocalNote />
              <Field label="Bio" required error={errors.bio}>
                <Textarea value={d.bio} onChange={(e) => set("bio", e.target.value)} rows={5} maxLength={800} showCount />
              </Field>
              <Field label="Expertise" hint="Comma separated, e.g. JavaScript, CSS, Interview prep">
                <Input value={d.expertise} onChange={(e) => set("expertise", e.target.value)} enterKeyHint="next" />
              </Field>
              <fieldset aria-describedby={errors.languages ? "lang-err" : undefined}>
                <legend className="mb-2 text-[14px] font-bold">Languages you teach in</legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                  {COURSE_LANGUAGES.map((l) => (
                    <Checkbox
                      key={l}
                      label={l}
                      checked={d.languages.includes(l)}
                      aria-invalid={errors.languages ? true : undefined}
                      aria-describedby={errors.languages ? "lang-err" : undefined}
                      onChange={(e) => set("languages", e.target.checked ? [...d.languages, l] : d.languages.filter((x) => x !== l))}
                    />
                  ))}
                </div>
                {errors.languages && (
                  <p id="lang-err" role="alert" className="mt-1.5 text-[13px] font-semibold text-[#c13500]">
                    {errors.languages}
                  </p>
                )}
              </fieldset>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Links"
              description={`Optional. Shown on your public tutor page; learners love seeing your work outside the course.${otherSocials.length ? ` Your ${otherSocials.map((x) => x.label).join(" and ")} link stays as it is.` : ""}`}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["website", "Website", "globe"],
                  ["youtube", "YouTube", "play-circle"],
                  ["instagram", "Instagram", "camera"],
                  ["linkedin", "LinkedIn", "briefcase"],
                ] as const
              ).map(([k, label, icon]) => (
                <Field key={k} label={label} optional error={errors[k]}>
                  <Input type="url" icon={icon} value={d[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://" />
                </Field>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payouts" description="Monthly bank transfer on the 10th. UPI is the backup if the bank transfer bounces. In this demo the UPI ID is kept in this browser." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank account" hint="Change it with a cancelled cheque via support.">
                <Input value={`${account.bank} ••${account.last4}`} disabled icon="wallet" />
              </Field>
              <Field label="Backup UPI ID" error={errors.upi}>
                <Input value={d.upi} onChange={(e) => set("upi", e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} inputMode="email" enterKeyHint="done" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Email me when…" description="Kept in this browser for the demo." />
            <div className="flex flex-col gap-4">
              <Switch label="A learner asks a question" description="Instant, so you can answer within a day." checked={d.notify.questions} onChange={(v) => set("notify", { ...d.notify, questions: v })} />
              <Switch label="Someone leaves a review" checked={d.notify.reviews} onChange={(v) => set("notify", { ...d.notify, reviews: v })} />
              <Switch label="Every sale" description="Can get busy on launch day." checked={d.notify.sales} onChange={(v) => set("notify", { ...d.notify, sales: v })} />
              <Switch label="Weekly studio summary" description="Mondays: learners, completion and earnings in one email." checked={d.notify.weekly} onChange={(v) => set("notify", { ...d.notify, weekly: v })} />
            </div>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 md:gap-5" aria-label="Profile preview">
          <Card className="xl:sticky xl:top-[88px]">
            <div className="flex items-center justify-between gap-3">
              <p className="t-micro text-ink/50 uppercase">Preview</p>
              <button
                type="button"
                onClick={() => setPreviewOpen((o) => !o)}
                aria-expanded={previewOpen}
                aria-controls="tutor-preview-body"
                className="tap -my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[14px] font-bold text-blue sm:hidden"
              >
                {previewOpen ? "Hide" : "Show how it looks"}
                <Icon name={previewOpen ? "chevron-up" : "chevron-down"} className="size-4" strokeWidth={2.4} />
              </button>
            </div>
            <div id="tutor-preview-body" className={clsx(!previewOpen && "max-sm:hidden")}>
            {!hydrated ? (
              <div className="mt-3" aria-hidden>
                <Skeleton variant="row" />
                <Skeleton variant="text" lines={3} className="mt-4" />
              </div>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={name} src={profile?.avatar ?? tutor?.avatar} tone={profile?.tone} size="lg" decorative />
                  <div className="min-w-0">
                    <p className="t-app-h3 truncate">{name}</p>
                    <p className="text-[13px] font-semibold text-ink/55">{d.city || "City not set"}</p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-snug font-bold break-words">{d.headline || "Your headline"}</p>
                <p className="t-small mt-2 line-clamp-5 break-words text-ink/70">{d.bio || "Your bio shows here."}</p>
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
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/[0.07] pt-4 text-[13px] font-semibold">
                    <div>
                      <Rating value={tutor.rating} size="sm" />
                      <p className="mt-1 text-ink/55">{formatNumber(tutor.reviewCount)} reviews</p>
                    </div>
                    <div>
                      <p className="font-bold">{formatNumber(tutor.learners)}</p>
                      <p className="mt-1 text-ink/55">learners</p>
                    </div>
                  </div>
                )}
                <p className="mt-4 text-[12.5px] font-semibold text-ink/50">Tutor since {tutorSince ? formatDate(tutorSince, "long") : "–"}</p>
              </>
            )}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Button type="submit" fullWidth loading={saving} disabled={!dirty} icon="check">
                {dirty ? "Save changes" : "All saved"}
              </Button>
              {dirty && (
                <Button variant="ghost" fullWidth onClick={discard}>
                  Discard changes
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </form>

      {/* below xl the Save button sits four screens down: keep it in reach while there are edits */}
      {/* phones: the kit's sticky action bar (safe area, --bottom-ui, hides the dock) */}
      <StickyActionBar show={dirty} label="Unsaved changes" title="Not saved yet" sub={`${changedCount(d, saved)} ${changedCount(d, saved) === 1 ? "field" : "fields"} edited`}>
        <Button variant="ghost" onClick={discard} className="h-12 px-2.5">
          Discard
        </Button>
        <Button type="submit" form={FORM_ID} icon="check" loading={saving} className="h-12 px-4">
          Save
        </Button>
      </StickyActionBar>
      {isClient &&
        dirty &&
        !phone &&
        createPortal(
          <div
            className="app-enter fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(12px,env(safe-area-inset-bottom))] xl:hidden"
            style={barInset ? { left: barInset.left, right: barInset.right } : undefined}
            role="region"
            aria-label="Unsaved changes"
          >
            <div className="mx-auto flex max-w-[640px] items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-cream shadow-lift">
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold">Unsaved changes</span>
              <button type="button" onClick={discard} className="tap h-10 shrink-0 rounded-full px-3.5 text-[14px] font-bold text-cream/80 hf:bg-white/10 hf:text-cream">
                Discard
              </button>
              <Button type="submit" form={FORM_ID} variant="sun" size="sm" icon="check" loading={saving} className="h-10 shrink-0">
                Save
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
    if (k === "notify") n += (Object.keys(d.notify) as (keyof ProfileDraft["notify"])[]).filter((x) => d.notify[x] !== saved.notify[x]).length;
    else if (JSON.stringify(d[k]) !== JSON.stringify(saved[k])) n++;
  }
  return Math.max(1, n);
}

function validate(d: ProfileDraft) {
  const errs: Record<string, string> = {};
  const n = d.name.replace(/\s+/g, " ").trim();
  if (n.length < 2) errs.name = "Your name needs at least 2 characters.";
  if (d.headline.trim().length < 10) errs.headline = "Write a headline of at least 10 characters.";
  if (d.bio.trim().length < 60) errs.bio = "Tell learners a bit more: at least 60 characters.";
  for (const k of ["website", "youtube", "instagram", "linkedin"] as const) if (d[k].trim() && !URL_RE.test(d[k].trim())) errs[k] = "Use a full link starting with https://";
  if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(d.upi.trim())) errs.upi = "That doesn't look like a UPI ID (name@bank).";
  if (!d.languages.length) errs.languages = "Pick at least one language.";
  return errs;
}

function LocalNote() {
  return (
    <p className="-mb-1 flex items-start gap-2 rounded-[16px] bg-cream/80 px-3.5 py-2.5 text-[13px] leading-snug font-semibold text-ink/65">
      <Icon name="info" className="mt-px size-4 shrink-0" />
      <span>Everything on this card and your links save to your public profile, so your tutor page, course pages and the studio pick them up. Only the backup UPI ID and email preferences stay in this browser for the demo.</span>
    </p>
  );
}
