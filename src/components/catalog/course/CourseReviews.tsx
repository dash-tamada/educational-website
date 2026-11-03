"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Field, Input, Textarea, toast } from "@/components/app";
import { Button, Eyebrow } from "@/components/editorial";
import { COURSE_PAGE } from "@/lib/content/course";
import { demo } from "@/lib/demo/store";
import { formatNumber, getCourseProgress, getRatingBreakdown, getReviews, getTutor, getUser, isEnrolled, plural, timeAgo, type Review, type ReviewWithUser } from "@/lib/mock";
import { reviewHints } from "@/lib/mock/extra/catalog";
import { isFlagship, useCourseState } from "./state";
import { MonoTag, Stars } from "./ui";

/* =============================================================================
   08 REVIEWS. Cream. Left (sticky on desktop): the average in giant Anton, stars,
   the count and a ruled histogram (click a row to filter). Right: sort + ruled
   review rows (name, city, date | stars, headline, text, the tutor's reply,
   Helpful), "Show more", and the review form for enrolled learners who have
   finished something and haven't reviewed yet (demo.addReview). Sample data.
   ============================================================================= */

type Sort = "newest" | "helpful" | "highest" | "lowest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "helpful", label: "Most helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];
const PAGE = 5;

export function CourseReviews({ courseId, index }: { courseId: string; index?: string }) {
  const { course, db, session } = useCourseState(courseId);
  const [sort, setSort] = useState<Sort>("helpful");
  const [star, setStar] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState(false);
  const refocusEdit = useRef(false);
  const focusFrom = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focusFrom.current !== null) {
      const i = focusFrom.current;
      focusFrom.current = null;
      listRef.current?.querySelectorAll<HTMLElement>(":scope > li")[i]?.focus();
    }
    if (!refocusEdit.current || editing) return;
    refocusEdit.current = false;
    document.getElementById("review-edit")?.focus();
  });
  if (!course) return null;
  const tutor = getTutor(course.tutorId, db);
  const tutorName = tutor?.name ?? "The tutor";
  const breakdown = getRatingBreakdown(course.id, db);
  const page = getReviews(course.id, { sort, rating: star || undefined, pageSize: shown }, db);
  const uid = session?.role === "student" ? session.userId : null;
  const enrolled = !!uid && isEnrolled(uid, course.id, db);
  const mineRow = uid ? db.reviews.find((r) => r.userId === uid && r.courseId === course.id) : undefined;
  const mine: ReviewWithUser | null = mineRow ? { ...mineRow, user: getUser(mineRow.userId, db) } : null;
  const mineShown = !!mine && (!star || mine.rating === star);
  const others = page.items.filter((r) => r.id !== mine?.id);
  // reviews come from people who've watched something: enrolled + one finished item
  const started = enrolled && getCourseProgress(uid!, course.id, db).completed > 0;
  const canReview = enrolled && started && !mine;
  const live = course.status === "published" || course.status === "archived";
  const onPosted = () => {
    setStar(0);
    setShown(PAGE);
    refocusEdit.current = true;
    setEditing(false);
  };
  const notYet = enrolled && !started && !mine && (
    <p className="t-small border-l-2 border-red py-1 pl-4 text-muted">Reviews open after your first finished lesson. Press play, then come back and tell people what clicked.</p>
  );

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-12 py-section">
        {/* score column */}
        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-offset)+32px)]">
            <Eyebrow index={index}>{COURSE_PAGE.reviews.label}</Eyebrow>
            <h2 id="reviews-title" className="t-headline-l mt-6">
              {isFlagship(course) ? COURSE_PAGE.reviews.title : "What learners say"}
            </h2>
            {breakdown.total > 0 && (
              <>
                <p className="mt-8 flex items-end gap-3">
                  <span className="font-display text-[clamp(6.5rem,4rem+8vw,11rem)] leading-[0.78]">{breakdown.average.toFixed(1)}</span>
                  <span className="pb-2">
                    <Stars value={breakdown.average} className="text-red" size="size-4" />
                    <span className="t-label mt-2 block text-muted">
                      <span className="sr-only">out of 5, </span>
                      {formatNumber(breakdown.total)} reviews
                    </span>
                  </span>
                </p>
                <ul className="mt-8 border-t border-line" aria-label="Filter reviews by rating">
                  {([5, 4, 3, 2, 1] as const).map((s) => {
                    const n = breakdown.counts[s];
                    const pct = breakdown.total ? Math.round((n / breakdown.total) * 100) : 0;
                    const active = star === s;
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          aria-pressed={active}
                          disabled={!n}
                          onClick={() => {
                            setStar(active ? 0 : s);
                            setShown(PAGE);
                          }}
                          aria-label={`${s} star reviews: ${n} (${pct}%)${active ? ", showing only these" : ""}`}
                          className={clsx(
                            "group grid w-full grid-cols-[28px_1fr_40px] items-center gap-3 border-b border-line py-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-40",
                            active && "text-red",
                          )}
                        >
                          <span className="t-timecode">{s}★</span>
                          <span className="relative h-px bg-line-strong">
                            <span className={clsx("absolute inset-y-[-1px] left-0 transition-colors", active ? "bg-red" : "bg-fg group-hf:bg-red")} style={{ width: `${pct}%` }} />
                          </span>
                          <span className="t-timecode text-right text-muted">{pct}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {star > 0 && (
                  <button type="button" onClick={() => setStar(0)} className="link-draw t-label mt-4">
                    Show all ratings
                  </button>
                )}
              </>
            )}
            <p className="t-caption mt-6">{COURSE_PAGE.reviews.sample}</p>
          </div>
        </div>

        {/* list column */}
        <div className="col-span-12 min-w-0 lg:col-span-8 lg:col-start-5">
          {breakdown.total === 0 && !mine ? (
            <div className="border-t border-line pt-8">
              <p className="t-headline-m max-w-[22ch]">{live ? "Be the first to leave a note." : "No reviews yet."}</p>
              <p className="t-body mt-3 max-w-[34rem] text-muted">
                {live ? "Nobody has reviewed this course yet. Once you've watched a lesson or two, tell people what clicked." : "Reviews appear here once learners can buy it."}
              </p>
              {canReview && (
                <div className="mt-8">
                  <ReviewForm courseId={course.id} userId={uid!} onPosted={onPosted} />
                </div>
              )}
              {notYet && <div className="mt-6">{notYet}</div>}
            </div>
          ) : (
            <>
              {canReview && (
                <div className="mb-10">
                  <ReviewForm courseId={course.id} userId={uid!} onPosted={onPosted} />
                </div>
              )}
              {notYet && <div className="mb-8">{notYet}</div>}
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-strong pb-4">
                <p className="t-label text-muted" aria-live="polite">
                  {star ? `${plural(page.total, "review")} with ${star} star${star === 1 ? "" : "s"}` : `Showing ${Math.min(page.total, others.length + (mineShown ? 1 : 0))} of ${page.total}`}
                </p>
                <label className="flex items-center gap-3">
                  <span className="t-label text-muted">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as Sort);
                      setShown(PAGE);
                    }}
                    className="conv-field t-small h-9 pr-6 font-medium"
                  >
                    {SORTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ul ref={listRef}>
                {mine &&
                  mineShown &&
                  (editing ? (
                    <li className="border-b border-line py-8">
                      <ReviewForm
                        courseId={course.id}
                        userId={uid!}
                        onPosted={onPosted}
                        initial={mine}
                        onCancel={() => {
                          refocusEdit.current = true;
                          setEditing(false);
                        }}
                      />
                    </li>
                  ) : (
                    <ReviewRow key={mine.id} review={mine} tutorName={tutorName} own onEdit={() => setEditing(true)} />
                  ))}
                {others.map((r) => (
                  <ReviewRow key={r.id} review={r} tutorName={tutorName} />
                ))}
              </ul>
              {page.items.length < page.total && (
                <div className="mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      focusFrom.current = listRef.current?.querySelectorAll(":scope > li").length ?? null;
                      setShown((n) => n + PAGE);
                    }}
                  >
                    Show more reviews
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewRow({ review: r, tutorName, own, onEdit }: { review: ReviewWithUser; tutorName: string; own?: boolean; onEdit?: () => void }) {
  const [helped, setHelped] = useState(false);
  const name = r.user?.name ?? "A learner";
  return (
    <li tabIndex={-1} className="grid gap-x-8 gap-y-4 border-b border-line py-8 focus-visible:outline-offset-[-2px] md:grid-cols-[180px_minmax(0,1fr)] md:py-10">
      <div className="min-w-0">
        <p className="font-medium">{name}</p>
        {r.user?.city && <p className="t-small text-muted">{r.user.city}</p>}
        <p className="t-timecode mt-2 text-muted">{timeAgo(r.createdAt)}</p>
        {own && (
          <div className="mt-3 flex items-center gap-3">
            <MonoTag tone="solid">Your review</MonoTag>
            <button type="button" id="review-edit" onClick={onEdit} className="link-draw t-label" aria-label="Edit your review">
              Edit
            </button>
          </div>
        )}
      </div>
      <div className="min-w-0">
        {own && r.hidden && <p className="t-small mb-3 text-muted">Hidden by the moderators, so only you can see it.</p>}
        <p className="flex items-center gap-3">
          <Stars value={r.rating} className="text-red" />
          <span className="sr-only">{r.rating} out of 5 stars</span>
        </p>
        {r.title && <h3 className="mt-3 font-heading text-[clamp(1.1875rem,1rem+0.6vw,1.5rem)] leading-[1.15] font-semibold tracking-[-0.025em]">{r.title}</h3>}
        <p className="t-body mt-2 max-w-[44rem]">{r.comment}</p>
        {r.reply && (
          <div className="mt-5 max-w-[40rem] border-l-2 border-red pl-4">
            <p className="t-label">{tutorName} replied</p>
            <p className="t-small mt-1.5 text-muted">{r.reply.body}</p>
          </div>
        )}
        {!own && (
          <button
            type="button"
            aria-pressed={helped}
            onClick={() => setHelped((h) => !h)}
            className="tap t-label mt-5 inline-flex h-9 items-center gap-2 border border-line-strong px-3 transition-colors hf:border-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-surface"
          >
            Helpful <span className="font-mono">({r.helpful + (helped ? 1 : 0)})</span>
          </button>
        )}
      </div>
    </li>
  );
}

function ReviewForm({ courseId, userId, onPosted, initial, onCancel }: { courseId: string; userId: string; onPosted: () => void; initial?: Review; onCancel?: () => void }) {
  const { course } = useCourseState(courseId);
  const [titleHint, bodyHint] = reviewHints(course);
  const ratingGroup = useRef<HTMLDivElement>(null);
  const commentBox = useRef<HTMLTextAreaElement>(null);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  useEffect(() => {
    if (initial) commentBox.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (!rating) err.rating = "Pick a star rating.";
    if (comment.trim().length < 20) err.comment = "Tell people a bit more (20 characters or so).";
    setErrors(err);
    if (err.rating) {
      ratingGroup.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    if (err.comment) {
      commentBox.current?.focus();
      return;
    }
    demo.addReview(userId, courseId, rating, comment.trim(), title.trim() || undefined);
    onPosted();
    if (initial) toast.success("Review updated", { description: "Saved in this browser (demo data)." });
    else toast.success("Thanks for the review", { description: "It's pinned at the top of the list for you (demo data, saved in this browser)." });
  };

  return (
    <form onSubmit={submit} noValidate className="border border-line-strong p-5 md:p-8">
      <p className="t-headline-m">{initial ? "Edit your review" : "What clicked for you?"}</p>
      <p className="t-small mt-2 text-muted">{initial ? "Changed your mind or finished more lessons? Update it any time." : "You've started this course, so your review helps the next filmmaker decide."}</p>
      <fieldset className="mt-6">
        <legend className="t-label">
          Your rating<span className="text-red"> *</span>
        </legend>
        <div
          ref={ratingGroup}
          role="radiogroup"
          aria-label="Your rating"
          aria-required="true"
          aria-invalid={errors.rating ? true : undefined}
          aria-describedby={errors.rating ? "review-rating-err" : undefined}
          className="mt-3 flex gap-1.5"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <label key={s} className="cursor-pointer" onMouseEnter={() => setHover(s)}>
              <input
                type="radio"
                name="review-rating"
                value={s}
                checked={rating === s}
                onChange={() => {
                  setRating(s);
                  setErrors((er) => ({ ...er, rating: undefined }));
                }}
                className="peer sr-only"
              />
              <span className="sr-only">
                {s} star{s === 1 ? "" : "s"}
              </span>
              <span
                aria-hidden
                className={clsx(
                  "grid size-10 place-items-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
                  (hover || rating) >= s ? "border-red bg-red text-white" : "border-line-strong text-muted",
                )}
              >
                <svg viewBox="0 0 24 24" className="size-[18px]">
                  <path d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z" fill="currentColor" />
                </svg>
              </span>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p id="review-rating-err" role="alert" className="t-small mt-2 text-red-deep">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <div className="mt-6 grid gap-5">
        <Field label="Headline" optional>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={titleHint} />
        </Field>
        <Field label="Your review" error={errors.comment} required>
          <Textarea ref={commentBox} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} showCount rows={4} placeholder={bodyHint} />
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" arrow>
          {initial ? "Save changes" : "Post review"}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
