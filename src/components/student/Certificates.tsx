"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  ProgressRing,
  StatGrid,
  StatTile,
  toast,
} from "@/components/app";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useDb, demo } from "@/lib/demo/store";
import { formatDate, getCertificates, plural } from "@/lib/mock";
import { CertificateCard } from "./CertificateCard";
import { CardsPageSkeleton, Hydrated } from "./Hydrated";
import { GridFiller, SectionTitle, TILE_TIGHT } from "./bits";
import { courseState, getMyCourses } from "./data";
import { rescueFocus } from "./hooks";
import { useStudentProfile } from "./prefs";

const stateRank = (p: Parameters<typeof courseState>[0]) =>
  courseState(p) === "in_progress" ? 0 : 1;
const verb = (p: Parameters<typeof courseState>[0]) =>
  courseState(p) === "in_progress" ? "Continue" : "Start";

const HEADER = {
  eyebrow: "Student space",
  eyebrowTone: "hotpink" as const,
  title: "Proof you did the thing.",
  description: "Download, share, or simply admire the evidence.",
  breadcrumbs: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Certificates" },
  ],
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function CertificatesFallback() {
  return (
    <CardsPageSkeleton
      header={
        <PageHeader
          {...HEADER}
          actions={
            <Button
              href="/dashboard/courses?status=in-progress"
              variant="secondary"
              icon="book"
            >
              Courses in progress
            </Button>
          }
        />
      }
    />
  );
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
  const certs = useMemo(
    () => getCertificates(uid, db).filter((c) => !!c.course),
    [uid, db],
  );
  const enrolled = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const certified = new Set(certs.map((c) => c.courseId));
  const claimable = enrolled.filter(
    (e) =>
      courseState(e.progress) === "completed" && !certified.has(e.course.id),
  );
  // started courses first (closest to done first), then the ones not opened yet
  const onTheWay = enrolled
    .filter(
      (e) =>
        courseState(e.progress) !== "completed" &&
        e.course.hasCertificate !== false,
    )
    .sort(
      (a, b) =>
        stateRank(a.progress) - stateRank(b.progress) ||
        b.progress.percent - a.progress.percent,
    );
  // the empty-state CTA: the most recently active course in progress (getMyCourses order), else the first not started
  const nextUp =
    enrolled.find(
      (e) =>
        courseState(e.progress) === "in_progress" &&
        e.course.hasCertificate !== false,
    ) ?? onTheWay[0];
  // the earned grid's spare slot(s) point at the course closest to its certificate
  const closest = [...onTheWay].sort(
    (a, b) => b.progress.percent - a.progress.percent,
  )[0];
  const hours = certs.reduce((s, c) => s + c.hours, 0);
  const earnedRef = useRef<HTMLElement>(null);

  const claim = (courseId: string, title: string) => {
    const cert = demo.issueCertificate(uid, courseId);
    // the claim button (often the whole "Ready to claim" card) goes away: land on the new certificate
    if (cert)
      rescueFocus(() =>
        earnedRef.current?.querySelector<HTMLElement>(
          `a[href="/certificates/${cert.code}"]`,
        ),
      );
    if (cert)
      toast({
        title: "Certificate issued",
        description: `${title} · ${cert.code}`,
        tone: "success",
        action: {
          label: "View",
          onClick: () => router.push(`/certificates/${cert.code}`),
        },
      });
    else
      toast.error("Not quite yet", {
        description: "Finish every lesson and quiz first.",
      });
  };

  return (
    <div className="app-enter">
      <PageHeader
        {...HEADER}
        actions={
          onTheWay.length ? (
            <Button
              href="/dashboard/courses?status=in-progress"
              variant="secondary"
              icon="book"
            >
              Courses in progress
            </Button>
          ) : undefined
        }
      />

      {certs.length > 0 && (
        <StatGrid className="mb-6 md:mb-8">
          <StatTile
            className={TILE_TIGHT}
            label="Certificates"
            value={certs.length}
            tone="sun"
            icon="award"
            hint="each one verifiable online"
          />
          <StatTile
            className={TILE_TIGHT}
            label="Hours certified"
            value={hours}
            tone="mint"
            icon="clock"
            hint={`of learning across ${plural(certs.length, "course")}`}
          />
          <StatTile
            className={TILE_TIGHT}
            label="Latest"
            value={formatDate(certs[0].issuedAt, "short")}
            tone="cyan"
            icon="calendar"
            hint={certs[0].course.title}
          />
          <StatTile
            className={TILE_TIGHT}
            label="On the way"
            value={onTheWay.length}
            tone="blush"
            icon="trend"
            hint={
              onTheWay.length === 1
                ? "course not finished yet"
                : "courses not finished yet"
            }
          />
        </StatGrid>
      )}

      {claimable.length > 0 && (
        <Card tone="mint" className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="t-app-h2">Ready to claim</h2>
              <p className="mt-1.5 t-small text-ink/75">
                You finished{" "}
                {claimable.length === 1 ? "this course" : "these courses"}. Your
                certificate is one click away.
              </p>
            </div>
            <ul className="flex flex-col gap-2 md:items-end">
              {claimable.map((e) => (
                <li key={e.course.id}>
                  <Button
                    variant="primary"
                    icon="award"
                    onClick={() => claim(e.course.id, e.course.title)}
                  >
                    Claim: {e.course.title}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {certs.length ? (
        <section ref={earnedRef} aria-labelledby="earned">
          <h2 id="earned" className="sr-only">
            Earned certificates
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {certs.map((c) => (
              <li key={c.id} className="app-fade">
                <CertificateCard
                  cert={c}
                  learnerName={profile.name}
                  className="h-full"
                />
              </li>
            ))}
            {closest ? (
              <GridFiller
                listItem
                n={certs.length}
                tone="blush"
                eyebrow={`Next up · ${closest.progress.percent}% done`}
                title={closest.course.title}
                body={`${plural(closest.progress.total - closest.progress.completed, "item")} to your next certificate.`}
                cta={verb(closest.progress)}
                href={`/learn/${closest.course.slug}/${closest.progress.resumeItemId ?? ""}`}
              />
            ) : (
              <GridFiller
                listItem
                n={certs.length}
                tone="blush"
                title="Collect another one?"
                body="Every course ends with a certificate. The first lesson of each is free."
                cta="Find your next course"
                href="/courses"
              />
            )}
          </ul>
          <p className="mt-5 flex items-start gap-2 t-small text-ink/70">
            <Icon name="shield" className="mt-0.5 size-4 shrink-0" />
            Every certificate has a public page with its verification code, so
            employers and colleges can check it is real.
          </p>
        </section>
      ) : (
        <Card padding="none">
          <EmptyState
            art="tami"
            tone="sun"
            title="No certificates yet. The first one is closer than you think."
            body="Finish every lesson and quiz in a course and we'll issue a certificate with its own verification link."
            action={
              nextUp ? (
                <Button
                  href={`/learn/${nextUp.course.slug}/${nextUp.progress.resumeItemId ?? ""}`}
                  variant="accent"
                  iconRight="arrow-right"
                >
                  {verb(nextUp.progress)} {nextUp.course.title}
                </Button>
              ) : (
                <Button
                  href="/courses"
                  variant="accent"
                  iconRight="arrow-right"
                >
                  Browse courses
                </Button>
              )
            }
          />
        </Card>
      )}

      {onTheWay.length > 0 && (
        <section aria-labelledby="on-the-way" className="mt-10 md:mt-12">
          <SectionTitle
            id="on-the-way"
            title="On the way"
            description="Keep going and these turn into certificates."
          />
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {onTheWay.map((e) => {
              const left = e.progress.total - e.progress.completed;
              return (
                <li key={e.course.id} className="min-w-0">
                  <Card
                    padding="sm"
                    className="flex items-center gap-3 p-4 sm:gap-4"
                  >
                    <ProgressRing
                      value={e.progress.percent}
                      size={60}
                      stroke={7}
                      tone="hotpink"
                      label={`${e.course.title} progress`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[16px] leading-snug font-bold">
                        <Link
                          href={`/courses/${e.course.slug}`}
                          className="hf:underline hf:decoration-ink/25 hf:underline-offset-2"
                        >
                          {e.course.title}
                        </Link>
                      </p>
                      <p className="mt-0.5 t-small text-ink/70">
                        {courseState(e.progress) === "not_started"
                          ? "Not started yet"
                          : e.progress.completed === 0
                            ? `Just started · 0 of ${e.progress.total} done`
                            : `${e.progress.percent}% done · ${plural(left, "item")} to go`}
                      </p>
                    </div>
                    <Button
                      href={`/learn/${e.course.slug}/${e.progress.resumeItemId ?? ""}`}
                      size="sm"
                      variant="secondary"
                      className="shrink-0 bg-cream! shadow-none! max-sm:hidden hf:bg-butter!"
                      iconRight="arrow-right"
                      aria-label={`${verb(e.progress)} ${e.course.title}`}
                    >
                      {verb(e.progress)}
                    </Button>
                    <Button
                      href={`/learn/${e.course.slug}/${e.progress.resumeItemId ?? ""}`}
                      size="sm"
                      variant="secondary"
                      iconOnly
                      icon="arrow-right"
                      className="shrink-0 bg-cream! shadow-none! sm:hidden hf:bg-butter!"
                      aria-label={`${verb(e.progress)} ${e.course.title}`}
                    />
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
