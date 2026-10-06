"use client";

import clsx from "clsx";
import { formatDate, getApplicationDetails, getUser } from "@/lib/mock";
import type { TutorApplication } from "@/lib/mock/types";
import { useDb } from "@/lib/demo/store";
import { StatusPill } from "./Badge";
import { Icon } from "./icons";

/* =============================================================================
   Tutor-application read-outs for admin screens (drawer, user detail).
     <ApplicationFacts app={app} />     "Details": teaching for, teaches in, website,
                                        payout country / method, GST (only what they gave)
     <ApplicationHistory app={app} />   "Previous rounds": earlier decisions + notes,
                                        oldest first (renders nothing on a first round)
     <ApplicationReview app={app} />    both, in that order
   Use getApplicationDetails(app).experience for the experience text: it strips the
   legacy "(3 to 7 years teaching; teaches in …)" tail old demo rows carry.
   Headings follow the drawer's section style (t-micro uppercase); pass `headingAs`
   to fit the surrounding outline (default h3).
   ============================================================================= */

type HeadingTag = "h2" | "h3" | "h4";

const sectionTitle = "mb-1.5 t-micro text-ink/60 uppercase";

export function ApplicationFacts({
  app,
  title = "Details",
  headingAs: H = "h3",
  className,
}: {
  app: TutorApplication;
  title?: string;
  headingAs?: HeadingTag;
  className?: string;
}) {
  const { facts } = getApplicationDetails(app);
  if (!facts.length) return null;
  return (
    <section className={className}>
      <H className={sectionTitle}>{title}</H>
      <dl className="divide-y divide-ink/[0.07] rounded-tag bg-cream px-3.5">
        {facts.map((f) => (
          <div key={f.label} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="shrink-0 t-small text-ink/65">{f.label}</dt>
            <dd className="min-w-0 text-right t-small font-semibold [overflow-wrap:anywhere]">
              {f.href ? (
                <a
                  href={f.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-sm underline decoration-ink/25 underline-offset-2 hf:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  {f.value}
                  <Icon name="external" className="size-3.5 shrink-0 text-ink/45" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const ROUND_VERB: Record<string, string> = {
  changes_requested: "Sent back for changes",
  rejected: "Rejected",
  approved: "Approved",
};

export function ApplicationHistory({
  app,
  title = "Previous rounds",
  headingAs: H = "h3",
  className,
}: {
  app: TutorApplication;
  title?: string;
  headingAs?: HeadingTag;
  className?: string;
}) {
  const db = useDb();
  const rounds = app.history ?? [];
  if (!rounds.length) return null;
  const last = rounds[rounds.length - 1];
  const nth = rounds.length + 1;
  return (
    <section className={className}>
      <H className={sectionTitle}>
        {title} <span className="text-ink/45">({rounds.length})</span>
      </H>
      <p className="mb-3 t-small text-ink/70">
        This is round {nth}. They resubmitted on {formatDate(app.submittedAt)} after{" "}
        {last.status === "changes_requested" ? "being asked for changes" : `a “${ROUND_VERB[last.status]?.toLowerCase() ?? last.status}” decision`}
        {last.decidedAt ? ` on ${formatDate(last.decidedAt)}` : ""}. Check the earlier ask was answered.
      </p>
      <ol className="space-y-2.5">
        {rounds.map((r, i) => {
          const by = r.decidedBy ? (getUser(r.decidedBy, db)?.name ?? "An admin") : null;
          return (
            <li key={`${r.submittedAt}-${i}`} className="rounded-tag bg-cream p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <span className="text-[13px] font-bold text-ink/70">
                  Round {i + 1} · applied {formatDate(r.submittedAt)}
                </span>
                <StatusPill status={r.status} size="sm" />
              </div>
              {r.decisionNote ? (
                <p className="mt-2 text-[14.5px] leading-relaxed">“{r.decisionNote}”</p>
              ) : (
                <p className="mt-2 t-small text-ink/60">No note was left.</p>
              )}
              {(by || r.decidedAt) && (
                <p className="mt-1.5 text-[13px] font-semibold text-ink/60">
                  {[by, r.decidedAt && formatDate(r.decidedAt)].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Details + previous rounds, stacked with the drawer's section rhythm. */
export function ApplicationReview({
  app,
  headingAs,
  className,
}: {
  app: TutorApplication;
  headingAs?: HeadingTag;
  className?: string;
}) {
  if (!getApplicationDetails(app).facts.length && !app.history?.length) return null;
  return (
    <div className={clsx("space-y-5", className)}>
      <ApplicationFacts app={app} headingAs={headingAs} />
      <ApplicationHistory app={app} headingAs={headingAs} />
    </div>
  );
}
