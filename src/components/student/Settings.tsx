"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Segmented,
  Select,
  StickyActionBar,
  Switch,
  Textarea,
  toast,
  useScrollHide,
} from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { toneBg, type Tone } from "@/lib/landing-data";
import { useDb, demo } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import {
  formatDate,
  getCertificates,
  getNotes,
  getOrders,
  getWishlist,
} from "@/lib/mock";
import { dailyMinutes, getMyCourses } from "./data";
import { focusFirstInvalid, useOutOfView } from "./hooks";
import { Hydrated, SettingsSkeleton } from "./Hydrated";
import { useStudentPrefs, useStudentProfile, type NotifKey } from "./prefs";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "password", label: "Password", icon: "lock" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "goals", label: "Learning goal", icon: "trend" },
  { id: "danger", label: "Danger zone", icon: "alert" },
] as const;

const TONES: { tone: Tone; label: string }[] = [
  { tone: "hotpink", label: "Hot pink" },
  { tone: "blue", label: "Blue" },
  { tone: "green", label: "Green" },
  { tone: "sun", label: "Sunshine" },
  { tone: "tangerine", label: "Tangerine" },
  { tone: "turquoise", label: "Turquoise" },
  { tone: "lilac", label: "Lilac" },
  { tone: "purple", label: "Purple" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DARK_TONES = new Set<Tone>([
  "hotpink",
  "blue",
  "green",
  "purple",
  "indigo",
  "flame",
  "forest",
  "magenta",
]);

const IDS = SECTIONS.map((x) => x.id);

/**
 * Which section the reader is in: the last one whose top has passed ~30% of the viewport,
 * or the last section once the page is scrolled to the bottom (short final sections never
 * reach the reading line otherwise).
 *
 * An explicit target (a nav click, or the #hash we landed on) wins over that guess and
 * stays active until the reader actually scrolls (wheel, touch, scroll keys, scrollbar),
 * so a jump to a short section near the end never flips to "Danger zone".
 */
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function useActiveSection() {
  const [active, setActive] = useState<string>(IDS[0]);
  const target = useRef<string | null>(null);
  const compute = useCallback(() => {
    if (target.current) {
      setActive(target.current);
      return;
    }
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
      setActive(IDS[IDS.length - 1]);
      return;
    }
    const line = window.innerHeight * 0.3;
    let cur: string = IDS[0];
    for (const id of IDS) {
      const el = document.getElementById(id)?.closest("section");
      if (el && el.getBoundingClientRect().top <= line) cur = id;
    }
    setActive(cur);
  }, []);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          compute();
        });
    };
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if ((IDS as readonly string[]).includes(id)) target.current = id;
      onScroll();
    };
    // a real scroll by the reader releases the explicit target
    const release = () => {
      if (!target.current) return;
      target.current = null;
      onScroll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(e.key)) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      )
        return;
      release();
    };
    // a press on the page's own scrollbar lands on <html>
    const onDown = (e: PointerEvent) => {
      if (e.target === document.documentElement) release();
    };
    fromHash();
    // the sections render after the store hydrates, so the browser's own jump to #goals
    // (dashboard "Edit weekly goal") found nothing: do it now that they exist
    if (target.current)
      document
        .getElementById(target.current)
        ?.scrollIntoView({ block: "start" });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [compute]);
  const jumpTo = useCallback((id: string) => {
    target.current = id;
    setActive(id);
  }, []);
  return [active, jumpTo] as const;
}

const HEADER = {
  eyebrow: "Student space",
  eyebrowTone: "hotpink" as const,
  title: "Your account.",
  description:
    "Name, password, nudges and goals. Tweak away, nothing here is permanent.",
  breadcrumbs: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Account" },
  ],
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function SettingsFallback() {
  return <SettingsSkeleton header={<PageHeader {...HEADER} />} />;
}

export function Settings() {
  return (
    <Hydrated fallback={<SettingsFallback />}>
      <SettingsInner />
    </Hydrated>
  );
}

function SettingsInner() {
  const [active, jumpTo] = useActiveSection();
  const nav = useRef<HTMLElement>(null);
  // phones: the section row sticks under the 56px app top bar and slides up with it when the
  // bar auto-hides (same scroll rule as AppTopBar), so no strip of content peeks above it
  const barHidden = useScrollHide({ after: 56, delta: 8 });
  // only one sticky save bar at a time: the profile form wins over the password form
  const [profileDirty, setProfileDirty] = useState(false);

  // on phones the section nav scrolls sideways: keep the active pill in view (without moving the page)
  useEffect(() => {
    const n = nav.current;
    const pill = n?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!n || !pill || n.scrollWidth <= n.clientWidth) return;
    const nr = n.getBoundingClientRect();
    const pr = pill.getBoundingClientRect();
    if (pr.left < nr.left + 24)
      n.scrollBy({ left: pr.left - nr.left - 32, behavior: "smooth" });
    else if (pr.right > nr.right - 24)
      n.scrollBy({ left: pr.right - nr.right + 32, behavior: "smooth" });
  }, [active]);

  // fade whichever edge hides pills (globals: [data-overflow]), so the row reads as "scroll for more"
  useEffect(() => {
    const n = nav.current;
    if (!n) return;
    const update = () => {
      const max = n.scrollWidth - n.clientWidth;
      const start = n.scrollLeft > 2;
      const end = max - n.scrollLeft > 2;
      const v = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (v) n.setAttribute("data-overflow", v);
      else n.removeAttribute("data-overflow");
    };
    update();
    n.addEventListener("scroll", update, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(n);
    return () => {
      n.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, []);

  return (
    <div className="app-enter">
      <PageHeader {...HEADER} />
      {/* anchors clear the sticky top bar, plus the sticky section row below lg */}
      <div className="grid items-start gap-5 [--header-offset:152px] md:[--header-offset:164px] lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8 lg:[--header-offset:112px]">
        <div
          data-bar-hidden={barHidden || undefined}
          className="sticky top-16 z-20 -mx-4 min-w-0 bg-cream/95 px-4 py-2 backdrop-blur-md transition-[translate] duration-300 ease-ui max-sm:top-[calc(56px+var(--sat))] max-sm:bg-cream/[0.97] max-sm:data-bar-hidden:-translate-y-14 sm:-mx-6 sm:px-6 md:top-[72px] lg:top-24 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          <nav
            ref={nav}
            aria-label="Settings sections"
            className="-m-1 no-scrollbar flex gap-1 overflow-x-auto p-1 lg:m-0 lg:flex-col lg:overflow-visible lg:p-0"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                data-section={s.id}
                data-no-transition
                onClick={() => jumpTo(s.id)}
                aria-current={active === s.id ? "true" : undefined}
                className={clsx(
                  "tap inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full px-3.5 text-[14.5px] font-semibold transition-colors max-sm:h-11 focus-visible:bg-white hf:bg-white hf:text-ink",
                  active === s.id
                    ? "bg-white text-ink shadow-soft"
                    : s.id === "danger"
                      ? "text-[#b02f00]"
                      : "text-ink/75",
                )}
              >
                <Icon name={s.icon} className="size-[18px]" />
                {s.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="min-w-0 space-y-5">
          <ProfileSection onDirtyChange={setProfileDirty} />
          <PasswordSection barAllowed={!profileDirty} />
          <NotificationsSection />
          <GoalSection />
          <DangerSection />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- profile */
function ProfileSection({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const profile = useStudentProfile();
  const initial = useMemo(
    () => ({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      city: profile.city,
      headline: profile.headline,
      tone: profile.tone,
      photo: profile.photo,
    }),
    [
      profile.name,
      profile.email,
      profile.phone,
      profile.city,
      profile.headline,
      profile.tone,
      profile.photo,
    ],
  );
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // follow the stored profile when it changes underneath us (saved here, another tab, or a demo reset)
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setForm(initial);
  }
  const dirtyKeys = (Object.keys(form) as (keyof typeof form)[]).filter(
    (k) => form[k] !== initial[k],
  );
  const dirty = dirtyKeys.length > 0;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  // phones: once the inline Save scrolls away while there are edits, a sticky bar carries it (S-03)
  const saveRef = useRef<HTMLButtonElement>(null);
  const saveOut = useOutOfView(saveRef);
  const discard = () => (setForm(initial), setErrors({}));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  // seed tones outside the eight swatches (e.g. mint) still show as the selected first option
  const tones = TONES.some((t) => t.tone === initial.tone)
    ? TONES
    : [{ tone: initial.tone, label: "Current colour" }, ...TONES];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2)
      next.name = "Tell us your name (at least 2 letters).";
    if (!EMAIL_RE.test(form.email.trim()))
      next.email = "That email doesn't look right.";
    if (form.phone.trim() && !/^\+?[\d\s-]{10,16}$/.test(form.phone.trim()))
      next.phone = "Use 10 digits, optionally with +91.";
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(
        Object.keys(next).length === 1
          ? "One field needs a look"
          : "A couple of fields need a look",
      );
      focusFirstInvalid(formRef.current);
      return;
    }
    setSaving(true);
    setTimeout(() => {
      try {
        demo.updateProfile(profile.uid, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          headline: form.headline,
          tone: form.tone,
          avatar: form.photo,
        });
        toast.success("Profile saved", {
          description:
            "Your name and photo now show everywhere, certificates included.",
        });
      } catch (err) {
        const msg = (err as Error).message || "Couldn't save that. Try again?";
        if (/email/i.test(msg)) setErrors({ email: msg });
        else if (/name/i.test(msg)) setErrors({ name: msg });
        else if (/photo|image/i.test(msg)) setErrors({ photo: msg });
        else toast.error("Couldn't save your profile", { description: msg });
        focusFirstInvalid(formRef.current);
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  return (
    <Card
      as="section"
      aria-labelledby="profile"
      className="scroll-mt-24 max-sm:scroll-mt-32"
    >
      <CardHeader
        id="profile"
        title="Profile"
        description="How you show up on certificates, Q&A and reviews."
      />
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="flex flex-col gap-5 rounded-card bg-cream p-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-center">
            {form.photo ? (
              <span className="relative block size-[72px] overflow-hidden rounded-full bg-white shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview, nothing to optimise */}
                <img
                  src={form.photo}
                  alt={`${form.name || "Your"} profile photo`}
                  className="size-full object-cover"
                />
              </span>
            ) : (
              <Avatar name={form.name || "?"} tone={form.tone} size="xl" />
            )}
            <PhotoPicker
              hasPhoto={!!form.photo}
              onPick={(url) => set("photo", url)}
              onRemove={() => set("photo", "")}
            />
            {errors.photo && (
              <p
                role="alert"
                className="flex max-w-[200px] items-start gap-1 text-[13px] leading-snug font-semibold text-[#c13500]"
              >
                <Icon
                  name="alert"
                  className="mt-px size-3.5 shrink-0"
                  strokeWidth={2.4}
                />
                {errors.photo}
              </p>
            )}
          </div>
          <fieldset className="min-w-0" disabled={!!form.photo}>
            <legend className="text-[14px] font-bold">Avatar colour</legend>
            <p className="mt-0.5 text-[13px] text-ink/70">
              {form.photo
                ? "Using your photo. Remove it to go back to initials on a colour."
                : "Your initials sit on this colour, or upload a photo instead."}
            </p>
            <div
              className={clsx(
                "mt-3 flex flex-wrap gap-2 coarse:gap-x-3 coarse:gap-y-2.5",
                form.photo && "opacity-40",
              )}
            >
              {tones.map((t) => (
                <label
                  key={t.tone}
                  className="hit relative cursor-pointer"
                  title={t.label}
                >
                  <input
                    type="radio"
                    name="avatar-tone"
                    value={t.tone}
                    checked={form.tone === t.tone}
                    onChange={() => set("tone", t.tone)}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{t.label}</span>
                  <span
                    aria-hidden
                    className={clsx(
                      "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-cream transition-shadow peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-blue",
                      toneBg[t.tone],
                    )}
                  >
                    {form.tone === t.tone && (
                      <Icon
                        name="check"
                        className={clsx(
                          "size-4",
                          DARK_TONES.has(t.tone) ? "text-white" : "text-ink",
                        )}
                        strokeWidth={3}
                      />
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* two columns only when the column is wide enough (the side nav takes room from lg to xl) */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field
            label="Full name"
            required
            error={errors.name}
            hint="This is the name printed on your certificates."
          >
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              maxLength={60}
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              icon="mail"
            />
          </Field>
          <Field
            label="Phone"
            optional
            error={errors.phone}
            hint="Only used for WhatsApp reminders, if you switch them on."
          >
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              placeholder="+91 98xxx xxxxx"
            />
          </Field>
          <Field label="City" optional>
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              autoComplete="address-level2"
              placeholder="Kochi"
            />
          </Field>
          <Field
            label="What are you learning for?"
            optional
            className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
            hint="Shown next to your questions in lesson Q&A."
          >
            <Textarea
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              maxLength={120}
              showCount
              rows={2}
              placeholder="Switching careers into web development"
            />
          </Field>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {dirty && (
            <span className="mr-auto text-[13px] font-semibold text-ink/70 max-sm:w-full">
              Unsaved changes
            </span>
          )}
          <Button
            variant="ghost"
            disabled={!dirty || saving}
            onClick={discard}
            className="max-sm:flex-1"
          >
            Discard
          </Button>
          <Button
            ref={saveRef}
            type="submit"
            variant="primary"
            disabled={!dirty}
            loading={saving}
            className="max-sm:h-12 max-sm:flex-[2]"
          >
            Save profile
          </Button>
        </div>
      </form>
      <StickyActionBar
        show={dirty && saveOut}
        label="Unsaved profile changes"
        title="Unsaved changes"
        sub={`Profile · ${dirtyKeys.length === 1 ? "1 field" : `${dirtyKeys.length} fields`} edited`}
      >
        <Button variant="ghost" onClick={discard} disabled={saving}>
          Discard
        </Button>
        <Button
          variant="primary"
          className="h-12"
          loading={saving}
          onClick={() => formRef.current?.requestSubmit()}
        >
          Save
        </Button>
      </StickyActionBar>
    </Card>
  );
}

/** Pick an image, centre-crop and shrink it to a 256px JPEG data URL (stays in this browser). */
function PhotoPicker({
  hasPhoto,
  onPick,
  onRemove,
}: {
  hasPhoto: boolean;
  onPick: (dataUrl: string) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      toast.error("That file isn't a photo", {
        description: "Use a JPG, PNG or WebP image.",
      });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That photo is a bit big", {
        description: "Pick one under 8 MB.",
      });
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const S = 256;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = S;
      canvas.height = S;
      const g = canvas.getContext("2d");
      if (g) {
        g.imageSmoothingQuality = "high";
        g.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          S,
          S,
        );
        onPick(canvas.toDataURL("image/jpeg", 0.85));
      }
      URL.revokeObjectURL(url);
      setBusy(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setBusy(false);
      toast.error("Couldn't read that photo", {
        description: "Try a different image.",
      });
    };
    img.src = url;
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon="upload"
        loading={busy}
        onClick={() => input.current?.click()}
        className="shadow-none!"
      >
        {hasPhoto ? "Change" : "Upload photo"}
      </Button>
      {hasPhoto && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          iconOnly
          icon="trash"
          aria-label="Remove photo"
          onClick={onRemove}
          className="text-ink/65"
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- password */
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: "Too short", tone: "bg-flame" },
  { label: "Weak", tone: "bg-flame" },
  { label: "Okay", tone: "bg-tangerine" },
  { label: "Good", tone: "bg-green" },
  { label: "Strong", tone: "bg-green" },
];

function PasswordSection({ barAllowed = true }: { barAllowed?: boolean }) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{
    cur?: string;
    pw?: string;
    confirm?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const submitOut = useOutOfView(submitRef);
  const s = strength(pw);
  // one level drives both the bars and the label: anything under 8 characters is "Too short" (one red bar)
  const level = pw.length < 8 ? 0 : s;
  // after the first submit, every edit re-checks the form, so errors clear as soon as they're fixed
  const [submitted, setSubmitted] = useState(false);

  const validate = (v: { cur: string; pw: string; confirm: string }) => {
    const next: typeof errors = {};
    if (!v.cur) next.cur = "Enter your current password.";
    if (v.pw.length < 8) next.pw = "Use at least 8 characters.";
    else if (strength(v.pw) < 2)
      next.pw = "Mix in capitals, numbers or symbols.";
    else if (v.pw === v.cur)
      next.pw = "Pick something different from your current password.";
    if (v.confirm !== v.pw) next.confirm = "The two passwords don't match.";
    return next;
  };
  const edit = (field: "cur" | "pw" | "confirm", value: string) => {
    const v = { cur, pw, confirm, [field]: value };
    if (field === "cur") setCur(value);
    else if (field === "pw") setPw(value);
    else setConfirm(value);
    if (submitted) setErrors(validate(v));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate({ cur, pw, confirm });
    setSubmitted(true);
    setErrors(next);
    if (Object.keys(next).length) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setCur("");
      setPw("");
      setConfirm("");
      setSubmitted(false);
      setErrors({});
      toast.success("Password updated", {
        description: "Demo only: nothing was stored or sent anywhere.",
      });
    }, 600);
  };

  const eye = (
    <button
      type="button"
      onClick={() => setShow((v) => !v)}
      className="hit grid size-8 place-items-center rounded-full text-ink/70 hf:bg-ink/[0.06]"
      aria-label={show ? "Hide passwords" : "Show passwords"}
      aria-pressed={show}
    >
      <Icon name={show ? "eye-off" : "eye"} className="size-[18px]" />
    </button>
  );

  return (
    <Card
      as="section"
      aria-labelledby="password"
      className="scroll-mt-24 max-sm:scroll-mt-32"
    >
      <CardHeader
        id="password"
        title="Password"
        description="Use something long that you don't use anywhere else."
        action={<Badge tone="butter">Demo</Badge>}
      />
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
      >
        <Field
          label="Current password"
          required
          error={errors.cur}
          className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)] lg:col-span-1 lg:max-w-none xl:col-span-2 xl:max-w-[calc(50%-0.5rem)]"
        >
          <Input
            type={show ? "text" : "password"}
            value={cur}
            onChange={(e) => edit("cur", e.target.value)}
            autoComplete="current-password"
            suffix={eye}
          />
        </Field>
        <Field label="New password" required error={errors.pw}>
          <Input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => edit("pw", e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password" required error={errors.confirm}>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => edit("confirm", e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <div
          className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          aria-live="polite"
        >
          {pw && (
            <div className="flex items-center gap-3">
              <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={clsx(
                      "h-1.5 rounded-full transition-colors",
                      i < Math.max(1, level)
                        ? STRENGTH[level].tone
                        : "bg-ink/[0.08]",
                    )}
                  />
                ))}
              </div>
              <span className="w-20 text-right text-[13px] font-bold">
                {STRENGTH[level].label}
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-end sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <Button
            ref={submitRef}
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!cur && !pw && !confirm}
            className="max-sm:h-12 max-sm:w-full"
          >
            Update password
          </Button>
        </div>
      </form>
      <StickyActionBar
        show={barAllowed && !!(cur || pw || confirm) && submitOut}
        label="Password change"
        title="New password"
        sub={pw ? STRENGTH[level].label : "Fill in all three fields"}
      >
        <Button
          variant="primary"
          className="h-12"
          loading={busy}
          onClick={() => formRef.current?.requestSubmit()}
        >
          Update
        </Button>
      </StickyActionBar>
    </Card>
  );
}

/* ----------------------------------------------------------------------------- notifications */
const NOTIFS: {
  key: NotifKey;
  label: string;
  description: string;
  group: "Email" | "WhatsApp";
}[] = [
  {
    key: "newLessons",
    label: "New lessons in my courses",
    description: "When a tutor adds or updates a lesson you own.",
    group: "Email",
  },
  {
    key: "qaReplies",
    label: "Replies to my questions",
    description: "Tutor answers and replies in lesson Q&A.",
    group: "Email",
  },
  {
    key: "quizReminders",
    label: "Checkpoint reminders",
    description:
      "A nudge when a quiz is the only thing between you and the next module.",
    group: "Email",
  },
  {
    key: "weeklyDigest",
    label: "Sunday progress digest",
    description:
      "Minutes learned, streak and what's up next. One email a week.",
    group: "Email",
  },
  {
    key: "offers",
    label: "Offers and new courses",
    description: "Festive codes and launches. Maybe twice a month.",
    group: "Email",
  },
  {
    key: "whatsapp",
    label: "Daily study reminder",
    description: "A short WhatsApp message at your reminder time.",
    group: "WhatsApp",
  },
];

function NotificationsSection() {
  const profile = useStudentProfile();
  const { prefs, save } = useStudentPrefs(profile.uid);
  const [status, setStatus] = useState("");
  const toggle = (k: NotifKey, v: boolean) => {
    if (k === "whatsapp" && v && !profile.phone) {
      toast.error("Add a phone number first", {
        description: "Pop it into your profile above, then switch this on.",
      });
      return;
    }
    save({ notifications: { ...prefs.notifications, [k]: v } });
    setStatus(
      `${NOTIFS.find((n) => n.key === k)?.label} ${v ? "on" : "off"}. Saved.`,
    );
  };
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <Card
      as="section"
      aria-label="Notification settings"
      className="scroll-mt-24 max-sm:scroll-mt-32"
    >
      <CardHeader
        id="notifications"
        title="Notifications"
        description="We'd rather you learn than read emails. Pick what's worth it."
        action={
          <span
            role="status"
            aria-live="polite"
            className={clsx(
              "text-[13px] font-bold text-[#00813a] transition-opacity",
              status ? "opacity-100" : "opacity-0",
            )}
          >
            {status && (
              <>
                <Icon
                  name="check"
                  className="mr-1 inline size-3.5 align-[-2px]"
                  strokeWidth={3}
                />
                Saved
              </>
            )}
          </span>
        }
      />
      {(["Email", "WhatsApp"] as const).map((g) => (
        <fieldset key={g} className="mt-2 first-of-type:mt-0">
          <legend className="mb-1 text-[12px] font-bold tracking-[0.06em] text-ink/70 uppercase">
            {g}
          </legend>
          <div className="divide-y divide-ink/[0.07]">
            {NOTIFS.filter((n) => n.group === g).map((n) => (
              <Switch
                key={n.key}
                className="py-3.5"
                label={n.label}
                description={n.description}
                checked={prefs.notifications[n.key]}
                onChange={(v) => toggle(n.key, v)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </Card>
  );
}

/* ----------------------------------------------------------------------------- goals */
/** Segmented control that fills its column and shares the width evenly (never scrolls or clips). */
const SEGMENT_FILL =
  "flex! w-full max-w-[420px] bg-cream! shadow-none! [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-2";
function GoalSection() {
  const db = useDb();
  const profile = useStudentProfile();
  const { prefs, save } = useStudentPrefs(profile.uid);
  const week = useMemo(
    () => dailyMinutes(profile.uid, db, 7).reduce((s, d) => s + d.value, 0),
    [profile.uid, db],
  );
  const weekly = prefs.dailyGoal * prefs.goalDays;
  const done = () =>
    toast.success("Goal updated", {
      description: "Your dashboard ring uses the new target.",
    });

  return (
    <Card
      as="section"
      aria-labelledby="goals"
      className="scroll-mt-24 max-sm:scroll-mt-32"
    >
      <CardHeader
        id="goals"
        title="Learning goal"
        description="Small and steady beats heroic and rare."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-[14px] font-bold">Minutes per learning day</p>
          <Segmented
            label="Minutes per learning day"
            className={SEGMENT_FILL}
            value={String(prefs.dailyGoal)}
            onChange={(v) => (save({ dailyGoal: Number(v) }), done())}
            options={["10", "15", "30", "60"].map((v) => ({
              value: v,
              label: `${v} min`,
            }))}
          />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-[14px] font-bold">Days a week</p>
          <Segmented
            label="Learning days per week"
            className={SEGMENT_FILL}
            value={String(prefs.goalDays)}
            onChange={(v) => (save({ goalDays: Number(v) }), done())}
            options={[
              { value: "3", label: "3 days" },
              { value: "5", label: "5 days" },
              { value: "7", label: "Every day" },
            ]}
          />
        </div>
        <Field
          label="Reminder time"
          hint="Used for the WhatsApp reminder and the in-app nudge."
        >
          <Select
            value={prefs.reminderTime}
            onChange={(e) => (save({ reminderTime: e.target.value }), done())}
            options={[
              { value: "07:00", label: "7:00 am · before work" },
              { value: "13:00", label: "1:00 pm · lunch break" },
              { value: "18:30", label: "6:30 pm · on the commute" },
              { value: "20:30", label: "8:30 pm · after dinner" },
              { value: "22:00", label: "10:00 pm · night owl" },
            ]}
          />
        </Field>
        <Field
          label="Preferred lesson language"
          hint="We'll show courses in this language first."
        >
          <Select
            value={prefs.language}
            onChange={(e) => (save({ language: e.target.value }), done())}
            options={[
              "English",
              "Hindi",
              "Hinglish",
              "Malayalam",
              "Tamil",
              "Telugu",
              "Kannada",
              "Bengali",
              "Marathi",
            ].map((l) => ({ value: l, label: l }))}
          />
        </Field>
      </div>
      <p className="mt-5 rounded-card bg-butter p-4 text-[14.5px] font-semibold">
        That&apos;s <strong>{weekly} minutes a week</strong>. You&apos;ve done{" "}
        {week} so far this week
        {week >= weekly ? ". Goal smashed!" : `, ${weekly - week} to go.`}
      </p>
    </Card>
  );
}

/* ----------------------------------------------------------------------------- danger zone */
function DangerSection() {
  const db = useDb();
  const profile = useStudentProfile();
  const { reset: resetPrefs, prefs } = useStudentPrefs(profile.uid);
  const { logout } = useDemoAuth();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleted, setDeleted] = useState(false);
  const closeDelete = () => {
    setDeleteOpen(false);
    setTyped("");
    setDeleted(false);
  };

  const exportData = () => {
    const uid = profile.uid;
    const data = {
      generatedAt: new Date().toISOString(),
      note: "Sample export from the Tamada Media demo. All data is fictional.",
      profile: {
        name: profile.name,
        email: profile.email,
        city: profile.city,
        phone: profile.phone,
        headline: profile.headline,
        joinedAt: profile.joinedAt,
      },
      preferences: prefs,
      enrollments: getMyCourses(uid, db).map((e) => ({
        course: e.course.title,
        enrolledAt: e.enrollment.createdAt,
        source: e.enrollment.source,
        progress: `${e.progress.percent}%`,
      })),
      orders: getOrders({ userId: uid, pageSize: 500 }, db).items.map((o) => ({
        number: o.number,
        course: o.course?.title,
        amount: o.amount,
        status: o.status,
        date: o.createdAt,
      })),
      certificates: getCertificates(uid, db).map((c) => ({
        code: c.code,
        course: c.course?.title,
        issuedAt: c.issuedAt,
      })),
      wishlist: getWishlist(uid, db).map((w) => w.course.title),
      notes: getNotes(uid, undefined, db).map((n) => ({
        courseId: n.courseId,
        itemId: n.itemId,
        atSec: n.atSec,
        text: n.text,
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamada-media-my-data-${formatDate(new Date().toISOString(), "numeric").replace(/\//g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Your data is downloading", {
      description: "A JSON file with your courses, orders and notes.",
    });
  };

  return (
    <Card
      as="section"
      aria-labelledby="danger"
      className="scroll-mt-24 ring-2 ring-[#ffe1d4] max-sm:scroll-mt-32"
    >
      <CardHeader
        id="danger"
        title="Danger zone"
        description="Careful with these. In the demo, nothing touches a real account."
      />
      <ul className="divide-y divide-ink/[0.07]">
        <li className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Download my data</p>
            <p className="t-small text-ink/70">
              Courses, orders, certificates and notes as a JSON file.
            </p>
          </div>
          <Button
            variant="secondary"
            icon="download"
            onClick={exportData}
            className="bg-cream! shadow-none! max-sm:h-12 max-sm:w-full hf:bg-butter!"
          >
            Download
          </Button>
        </li>
        <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Reset demo data</p>
            <p className="t-small text-ink/70">
              Undo every purchase, lesson and setting you changed in this
              browser.
            </p>
          </div>
          <Button
            variant="secondary"
            icon="refresh"
            onClick={() => setResetOpen(true)}
            className="bg-cream! shadow-none! max-sm:h-12 max-sm:w-full hf:bg-butter!"
          >
            Reset
          </Button>
        </li>
        <li className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-[#b02f00]">Delete my account</p>
            <p className="t-small text-ink/70">
              Removes your progress, certificates and order history for good.
            </p>
          </div>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => setDeleteOpen(true)}
            className="max-sm:h-12 max-sm:w-full"
          >
            Delete account
          </Button>
        </li>
      </ul>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          demo.reset();
          resetPrefs();
          toast.success("Demo data reset", {
            description: "Everything is back to the starting sample data.",
          });
        }}
        title="Reset all demo data?"
        description="Purchases, progress, wishlist changes and settings made in this browser go back to the original sample data."
        confirmLabel="Reset demo data"
        tone="danger"
      />

      <Modal
        open={deleteOpen}
        onClose={closeDelete}
        size="sm"
        title={
          deleted ? "Demo account: nothing was deleted" : "Delete your account?"
        }
        description={
          deleted
            ? "This is sample data, so your progress is safe. We'll log you out instead, and you can pick a demo role to come back."
            : "In a real account this can't be undone: courses, certificates and receipts would be gone."
        }
        footer={
          deleted ? (
            <>
              <Button variant="secondary" onClick={closeDelete}>
                Stay logged in
              </Button>
              <Button
                variant="primary"
                icon="logout"
                onClick={() => logout({ redirectTo: "/" })}
                data-autofocus=""
              >
                Log me out
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={closeDelete}>
                Keep my account
              </Button>
              <Button
                variant="danger"
                disabled={typed.trim().toUpperCase() !== "DELETE"}
                onClick={() => setDeleted(true)}
              >
                Delete forever
              </Button>
            </>
          )
        }
      >
        {deleted ? (
          <div className="flex items-center gap-4 rounded-card bg-cream p-4">
            <Mascot
              title=""
              className="w-12 shrink-0"
              style={{ transform: "rotate(-8deg)" }}
            />
            <p className="t-small text-ink/80">
              Phew. In the real app this would wipe everything, so we ask twice.
              Here it just signs you out.
            </p>
          </div>
        ) : (
          <Field label='Type "DELETE" to confirm'>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="DELETE"
            />
          </Field>
        )}
      </Modal>
    </Card>
  );
}
