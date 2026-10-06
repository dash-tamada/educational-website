"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Icon,
  Input,
  PageHeader,
  RadioGroup,
  Segmented,
  Select,
  Skeleton,
  StickyActionBar,
  Switch,
  Textarea,
  toast,
  UnsavedChangesGuard,
  useIsClient,
} from "@/components/app";
import { focusFirstInvalid } from "./shared";

/* =============================================================================
   Platform settings (demo). Saved in this browser only (localStorage): there is
   no backend yet, and nothing here changes how other pages behave.
   ============================================================================= */

const KEY = "tm-admin-settings";

type Provider = "manual" | "razorpay" | "stripe";
type BannerTone = "info" | "warning" | "party";
interface Settings {
  siteName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  language: string;
  provider: Provider;
  gstRate: number;
  revenueShare: number;
  refundDays: number;
  freeFirstVideo: boolean;
  extraPreviews: boolean;
  certificates: boolean;
  gatingQuizzes: boolean;
  holdLinkReviews: boolean;
  reviewBeforePublish: boolean;
  bannerOn: boolean;
  bannerText: string;
  bannerTone: BannerTone;
}

const DEFAULTS: Settings = {
  siteName: "Tamada Media",
  tagline: "Short videos, tiny tests, real progress.",
  supportEmail: "hello@tamadamedia.com",
  supportPhone: "+91 98765 43210",
  language: "English",
  provider: "manual",
  gstRate: 18,
  revenueShare: 70,
  refundDays: 7,
  freeFirstVideo: true,
  extraPreviews: true,
  certificates: true,
  gatingQuizzes: true,
  holdLinkReviews: true,
  reviewBeforePublish: true,
  bannerOn: false,
  bannerText:
    "Heads up: we're doing a quick upgrade on Sunday, 11 Oct, 2–3 am IST. Videos may pause for a few minutes.",
  bannerTone: "info",
};

/** Number fields stay strings while typing (clearing one doesn't snap it to "0",
 *  and typing 5 doesn't show "05"); they become numbers on save. */
type NumKey = "gstRate" | "revenueShare" | "refundDays";
const NUM_KEYS: NumKey[] = ["gstRate", "revenueShare", "refundDays"];
type Form = Omit<Settings, NumKey> & Record<NumKey, string>;
const toForm = (x: Settings): Form => ({
  ...x,
  gstRate: String(x.gstRate),
  revenueShare: String(x.revenueShare),
  refundDays: String(x.refundDays),
});
const fromForm = (f: Form): Settings => ({
  ...f,
  gstRate: Number(f.gstRate),
  revenueShare: Number(f.revenueShare),
  refundDays: Number(f.refundDays),
});

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw
      ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
      : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function SettingsView() {
  const client = useIsClient();
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Settings"
        eyebrowTone="purple"
        title="House rules."
        description="Site details, payments, learning rules and the maintenance banner, all in one place."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Settings" },
        ]}
        meta={
          <Badge tone="butter" dot>
            Demo: saved in this browser only
          </Badge>
        }
      />
      {client ? (
        <SettingsForm />
      ) : (
        <div
          className="grid gap-6 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading settings"
        >
          <Skeleton className="h-[420px] xl:col-span-2" />
          <Skeleton className="h-[260px]" />
        </div>
      )}
    </div>
  );
}

function SettingsForm() {
  const [saved, setSaved] = useState<Settings>(load);
  const [s, setS] = useState<Form>(() => toForm(saved));
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>(
    {},
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  /** the "fields need a look" toast, dismissed once a save goes through */
  const errorToast = useRef<number | null>(null);
  const dirty = useMemo(
    () => JSON.stringify(s) !== JSON.stringify(toForm(saved)),
    [s, saved],
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    const errs: typeof errors = {};
    if (!s.siteName.trim()) errs.siteName = "The site needs a name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.supportEmail.trim()))
      errs.supportEmail = "That doesn't look like an email address.";
    if (
      s.supportPhone.trim() &&
      !/^\+?[\d\s-]{8,16}$/.test(s.supportPhone.trim())
    )
      errs.supportPhone = "Use digits, spaces or dashes, e.g. +91 98765 43210.";
    const n = fromForm(s);
    if (!(n.gstRate >= 0 && n.gstRate <= 28))
      errs.gstRate = "GST is between 0% and 28%.";
    if (!(n.revenueShare >= 50 && n.revenueShare <= 90))
      errs.revenueShare = "Keep the tutor share between 50% and 90%.";
    if (!(
      Number.isInteger(n.refundDays) &&
      n.refundDays >= 0 &&
      n.refundDays <= 30
    ))
      errs.refundDays = "0 to 30 days.";
    for (const k of NUM_KEYS) if (!s[k].trim()) errs[k] = "Required.";
    if (s.bannerOn && s.bannerText.trim().length < 10)
      errs.bannerText = "Write the banner message before switching it on.";
    setErrors(errs);
    if (errorToast.current != null) {
      toast.dismiss(errorToast.current);
      errorToast.current = null;
    }
    if (Object.keys(errs).length) {
      errorToast.current = toast.error(
        Object.keys(errs).length === 1
          ? "One field needs a look."
          : "A few fields need a look.",
        { description: "We took you to the first one. It’s marked in red." },
      );
      focusFirstInvalid(formRef.current);
      return;
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(n));
    } catch {
      /* private mode: keep it in memory */
    }
    setSaved(n);
    setS(toForm(n));
    toast.success("Settings saved.", {
      description:
        "Demo only: they live in this browser and don't change the rest of the site yet.",
    });
  };

  const bannerStyles: Record<BannerTone, string> = {
    info: "bg-blue text-white",
    warning: "bg-sun text-ink",
    // hotpink-deep: small white text needs the deeper pink for AA (5.1:1)
    party: "bg-hotpink-deep text-white",
  };

  return (
    <form
      id="settings-form"
      ref={formRef}
      onSubmit={save}
      noValidate
      className="sm:pb-24"
    >
      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 md:space-y-6 xl:col-span-2">
          <Card as="section" aria-labelledby="general-title">
            <CardHeader
              id="general-title"
              title="General"
              description="How Tamada introduces itself in emails, receipts and the footer."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site name" required error={errors.siteName}>
                <Input
                  value={s.siteName}
                  onChange={(e) => set("siteName", e.target.value)}
                  maxLength={40}
                />
              </Field>
              <Field
                label="Default language"
                hint="For emails and new course pages."
              >
                <Select
                  value={s.language}
                  onChange={(e) => set("language", e.target.value)}
                  options={[
                    "English",
                    "Hindi",
                    "Hinglish",
                    "Tamil",
                    "Telugu",
                    "Bengali",
                    "Marathi",
                  ].map((l) => ({ value: l, label: l }))}
                />
              </Field>
              <Field label="Tagline" optional className="sm:col-span-2">
                <Input
                  value={s.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field
                label="Support email"
                required
                error={errors.supportEmail}
                hint="Learners reply here from receipts."
              >
                <Input
                  type="email"
                  icon="mail"
                  value={s.supportEmail}
                  onChange={(e) => set("supportEmail", e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field label="Support phone" optional error={errors.supportPhone}>
                <Input
                  type="tel"
                  value={s.supportPhone}
                  onChange={(e) => set("supportPhone", e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Currency"
                hint="Every price is in Indian rupees for now."
              >
                <Input value="INR (₹)" disabled readOnly />
              </Field>
            </div>
          </Card>

          <Card as="section" aria-labelledby="pay-title">
            <CardHeader
              id="pay-title"
              title="Payments"
              description="How learners pay and how money is split."
            />
            <RadioGroup<Provider>
              label="Payment provider"
              name="provider"
              value={s.provider}
              onChange={(v) => set("provider", v)}
              variant="cards"
              orientation="horizontal"
              options={[
                {
                  value: "manual",
                  label: "Manual (demo)",
                  description:
                    "Mock checkout. Orders are marked paid instantly.",
                },
                {
                  value: "razorpay",
                  label: (
                    <span className="flex flex-col items-start gap-1">
                      Razorpay <Badge size="sm">Coming soon</Badge>
                    </span>
                  ),
                  description: "UPI, cards and netbanking.",
                  disabled: true,
                },
                {
                  value: "stripe",
                  label: (
                    <span className="flex flex-col items-start gap-1">
                      Stripe <Badge size="sm">Coming soon</Badge>
                    </span>
                  ),
                  description: "International cards.",
                  disabled: true,
                },
              ]}
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field
                label="GST rate"
                error={errors.gstRate}
                hint="Included in every price."
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={28}
                  value={s.gstRate}
                  onChange={(e) => set("gstRate", e.target.value)}
                  suffix={<span className="pr-2 font-bold text-ink/55">%</span>}
                />
              </Field>
              <Field
                label="Tutor share"
                error={errors.revenueShare}
                hint="Default for new tutors."
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={90}
                  value={s.revenueShare}
                  onChange={(e) => set("revenueShare", e.target.value)}
                  suffix={<span className="pr-2 font-bold text-ink/55">%</span>}
                />
              </Field>
              <Field
                label="Refund window"
                error={errors.refundDays}
                hint="Days after purchase."
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={s.refundDays}
                  onChange={(e) => set("refundDays", e.target.value)}
                  suffix={
                    <span className="pr-2 font-bold text-ink/55">days</span>
                  }
                />
              </Field>
            </div>
          </Card>

          <Card as="section" aria-labelledby="learn-title">
            <CardHeader
              id="learn-title"
              title="Learning rules"
              description="The promises we make to every learner."
            />
            <div className="divide-y divide-ink/[0.07]">
              <div className="pb-4">
                <Switch
                  label="The first video of every course is free"
                  description="Anyone can watch it without buying or signing up. This is the heart of the Tamada promise."
                  checked={s.freeFirstVideo}
                  onChange={(v) => set("freeFirstVideo", v)}
                />
                {!s.freeFirstVideo && (
                  <p
                    role="status"
                    className="app-fade mt-3 flex gap-2 rounded-tag bg-[#ffe1d4] p-3 text-[14px] font-semibold text-[#8a2600]"
                  >
                    <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                    Every course page loses its free preview. Expect fewer
                    people to try, and fewer to buy.
                  </p>
                )}
              </div>
              <Switch
                className="py-4"
                label="Tutors can open extra free previews"
                description="Up to 3 more videos per course, when it helps learners decide."
                checked={s.extraPreviews}
                onChange={(v) => set("extraPreviews", v)}
                disabled={!s.freeFirstVideo}
              />
              <Switch
                className="py-4"
                label="Gating tests"
                description="Tutors can lock later lessons until a test is passed."
                checked={s.gatingQuizzes}
                onChange={(v) => set("gatingQuizzes", v)}
              />
              <Switch
                className="py-4"
                label="Certificates on completion"
                description="Issued when every lesson and test is done. Verifiable at /certificates/[code]."
                checked={s.certificates}
                onChange={(v) => set("certificates", v)}
              />
              <div className="flex items-start justify-between gap-4 pt-4">
                <div>
                  <p className="text-[15px] font-semibold">
                    A video counts as watched at
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink/60">
                    Fixed for now, so progress means the same thing everywhere.
                  </p>
                </div>
                <Badge tone="neutral">90%</Badge>
              </div>
            </div>
          </Card>

          <Card as="section" aria-labelledby="mod-title">
            <CardHeader id="mod-title" title="Moderation" />
            <div className="divide-y divide-ink/[0.07]">
              <Switch
                className="pb-4"
                label="Review every course before it goes live"
                description="New and updated courses wait in the review queue."
                checked={s.reviewBeforePublish}
                onChange={(v) => set("reviewBeforePublish", v)}
              />
              <Switch
                className="pt-4"
                label="Hold reviews that contain links"
                description="They wait in Reports until an admin approves them."
                checked={s.holdLinkReviews}
                onChange={(v) => set("holdLinkReviews", v)}
              />
            </div>
          </Card>
        </div>

        <div className="grid min-w-0 content-start items-start gap-4 md:grid-cols-2 md:gap-6 xl:sticky xl:top-24 xl:grid-cols-1 xl:self-start">
          <Card as="section" aria-labelledby="banner-title">
            <CardHeader
              id="banner-title"
              title="Maintenance banner"
              description="A strip across the top of every page."
            />
            <Switch
              label="Show the banner"
              checked={s.bannerOn}
              onChange={(v) => set("bannerOn", v)}
            />
            <Field label="Message" className="mt-4" error={errors.bannerText}>
              <Textarea
                rows={3}
                value={s.bannerText}
                onChange={(e) => set("bannerText", e.target.value)}
                maxLength={160}
                showCount
              />
            </Field>
            <div className="mt-4">
              <p className="mb-1.5 text-[14px] font-bold">Style</p>
              <Segmented
                label="Banner style"
                size="sm"
                value={s.bannerTone}
                onChange={(v) => set("bannerTone", v)}
                options={[
                  { value: "info", label: "Info" },
                  { value: "warning", label: "Warning" },
                  { value: "party", label: "Celebrate" },
                ]}
              />
            </div>
            <p className="mt-5 mb-2 t-micro text-ink/55 uppercase">Preview</p>
            <div
              className={clsx(
                "flex items-start gap-2 rounded-tag px-3.5 py-2.5 text-[13.5px] leading-snug font-semibold transition-colors",
                bannerStyles[s.bannerTone],
              )}
            >
              <Icon
                name={
                  s.bannerTone === "party"
                    ? "sparkles"
                    : s.bannerTone === "warning"
                      ? "alert"
                      : "info"
                }
                className="mt-px size-4 shrink-0"
              />
              <span className="min-w-0 break-words">
                {s.bannerText.trim() || "Your message here."}
              </span>
            </div>
            <p className="mt-2 t-small text-ink/55">
              Preview only in this demo: the banner isn&apos;t wired to the
              site yet.{" "}
              {s.bannerOn
                ? "Once it is, every visitor sees it after you save."
                : "It’s switched off, so nobody would see it."}
            </p>
          </Card>

          <Card tone="purple">
            <p className="t-app-h3">Heads up</p>
            <p className="mt-1.5 t-small opacity-90">
              This is a demo control room. Settings are remembered in this
              browser so you can play, but the live site keeps its defaults
              until the backend arrives.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-4"
              icon="refresh"
              onClick={() => setConfirmReset(true)}
            >
              Reset to defaults
            </Button>
          </Card>
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        onDiscard={() => {
          setS(toForm(saved));
          setErrors({});
        }}
      />
      {/* phones: the shared sticky action bar (safe area, --bottom-ui, hides the dock,
          rides above the keyboard); the floating pill above is tablet/desktop only */}
      <StickyActionBar
        show={dirty}
        title="Unsaved changes"
        label="Unsaved settings"
      >
        <Button
          type="button"
          variant="ghost"
          className="h-12 px-3!"
          onClick={() => {
            setS(toForm(saved));
            setErrors({});
          }}
        >
          Discard
        </Button>
        <Button type="submit" form="settings-form" variant="primary" className="h-12 px-6!">
          Save
        </Button>
      </StickyActionBar>

      {/* covers links, top-bar search, notifications, the role switcher and reload */}
      <UnsavedChangesGuard
        when={dirty}
        description="Your changes to the settings haven't been saved. Leave now and they're gone."
        onLeave={() => setS(toForm(saved))}
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset every setting?"
        description="Back to the Tamada defaults. Your saved demo changes in this browser are cleared."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => {
          try {
            window.localStorage.removeItem(KEY);
          } catch {
            /* ignore */
          }
          setSaved(DEFAULTS);
          setS(toForm(DEFAULTS));
          setErrors({});
          toast("Settings reset to defaults.");
        }}
      />
    </form>
  );
}

/**
 * Sticky "unsaved changes" bar. Portalled to <body> so it is fixed to the
 * viewport whatever transforms its ancestors keep (the page's .app-enter
 * animation leaves one behind), and it lifts the toast stack above itself.
 * The Save button submits the settings form through its `form` attribute.
 */
function SaveBar({ dirty, onDiscard }: { dirty: boolean; onDiscard: () => void }) {
  // Line the bar up with the content column (<main>), whatever the sidebar does:
  // collapsing it changes main's box, and the ResizeObserver follows.
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const measure = () => {
      const r = main.getBoundingClientRect();
      setBox((b) =>
        b && b.left === r.left && b.width === r.width
          ? b
          : { left: r.left, width: r.width },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener("resize", measure);
    // the sidebar's padding transition ends with main in its new place
    const col = main.parentElement;
    col?.addEventListener("transitionend", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      col?.removeEventListener("transitionend", measure);
    };
  }, []);
  useEffect(() => {
    // phones use the StickyActionBar, which lifts toasts through --bottom-ui itself
    if (!dirty || window.matchMedia("(max-width: 639.98px)").matches) return;
    const root = document.documentElement;
    const prev = root.style.getPropertyValue("--toast-offset");
    root.style.setProperty("--toast-offset", "72px");
    return () => {
      if (prev) root.style.setProperty("--toast-offset", prev);
      else root.style.removeProperty("--toast-offset");
    };
  }, [dirty]);
  // SettingsForm (our only parent) renders on the client only, so document exists
  return createPortal(
    <div
      style={
        box
          ? ({ left: box.left, width: box.width, right: "auto" } as CSSProperties)
          : undefined
      }
      className={clsx(
        "fixed inset-x-0 bottom-3 z-30 px-3 transition-[opacity,translate] duration-200 ease-ui max-sm:hidden sm:bottom-5 sm:px-6 lg:px-8",
        dirty
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-hidden={!dirty}
      data-admin-savebar=""
    >
      <div
        role="region"
        aria-label="Unsaved settings"
        className="mx-auto flex max-w-[860px] items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-cream shadow-lift sm:gap-3"
      >
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold">
          <span className="sm:hidden">Unsaved</span>
          <span className="max-sm:hidden">You have unsaved changes</span>
        </span>
        <button
          type="button"
          onClick={onDiscard}
          tabIndex={dirty ? 0 : -1}
          className="tap h-9 rounded-full px-3.5 text-[14px] font-bold text-cream/80 transition-colors hf:bg-white/10 hf:text-cream"
        >
          Discard
        </button>
        <Button
          type="submit"
          form="settings-form"
          size="sm"
          variant="sun"
          icon="check"
          tabIndex={dirty ? 0 : -1}
        >
          Save changes
        </Button>
      </div>
    </div>,
    document.body,
  );
}
