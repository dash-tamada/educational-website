"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { Button, Icon, PageHeader, Section, toast } from "@/components/app";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useDb, demo } from "@/lib/demo/store";
import { FLAGSHIP } from "@/lib/content/site";
import { formatDate, getCertificates, plural } from "@/lib/mock";
import { CertificateCard, copyCertLink, linkedInUrl, shareCert, whatsAppUrl } from "./CertificateCard";
import { CardsPageSkeleton, Hydrated } from "./Hydrated";
import { SeeAll, idx } from "./bits";
import { courseState, getMyCourses } from "./data";
import { rescueFocus } from "./hooks";
import { useStudentProfile } from "./prefs";

/* =============================================================================
   Certificates, v2: earned certificates as cream paper sheets (CertificateCard)
   in a two-up grid, a ruled "ready to claim" block, and the specimen sheet for
   courses still on the way (Mobius split sections, mono indexes).
   ============================================================================= */

const stateRank = (p: Parameters<typeof courseState>[0]) => (courseState(p) === "in_progress" ? 0 : 1);
const verb = (p: Parameters<typeof courseState>[0]) => (courseState(p) === "in_progress" ? "Continue" : "Start");

const HEADER = {
  eyebrow: "Student space",
  title: (
    <>
      Proof you did the <em>thing</em>.
    </>
  ),
  description: "Download, share, or simply admire the evidence. Every certificate has a public page anyone can verify.",
  breadcrumbs: [{ label: "Dashboard", href: "/dashboard" }, { label: "Certificates" }],
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function CertificatesFallback() {
  return <CardsPageSkeleton header={<PageHeader {...HEADER} rule={false} />} />;
}

export function Certificates() {
  return (
    <Hydrated fallback={<CertificatesFallback />}>
      <CertificatesInner />
    </Hydrated>
  );
}

function CertificatesInner() {
  const db = useDb();
  const router = useTransitionRouter();
  const profile = useStudentProfile();
  const uid = profile.uid;
  const certs = useMemo(() => getCertificates(uid, db).filter((c) => !!c.course), [uid, db]);
  const enrolled = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const certified = new Set(certs.map((c) => c.courseId));
  const claimable = enrolled.filter((e) => courseState(e.progress) === "completed" && !certified.has(e.course.id));
  // started courses first (closest to done first), then the ones not opened yet
  const onTheWay = enrolled
    .filter((e) => courseState(e.progress) !== "completed" && e.course.hasCertificate !== false)
    .sort((a, b) => stateRank(a.progress) - stateRank(b.progress) || b.progress.percent - a.progress.percent);
  const hours = certs.reduce((s, c) => s + c.hours, 0);
  const earnedRef = useRef<HTMLElement>(null);
  let n = 0;
  const next = () => idx(++n);

  const claim = (courseId: string, title: string) => {
    const cert = demo.issueCertificate(uid, courseId);
    // the claim button (often the whole "Ready to claim" block) goes away: land on the new certificate
    if (cert) rescueFocus(() => earnedRef.current?.querySelector<HTMLElement>(`a[href="/certificates/${cert.code}"]`));
    if (cert)
      toast({
        title: "Certificate issued",
        description: `${title} · ${cert.code}`,
        tone: "success",
        action: { label: "View", onClick: () => router.push(`/certificates/${cert.code}`) },
      });
    else toast.error("Not quite yet", { description: "Finish every lesson and quiz first." });
  };

  return (
    <div className="app-enter">
      <PageHeader
        {...HEADER}
        rule={false}
        meta={
          certs.length ? (
            <p className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
              <span className="text-fg">{plural(certs.length, "certificate")}</span>
              <span>{hours} hours certified</span>
              <span>Latest {formatDate(certs[0].issuedAt, "medium")}</span>
            </p>
          ) : undefined
        }
      />

      <div className="space-y-14 md:space-y-20">
        {claimable.length > 0 && (
          <Section index={next()} label="Ready to claim" note="You finished. One click and it's issued, with its own verification link.">
            <ul className="border-b border-line">
              {claimable.map((e) => (
                <li key={e.course.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-4">
                  <span className="min-w-0">
                    <span className="block font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">100% · {e.progress.total} items</span>
                    <span className="mt-1 block text-[17px] font-medium tracking-[-0.01em]">{e.course.title}</span>
                  </span>
                  <Button variant="red" icon="award" onClick={() => claim(e.course.id, e.course.title)}>
                    Claim certificate
                  </Button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {certs.length > 0 && (
          <section ref={earnedRef} aria-labelledby="earned">
            <Section index={next()} label="Earned" note="Tap a sheet for its public page. Share it, or add it to LinkedIn.">
              <h2 id="earned" className="sr-only">
                Earned certificates
              </h2>
              <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2">
                {certs.map((c) => (
                  <li key={c.id} className="app-fade min-w-0">
                    <CertificateCard cert={c} learnerName={profile.name} className="h-full" headingLevel="h3" />
                  </li>
                ))}
                {/* one certificate: the other column carries the share + verify actions */}
                {certs.length === 1 && (
                  <li className="min-w-0 max-md:hidden">
                    <SharePanel cert={certs[0]} />
                  </li>
                )}
              </ul>
              <p className="mt-6 flex items-start gap-2.5 t-small text-muted">
                <Icon name="shield" className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
                Every certificate has a public page with its verification code, so employers and colleges can check it is real.
              </p>
            </Section>
          </section>
        )}

        {onTheWay.length > 0 && (
          <Section
            index={next()}
            label={certs.length ? "On the way" : "Your first one"}
            note={certs.length ? "Keep going and these turn into certificates." : "Finish every lesson and test and we issue it, with its own verification link."}
          >
            <ul className="space-y-12">
              {onTheWay.map((e) => {
                const left = e.progress.total - e.progress.completed;
                const href = `/learn/${e.course.slug}/${e.progress.resumeItemId ?? ""}`;
                return (
                  <li key={e.course.id} className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
                    <div className="min-w-0 border-t border-line pt-4">
                      <p className="t-statement-m max-w-[20ch] text-balance">
                        {plural(left, "step")} between you and <span className="text-red">this</span> sheet.
                      </p>
                      <dl className="mt-6 border-b border-line font-mono text-[11px] tracking-[0.06em] uppercase">
                        {[
                          ["Course", e.course.title],
                          ["Progress", `${e.progress.percent}% · ${e.progress.completed}/${e.progress.total}`],
                          ["Issued as", e.course.certificateTitle ?? FLAGSHIP.certificateTitle],
                        ].map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-t border-line py-2.5">
                            <dt className="text-muted">{k}</dt>
                            <dd className="min-w-0 normal-case tracking-[0.02em]">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <Button href={href} variant="red" icon="play">
                          {verb(e.progress)} the course
                        </Button>
                        <SeeAll href={`/courses/${e.course.slug}`}>Course page</SeeAll>
                      </div>
                    </div>
                    <CertificateCard preview={{ course: e.course, percent: e.progress.percent, left, href }} learnerName={profile.name} />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {!certs.length && !onTheWay.length && !claimable.length && (
          <div className="border-t border-fg pt-10">
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">00 issued</p>
            <h2 className="mt-3 max-w-[20ch] t-headline-m">No certificates yet. The first one starts with a free lesson.</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button href={FLAGSHIP.freeLessonHref} variant="red" icon="play">
                Watch free lesson
              </Button>
              <Button href={FLAGSHIP.href} variant="outline">
                Course page
              </Button>
            </div>
          </div>
        )}

        <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
          Checking someone else&apos;s?{" "}
          <Link href="/certificates" className="text-fg underline decoration-line-strong underline-offset-4 hf:text-red hf:decoration-red">
            Verify a code
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Beside a lone certificate: the verify code, its public page and the share actions as ruled rows. */
function SharePanel({ cert }: { cert: ReturnType<typeof getCertificates>[number] }) {
  const row = "group flex min-h-12 w-full items-center gap-4 border-b border-line text-left text-[15px] font-medium transition-colors hf:text-red";
  return (
    <div className="flex h-full flex-col border-t border-fg pt-4">
      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">Put it where people can see it</p>
      <p className="mt-6 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">Verification code</p>
      <p className="mt-1.5 t-display-s text-[clamp(2rem,1.4rem+1.6vw,3rem)] tabular-nums">{cert.code}</p>
      <p className="mt-2 t-small text-muted">Issued {formatDate(cert.issuedAt, "long")} · anyone with the link can check it&apos;s real.</p>
      <div className="mt-8 border-t border-line">
        <Link href={`/certificates/${cert.code}`} className={row}>
          <span className="font-mono text-[10.5px] text-muted">01</span>
          <span className="min-w-0 flex-1">Public page and PDF</span>
          <Icon name="arrow-right" className="size-4 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" strokeWidth={1.7} />
        </Link>
        <button type="button" onClick={() => copyCertLink(cert.code)} className={row}>
          <span className="font-mono text-[10.5px] text-muted">02</span>
          <span className="min-w-0 flex-1">Copy the link</span>
          <Icon name="copy" className="size-4" strokeWidth={1.7} />
        </button>
        <a href={linkedInUrl(cert)} target="_blank" rel="noopener noreferrer" className={row}>
          <span className="font-mono text-[10.5px] text-muted">03</span>
          <span className="min-w-0 flex-1">Add to LinkedIn</span>
          <Icon name="external" className="size-4" strokeWidth={1.7} />
        </a>
        <a href={whatsAppUrl(cert)} target="_blank" rel="noopener noreferrer" className={row}>
          <span className="font-mono text-[10.5px] text-muted">04</span>
          <span className="min-w-0 flex-1">Share on WhatsApp</span>
          <Icon name="external" className="size-4" strokeWidth={1.7} />
        </a>
      </div>
      <div className="mt-auto pt-8">
        <Button variant="red" icon="share" onClick={() => shareCert(cert.code, cert.course.title)}>
          Share
        </Button>
      </div>
    </div>
  );
}
