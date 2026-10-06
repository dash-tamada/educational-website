"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  Badge,
  Button,
  Card,
  DemoPill,
  DescriptionList,
  EmptyState,
  Field,
  Icon,
  Input,
  Skeleton,
  isCoarse,
  toast,
} from "@/components/app";
import { Eyebrow } from "@/components/decor/Bits";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import {
  formatDate,
  getCertificateByCode,
  getCourseStats,
  formatDuration,
  getFirstFreeItem,
} from "@/lib/mock";
import { cropSrc } from "@/lib/img";
import { CERT_CODE_RE, normaliseCode } from "@/lib/mock/extra/auth";
import { CertificateSheet } from "./CertificateSheet";
import { CertificateViewer } from "./CertificateViewer";

const noopSubscribe = () => () => {};

/** Print just the certificate, on one A4 landscape page. */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #fff !important; }
  body:has(.cert-sheet) header, body:has(.cert-sheet) footer, body:has(.cert-sheet) .no-print { display: none !important; }
  /* toasts (e.g. "Link copied.") must never print on the certificate: the Toaster is a fixed aria-live div wrapping an <ol> */
  body:has(.cert-sheet) [data-toaster], body:has(.cert-sheet) [aria-live="polite"]:has(> ol), body:has(.cert-sheet) [aria-live]:has(> ol) { display: none !important; }
  body:has(.cert-sheet) main { padding: 0 !important; }
  .cert-print-wrap { padding: 0 !important; margin: 0 !important; max-width: none !important; }
  .cert-sheet { width: 297mm; height: 210mm; }
  .cert-sheet .cert-paper { box-shadow: none !important; border-radius: 0 !important; height: 210mm; aspect-ratio: auto !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export function CertificateLookup({
  initial = "",
  compact,
  label = "Check another certificate",
  size,
}: {
  initial?: string;
  compact?: boolean;
  label?: string;
  size?: "lg";
}) {
  const router = useTransitionRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normaliseCode(value);
    if (!CERT_CODE_RE.test(code)) {
      setError(
        value.trim()
          ? "Codes look like TM-7QK4-M2XD (printed top right of the certificate)."
          : "Enter a certificate code, like TM-7QK4-M2XD.",
      );
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    router.push(`/certificates/${code}`);
  };
  return (
    <form
      onSubmit={submit}
      noValidate
      className={
        compact ? "" : "rounded-card-lg bg-white p-5 shadow-soft md:p-6"
      }
    >
      <Field
        label={label}
        error={error}
        hint={
          error
            ? undefined
            : "Enter the code from the certificate. Dashes are optional."
        }
      >
        <Input
          ref={inputRef}
          icon="search"
          placeholder="TM-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(undefined);
          }}
          inputSize={size}
          suffix={
            <Button
              type="submit"
              size="sm"
              variant={size === "lg" ? "accent" : "primary"}
              className={size === "lg" ? "mr-1" : undefined}
            >
              Verify
            </Button>
          }
          className={
            size === "lg"
              ? "[&_input]:pr-28 [&_input]:font-mono [&_input]:uppercase"
              : "[&_input]:pr-24 [&_input]:font-mono [&_input]:uppercase"
          }
        />
      </Field>
    </form>
  );
}

export function CertificateView({ code }: { code: string }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const hit = getCertificateByCode(code, db);
  const display = normaliseCode(code);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );

  if (!hit && !hydrated)
    return (
      <div
        aria-busy="true"
        aria-label="Checking certificate"
        className="grid gap-6"
      >
        <Skeleton className="h-24 rounded-card-lg" />
        <Skeleton className="aspect-[1.414/1] w-full rounded-card-lg" />
      </div>
    );

  if (!hit)
    return (
      <div className="app-enter grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <Card padding="lg" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="flame" dot>
              Not verified
            </Badge>
            <span className="font-mono text-[14px] font-bold break-all text-ink/70">
              {display}
            </span>
          </div>
          <EmptyState
            as="h2"
            art="tami"
            tone="blush"
            title="We couldn't find that certificate."
            body="No Tamada Media certificate has this code. It might have a typo, or it may not be one of ours."
            className="!px-0 !pb-4"
          />
          <ul className="mx-auto grid max-w-[30rem] gap-2.5 text-[15px] text-ink/75">
            <li className="flex gap-2.5">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue" />{" "}
              Codes use letters and numbers, never 0, O, 1 or I. Check those
              first.
            </li>
            <li className="flex gap-2.5">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue" />{" "}
              Ask the learner for their certificate link: it opens this page
              with the code filled in.
            </li>
            <li className="flex gap-2.5">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue" />{" "}
              Still unsure? Our team can confirm it by email.
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              href={`/contact?topic=certificate&ref=${encodeURIComponent(display)}#message`}
              variant="secondary"
              icon="mail"
            >
              Ask us to check
            </Button>
            <Button href="/courses" variant="ghost" iconRight="arrow-right">
              Browse courses
            </Button>
          </div>
        </Card>
        <div className="grid gap-4">
          <CertificateLookup initial={display} />
          <Card tone="butter" padding="md">
            <p className="t-app-h3">Try a real one</p>
            <p className="mt-1 t-small text-ink/70">
              Sample certificates from the demo data:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["TM-7QK4-M2XD", "TM-3HNP-8RVA"].map((c) => (
                <Link
                  key={c}
                  href={`/certificates/${c}`}
                  className="tap inline-flex items-center rounded-full bg-white px-3 py-2 font-mono text-[13px] font-bold shadow-soft coarse:min-h-11 coarse:px-4 hf:bg-ink hf:text-cream"
                >
                  {c}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );

  const { certificate, course, user, tutor } = hit;
  const mine = session?.userId === user.id;
  const stats = getCourseStats(course.id, db);
  const freeItem = getFirstFreeItem(course.id, db);
  const shareUrl = `${origin}/certificates/${certificate.code}`;
  const tutorName = tutor?.name ?? "the Tamada team";
  const sheetData = {
    code: certificate.code,
    learner: user.name,
    course: course.title,
    tutor: tutorName,
    issuedAt: certificate.issuedAt,
    hours: certificate.hours,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied.", {
        description: "Anyone with it can verify this certificate.",
      });
    } catch {
      toast.error("Couldn't copy the link.", { description: shareUrl });
    }
  };
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  /** Touch screens with a share sheet (WhatsApp, LinkedIn, Mail…) use it; everyone else gets LinkedIn. */
  const share = async (e: React.MouseEvent) => {
    if (typeof navigator === "undefined" || !navigator.share || !isCoarse())
      return;
    e.preventDefault();
    try {
      await navigator.share({
        title: `${user.name}: ${course.title} certificate`,
        text: `Verified Tamada Media certificate ${certificate.code}`,
        url: shareUrl,
      });
    } catch {
      // dismissed share sheet: nothing to do
    }
  };
  /** Download / Copy / Share: one 44px row of three on phones, labelled buttons from 640px. */
  const actions = (onPrint: () => void, inSheet = false) => (
    <>
      <Button
        variant="accent"
        icon="download"
        onClick={onPrint}
        className={inSheet ? "min-w-0 flex-1 px-2" : "max-sm:px-2"}
      >
        {/* one span: the button's flex gap must not split "Download" from "PDF" */}
        <span>
          <span className={inSheet ? "hidden" : "max-sm:hidden"}>Download </span>
          PDF
        </span>
      </Button>
      <Button
        variant="secondary"
        icon="copy"
        onClick={copy}
        className={inSheet ? "min-w-0 flex-1 px-2" : "max-sm:px-2"}
      >
        <span>
          Copy
          <span className={inSheet ? "hidden" : "max-sm:hidden"}> link</span>
        </span>
      </Button>
      <Button
        variant="secondary"
        icon="share"
        href={linkedIn}
        onClick={share}
        className={inSheet ? "min-w-0 flex-1 px-2" : "max-sm:px-2"}
      >
        <span>
          Share
          <span className={inSheet ? "hidden" : "max-sm:hidden"}>
            {" "}
            on LinkedIn
          </span>
        </span>
      </Button>
    </>
  );

  return (
    <div className="app-enter">
      <style>{PRINT_CSS}</style>

      {/* verified banner */}
      <div
        className="no-print flex flex-col gap-4 rounded-card-lg bg-mint p-5 md:flex-row md:items-center md:justify-between md:p-6"
        role="status"
      >
        <div className="flex items-start gap-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full bg-green text-white"
            aria-hidden
          >
            <Icon name="check" className="size-6" strokeWidth={3} />
          </span>
          <div>
            <p className="t-app-h2">Verified. This certificate is genuine.</p>
            <p className="mt-1 t-small text-ink/75">
              Issued to <strong className="font-bold">{user.name}</strong> on{" "}
              {formatDate(certificate.issuedAt, "long")} for completing{" "}
              {course.title}.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {mine && <Badge tone="white">This one&apos;s yours</Badge>}
          <DemoPill className="bg-white!" />
        </div>
      </div>

      {/* actions */}
      <div className="no-print mt-5 flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-3">
        {actions(() => window.print())}
        {mine && (
          <Button
            variant="ghost"
            href="/dashboard/certificates"
            iconRight="arrow-right"
            className="max-sm:col-span-3"
          >
            All my certificates
          </Button>
        )}
      </div>

      <div className="cert-print-wrap mt-6">
        <CertificateViewer
          data={sheetData}
          footer={(close) =>
            actions(() => {
              // print the page, not the viewer: close it first
              close();
              window.setTimeout(() => window.print(), 320);
            }, true)
          }
        >
          <CertificateSheet data={sheetData} />
        </CertificateViewer>
      </div>
      <p className="no-print mt-3 text-center text-[13px] text-ink/70 max-sm:hidden">
        Tip: “Download PDF” opens your print dialog. Choose “Save as PDF” and
        landscape.
      </p>

      {/* details */}
      <div className="no-print mt-10 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <Card>
          <h2 className="t-app-h2">Certificate details</h2>
          <DescriptionList
            className="mt-4"
            items={[
              { label: "Learner", value: user.name },
              {
                label: "Course",
                value: (
                  <Link
                    href={`/courses/${course.slug}`}
                    className="text-blue-deep underline-offset-2 hf:underline"
                  >
                    {course.title}
                  </Link>
                ),
              },
              {
                label: "Tutor",
                value: tutor ? (
                  <Link
                    href={`/tutors/${tutor.slug}`}
                    className="text-blue-deep underline-offset-2 hf:underline"
                  >
                    {tutor.name}
                  </Link>
                ) : (
                  tutorName
                ),
              },
              {
                label: "Issued",
                value: formatDate(certificate.issuedAt, "long"),
              },
              {
                label: "Course length",
                value: `${certificate.hours} hours · ${stats.videos} videos · ${stats.quizzes} tests`,
              },
              {
                label: "Code",
                value: <span className="font-mono">{certificate.code}</span>,
              },
            ]}
          />
          <p className="mt-5 rounded-tag bg-cream px-4 py-3 t-small text-ink/70">
            Certificates are issued automatically when a learner watches every
            lesson and passes every required test. Tamada Media doesn&apos;t
            sell or hand-issue them.
          </p>
        </Card>
        <div className="grid content-start gap-4">
          <Card padding="none" className="overflow-hidden">
            <div className="relative aspect-[16/9]">
              <Image
                src={cropSrc(course.thumbnail, 9 / 16)}
                alt=""
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <p className="t-micro text-ink/65 uppercase">
                The course behind it
              </p>
              <p className="mt-1 t-app-h2">{course.title}</p>
              <p className="mt-1.5 t-small text-ink/65">{course.promise}</p>
              <p className="mt-3 t-small font-semibold text-ink/70">
                {stats.modules} modules ·{" "}
                {formatDuration(stats.totalSec, "short")} · by {tutorName}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {freeItem && (
                  <Button
                    href={`/learn/${course.slug}/${freeItem.id}`}
                    variant="accent"
                    icon="play"
                    size="sm"
                  >
                    Watch the first video free
                  </Button>
                )}
                <Button
                  href={`/courses/${course.slug}`}
                  variant="secondary"
                  size="sm"
                >
                  See the course
                </Button>
              </div>
            </div>
          </Card>
          <CertificateLookup />
        </div>
      </div>
    </div>
  );
}

/**
 * Page heading. "Proof they did the thing." only when the code verifies; a
 * neutral "Certificate check" while checking or when nothing matches, so the
 * H1 never contradicts the "couldn't find it" card below.
 */
export function CertificateHeading({ code }: { code: string }) {
  const db = useDb();
  const verified = !!getCertificateByCode(code, db);
  return (
    <div className="no-print mb-6 md:mb-8">
      <Eyebrow tone="purple">
        {verified ? "Certificate check" : "Verify a certificate"}
      </Eyebrow>
      <h1 className="mt-eyebrow t-display-m">
        {verified ? "Proof they did the thing." : "Certificate check"}
      </h1>
      <p className="mt-3 max-w-[52ch] t-body text-ink/70">
        Every Tamada Media certificate has a unique code. This page checks it
        against our records.
      </p>
    </div>
  );
}
