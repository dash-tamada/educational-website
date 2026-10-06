"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Button, Field, Icon, Modal, Textarea, toast } from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { formatDate, type Certificate, type Course } from "@/lib/mock";
import { demo, useDb } from "@/lib/demo/store";

/* "Course complete. Go make something with it." Light confetti + certificate link + quick review. */

const COLORS = [
  "#ffcf3f",
  "#ff008c",
  "#2668fd",
  "#00b351",
  "#fd4401",
  "#2cd1d0",
  "#9b82e0",
  "#c8ff2e",
];
const PIECES = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 900) / 1000,
  dur: 1.6 + ((i * 29) % 10) / 10,
  rot: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
  w: 6 + (i % 3) * 3,
  round: i % 4 === 0,
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
          className={clsx(
            "absolute top-0 block",
            p.round ? "rounded-full" : "rounded-[2px]",
          )}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w * 1.6,
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
      title="Course complete. Go make something with it."
      description={`You finished every lesson and test in ${course.title}.`}
      footer={
        <>
          <Button variant="secondary" href="/dashboard">
            Back to dashboard
          </Button>
          {certificate && (
            <Button
              variant="sun"
              href={`/certificates/${certificate.code}`}
              iconRight="arrow-right"
              icon="award"
            >
              View certificate
            </Button>
          )}
        </>
      }
    >
      <div ref={bodyRef} className="relative">
        {open && panel && <Confetti host={panel} />}
        <div className="relative flex items-center gap-4 rounded-card bg-butter p-4 md:p-5">
          <div className="grid size-20 shrink-0 place-items-center rounded-full bg-white">
            <Mascot
              title=""
              wink
              className="w-12"
              style={{ transform: "rotate(-8deg)" }}
            />
          </div>
          <div className="min-w-0">
            {certificate ? (
              <>
                <p className="t-micro text-[#6b5400] uppercase">
                  Certificate issued
                </p>
                <p className="mt-1 font-display text-[28px] leading-none tracking-[0.02em]">
                  {certificate.code}
                </p>
                <p className="mt-1.5 t-small text-ink/70">
                  {certificate.hours}{" "}
                  {certificate.hours === 1 ? "hour" : "hours"} · issued{" "}
                  {formatDate(certificate.issuedAt, "long")} · anyone can verify
                  it with this code
                </p>
              </>
            ) : (
              <>
                <p className="t-app-h3">Every item done.</p>
                <p className="mt-1 t-small text-ink/70">
                  This course doesn&apos;t come with a certificate, but the
                  skills are all yours.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="t-app-h3">How was it?</h3>
          {existing && !sent ? (
            <p className="mt-1.5 t-small text-ink/65">
              You already reviewed this course ({existing.rating} of 5). Thank
              you!
            </p>
          ) : sent ? (
            <p
              className="mt-1.5 flex items-center gap-1.5 t-small font-semibold text-ink"
              role="status"
            >
              <Icon
                name="check-circle"
                className="size-4 shrink-0 text-green"
              />
              Thanks, your review is live on the course page.
            </p>
          ) : userId ? (
            <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
              <fieldset>
                <legend className="mb-1.5 text-[14px] font-bold">
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
                      className="tap grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue hf:bg-butter coarse:size-11"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={clsx(
                          "size-7",
                          n <= rating ? "text-tangerine" : "text-ink/25",
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
                    className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#b02f00]"
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
