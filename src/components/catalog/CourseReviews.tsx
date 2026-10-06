"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Avatar, Button, DemoPill, EmptyState, Field, Icon, Input, Rating, Select, Textarea, toast } from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseById, getCourseProgress, getRatingBreakdown, getReviews, getTutor, getUser, isEnrolled, plural, timeAgo, type Review, type ReviewWithUser } from "@/lib/mock";
import { reviewHints } from "@/lib/mock/extra/catalog";
import { SectionTitle } from "./ui";

type Sort = "newest" | "helpful" | "highest" | "lowest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "helpful", label: "Most helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

/**
 * "People are saying": rating histogram (click a bar to filter), sortable list,
 * tutor replies, helpful votes, show more, and a review form for enrolled
 * students who haven't reviewed yet (demo.addReview). All sample data.
 */
export function CourseReviews({ courseId }: { courseId: string }) {
  const db = useDb();
  const session = useDemoSession();
  const [sort, setSort] = useState<Sort>("helpful");
  const [star, setStar] = useState(0);
  const [shown, setShown] = useState(4);
  const [editing, setEditing] = useState(false);
  // after posting, saving or cancelling an edit, focus goes to the pinned card's Edit button
  const refocusEdit = useRef(false);
  // "Show more reviews": focus moves to the first newly shown review (the button may unmount)
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
  const course = getCourseById(courseId, db);
  if (!course) return null;
  const tutor = getTutor(course.tutorId, db);
  const breakdown = getRatingBreakdown(course.id, db);
  const page = getReviews(course.id, { sort, rating: star || undefined, pageSize: shown }, db);
  const uid = session?.role === "student" ? session.userId : null;
  const enrolled = !!uid && isEnrolled(uid, course.id, db);
  // the signed-in student's own review: pinned first whatever the sort, with Edit
  const mineRow = uid ? db.reviews.find((r) => r.userId === uid && r.courseId === course.id) : undefined;
  const mine: ReviewWithUser | null = mineRow ? { ...mineRow, user: getUser(mineRow.userId, db) } : null;
  const reviewed = !!mine;
  const mineShown = !!mine && (!star || mine.rating === star);
  const others = page.items.filter((r) => r.id !== mine?.id);
  // rule: enrolled + at least one finished lesson or test, so reviews come from people who've watched something
  const started = enrolled && getCourseProgress(uid!, course.id, db).completed > 0;
  const canReview = enrolled && started && !reviewed;
  const onPosted = () => {
    // the new review is pinned first; clear the rating filter so it's in view
    setStar(0);
    setShown(4);
    // the form unmounts (replaced by the pinned card): keep keyboard focus on that card
    refocusEdit.current = true;
    setEditing(false);
  };
  const live = course.status === "published" || course.status === "archived";
  const notYet = enrolled && !started && !reviewed && (
    <p className="flex items-start gap-2 rounded-card bg-butter px-4 py-3 text-[14px] font-semibold text-[#6b5400]">
      <Icon name="info" className="mt-px size-4 shrink-0" />
      Reviews open after your first finished lesson. Press play, then come back and tell people what clicked.
    </p>
  );

  return (
    <section aria-labelledby="reviews-title">
      <SectionTitle kicker="Reviews" title="People are saying" id="reviews-title" action={<DemoPill />} />

      {breakdown.total === 0 ? (
        <div className="mt-6 rounded-card-lg bg-white shadow-soft">
          {live ? (
            <EmptyState title="Be the first human to leave a note." body="Nobody has reviewed this course yet. Once you've watched a lesson or two, tell people what clicked." art="buddy" tone="mint" />
          ) : (
            <EmptyState title="No reviews yet." body="Reviews appear here once learners can buy it." art="buddy" tone="lilac" />
          )}
          {(canReview || notYet) && (
            <div className="px-5 pb-6 md:px-8">{canReview ? <ReviewForm courseId={course.id} userId={uid!} onPosted={onPosted} /> : notYet}</div>
          )}
        </div>
      ) : (
                // side by side on tablets and wide desktops; stacked in the narrow 1024-1279 main column
        <div className="mt-6 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8 lg:grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="self-start rounded-card-lg bg-white p-5 shadow-soft md:sticky md:top-[calc(var(--header-offset)+8px)] lg:static lg:grid lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start lg:gap-x-8 xl:sticky xl:block">
            <div className="flex items-end gap-3">
              <span className="font-display text-[4rem] leading-[0.8] font-black">{breakdown.average.toFixed(1)}</span>
              <div className="pb-1">
                <Rating value={breakdown.average} showValue={false} />
                <p className="mt-1 text-[13px] font-semibold text-ink/60">{plural(breakdown.total, "review")}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-1 lg:row-span-2 lg:mt-0 xl:mt-5" aria-label="Filter reviews by rating">
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
                        setShown(4);
                      }}
                      aria-label={`${s} star reviews: ${n} (${pct}%)${active ? ", showing only these" : ""}`}
                      className={clsx(
                        "flex w-full items-center gap-2.5 rounded-tag px-2 py-1.5 text-[13px] font-bold transition-colors disabled:cursor-default disabled:opacity-45",
                        active ? "bg-butter" : "hf:bg-ink/[0.04]",
                      )}
                    >
                      <span className="inline-flex w-7 items-center gap-0.5">
                        {s}
                        <svg viewBox="0 0 24 24" className="size-3.5 text-tangerine" aria-hidden>
                          <path d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                        <span className="block h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-8 text-right tabular-nums text-ink/55">{pct}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {star > 0 && (
              <button type="button" onClick={() => setStar(0)} className="mt-3 px-2 text-[13px] font-bold text-blue underline-offset-4 hf:underline">
                Show all ratings
              </button>
            )}
          </div>

          <div className="min-w-0">
            {canReview && <ReviewForm courseId={course.id} userId={uid!} onPosted={onPosted} />}
            {notYet}
            <div className={clsx("flex flex-wrap items-center justify-between gap-3", (canReview || notYet) && "mt-6")}>
              <p className="text-[14px] font-semibold text-ink/60" aria-live="polite">
                {star
                  ? `${plural(page.total, "review")} with ${star} star${star === 1 ? "" : "s"}`
                  : `Showing ${Math.min(page.total, others.length + (mineShown ? 1 : 0))} of ${page.total}`}
              </p>
              <label className="sr-only" htmlFor="review-sort">
                Sort reviews
              </label>
              <div className="w-[190px]">
                <Select
                  id="review-sort"
                  selectSize="sm"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as Sort);
                    setShown(4);
                  }}
                  options={SORTS}
                />
              </div>
            </div>
            <ul ref={listRef} className="mt-4 space-y-3">
              {mine && mineShown && (
                editing ? (
                  <li className="app-fade">
                    <ReviewForm courseId={course.id} userId={uid!} onPosted={onPosted} initial={mine} onCancel={() => {
                        refocusEdit.current = true;
                        setEditing(false);
                      }}
                    />
                  </li>
                ) : (
                  <ReviewCard key={mine.id} review={mine} tutorName={tutor?.name ?? "The tutor"} tutorAvatar={tutor?.avatar} own onEdit={() => setEditing(true)} />
                )
              )}
              {others.map((r) => (
                <ReviewCard key={r.id} review={r} tutorName={tutor?.name ?? "The tutor"} tutorAvatar={tutor?.avatar} />
              ))}
            </ul>
            {page.items.length < page.total && (
              <div className="mt-5">
                <Button
                  variant="secondary"
                  icon="plus"
                  onClick={() => {
                    focusFrom.current = listRef.current?.querySelectorAll(":scope > li").length ?? null;
                    setShown((n) => n + 4);
                  }}
                >
                  Show more reviews
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  review: r,
  tutorName,
  tutorAvatar,
  own,
  onEdit,
}: {
  review: ReviewWithUser;
  tutorName: string;
  tutorAvatar?: string;
  own?: boolean;
  onEdit?: () => void;
}) {
  const [helped, setHelped] = useState(false);
  const name = r.user?.name ?? "A learner";
  return (
    <li tabIndex={-1} className={clsx("app-fade rounded-card bg-white p-5 shadow-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue", own && "ring-2 ring-sun")}>
      {own && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-2.5 py-1 text-[12px] font-bold tracking-[0.04em] uppercase">
            <Icon name="star" className="size-3.5" />
            Your review
          </span>
          <Button id="review-edit" variant="ghost" size="sm" icon="edit" onClick={onEdit} aria-label="Edit your review">
            Edit
          </Button>
        </div>
      )}
      {own && r.hidden && (
        <p className="mb-3 rounded-tag bg-lilac/30 px-3 py-2 text-[13px] font-semibold text-ink/75">Hidden by the moderators, so only you can see it.</p>
      )}
      <div className="flex items-start gap-3">
        <Avatar name={name} src={r.user?.avatar} tone={r.user?.tone} size="md" decorative />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-[15px] font-bold">{name}</p>
            <p className="text-[12.5px] font-semibold text-ink/50">{timeAgo(r.createdAt)}</p>
          </div>
          <p className="text-[13px] font-semibold text-ink/55">{r.user?.city}</p>
        </div>
      </div>
      <div className="mt-3">
        <Rating value={r.rating} size="sm" showValue={false} />
        {r.title && <p className="t-app-h3 mt-2">{r.title}</p>}
        <p className="t-body mt-1.5 text-ink/80">{r.comment}</p>
      </div>
      {r.reply && (
        <div className="mt-4 flex gap-3 rounded-tag bg-cream p-3.5">
          <Avatar name={tutorName} src={tutorAvatar} size="sm" decorative />
          <div className="min-w-0">
            <p className="text-[13px] font-bold">
              {tutorName} <span className="font-semibold text-ink/50">replied</span>
            </p>
            <p className="mt-0.5 text-[14px] text-ink/75">{r.reply.body}</p>
          </div>
        </div>
      )}
      {!own && (
      <div className="mt-4">
        <button
          type="button"
          aria-pressed={helped}
          onClick={() => setHelped((h) => !h)}
          className={clsx("tap inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-colors", helped ? "bg-ink text-cream" : "bg-ink/[0.06] text-ink/75 hf:bg-ink/10")}
        >
          <Icon name="check" className="size-3.5" strokeWidth={2.6} />
          Helpful ({r.helpful + (helped ? 1 : 0)})
        </button>
      </div>
      )}
    </li>
  );
}

function ReviewForm({
  courseId,
  userId,
  onPosted,
  initial,
  onCancel,
}: {
  courseId: string;
  userId: string;
  onPosted: () => void;
  initial?: Review;
  onCancel?: () => void;
}) {
  const db = useDb();
  const [titleHint, bodyHint] = reviewHints(getCourseById(courseId, db));
  const ratingGroup = useRef<HTMLDivElement>(null);
  const commentBox = useRef<HTMLTextAreaElement>(null);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  // editing: focus lands in the review text (the Edit button that opened it is gone)
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
      // focus the first star so the keyboard lands on the problem
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
    <form onSubmit={submit} noValidate className="rounded-card bg-butter p-5">
      <p className="t-app-h3">{initial ? "Edit your review" : "What clicked for you?"}</p>
      <p className="mt-1 text-[14px] text-ink/70">
        {initial ? "Changed your mind or finished more lessons? Update it any time." : "You've started this course, so your review helps the next curious human decide."}
      </p>
      <fieldset className="mt-4">
        <legend className="text-[14px] font-bold">
          Your rating
          <span className="text-flame" aria-hidden>
            {" "}
            *
          </span>
        </legend>
        <div
          ref={ratingGroup}
          role="radiogroup"
          aria-label="Your rating"
          aria-required="true"
          aria-invalid={errors.rating ? true : undefined}
          aria-describedby={errors.rating ? "review-rating-err" : undefined}
          className="mt-1.5 flex gap-1"
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
                  setErrors((e) => ({ ...e, rating: undefined }));
                }}
                className="peer sr-only"
              />
              <span className="sr-only">
                {s} star{s === 1 ? "" : "s"}
              </span>
              {/* unselected stars: a white star with a dark outline (well over 3:1 on butter) */}
              <svg viewBox="0 0 24 24" className={clsx("size-8 rounded-md peer-focus-visible:outline-3 peer-focus-visible:outline-blue", (hover || rating) >= s ? "text-tangerine" : "text-ink/60")} aria-hidden>
                <path
                  d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z"
                  fill={(hover || rating) >= s ? "currentColor" : "#fff"}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p id="review-rating-err" role="alert" className="mt-1 text-[13px] font-semibold text-[#c13500]">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <div className="mt-4 grid gap-4">
        <Field label="Headline" optional>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={titleHint} />
        </Field>
        <Field label="Your review" error={errors.comment} required>
          <Textarea ref={commentBox} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} showCount rows={4} placeholder={bodyHint} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">{initial ? "Save changes" : "Post review"}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
