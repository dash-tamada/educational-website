"use client";

import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { useId, useRef, useState } from "react";
import clsx from "clsx";
import {
  Button,
  Field,
  Icon,
  Input,
  Modal,
  Textarea,
  toast,
  useIsPhone,
} from "@/components/app";
import { demo } from "@/lib/demo/store";
import { formatDate, type Course, type Review } from "@/lib/mock";

/* =============================================================================
   Rate-a-course dialog (one review per learner per course; re-submitting edits
   it). Writes through demo.addReview, so the course page's reviews and the
   tutor's review inbox pick it up straight away.
   ============================================================================= */

const WORDS = ["", "Not for me", "Meh", "Decent", "Really good", "Loved it"];

function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReviewDialog({
  open,
  onClose,
  onSaved,
  uid,
  course,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  /** runs after the review is saved and the dialog has closed (move focus if the trigger is gone) */
  onSaved?: () => void;
  uid: string;
  course: Course;
  existing?: Review;
}) {
  // phones: the dialog is a bottom sheet (Modal does that) and Post lives in its sticky
  // footer, above the keyboard and the home indicator (S-07)
  const phone = useIsPhone();
  const formId = useId();
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? "Edit your review" : `Rate ${course.title}`}
      description="Honest beats nice. Your review helps the next learner decide, and helps the tutor get better."
      mobileFooter="fill"
      footer={
        phone ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              loading={busy}
              icon="star"
              className="h-12"
            >
              {existing ? "Update review" : "Post review"}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* keyed so a reopened dialog starts from the saved review */}
      {open && (
        <ReviewForm
          key={existing?.id ?? "new"}
          id={formId}
          inlineActions={!phone}
          onBusy={setBusy}
          uid={uid}
          course={course}
          existing={existing}
          onDone={onClose}
          onSaved={() => {
            onClose();
            onSaved?.();
          }}
        />
      )}
    </Modal>
  );
}

function ReviewForm({
  id,
  inlineActions = true,
  onBusy,
  uid,
  course,
  existing,
  onDone,
  onSaved,
}: {
  id?: string;
  /** desktop: Cancel / Post sit at the end of the form (phones put them in the sheet footer) */
  inlineActions?: boolean;
  onBusy?: (busy: boolean) => void;
  uid: string;
  course: Course;
  existing?: Review;
  onDone: () => void;
  onSaved: () => void;
}) {
  const router = useTransitionRouter();
  const name = useId();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>(
    {},
  );
  const [busy, setBusyState] = useState(false);
  const setBusy = (b: boolean) => {
    setBusyState(b);
    onBusy?.(b);
  };
  const formRef = useRef<HTMLFormElement>(null);
  const shown = hover || rating;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!rating) next.rating = "Pick a star rating first.";
    if (comment.trim().length < 20)
      next.comment = "A sentence or two, please (20 characters or more).";
    setErrors(next);
    if (Object.keys(next).length) {
      // land on the first problem: the checked star (or the first one), else the review text
      requestAnimationFrame(() => {
        const form = formRef.current;
        const el = next.rating
          ? (form?.querySelector<HTMLElement>(
              `input[name="${CSS.escape(name)}"]:checked`,
            ) ??
            form?.querySelector<HTMLElement>(
              `input[name="${CSS.escape(name)}"]`,
            ))
          : form?.querySelector<HTMLElement>('[aria-invalid="true"]');
        el?.focus();
      });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      demo.addReview(uid, course.id, rating, comment, title);
      setBusy(false);
      onSaved();
      toast({
        title: existing ? "Review updated" : "Thanks for the review!",
        description:
          "It's on the course page now (in this demo browser). Sort reviews by Newest to find it.",
        tone: "success",
        action: {
          label: "View",
          onClick: () => router.push(`/courses/${course.slug}#reviews-title`),
        },
      });
    }, 350);
  };

  return (
    <form
      id={id}
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="space-y-5"
    >
      <fieldset aria-describedby={errors.rating ? `${name}-err` : undefined}>
        <legend className="text-[11px] font-semibold tracking-[0.14em] uppercase">
          Your rating{" "}
          <span className="text-red" aria-hidden>
            *
          </span>
        </legend>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="cursor-pointer p-0.5 coarse:p-1"
                onMouseEnter={() => setHover(n)}
              >
                <input
                  type="radio"
                  name={name}
                  value={n}
                  checked={rating === n}
                  data-autofocus={
                    (rating ? rating === n : n === 1) ? "" : undefined
                  }
                  onChange={() => {
                    setRating(n);
                    setErrors((er) => ({ ...er, rating: undefined }));
                  }}
                  className="peer sr-only"
                />
                <span className="sr-only">
                  {n} star{n > 1 ? "s" : ""}, {WORDS[n]}
                </span>
                <span className="block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red">
                  <Star
                    filled={n <= shown}
                    className={clsx(
                      "size-9 text-fg transition-transform duration-150",
                      n <= shown && "scale-105",
                    )}
                  />
                </span>
              </label>
            ))}
          </div>
          <span
            className={clsx("font-mono text-[12px] tracking-[0.06em] uppercase", !shown && "text-muted")}
            aria-hidden
          >
            {shown ? WORDS[shown] : "Tap a star"}
          </span>
        </div>
        {errors.rating && (
          <p
            id={`${name}-err`}
            role="alert"
            className="mt-1.5 flex items-start gap-1 text-[13px] leading-snug font-medium text-red-deep"
          >
            <Icon name="alert" className="mt-px size-3.5" strokeWidth={2.4} />
            {errors.rating}
          </p>
        )}
      </fieldset>

      <Field label="Headline" optional>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Worth every rupee"
        />
      </Field>
      <Field
        label="Your review"
        required
        error={errors.comment}
        hint="What clicked, what didn't, who you'd recommend it to."
      >
        <Textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (errors.comment && e.target.value.trim().length >= 20)
              setErrors((er) => ({ ...er, comment: undefined }));
          }}
          rows={5}
          maxLength={600}
          showCount
          placeholder="The short lessons fit my commute, and the quizzes between videos kept me honest."
        />
      </Field>

      {existing?.reply && (
        <div className="border-l-2 border-red py-1 pl-4">
          <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
            Tutor replied · {formatDate(existing.reply.createdAt, "short")}
          </p>
          <p className="mt-1.5 t-small">{existing.reply.body}</p>
        </div>
      )}

      {inlineActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <p className="mr-auto t-small text-muted">
            Shown with your name and city.
          </p>
          <Button variant="ghost" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="red" loading={busy} icon="star">
            {existing ? "Update review" : "Post review"}
          </Button>
        </div>
      ) : (
        <p className="t-small text-muted">
          Shown with your name and city.
        </p>
      )}
    </form>
  );
}
