"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button, Field, Input, Skeleton, isCoarse, toast } from "@/components/app";
import { ArrowLink, Eyebrow, Photo } from "@/components/editorial";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { formatDate, getCertificateByCode, getCourseStats, formatDuration, getFirstFreeItem } from "@/lib/mock";
import { FLAGSHIP } from "@/lib/content/site";
import { CERT_CODE_RE, normaliseCode } from "@/lib/mock/extra/auth";
import { CertificateSheet } from "./CertificateSheet";
import { CertificateViewer } from "./CertificateViewer";

/* =============================================================================
   Certificate verification (dark theatre page around a cream certificate).
   verified   ● VERIFIED (mono, red dot) + a one-line statement as the h1,
              Download PDF / Print / Copy link / Share, the sheet (tap for a
              full-size viewer on phones), then a ruled record + the course
   unknown    ○ NOT VERIFIED, an honest "no record" with tips, a ghosted empty
              certificate frame, the lookup and two sample codes
   Print: only the sheet, one A4 landscape page, on white (PRINT_CSS).
   ============================================================================= */

const noopSubscribe = () => () => {};
const SAMPLES = ["TM-7QK4-M2XD", "TM-3HNP-8RVA"];

/** Print just the certificate, on one A4 landscape page, on white. */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #fff !important; }
  body:has(.cert-sheet) header, body:has(.cert-sheet) footer, body:has(.cert-sheet) .no-print, body:has(.cert-sheet) .live-clock { display: none !important; }
  /* toasts (e.g. "Link copied.") must never print on the certificate */
  body:has(.cert-sheet) [data-toaster], body:has(.cert-sheet) [aria-live]:has(> ol) { display: none !important; }
  body:has(.cert-sheet) main { padding: 0 !important; }
  .cert-print-wrap, .cert-print-flat { padding: 0 !important; margin: 0 !important; max-width: none !important; min-height: 0 !important; border: 0 !important; background: #fff !important; display: block !important; }
  .cert-sheet { width: 297mm; height: 210mm; }
  .cert-sheet .cert-paper { box-shadow: none !important; height: 210mm; aspect-ratio: auto !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

/* ----------------------------------------------------------------------------- lookup */
export function CertificateLookup({
  initial = "",
  compact,
  label = "Check another certificate",
  size,
}: {
  initial?: string;
  /** legacy (layout is always flat now) */
  compact?: boolean;
  label?: string;
  size?: "lg";
}) {
  void compact;
  const router = useTransitionRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normaliseCode(value);
    if (!CERT_CODE_RE.test(code)) {
      setError(value.trim() ? "Codes look like TM-7QK4-M2XD (printed top right of the certificate)." : "Enter a certificate code, like TM-7QK4-M2XD.");
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    router.push(`/certificates/${code}`);
  };
  return (
    <form onSubmit={submit} noValidate>
      <Field label={label} error={error} hint={error ? undefined : "The code from the certificate. Dashes are optional."}>
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
            <Button type="submit" size="sm" variant="accent" className="mr-1">
              Verify
            </Button>
          }
          className="[&_input]:pr-28 [&_input]:font-mono [&_input]:uppercase"
        />
      </Field>
    </form>
  );
}

/* ----------------------------------------------------------------------------- bits */
function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={clsx("flex items-center gap-3 font-mono text-[12.5px] font-semibold tracking-[0.14em] uppercase md:text-[13.5px]", ok ? "text-cream" : "text-ash")}>
      <span aria-hidden className={clsx("size-2 shrink-0 rounded-full", ok ? "animate-pulse bg-red" : "ring-1 ring-red")} />
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="t-label pt-[3px] text-ash">{label}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}

/** An empty certificate: the double frame, ghosted, with NO RECORD where the name would be. */
function GhostSheet({ code }: { code: string }) {
  return (
    <div aria-hidden className="relative aspect-[1.414/1] w-full">
      <div className="absolute inset-0 border border-cream/25" />
      <div className="absolute inset-[3.5%] border border-cream/12" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4%] text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-ash uppercase">Certificate no. {code || "—"}</p>
        <p className="font-display text-[clamp(2.5rem,1.6rem+3.5vw,4.5rem)] leading-[0.9] text-transparent uppercase [-webkit-text-stroke:1px_rgb(253_248_238/0.45)]">
          No record
        </p>
        <span className="h-px w-[38%] bg-cream/20" />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- view */
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
      <div aria-busy="true" aria-label="Checking certificate" className="grid gap-8">
        <Status ok={false}>Checking the record…</Status>
        <Skeleton className="h-14 w-3/4 opacity-20" />
        <Skeleton className="aspect-[1.414/1] w-full opacity-10" />
      </div>
    );

  if (!hit)
    return (
      <div className="app-enter edit-grid gap-y-14">
        <div className="col-span-12 lg:col-span-6">
          <Status ok={false}>Not verified</Status>
          <h1 className="t-headline-l mt-6 max-w-[14ch] text-balance">We couldn&apos;t find that certificate.</h1>
          <p className="t-body mt-6 max-w-[40ch] text-cream/80">
            No Tamada Media certificate has the code <span className="font-mono text-cream [overflow-wrap:anywhere]">{display || "(empty)"}</span>. It
            might have a typo, or it may not be one of ours.
          </p>
          <ol className="mt-10 border-t border-line text-[14.5px] leading-snug">
            {[
              "Codes use letters and numbers, never 0, O, 1 or I. Check those first.",
              "Ask the learner for their certificate link: it opens this page with the code filled in.",
              "Still unsure? Our team can confirm it by email.",
            ].map((t, i) => (
              <li key={t} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-b border-line py-3.5">
                <span className="t-timecode pt-[3px] text-ash" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-cream/85">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href={`/contact?topic=certificate&ref=${encodeURIComponent(display)}#message`} variant="outline">
              Ask us to check
            </Button>
            <ArrowLink href={FLAGSHIP.href}>See the course</ArrowLink>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <GhostSheet code={display} />
          <div className="mt-10">
            <CertificateLookup initial={display} size="lg" />
          </div>
          <div className="mt-8">
            <p className="t-label text-ash">Try a real one</p>
            <ul className="mt-3 border-t border-line">
              {SAMPLES.map((c) => (
                <li key={c} className="border-b border-line">
                  <Link href={`/certificates/${c}`} className="group flex min-h-12 items-center justify-between gap-4 py-2 font-mono text-[14px] tracking-[0.06em] transition-colors hf:text-red-lite">
                    {c}
                    <span className="t-label text-ash transition-colors group-hf:text-red-lite">Verify →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );

  const { certificate, course, user, tutor } = hit;
  const mine = session?.userId === user.id;
  const stats = getCourseStats(course.id, db);
  const freeItem = getFirstFreeItem(course.id, db);
  const shareUrl = `${origin}/certificates/${certificate.code}`;
  const director = tutor?.name ?? FLAGSHIP.director;
  const issued = formatDate(certificate.issuedAt, "long");
  const sheetData = {
    code: certificate.code,
    learner: user.name,
    course: course.title,
    tutor: director,
    issuedAt: certificate.issuedAt,
    hours: certificate.hours,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied.", { description: "Anyone with it can verify this certificate." });
    } catch {
      toast.error("Couldn't copy the link.", { description: shareUrl });
    }
  };
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  /** Touch screens with a share sheet (WhatsApp, LinkedIn, Mail…) use it; everyone else gets LinkedIn. */
  const share = async (e: React.MouseEvent) => {
    if (typeof navigator === "undefined" || !navigator.share || !isCoarse()) return;
    e.preventDefault();
    try {
      await navigator.share({
        title: `${user.name}: ${FLAGSHIP.certificateTitle}`,
        text: `Verified Tamada Media certificate ${certificate.code}`,
        url: shareUrl,
      });
    } catch {
      // dismissed share sheet: nothing to do
    }
  };
  const print = () => window.print();
  const download = () => {
    toast.info("Choose “Save as PDF”.", { description: "Your print dialog opens with the certificate on one landscape page." });
    window.setTimeout(() => window.print(), 350);
  };

  /** Download / Print / Copy / Share: a 2 x 2 grid on phones, one row from 640px. */
  const actions = (onPrint: () => void, onDownload: () => void, inSheet = false) => (
    <>
      <Button variant="accent" icon="download" onClick={onDownload} className={inSheet ? "min-w-0 flex-1 px-2" : undefined}>
        {inSheet ? "PDF" : "Download PDF"}
      </Button>
      {!inSheet && (
        <Button variant="outline" icon="file" onClick={onPrint}>
          Print
        </Button>
      )}
      <Button variant={inSheet ? "secondary" : "outline"} icon="copy" onClick={copy} className={inSheet ? "min-w-0 flex-1 px-2" : undefined}>
        Copy link
      </Button>
      <Button variant={inSheet ? "secondary" : "outline"} icon="share" href={linkedIn} onClick={share} className={inSheet ? "min-w-0 flex-1 px-2" : undefined}>
        Share
      </Button>
    </>
  );

  return (
    <div className="app-enter">
      <style>{PRINT_CSS}</style>

      {/* verdict + actions */}
      <div className="no-print edit-grid items-end gap-y-8 border-b border-line pb-8 md:pb-10">
        <div className="col-span-12 lg:col-span-8">
          <Status ok>Verified · genuine record</Status>
          <h1 className="t-headline-l mt-6 max-w-[18ch] text-balance">
            {user.name} is a {FLAGSHIP.certificateTitle}.
          </h1>
          <p className="t-body mt-5 max-w-[46ch] text-cream/80">
            Issued on {issued} for completing {course.title}, every lesson, checkpoint and the capstone film.
            {mine && <span className="t-label ml-2 align-middle text-red-lite">This one&apos;s yours</span>}
          </p>
        </div>
        <div className="col-span-12 grid grid-cols-2 gap-2 sm:max-w-[24rem] lg:col-span-4 lg:ml-auto lg:w-[24rem]">{actions(print, download)}</div>
      </div>

      {/* the sheet */}
      <div className="cert-print-flat mx-auto mt-10 max-w-[1120px] md:mt-14">
        <CertificateViewer
          data={sheetData}
          footer={(close) =>
            actions(
              () => {},
              () => {
                // print the page, not the viewer: close it first
                close();
                window.setTimeout(() => window.print(), 320);
              },
              true,
            )
          }
        >
          <CertificateSheet data={sheetData} />
        </CertificateViewer>
        <p className="no-print t-caption mt-4 text-center text-ash max-sm:hidden">
          “Download PDF” opens your print dialog: choose “Save as PDF” and landscape. The print is the certificate alone, on white.
        </p>
      </div>

      {/* record + the course */}
      <div className="no-print edit-grid mt-16 gap-y-14 md:mt-24">
        <section aria-labelledby="cert-record" className="col-span-12 lg:col-span-6">
          <Eyebrow as="h2" className="text-cream">
            <span id="cert-record">The record</span>
          </Eyebrow>
          <dl className="mt-6 border-t border-line">
            <Row label="Learner">{user.name}</Row>
            <Row label="Certificate">{FLAGSHIP.certificateTitle}</Row>
            <Row label="Course">
              <Link href={`/courses/${course.slug}`} className="link-draw">
                {course.title}
              </Link>
            </Row>
            <Row label="Signed by">{director}, Director</Row>
            <Row label="Issued">{issued}</Row>
            <Row label="Course length">
              {certificate.hours} hours · {stats.videos} videos · {stats.quizzes} checkpoints
            </Row>
            <Row label="Code">
              <span className="font-mono tracking-[0.06em]">{certificate.code}</span>
            </Row>
          </dl>
          <p className="t-small mt-6 max-w-[48ch] text-ash">
            Certificates are issued automatically when a learner finishes every lesson and passes every required checkpoint. Tamada Media
            doesn&apos;t sell or hand-issue them.
          </p>
          {mine && (
            <div className="mt-6">
              <ArrowLink href="/dashboard/certificates">All my certificates</ArrowLink>
            </div>
          )}
        </section>

        <section aria-labelledby="cert-course" className="col-span-12 lg:col-span-5 lg:col-start-8">
          <Eyebrow as="h2" className="text-cream">
            <span id="cert-course">The course behind it</span>
          </Eyebrow>
          <Photo k="course-flagship" sizes="(min-width: 1024px) 40vw, 100vw" ratio={9 / 16} className="mt-6 aspect-[16/9]" />
          <p className="mt-5 font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight font-semibold tracking-[-0.03em]">{course.title}</p>
          <p className="t-small mt-2 text-cream/75">{course.promise}</p>
          <p className="t-timecode mt-4 text-ash">
            {stats.modules} modules · {formatDuration(stats.totalSec, "short")} · {director}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            {freeItem && (
              <Button href={`/learn/${course.slug}/${freeItem.id}`} variant="cream" icon="play">
                Watch free lesson
              </Button>
            )}
            <ArrowLink href={`/courses/${course.slug}`}>See the course</ArrowLink>
          </div>
          <div className="mt-12">
            <CertificateLookup />
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The page's top row: eyebrow + the code being checked (the verdict h1 lives in
 * CertificateView, so it never contradicts what the record says).
 */
export function CertificateHeading({ code }: { code: string }) {
  return (
    <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:mb-14">
      <Eyebrow index="09" className="text-cream">
        Certificate check
      </Eyebrow>
      <p className="t-timecode text-ash [overflow-wrap:anywhere]">{normaliseCode(code) || "—"}</p>
    </div>
  );
}
