"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Button, Field, Icon, Modal, Textarea, toast } from "@/components/app";
import { formatDate, type Certificate, type Course } from "@/lib/mock";
import { demo, useDb } from "@/lib/demo/store";

/* "Course complete. Go make something with it." On the theatre: a slow fall of
   red and cream paper squares, the certificate as a cream sheet, a quick review. */

const COLORS = ["#e3061b", "#fdf8ee", "#e3061b", "#9a948a"];
const PIECES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 900) / 1000,
  dur: 1.8 + ((i * 29) % 10) / 10,
  rot: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
  w: 4 + (i % 3) * 2,
}));

/**
 * Falls from the dialog's top edge, over the title and the certificate card
 * (portalled into the panel, above its content; it never takes pointer events).
 */
function Confetti({ host }: { host: HTMLElement }) {
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[340px] overflow-hidden motion-reduce:hidden"
    >
      <style>{`@keyframes tm-confetti{0%{transform:translateY(-24px) rotate(0deg);opacity:0}8%{opacity:1}80%{opacity:1}100%{transform:translateY(330px) rotate(540deg);opacity:0}}`}</style>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 1.6,
            background: p.color,
            rotate: `${p.rot}deg`,
            animation: `tm-confetti ${p.dur}s ${p.delay}s cubic-bezier(.2,.6,.4,1) both`,
          }}
        />
      ))}
    </div>,
    host,
  );
}

/** "Certified AI Filmmaker" -> lead "Certified AI", last "Filmmaker" (the red word). */
function certTitle(course: Course) {
  const t = (course.certificateTitle ?? course.title).trim();
  const i = t.lastIndexOf(" ");
  return i > 0 ? { lead: t.slice(0, i), last: t.slice(i + 1) } : { lead: "", last: t };
}

export function CompletionModal({
  open,
  onClose,
  course,
  certificate,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  course: Course;
  certificate: Certificate | null;
  userId: string | null;
}) {
  const db = useDb();
  const existing = userId
    ? db.reviews.find((r) => r.userId === userId && r.courseId === course.id)
    : undefined;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const stars = useRef<(HTMLButtonElement | null)[]>([]);
  // the dialog panel (relative, overflow hidden): the confetti's stage
  const bodyRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    setPanel(bodyRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null);
  }, [open]);

  const pick = (n: number, focus = false) => {
    setRating(n);
    setRatingError(null);
    if (focus) stars.current[n - 1]?.focus();
  };
  // radiogroup keyboard model: arrows move and select, Home/End jump
  const onStarKey = (e: React.KeyboardEvent, n: number) => {
    const map: Record<string, number> = {
      ArrowRight: n + 1,
      ArrowUp: n + 1,
      ArrowLeft: n - 1,
      ArrowDown: n - 1,
      Home: 1,
      End: 5,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    pick(Math.min(5, Math.max(1, map[e.key])), true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const noRating = !rating;
    const shortComment = comment.trim().length < 10;
    setRatingError(noRating ? "Pick a star rating first." : null);
    setError(
      shortComment
        ? "A sentence or two helps other learners (10+ characters)."
        : null,
    );
    if (noRating) {
      stars.current[0]?.focus();
      return;
    }
    if (shortComment) return;
    demo.addReview(userId, course.id, rating, comment);
    setSent(true);
    setError(null);
    toast.success("Review posted", {
      description: "Thanks! It shows on the course page (demo data).",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      surface="ink"
      mobile="dialog"
      eyebrow="Course complete · Fin"
      title="Go make something with it."
      description={`You finished every lesson and test in ${course.title}.`}
      footer={
        <>
          <Button variant="outline" href="/dashboard">
            Back to dashboard
          </Button>
          {certificate && (
            <Button
              variant="red"
              href={`/certificates/${certificate.code}`}
              iconRight="arrow-right"
            >
              View certificate
            </Button>
          )}
        </>
      }
    >
      <div ref={bodyRef} className="relative">
        {open && panel && <Confetti host={panel} />}
        {certificate ? (
          // the certificate: a cream sheet with a hairline frame
          <div className="relative bg-cream p-1.5 text-ink">
            <div className="border border-ink/25 px-5 pt-5 pb-4 text-center md:px-8 md:pt-7">
              <p className="font-mono text-[9.5px] tracking-[0.16em] text-ink/60 uppercase">
                Tamada Media · Certificate of completion
              </p>
              <p className="mt-4 font-display text-[clamp(2rem,1.5rem+2vw,2.875rem)] leading-[0.9] uppercase">
                {certTitle(course).lead}{" "}
                <span className="text-red">{certTitle(course).last}</span>
              </p>
              <p className="mt-3 text-[13px] text-ink/70">{course.title}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-ink/20 pt-3 font-mono text-[10px] tracking-[0.08em] text-ink/70 uppercase tabular-nums">
                <span className="text-ink">{certificate.code}</span>
                <span>
                  {certificate.hours} {certificate.hours === 1 ? "hr" : "hrs"} ·{" "}
                  {formatDate(certificate.issuedAt, "long")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-fg pt-4">
            <p className="font-heading text-[19px] font-semibold tracking-[-0.02em]">
              Every item done.
            </p>
            <p className="mt-1 t-small text-muted">
              This course doesn&apos;t come with a certificate, but the skills
              are all yours.
            </p>
          </div>
        )}
        {certificate && (
          <p className="mt-3 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            Anyone can verify it at /certificates/{certificate.code}
          </p>
        )}

        <div className="mt-8 border-t border-line pt-5">
          <h3 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
            How was it?
          </h3>
          {existing && !sent ? (
            <p className="mt-2 t-small text-muted">
              You already reviewed this course ({existing.rating} of 5). Thank
              you!
            </p>
          ) : sent ? (
            <p
              className="mt-2 flex items-center gap-2 t-small font-medium text-fg"
              role="status"
            >
              <Icon
                name="check-circle"
                className="size-4 shrink-0 text-red-lite"
                strokeWidth={1.8}
              />
              Thanks, your review is live on the course page.
            </p>
          ) : userId ? (
            <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-muted">
                  Your rating
                </legend>
                <div
                  className="flex gap-1"
                  role="radiogroup"
                  aria-label="Rating out of 5"
                  aria-invalid={ratingError ? true : undefined}
                  aria-describedby={
                    ratingError ? "review-rating-error" : undefined
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      ref={(el) => {
                        stars.current[n - 1] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      tabIndex={(rating || 1) === n ? 0 : -1}
                      onClick={() => pick(n)}
                      onKeyDown={(e) => onStarKey(e, n)}
                      className="tap grid size-10 place-items-center ring-1 ring-line ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red hf:ring-fg coarse:size-11"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={clsx(
                          "size-6",
                          n <= rating ? "text-red" : "text-fg/25",
                        )}
                        aria-hidden
                      >
                        <path
                          d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
                {ratingError && (
                  <p
                    id="review-rating-error"
                    className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-red-lite"
                  >
                    <Icon name="alert" className="size-3.5" />
                    {ratingError}
                  </p>
                )}
              </fieldset>
              <Field
                label="A line for future learners"
                error={error ?? undefined}
                optional={false}
              >
                <Textarea
                  rows={3}
                  maxLength={400}
                  showCount
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What clicked for you? Who should take this?"
                />
              </Field>
              <Button
                type="submit"
                size="sm"
                className="max-sm:h-12 max-sm:w-full"
              >
                Post review
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
