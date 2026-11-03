"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Button, DropdownMenu, FullScreenSheet, Icon, toast } from "@/components/app";
import { CertificateSheet } from "@/components/auth/CertificateSheet";
import { useDb } from "@/lib/demo/store";
import { FLAGSHIP } from "@/lib/content/site";
import { formatDate, getTutor, plural, type Certificate, type Course } from "@/lib/mock";

/* =============================================================================
   CertificateCard: a mini certificate on cream paper. One hairline frame inside
   another (no seal, no mascot), "TAMADA MEDIA" tiny caps and the mono number on
   top, the certificate title in Anton (last word red: CERTIFIED AI FILMMAKER),
   the learner's name in Inter Tight, a ruled foot (issued / hours / verify).
   Actions under the sheet: Verify (the public page /certificates/<code>) + share.

   <CertificateCard cert={c} learnerName="Priya Nair" />
   <CertificateCard preview={{ course, percent: 39, left: 31, href }} learnerName="Priya Nair" />
       the "not issued yet" specimen (dashboard teaser, certificates page)
   ============================================================================= */

export const certPath = (code: string) => `/certificates/${code}`;
export const certUrl = (code: string) => (typeof window === "undefined" ? certPath(code) : `${window.location.origin}${certPath(code)}`);

export async function copyCertLink(code: string) {
  const url = certUrl(code);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: "Anyone with it can verify your certificate." });
  } catch {
    toast.info("Copy this link", { description: url });
  }
}

export async function shareCert(code: string, courseTitle: string) {
  const url = certUrl(code);
  const text = `I just finished “${courseTitle}” on Tamada Media!`;
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: "My Tamada Media certificate", text, url });
      return;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
  }
  await copyCertLink(code);
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export const linkedInUrl = (cert: Certificate & { course: Course }) => {
  const issued = new Date(cert.issuedAt);
  return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.course.title)}&organizationName=${encodeURIComponent("Tamada Media")}&issueYear=${issued.getFullYear()}&issueMonth=${issued.getMonth() + 1}&certId=${encodeURIComponent(cert.code)}&certUrl=${encodeURIComponent(certUrl(cert.code))}`;
};
export const whatsAppUrl = (cert: Certificate & { course: Course }) =>
  `https://wa.me/?text=${encodeURIComponent(`I just finished “${cert.course.title}” on Tamada Media! ${certUrl(cert.code)}`)}`;

/** "Certified AI Filmmaker" with the last word in red. */
export function CertTitle({ course, className }: { course?: Pick<Course, "certificateTitle" | "title"> | null; className?: string }) {
  const words = (course?.certificateTitle ?? FLAGSHIP.certificateTitle).split(" ");
  const last = words.pop();
  return (
    <span className={clsx("font-display leading-[0.92] font-normal tracking-[0.005em] uppercase", className)}>
      {words.join(" ")} <span className="text-red">{last}</span>
    </span>
  );
}

type Preview = { course: Course; percent: number; left: number; href: string };

export function CertificateCard({
  cert,
  preview,
  learnerName,
  compact,
  className,
  headingLevel = "h3",
}: {
  cert?: Certificate & { course: Course };
  /** not issued yet: a specimen sheet with the learner's progress */
  preview?: Preview;
  learnerName: string;
  compact?: boolean;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const course = cert?.course ?? preview?.course ?? null;
  // phones: tapping an issued sheet opens a full-screen viewer (share / copy / LinkedIn) instead of
  // leaving the dashboard; from 640px it links straight to the public certificate page
  const [viewing, setViewing] = useState(false);
  if (!course) return null;
  const code = cert?.code ?? "TM-····-····";

  const shareItems = cert
    ? [
        { label: "Copy link", icon: "copy" as const, onSelect: () => copyCertLink(cert.code) },
        { label: "Share…", icon: "share" as const, onSelect: () => shareCert(cert.code, cert.course.title) },
        { divider: true as const },
        { label: "Add to LinkedIn", icon: "external" as const, onSelect: () => openExternal(linkedInUrl(cert)) },
        { label: "Share on WhatsApp", icon: "chat" as const, onSelect: () => openExternal(whatsAppUrl(cert)) },
      ]
    : [];

  return (
    <article className={clsx("group relative flex min-w-0 flex-col", className)}>
      {/* the paper: outer hairline, inner hairline frame */}
      <div className={clsx("ground-cream relative flex flex-1 flex-col border border-ink/15 bg-paper", compact ? "p-1.5" : "p-2")}>
        <div className={clsx("relative flex flex-1 flex-col border border-ink/20", compact ? "px-4 pt-4 pb-4" : "px-5 pt-5 pb-5 md:px-7 md:pt-6 md:pb-6")}>
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 pb-3">
            <span className="text-[10.5px] font-semibold tracking-[0.2em] whitespace-nowrap text-ink uppercase max-sm:text-[11px]">Tamada Media</span>
            <span className="font-mono text-[10.5px] tracking-[0.06em] whitespace-nowrap text-smoke tabular-nums">No. {code}</span>
          </div>
          <p className={clsx("text-[10.5px] font-semibold tracking-[0.18em] text-smoke uppercase max-sm:text-[11px]", compact ? "mt-4" : "mt-5 md:mt-6")}>Certificate of completion</p>
          <H className={clsx("mt-2 font-display leading-[0.92] font-normal", compact ? "text-[clamp(1.75rem,1.4rem+1vw,2.25rem)]" : "text-[clamp(2rem,1.5rem+1.6vw,3rem)]")}>
            {cert ? (
              <Link
                href={certPath(cert.code)}
                className="after:absolute after:inset-0 after:z-[1] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-red"
              >
                <CertTitle course={course} />
              </Link>
            ) : (
              <CertTitle course={course} />
            )}
          </H>
          <p className={clsx("text-[10.5px] font-semibold tracking-[0.18em] text-smoke uppercase max-sm:text-[11px]", compact ? "mt-4" : "mt-5")}>Awarded to</p>
          <p className={clsx("mt-1 truncate font-heading font-semibold tracking-[-0.03em] text-ink", compact ? "text-[20px]" : "text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)]")}>{learnerName}</p>
          <p className="mt-1 line-clamp-2 t-small text-smoke">for completing {course.title}</p>

          {/* ruled foot (pinned to the bottom when cards in a row stretch) */}
          <div aria-hidden className={clsx("flex-1", compact ? "min-h-4" : "min-h-6")} />
          {cert ? (
            <dl className={clsx("grid grid-cols-2 border-t border-ink/15 font-mono text-[11px] tracking-[0.04em] tabular-nums", compact ? "pt-3" : "pt-4")}>
              <div className="min-w-0 pr-3">
                <dt className="text-smoke uppercase">Issued</dt>
                <dd className="mt-1 truncate text-ink">{formatDate(cert.issuedAt, "medium")}</dd>
              </div>
              <div className="min-w-0 border-l border-ink/15 pl-3">
                <dt className="text-smoke uppercase">Hours</dt>
                <dd className="mt-1 text-ink">{cert.hours} hr{cert.hours === 1 ? "" : "s"}</dd>
              </div>
            </dl>
          ) : (
            preview && (
              <div className={clsx("border-t border-ink/15 font-mono text-[11px] tracking-[0.06em] uppercase", compact ? "pt-3" : "pt-4")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-red-deep">
                    <span aria-hidden className="size-[6px] bg-red" />
                    Not issued yet
                  </span>
                  <span className="text-ink tabular-nums">{preview.percent}%</span>
                </div>
                <div role="progressbar" aria-label="Progress to your certificate" aria-valuenow={preview.percent} aria-valuemin={0} aria-valuemax={100} className="relative mt-2.5 h-px bg-ink/15">
                  <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${preview.percent}%` }} />
                </div>
                <p className="mt-2.5 text-smoke normal-case tracking-[0.02em]">{plural(preview.left, "item")} to go</p>
              </div>
            )
          )}

          {/* phones: the whole issued sheet opens the viewer (a button over the stretched link) */}
          {cert && (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`View certificate: ${cert.course.title}`}
              onClick={() => setViewing(true)}
              className="absolute inset-0 z-[2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red sm:hidden"
            />
          )}
          {!cert && <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rotate-[-8deg] border border-red/50 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-red/70 uppercase max-sm:hidden">Specimen</span>}
        </div>
      </div>

      {/* actions under the sheet */}
      <div className={clsx("relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line", compact ? "py-2.5" : "py-3")}>
        {cert ? (
          <>
            <Link href={certPath(cert.code)} className="group/v inline-flex min-h-9 min-w-0 items-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase coarse:min-h-11 hf:text-red">
              <Icon name="shield" className="size-4 shrink-0" strokeWidth={1.6} />
              <span className="truncate">Verify · /certificates/{cert.code}</span>
            </Link>
            <DropdownMenu
              label={`Share certificate for ${cert.course.title}`}
              trigger={<Icon name="share" className="size-[17px]" strokeWidth={1.7} />}
              triggerClassName="tap grid size-9 place-items-center text-fg ring-1 ring-inset ring-line-strong transition-colors coarse:size-11 hf:bg-fg hf:text-surface"
              items={shareItems}
              width={220}
            />
          </>
        ) : (
          preview && (
            <>
              <span className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">Verifiable at /certificates/…</span>
              <Link href={preview.href} className="group/v inline-flex min-h-9 items-center gap-2 text-[14px] font-medium coarse:min-h-11 hf:text-red">
                Keep going
                <Icon name="arrow-right" className="size-4 transition-[translate] duration-500 ease-expo group-hf/v:translate-x-1" strokeWidth={1.8} />
              </Link>
            </>
          )
        )}
      </div>
      {cert && <CertificateViewer open={viewing} onClose={() => setViewing(false)} cert={cert} learnerName={learnerName} />}
    </article>
  );
}

const ROW = "tap flex min-h-[52px] items-center gap-3 px-1 text-[15.5px] font-medium active:bg-fg/[0.05]";

/** Phone viewer: the full certificate sheet, Share (native share sheet) and Copy link in the footer. */
function CertificateViewer({ open, onClose, cert, learnerName }: { open: boolean; onClose: () => void; cert: Certificate & { course: Course }; learnerName: string }) {
  const db = useDb();
  const tutor = getTutor(cert.course.tutorId, db);
  const rows = [
    { label: "Add to LinkedIn", icon: "external" as const, href: linkedInUrl(cert), external: true },
    { label: "Share on WhatsApp", icon: "chat" as const, href: whatsAppUrl(cert), external: true },
    { label: "Public page and PDF download", icon: "download" as const, href: certPath(cert.code), external: false },
  ];
  return (
    <FullScreenSheet
      open={open}
      onClose={onClose}
      title={cert.course.title}
      description={`Verification code ${cert.code}`}
      footerLayout="fill"
      footer={
        <>
          <Button variant="outline" icon="copy" className="h-12" onClick={() => copyCertLink(cert.code)}>
            Copy link
          </Button>
          <Button variant="red" icon="share" className="h-12" onClick={() => shareCert(cert.code, cert.course.title)}>
            Share
          </Button>
        </>
      }
    >
      <CertificateSheet
        data={{
          code: cert.code,
          learner: learnerName,
          course: cert.course.title,
          tutor: tutor?.name ?? "Tamada tutor",
          issuedAt: cert.issuedAt,
          hours: cert.hours,
        }}
      />
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <li key={r.label}>
            {r.external ? (
              <a href={r.href} target="_blank" rel="noopener noreferrer" className={ROW}>
                <Icon name={r.icon} className="size-5 shrink-0 text-muted" strokeWidth={1.6} />
                <span className="min-w-0 flex-1">{r.label}</span>
                <Icon name="external" className="size-4 shrink-0 text-muted" strokeWidth={1.6} />
              </a>
            ) : (
              <Link href={r.href} className={ROW}>
                <Icon name={r.icon} className="size-5 shrink-0 text-muted" strokeWidth={1.6} />
                <span className="min-w-0 flex-1">{r.label}</span>
                <Icon name="chevron-right" className="size-4 shrink-0 text-muted" strokeWidth={1.6} />
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-2 t-small text-muted">
        <Icon name="shield" className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
        Anyone with the link can check this certificate is real.
      </p>
    </FullScreenSheet>
  );
}
