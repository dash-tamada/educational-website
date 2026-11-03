"use client";

import { useState } from "react";
import {
  Button,
  ConfirmDialog,
  Field,
  Modal,
  StatusPill,
  Textarea,
  toast,
} from "@/components/app";
import { CheckRow, RuleNote } from "@/components/tutor/editorial";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatINR,
  getCurriculum,
  getUser,
  plural,
  type Course,
  type Db,
  type Question,
  type Quiz,
} from "@/lib/mock";

/* =============================================================================
   Course review helpers: the automatic checklist and the publish / send back /
   archive / restore dialogs (used by the queue, the table and the review page).
   ============================================================================= */

/** A "rejected" course that has been live before: an admin unpublished it, and the
 *  learners who bought it keep their access. */
export const wasLive = (c: Course) => c.status === "rejected" && !!c.publishedAt;

/** StatusPill for a course: says "Unpublished" instead of "Rejected" for a course
 *  that was taken down after going live. */
export function CourseStatusPill({
  course,
  size,
}: {
  course: Course;
  size?: "sm" | "md";
}) {
  return (
    <StatusPill
      status={course.status}
      size={size}
      label={wasLive(course) ? "Unpublished" : undefined}
    />
  );
}

export interface ReviewCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** where the problem is (quiz check): item ids to jump to in the curriculum */
  issues?: { itemId: string; moduleId: string; label: string }[];
}

/** Why a question can't be graded, or null when it's fine. */
export function questionProblem(q: Question): string | null {
  if (q.type === "short")
    return q.acceptedAnswers?.length ? null : "No accepted answer";
  if (!q.options.length) return "No options to choose from";
  return q.options.some((o) => o.isCorrect) ? null : "No correct answer marked";
}
/** Problems in a quiz: one line per broken question (or an empty quiz). */
export function quizProblems(quiz: Quiz): string[] {
  if (!quiz.questions.length) return ["The test has no questions"];
  return quiz.questions.flatMap((q, i) => {
    const p = questionProblem(q);
    return p ? [`Question ${i + 1}: ${p.toLowerCase()}`] : [];
  });
}

export function courseChecks(course: Course, db: Db): ReviewCheck[] {
  const mods = getCurriculum(course.id, db);
  const items = mods.flatMap((m) => m.items);
  const videoItems = items.flatMap((i) => (i.type === "video" ? [i] : []));
  const videos = videoItems.map((i) => i.lesson);
  const quizItems = items.flatMap((i) => (i.type === "quiz" ? [i] : []));
  const quizzes = quizItems.map((i) => i.quiz);
  const first = items[0];
  const uncaptioned = videoItems.filter((i) => !i.lesson.hasCaptions);
  const noCaptions = uncaptioned.length;
  const modNo = (moduleId: string) =>
    mods.find((m) => m.id === moduleId)?.position ?? 0;
  const broken = quizItems.filter((i) => quizProblems(i.quiz).length > 0);
  const badQuizzes = broken.length;
  const promiseOk =
    course.promise.trim().length >= 20 &&
    course.description.trim().length >= 60;
  return [
    {
      id: "promise",
      label: "Clear promise",
      ok: promiseOk,
      detail: promiseOk
        ? `“${course.promise}”`
        : "The one-line promise or description is too thin to sell the course.",
    },
    {
      id: "preview",
      label: "Useful first video",
      ok: !!first && first.type === "video" && first.lesson.isFreePreview,
      detail:
        first?.type === "video"
          ? first.lesson.isFreePreview
            ? `“${first.lesson.title}” is the free preview.`
            : "The first video isn't marked as the free preview."
          : first
            ? "The course starts with a test or file, not a video."
            : "There are no lessons yet.",
    },
    {
      id: "captions",
      label: "Accessible captions",
      ok: videos.length > 0 && noCaptions === 0,
      detail: !videos.length
        ? "No videos to caption yet."
        : noCaptions
          ? `${plural(noCaptions, "video")} still ${noCaptions === 1 ? "needs" : "need"} captions.`
          : `All ${plural(videos.length, "video")} have captions.`,
      issues: uncaptioned.map((i) => ({
        itemId: i.id,
        moduleId: i.moduleId,
        label: `Module ${modNo(i.moduleId)}: ${i.lesson.title}`,
      })),
    },
    {
      id: "quizzes",
      label: "Quiz answers verified",
      ok: badQuizzes === 0,
      detail: !quizzes.length
        ? "No tests in this course (that's allowed)."
        : badQuizzes
          ? `${plural(badQuizzes, "test")} can't be graded yet.`
          : `Every question in ${plural(quizzes.length, "test")} has an answer.`,
      issues: broken.map((i) => ({
        itemId: i.id,
        moduleId: i.moduleId,
        label: `${i.quiz.title}: ${quizProblems(i.quiz).join("; ")}`,
      })),
    },
    {
      id: "basics",
      label: "Thumbnail and price present",
      ok: !!course.thumbnail && course.price > 0,
      detail:
        course.price > 0
          ? `Cover set, priced at ${formatINR(course.price)}.`
          : "The course has no price yet.",
    },
  ];
}

/* ----------------------------------------------------------------------------- dialogs */
export type CourseAction = {
  kind: "publish" | "send_back" | "archive" | "restore";
  course: Course;
  /** review page only: did the admin tick "I watched the free preview"? */
  watched?: boolean;
} | null;

export function CourseActionDialogs({
  action,
  onClose,
}: {
  action: CourseAction;
  onClose: () => void;
}) {
  const db = useDb();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const failing =
    action?.kind === "publish"
      ? courseChecks(action.course, db).filter((x) => !x.ok)
      : [];
  const close = () => {
    setNote("");
    setError(null);
    onClose();
  };
  const c = action?.course;
  const tutorName = c ? (getUser(c.tutorId, db)?.name ?? "The tutor") : "";
  /** a tutor's draft that was never sent for review */
  const unsubmitted = c?.status === "draft";
  /** "send back" on a live course is an unpublish: different stakes, different copy */
  const unpublishing = c?.status === "published";
  /** publishing a course that was live before and got unpublished */
  const republishing = !!c && wasLive(c);
  const quickNotes = unpublishing
    ? [
        "We received a copyright complaint about some of the material.",
        "Parts of the course are out of date and need a refresh.",
        "Several lessons don't play or have broken audio.",
      ]
    : [
        "Please add captions to every video.",
        "One quiz question has no correct answer marked.",
        "The first video should be a real lesson, not a trailer.",
      ];

  const sendBack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!c) return;
    if (note.trim().length < 15)
      return setError(
        "Give the tutor something to act on (at least a sentence).",
      );
    demo.setCourseStatus(c.id, "rejected", note);
    if (c.featured) demo.setCourseFeatured(c.id, false);
    if (unpublishing)
      toast.info(`${c.title} is unpublished.`, {
        description: `It's out of the catalogue. ${tutorName} sees your note on their courses page.`,
      });
    else
      toast.info(`${c.title} went back to the tutor.`, {
        description: "They see your note on their courses page.",
      });
    close();
  };

  const publishTitle = failing.length
    ? republishing
      ? "Republish with open issues?"
      : "Publish with open issues?"
    : republishing
      ? "Republish this course?"
      : unsubmitted
        ? "Publish this draft?"
        : "Publish this course?";
  const publishLabel = failing.length
    ? republishing
      ? "Republish anyway"
      : "Publish anyway"
    : republishing
      ? "Republish"
      : "Publish course";
  const confirmPublish = () => {
    if (!c) return;
    demo.setCourseStatus(c.id, "published");
    toast.success(
      republishing ? `${c.title} is live again.` : `${c.title} is live.`,
      {
        description: republishing
          ? "It’s back in the catalogue and search, and the tutor sees it as published."
          : "It’s in the catalogue now, and the tutor sees it as published.",
      },
    );
    close();
  };
  return (
    <>
      {/* The publish decision is the cinematic moment: an ink panel, one red button. */}
      <ConfirmDialog
        open={action?.kind === "publish"}
        onClose={close}
        onConfirm={confirmPublish}
        tone={failing.length ? "danger" : "red"}
        confirmIcon="check"
        confirmLabel={publishLabel}
        surface="ink"
        eyebrow={
          c
            ? `${republishing ? "Republish" : "Publish"} · ${tutorName}`
            : "Publish"
        }
        title={publishTitle}
        description={
          c
            ? failing.length
              ? `${plural(failing.length, "automatic check")} ${failing.length === 1 ? "fails" : "fail"}. Learners would see ${c.title} as it is.`
              : republishing
                ? `${c.title} goes back into the catalogue and search straight away. Learners who bought it never lost access.`
                : `${c.title} goes into the catalogue straight away. The first video stays free for everyone.`
            : undefined
        }
      >
        {(failing.length > 0 || action?.watched === false || unsubmitted) && (
          <div className="space-y-3">
            {unsubmitted && (
              <RuleNote tone="quiet" label="Not submitted yet">
                {tutorName} hasn&apos;t submitted this yet. Publishing skips
                their request for review, and it goes live as it is today.
              </RuleNote>
            )}
            {failing.length > 0 && (
              <ul className="divide-y divide-line border-y border-line">
                {failing.map((f) => (
                  <CheckRow key={f.id} state="fail" hint={f.detail}>
                    {f.label}
                  </CheckRow>
                ))}
              </ul>
            )}
            {action?.watched === false && (
              <RuleNote tone="red" label="Free preview not ticked">
                You haven&apos;t ticked “I watched the free preview” yet.
                It&apos;s the first thing every learner sees.
              </RuleNote>
            )}
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={action?.kind === "archive"}
        onClose={close}
        tone="danger"
        onConfirm={() => {
          if (!c) return;
          demo.setCourseStatus(c.id, "archived");
          if (c.featured) demo.setCourseFeatured(c.id, false);
          toast({
            title: `${c.title} is archived.`,
            description:
              "Hidden from the catalogue. People who bought it keep access.",
          });
        }}
        title="Archive this course?"
        description="It disappears from the catalogue and search. Learners who already own it keep full access."
        confirmLabel="Archive"
      />
      <ConfirmDialog
        open={action?.kind === "restore"}
        onClose={close}
        onConfirm={() => {
          if (!c) return;
          demo.setCourseStatus(c.id, "published");
          toast.success(`${c.title} is back in the catalogue.`);
        }}
        title="Restore this course?"
        description="It goes straight back into the catalogue as published."
        confirmLabel="Restore"
      />
      <Modal
        open={action?.kind === "send_back"}
        onClose={close}
        eyebrow={
          c
            ? unpublishing
              ? `Unpublish · ${tutorName}`
              : `Send back · ${tutorName}`
            : undefined
        }
        title={
          unpublishing && c ? `Unpublish ${c.title}?` : "Send back with a note"
        }
        description={
          c
            ? unpublishing
              ? `It leaves the catalogue and search now. ${plural(c.learners, "learner")} who bought it keep full access. ${tutorName} sees your note and can fix and resubmit.${c.featured ? " It also loses its Featured spot." : ""}`
              : `${c.title} moves to “Rejected” until the tutor fixes it and resubmits.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="sendback-form"
              variant="danger"
              icon={unpublishing ? "eye-off" : "arrow-left"}
            >
              {unpublishing ? "Unpublish" : "Send back"}
            </Button>
          </>
        }
      >
        <form
          id="sendback-form"
          onSubmit={sendBack}
          noValidate
          className="space-y-3"
        >
          <Field
            label={unpublishing ? "Why it's coming down" : "Note for the tutor"}
            required
            hint={
              unpublishing
                ? "The tutor sees this. Say what happened and what would bring it back."
                : "Be specific and friendly: what to change, and where."
            }
            error={error ?? undefined}
          >
            <Textarea
              rows={5}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              placeholder={
                unpublishing
                  ? "e.g. A rights holder flagged the music in Module 3. Swap the tracks and resubmit, and it goes straight back up."
                  : "e.g. Module 2, lesson 3 has no captions, and Quiz 1 question 4 has no correct answer marked. Fix those and resubmit!"
              }
              maxLength={600}
              showCount
            />
          </Field>
          <p className="pt-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Quick notes
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick notes">
            {quickNotes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setNote((n) => (n.trim() ? `${n.trim()} ${s}` : s));
                  setError(null);
                }}
                className="tap min-h-9 px-3 py-2 text-left text-[13px] leading-snug text-fg ring-1 ring-line-strong transition-colors ring-inset hf:bg-fg hf:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red coarse:min-h-11"
              >
                <span aria-hidden className="mr-1.5 font-mono text-red-deep">+</span>
                {s}
              </button>
            ))}
          </div>
        </form>
      </Modal>
    </>
  );
}
