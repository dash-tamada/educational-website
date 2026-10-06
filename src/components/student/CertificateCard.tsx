"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import {
  Button,
  DropdownMenu,
  FullScreenSheet,
  Icon,
  toast,
} from "@/components/app";
import { CertificateSheet } from "@/components/auth/CertificateSheet";
import { useDb } from "@/lib/demo/store";
import { ScallopBadge } from "@/components/decor/Scallop";
import { Mascot } from "@/components/decor/Mascot";
import { toneBg, toneHex, type Tone } from "@/lib/landing-data";
import {
  formatDate,
  getTutor,
  type Certificate,
  type Course,
} from "@/lib/mock";

/* =============================================================================
   CertificateCard: a mini "paper" certificate (cream sheet, learner name in
   script, course-tone seal) + actions (view, copy link, share).
   ============================================================================= */

export const certPath = (code: string) => `/certificates/${code}`;
export const certUrl = (code: string) =>
  typeof window === "undefined"
    ? certPath(code)
    : `${window.location.origin}${certPath(code)}`;

export async function copyCertLink(code: string) {
  const url = certUrl(code);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", {
      description: "Anyone with it can verify your certificate.",
    });
  } catch {
    toast.info("Copy this link", { description: url });
  }
}

export async function shareCert(code: string, courseTitle: string) {
  const url = certUrl(code);
  const text = `I just finished “${courseTitle}” on Tamada Media!`;
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: "My Tamada Media certificate",
        text,
        url,
      });
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

export function CertificateCard({
  cert,
  learnerName,
  compact,
  className,
  headingLevel = "h3",
}: {
  cert: Certificate & { course: Course };
  learnerName: string;
  compact?: boolean;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const tone = cert.course.tone as Tone;
  // phones: tapping the sheet opens a full-screen viewer (share / copy / LinkedIn) instead of
  // leaving the dashboard; from 640px it links straight to the public certificate page
  const [viewing, setViewing] = useState(false);
  const issued = new Date(cert.issuedAt);
  const shareItems = [
    {
      label: "Copy link",
      icon: "copy" as const,
      onSelect: () => copyCertLink(cert.code),
    },
    {
      label: "Share…",
      icon: "share" as const,
      onSelect: () => shareCert(cert.code, cert.course.title),
    },
    { divider: true as const },
    {
      label: "Add to LinkedIn",
      icon: "external" as const,
      onSelect: () =>
        openExternal(
          `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.course.title)}&organizationName=${encodeURIComponent("Tamada Media")}&issueYear=${issued.getFullYear()}&issueMonth=${issued.getMonth() + 1}&certId=${encodeURIComponent(cert.code)}&certUrl=${encodeURIComponent(certUrl(cert.code))}`,
        ),
    },
    {
      label: "Share on WhatsApp",
      icon: "chat" as const,
      onSelect: () =>
        openExternal(
          `https://wa.me/?text=${encodeURIComponent(`I just finished “${cert.course.title}” on Tamada Media! ${certUrl(cert.code)}`)}`,
        ),
    },
  ];

  const dark = [
    "blue",
    "purple",
    "indigo",
    "green",
    "flame",
    "hotpink",
    "forest",
  ].includes(tone);

  return (
    <article
      className={clsx(
        "group hover-lift relative flex flex-col rounded-card bg-white p-2.5 shadow-soft",
        className,
      )}
    >
      {/* the sheet: the title link's ::after stretches over all of it */}
      <div
        className={clsx(
          "relative flex flex-1 flex-col overflow-hidden rounded-img bg-cream",
          compact ? "px-4 pt-4 pb-4" : "px-5 pt-5 pb-5 md:px-6 md:pt-6",
        )}
      >
        <span
          aria-hidden
          className={clsx("absolute inset-y-0 left-0 w-2", toneBg[tone])}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-[12px] ring-1 ring-ink/[0.08]"
        />
        <div className="flex items-center gap-2">
          <Mascot
            title=""
            className="w-5 shrink-0"
            style={{ transform: "rotate(-8deg)" }}
          />
          <span className="text-[10.5px] font-extrabold tracking-[0.18em] whitespace-nowrap text-ink/75 uppercase max-sm:text-[12px] max-sm:tracking-[0.14em]">
            Tamada Media
          </span>
        </div>
        <p
          className={clsx(
            "font-bold tracking-[0.14em] text-ink/70 uppercase max-sm:text-[12px] max-sm:tracking-[0.1em]",
            compact ? "mt-3 text-[10.5px]" : "mt-4 text-[11px]",
          )}
        >
          Certificate of completion
        </p>
        <p
          className={clsx(
            "truncate font-script leading-[1.15] text-ink",
            compact
              ? "mt-1 text-[26px]"
              : "mt-1.5 text-[clamp(1.875rem,1.5rem+1vw,2.375rem)]",
          )}
        >
          {learnerName}
        </p>
        <p
          className={clsx(
            "font-semibold text-ink/70",
            compact ? "text-[12px]" : "text-[13px]",
          )}
        >
          finished
        </p>
        {/* the title gets the sheet's full width; the seal sits beside the meta row below */}
        <H
          className={clsx(
            "font-heading leading-[1] font-extrabold tracking-[-0.02em] text-balance [font-variation-settings:'opsz'_96]",
            compact
              ? "mt-1 line-clamp-3 text-[18px]"
              : "mt-1 line-clamp-3 text-[22px] md:text-[24px]",
          )}
        >
          <Link
            href={certPath(cert.code)}
            className="after:absolute after:inset-0 after:z-[1] after:rounded-img focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-blue"
          >
            {cert.course.title}
          </Link>
        </H>
        {/* phones: the whole sheet opens the viewer (a button over the stretched link) */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`View certificate: ${cert.course.title}`}
          onClick={() => setViewing(true)}
          className="absolute inset-0 z-[2] rounded-img focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-blue sm:hidden"
        />
        <div
          className={clsx(
            "mt-auto flex items-end justify-between gap-3",
            compact ? "pt-3" : "pt-4",
          )}
        >
          <div
            className={clsx(
              "flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 font-semibold text-ink/70",
              compact ? "text-[12px]" : "text-[12.5px]",
            )}
          >
            <span className="whitespace-nowrap">
              {formatDate(cert.issuedAt, "long")}
            </span>
            <span className="whitespace-nowrap">
              {cert.hours} hr{cert.hours === 1 ? "" : "s"} of learning
            </span>
          </div>
          <ScallopBadge
            fill={toneHex[tone]}
            bumps={16}
            className={clsx(
              "pointer-events-none shrink-0",
              compact ? "-mr-1 -mb-1 size-14" : "-mr-1 -mb-1 size-[72px]",
            )}
          >
            <span className="grid h-full place-items-center">
              <Icon
                name="award"
                className={clsx(
                  compact ? "size-6" : "size-7",
                  dark ? "text-white" : "text-ink",
                )}
                strokeWidth={2.2}
              />
            </span>
          </ScallopBadge>
        </div>
      </div>

      {/* footer */}
      <div
        className={clsx(
          "relative z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-2",
          compact ? "px-1.5 pt-2.5 pb-0.5" : "px-2 pt-3 pb-1",
        )}
      >
        <div className="shrink-0">
          <p className="text-[11px] font-bold tracking-[0.06em] text-ink/70 uppercase max-sm:text-[12px]">
            Verification code
          </p>
          <p className="font-mono text-[13px] font-bold tracking-[0.03em] whitespace-nowrap">
            {cert.code}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {!compact && (
            <>
              <Button
                href={certPath(cert.code)}
                size="sm"
                variant="primary"
                iconRight="arrow-right"
                className="max-sm:hidden"
              >
                View
              </Button>
              <Button
                href={certPath(cert.code)}
                size="sm"
                variant="primary"
                iconOnly
                icon="arrow-right"
                aria-label={`View certificate for ${cert.course.title}`}
                className="sm:hidden"
              />
            </>
          )}
          <DropdownMenu
            label={`Share certificate for ${cert.course.title}`}
            trigger={
              <Icon name="share" className="size-[18px]" strokeWidth={2.2} />
            }
            triggerClassName="tap grid size-9 place-items-center rounded-full bg-cream text-ink coarse:size-11 hf:bg-butter"
            items={shareItems}
            width={220}
          />
        </div>
      </div>
      <CertificateViewer
        open={viewing}
        onClose={() => setViewing(false)}
        cert={cert}
        learnerName={learnerName}
      />
    </article>
  );
}

const ROW =
  "tap flex min-h-[52px] items-center gap-3 rounded-card px-4 text-[16px] font-semibold active:bg-butter/60";

/** Phone viewer: the full certificate sheet, Share (native share sheet) and Copy link in the footer. */
function CertificateViewer({
  open,
  onClose,
  cert,
  learnerName,
}: {
  open: boolean;
  onClose: () => void;
  cert: Certificate & { course: Course };
  learnerName: string;
}) {
  const db = useDb();
  const tutor = getTutor(cert.course.tutorId, db);
  const issued = new Date(cert.issuedAt);
  const rows = [
    {
      label: "Add to LinkedIn",
      icon: "external" as const,
      href: `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.course.title)}&organizationName=${encodeURIComponent("Tamada Media")}&issueYear=${issued.getFullYear()}&issueMonth=${issued.getMonth() + 1}&certId=${encodeURIComponent(cert.code)}&certUrl=${encodeURIComponent(certUrl(cert.code))}`,
      external: true,
    },
    {
      label: "Share on WhatsApp",
      icon: "chat" as const,
      href: `https://wa.me/?text=${encodeURIComponent(`I just finished “${cert.course.title}” on Tamada Media! ${certUrl(cert.code)}`)}`,
      external: true,
    },
    {
      label: "Public page and PDF download",
      icon: "download" as const,
      href: certPath(cert.code),
      external: false,
    },
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
          <Button
            variant="secondary"
            icon="copy"
            className="h-12"
            onClick={() => copyCertLink(cert.code)}
          >
            Copy link
          </Button>
          <Button
            variant="accent"
            icon="share"
            className="h-12"
            onClick={() => shareCert(cert.code, cert.course.title)}
          >
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
      <ul className="mt-5 divide-y divide-ink/[0.07] rounded-card bg-cream">
        {rows.map((r) => (
          <li key={r.label}>
            {r.external ? (
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className={ROW}
              >
                <Icon name={r.icon} className="size-5 shrink-0 text-ink/70" />
                <span className="min-w-0 flex-1">{r.label}</span>
                <Icon name="external" className="size-4 shrink-0 text-ink/45" />
              </a>
            ) : (
              <Link href={r.href} className={ROW}>
                <Icon name={r.icon} className="size-5 shrink-0 text-ink/70" />
                <span className="min-w-0 flex-1">{r.label}</span>
                <Icon
                  name="chevron-right"
                  className="size-4 shrink-0 text-ink/45"
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug font-semibold text-ink/70">
        <Icon name="shield" className="mt-px size-4 shrink-0" />
        Anyone with the link can check this certificate is real.
      </p>
    </FullScreenSheet>
  );
}
