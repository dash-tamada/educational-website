"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  ProgressBar,
  ProgressRing,
  Segmented,
  StickyActionBar,
  toast,
} from "@/components/app";
import { Mascot } from "@/components/decor/Mascot";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import {
  formatDate,
  getQuizAttempts,
  getQuizForTaking,
  gradeQuiz,
  itemTitle,
  plural,
  type ItemContext,
  type ModuleItem,
  type Question,
  type QuizAnswers,
  type QuizItem,
} from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { learnHref, useLearn } from "./context";
import { usePref } from "./usePref";

/* =============================================================================
   Tiny tests between lessons. Intro -> taking (one at a time or full form) ->
   graded locally -> result with explanations. Correct answers are never rendered
   before submission (getQuizForTaking); after a failed attempt with tries left,
   the review shows right/wrong + explanations but not the right option.
   ============================================================================= */

type Phase =
  | { kind: "intro" }
  | { kind: "taking" }
  | {
      kind: "result";
      /** a practice round: graded here, never saved, no attempt used */
      practice: boolean;
      attemptId: string | null;
      score: number;
      passed: boolean;
      results: { questionId: string; correct: boolean }[];
      answers: QuizAnswers;
    };

export function QuizRunner({ ctx }: { ctx: ItemContext & { item: QuizItem } }) {
  const {
    course,
    db,
    session,
    tracking,
    flat,
    accessMap,
    afterProgress,
    setFocusMode,
  } = useLearn();
  const quiz = ctx.item.quiz;
  const forTaking = useMemo(() => getQuizForTaking(quiz), [quiz]);
  const uid = session?.userId ?? null;
  const attempts = uid && tracking ? getQuizAttempts(uid, ctx.item.id, db) : [];
  const passedBefore = attempts.some((a) => a.passed);
  const best = attempts.reduce((m, a) => Math.max(m, a.score), 0);
  const left =
    quiz.maxAttempts > 0
      ? Math.max(0, quiz.maxAttempts - attempts.length)
      : Infinity;
  const outOfTries = tracking && left === 0;

  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  /** the round in progress is practice (after a pass, or with no attempts left) */
  const [practice, setPractice] = useState(false);
  const [mode, setMode] = usePref<string>("quiz-mode", "one");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const answered = (q: { id: string; type: Question["type"] }) => {
    const a = answers[q.id];
    return q.type === "short"
      ? typeof a === "string" && a.trim().length > 0
      : Array.isArray(a) && a.length > 0;
  };
  const unanswered = forTaking.questions.filter((q) => !answered(q)).length;
  const total = forTaking.questions.length;
  const taking = phase.kind === "taking";
  // focus mode: the "Your path" bar steps aside for the test's own action bar
  useEffect(() => {
    if (!taking) return;
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [taking, setFocusMode]);
  const submitBtn = useRef<HTMLButtonElement>(null);

  const start = (asPractice = false) => {
    setPractice(asPractice);
    setAnswers({});
    setStep(0);
    setDeadline(
      quiz.timeLimitMin ? Date.now() + quiz.timeLimitMin * 60_000 : null,
    );
    setPhase({ kind: "taking" });
    requestAnimationFrame(() => focusTop(topRef.current));
  };

  const submit = () => {
    setConfirm(false);
    setDeadline(null);
    if (tracking && uid && !practice) {
      try {
        const a = demo.submitQuiz(uid, course.id, ctx.item.id, answers);
        setPhase({
          kind: "result",
          practice: false,
          attemptId: a.id,
          score: a.score,
          passed: a.passed,
          results: a.results,
          answers,
        });
        // the completion modal (last open item) already celebrates
        if (a.passed && !afterProgress())
          toast.success(
            quiz.isGating
              ? "Passed! The next lessons are unlocked."
              : "Passed! Nice work.",
            { description: `You scored ${a.score}%.` },
          );
      } catch (e) {
        toast.error(
          e instanceof Error && e.message === "No attempts left"
            ? "No attempts left on this test."
            : "Couldn't submit that attempt.",
        );
      }
    } else {
      const g = gradeQuiz(quiz, answers);
      setPhase({
        kind: "result",
        practice: tracking && practice,
        attemptId: null,
        score: g.score,
        passed: g.passed,
        results: g.results,
        answers,
      });
    }
    requestAnimationFrame(() => focusTop(topRef.current));
  };

  // time limit (none of the seeded tests have one, but the model supports it)
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [deadline]);
  const remaining =
    deadline && now ? Math.max(0, Math.round((deadline - now) / 1000)) : null;
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    if (remaining === 0 && phase.kind === "taking") {
      toast.info("Time's up", { description: "We submitted what you had." });
      submitRef.current();
    }
  }, [remaining, phase.kind]);

  const setAnswer = (qid: string, v: string[] | string) =>
    setAnswers((a) => ({ ...a, [qid]: v }));
  const nextItem = ctx.next;
  const afterQuiz = flat.slice(ctx.index + 1);
  const unlocked = quiz.isGating
    ? afterQuiz.filter((x) => accessMap[x.item.id]?.allowed).slice(0, 3)
    : [];

  return (
    <Card padding="none" className="overflow-hidden">
      <div
        ref={topRef}
        id="quiz-top"
        tabIndex={-1}
        aria-label={`Test: ${quiz.title}`}
        className="scroll-mt-24 focus:outline-none"
      >
        {phase.kind === "intro" && (
          <Intro
            ctx={ctx}
            attemptsCount={attempts.length}
            best={best}
            passedBefore={passedBefore}
            left={left}
            outOfTries={outOfTries}
            tracking={tracking}
            mode={mode}
            setMode={setMode}
            onStart={() => start(false)}
            onPractice={() => start(true)}
          />
        )}

        {phase.kind === "taking" && (
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="t-eyebrow text-blue">
                  {practice && tracking
                    ? "Practice run · not saved"
                    : "Tiny test time"}
                </p>
                <h1 className="mt-1.5 t-app-h2">{quiz.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                {remaining !== null && (
                  <Badge tone={remaining < 60 ? "flame" : "neutral"} dot>
                    <span className="tabular-nums">
                      {Math.floor(remaining / 60)}:
                      {String(remaining % 60).padStart(2, "0")} left
                    </span>
                  </Badge>
                )}
                <Badge tone="neutral">
                  {forTaking.questions.length - unanswered}/
                  {forTaking.questions.length} answered
                </Badge>
              </div>
            </div>

            {mode === "one" ? (
              <>
                <ProgressBar
                  value={((step + 1) / forTaking.questions.length) * 100}
                  size="sm"
                  tone="blue"
                  className="mt-5 max-sm:hidden"
                  label={`Question ${step + 1} of ${forTaking.questions.length}`}
                />
                {/* phones: one segment per question (tap one to jump there) */}
                <nav
                  aria-label="Jump to question"
                  className="mt-5 flex gap-1.5 sm:hidden"
                >
                  {forTaking.questions.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-current={i === step ? "step" : undefined}
                      aria-label={`Question ${i + 1}${answered(q) ? ", answered" : ""}`}
                      className={clsx(
                        "hit h-2 min-w-0 flex-1 rounded-full transition-colors",
                        i === step
                          ? "bg-ink"
                          : answered(q)
                            ? "bg-blue"
                            : "bg-ink/[0.1]",
                      )}
                    />
                  ))}
                </nav>
                <QuestionBlock
                  key={forTaking.questions[step].id}
                  q={forTaking.questions[step]}
                  index={step}
                  total={forTaking.questions.length}
                  value={answers[forTaking.questions[step].id]}
                  onChange={setAnswer}
                  autoFocus
                />
                {/* phones: these live in the sticky action bar below */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-ink/[0.07] pt-5 max-sm:hidden">
                  <Button
                    variant="ghost"
                    icon="chevron-left"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    {step < forTaking.questions.length - 1 ? (
                      <Button
                        iconRight="chevron-right"
                        onClick={() => setStep((s) => s + 1)}
                      >
                        {answered(forTaking.questions[step])
                          ? "Next question"
                          : "Skip for now"}
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        icon="check"
                        onClick={() =>
                          unanswered ? setConfirm(true) : submit()
                        }
                      >
                        Submit answers
                      </Button>
                    )}
                  </div>
                </div>
                <nav
                  aria-label="Jump to question"
                  className="mt-4 flex flex-wrap gap-1.5 max-sm:hidden"
                >
                  {forTaking.questions.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-current={i === step ? "step" : undefined}
                      aria-label={`Question ${i + 1}${answered(q) ? ", answered" : ""}`}
                      className={clsx(
                        "tap grid size-8 place-items-center rounded-full text-[13px] font-bold tabular-nums transition-colors",
                        i === step
                          ? "bg-ink text-cream"
                          : answered(q)
                            ? "bg-[#dfe8ff] text-blue-deep"
                            : "bg-ink/[0.06] text-ink/65 hf:bg-ink/10",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (unanswered) setConfirm(true);
                  else submit();
                }}
                noValidate
              >
                <ol className="mt-2 divide-y divide-ink/[0.07]">
                  {forTaking.questions.map((q, i) => (
                    <li key={q.id}>
                      <QuestionBlock
                        q={q}
                        index={i}
                        total={forTaking.questions.length}
                        value={answers[q.id]}
                        onChange={setAnswer}
                      />
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.07] pt-5">
                  <p className="t-small text-ink/65">
                    Pass mark {quiz.passPercentage}%.{" "}
                    {unanswered
                      ? `${plural(unanswered, "question")} still blank.`
                      : "All answered."}
                  </p>
                  <Button
                    ref={submitBtn}
                    type="submit"
                    variant="accent"
                    icon="check"
                    className="max-sm:w-full"
                  >
                    Submit answers
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {phase.kind === "result" && (
          <Result
            ctx={ctx}
            phase={phase}
            tracking={tracking}
            attemptsLeft={
              tracking
                ? quiz.maxAttempts > 0
                  ? Math.max(0, quiz.maxAttempts - attempts.length)
                  : Infinity
                : Infinity
            }
            unlocked={unlocked.map((x) => x.item)}
            nextItem={nextItem}
            nextOpen={!!nextItem && !!accessMap[nextItem.id]?.allowed}
            passedBefore={passedBefore}
            courseSlug={course.slug}
            onRetry={() => start(false)}
            onPractice={() => start(true)}
            onBack={() => setPhase({ kind: "intro" })}
          />
        )}
      </div>

      {taking &&
        (mode === "one" ? (
          <StickyActionBar
            show
            label="Test actions"
            title={`${total - unanswered} of ${total} answered`}
            sub={`Pass mark ${quiz.passPercentage}%`}
          >
            <Button
              variant="secondary"
              iconOnly
              icon="chevron-left"
              aria-label="Previous question"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            />
            {step < total - 1 ? (
              <Button
                className="h-12"
                iconRight="chevron-right"
                onClick={() => setStep((s) => s + 1)}
              >
                {answered(forTaking.questions[step]) ? "Next" : "Skip"}
              </Button>
            ) : (
              <Button
                className="h-12"
                variant="accent"
                icon="check"
                onClick={() => (unanswered ? setConfirm(true) : submit())}
              >
                Submit
              </Button>
            )}
          </StickyActionBar>
        ) : (
          <StickyActionBar
            watch={submitBtn}
            label="Test actions"
            title={`${total - unanswered} of ${total} answered`}
            sub={`Pass mark ${quiz.passPercentage}%`}
          >
            <Button
              className="h-12"
              variant="accent"
              icon="check"
              onClick={() => (unanswered ? setConfirm(true) : submit())}
            >
              Submit
            </Button>
          </StickyActionBar>
        ))}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={submit}
        title={`Submit with ${plural(unanswered, "blank question")}?`}
        description="Blank answers count as wrong. You can go back and fill them in first."
        confirmLabel="Submit anyway"
        cancelLabel="Keep answering"
      />
    </Card>
  );
}

/* ----------------------------------------------------------------------------- intro */
function Intro({
  ctx,
  attemptsCount,
  best,
  passedBefore,
  left,
  outOfTries,
  tracking,
  mode,
  setMode,
  onStart,
  onPractice,
}: {
  ctx: ItemContext & { item: QuizItem };
  attemptsCount: number;
  best: number;
  passedBefore: boolean;
  left: number;
  outOfTries: boolean;
  tracking: boolean;
  mode: string;
  setMode: (m: string) => void;
  onStart: () => void;
  onPractice: () => void;
}) {
  const { db, session } = useLearn();
  const quiz = ctx.item.quiz;
  const attempts =
    session && tracking ? getQuizAttempts(session.userId, ctx.item.id, db) : [];
  const facts = [
    { icon: "quiz", label: "Questions", value: String(quiz.questions.length) },
    {
      icon: "check-circle",
      label: "Pass mark",
      value: `${quiz.passPercentage}%`,
    },
    {
      icon: "refresh",
      label: "Attempts left",
      value: tracking
        ? left === Infinity
          ? "Unlimited"
          : String(left)
        : quiz.maxAttempts
          ? String(quiz.maxAttempts)
          : "Unlimited",
    },
    {
      icon: "clock",
      label: "Time",
      value: quiz.timeLimitMin ? `${quiz.timeLimitMin} min` : "No limit",
    },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="t-eyebrow text-blue">Tiny test time</p>
          {quiz.isGating && (
            <Badge tone="butter" dot size="sm">
              Checkpoint
            </Badge>
          )}
          {passedBefore && (
            <Badge tone="mint" dot size="sm">
              Passed
            </Badge>
          )}
        </div>
        <h1
          className="mt-eyebrow t-display-m"
          style={{ fontSize: "clamp(1.875rem, 1.2rem + 1.6vw, 2.75rem)" }}
        >
          {quiz.title}
        </h1>
        <p className="mt-sub max-w-[56ch] t-body text-ink/70">
          {plural(quiz.questions.length, "quick question")}. Pass with{" "}
          {quiz.passPercentage}%{" "}
          {quiz.isGating
            ? "to unlock the next lessons."
            : "to lock in what you learned."}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-[18px] bg-cream/70 px-3.5 py-3"
            >
              <dt className="flex items-center gap-1.5 text-[12px] font-bold text-ink/65">
                <Icon name={f.icon} className="size-3.5" />
                {f.label}
              </dt>
              <dd className="mt-1 font-display text-[24px] leading-none tracking-[0.01em]">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <Segmented
            label="How do you want to answer?"
            value={mode}
            onChange={setMode}
            options={[
              { value: "one", label: "One at a time" },
              { value: "all", label: "All on one page" },
            ]}
            size="sm"
          />
        </div>

        {outOfTries && (
          <p
            className={clsx(
              "mt-6 flex items-start gap-2 rounded-[18px] px-4 py-3 text-[14px] font-semibold",
              passedBefore
                ? "bg-mint text-forest"
                : "bg-[#ffe1d4] text-[#9a2900]",
            )}
          >
            <Icon
              name={passedBefore ? "check-circle" : "alert"}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              {passedBefore
                ? `Passed. You've used all ${plural(quiz.maxAttempts, "attempt")}, so this score is locked in.`
                : "You've used every attempt on this test. Message the tutor from the Q&A tab and they can help."}
            </span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {outOfTries || (tracking && passedBefore) ? (
            // nothing left to prove (or no tries left): rounds here aren't saved
            <Button
              id="quiz-start"
              size="lg"
              variant={outOfTries ? "secondary" : "accent"}
              icon="refresh"
              onClick={onPractice}
              className="scroll-mt-24"
            >
              {passedBefore ? "Retake for practice" : "Practice run"}
            </Button>
          ) : (
            <Button
              id="quiz-start"
              size="lg"
              variant="accent"
              iconRight="arrow-right"
              onClick={onStart}
              className="scroll-mt-24"
            >
              {attemptsCount ? "Try again" : "Start the test"}
            </Button>
          )}
          {!tracking ? (
            <p className="t-small text-ink/65">
              Preview mode: answers are graded but not saved.
            </p>
          ) : outOfTries || passedBefore ? (
            <p className="t-small text-ink/65">
              Practice rounds are graded but not saved, and don&apos;t use an
              attempt.
            </p>
          ) : null}
        </div>

        {attempts.length > 0 && (
          <div className="mt-8">
            <h3 className="t-app-h3">Your attempts</h3>
            <p className="mt-1 t-small text-ink/65">Best score {best}%.</p>
            {/* phones: one stacked row per attempt */}
            <ul className="mt-3 divide-y divide-ink/[0.07] sm:hidden">
              {attempts.map((a, i) => (
                <li
                  key={a.id}
                  className="flex min-h-12 items-center gap-3 py-2.5 text-[14px]"
                >
                  <span className="min-w-0 flex-1 font-semibold text-ink/70">
                    <span className="font-bold text-ink tabular-nums">
                      #{i + 1}
                    </span>{" "}
                    · {formatDate(a.createdAt, "short")} ·{" "}
                    <span className="font-bold text-ink tabular-nums">
                      {a.score}%
                    </span>
                  </span>
                  <Badge tone={a.passed ? "mint" : "flame"} dot size="sm">
                    {a.passed ? "Passed" : "Not yet"}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="mt-3 overflow-x-auto max-sm:hidden">
              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">
                  Previous attempts on {quiz.title}
                </caption>
                <thead>
                  <tr className="text-[12px] font-bold text-ink/65 uppercase">
                    <th scope="col" className="py-2 pr-3 font-bold">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-3 font-bold">
                      When
                    </th>
                    <th scope="col" className="py-2 pr-3 font-bold">
                      Score
                    </th>
                    <th scope="col" className="py-2 font-bold">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.07]">
                  {attempts.map((a, i) => (
                    <tr key={a.id}>
                      <td className="py-2.5 pr-3 font-bold tabular-nums">
                        {i + 1}
                      </td>
                      <td className="py-2.5 pr-3 text-ink/70">
                        {formatDate(a.createdAt, "datetime")}
                      </td>
                      <td className="py-2.5 pr-3 font-bold tabular-nums">
                        {a.score}%
                      </td>
                      <td className="py-2.5">
                        <Badge tone={a.passed ? "mint" : "flame"} dot size="sm">
                          {a.passed ? "Passed" : "Not yet"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div
        className="relative hidden flex-col items-center justify-center gap-4 overflow-hidden bg-butter p-6 md:flex"
        aria-hidden
      >
        <span className="absolute -top-10 -right-10 size-40 rounded-full bg-sun" />
        <span className="absolute -bottom-12 -left-8 size-36 rounded-full bg-white/60" />
        <div className="relative flex items-end gap-2">
          <BlockBuddy body="#2668fd" head="#ffcf3f" wave className="w-14" />
          <Mascot
            title=""
            className="w-24"
            style={{ transform: "rotate(-8deg)" }}
          />
        </div>
        <p className="relative text-center t-hand">
          no trick questions, promise
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- question */
type TakingQ = ReturnType<typeof getQuizForTaking>["questions"][number];

function QuestionBlock({
  q,
  index,
  total,
  value,
  onChange,
  autoFocus,
}: {
  q: TakingQ;
  index: number;
  total: number;
  value: string[] | string | undefined;
  onChange: (id: string, v: string[] | string) => void;
  autoFocus?: boolean;
}) {
  const picked = Array.isArray(value) ? value : [];
  const hint =
    q.type === "multiple"
      ? "Pick all that apply."
      : q.type === "short"
        ? "Type a short answer."
        : q.type === "true_false"
          ? "True or false?"
          : "Pick one.";
  const name = `q-${q.id}`;
  return (
    <fieldset className="app-fade py-6">
      <legend className="contents">
        <span className="block text-[13px] font-bold text-ink/65">
          Question {index + 1} of {total}
        </span>
        <span className="mt-1.5 block text-[19px] leading-snug font-bold md:text-[21px]">
          {q.text}
        </span>
      </legend>
      <p className="mt-1 t-small text-ink/65">{hint}</p>
      {q.type === "short" ? (
        <div className="mt-4 max-w-md">
          <label htmlFor={name} className="sr-only">
            Your answer
          </label>
          <input
            id={name}
            type="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(q.id, e.target.value)}
            placeholder="Your answer"
            className="h-12 w-full rounded-tag bg-white px-4 text-[16px] font-semibold ring-1 ring-ink/[0.15] placeholder:text-ink/35 focus:ring-2 focus:ring-blue focus:outline-none"
          />
        </div>
      ) : (
        <div
          className={clsx(
            "mt-4 grid gap-2",
            q.type === "true_false" ? "max-w-md grid-cols-2" : "sm:grid-cols-2",
          )}
        >
          {q.options.map((o, i) => {
            const checked = picked.includes(o.id);
            const multi = q.type === "multiple";
            return (
              <label
                key={o.id}
                className={clsx(
                  "tap group relative flex cursor-pointer items-center gap-3 rounded-[18px] px-4 py-3.5 text-[15px] font-semibold ring-1 transition-[background-color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue max-sm:min-h-14 max-sm:text-[16px]",
                  checked
                    ? "bg-[#dfe8ff] ring-blue"
                    : "bg-white ring-ink/[0.12] hf:bg-cream/70",
                )}
              >
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={name}
                  value={o.id}
                  checked={checked}
                  autoFocus={autoFocus && i === 0 && !picked.length}
                  onChange={() =>
                    onChange(
                      q.id,
                      multi
                        ? checked
                          ? picked.filter((x) => x !== o.id)
                          : [...picked, o.id]
                        : [o.id],
                    )
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={clsx(
                    "grid size-6 shrink-0 place-items-center text-[12px] font-bold transition-colors",
                    multi ? "rounded-[7px]" : "rounded-full",
                    checked
                      ? "bg-blue text-white"
                      : "bg-ink/[0.06] text-ink/65",
                  )}
                >
                  {checked ? (
                    <Icon name="check" className="size-3.5" strokeWidth={3} />
                  ) : q.type === "true_false" ? (
                    ""
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="min-w-0">{o.text}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

/* ----------------------------------------------------------------------------- result */
/** Last item passed and the whole course is done: point at the certificate. */
function FinishedCta() {
  const { progress, certificate, showCompletion } = useLearn();
  if (progress.percent < 100) return null;
  return (
    <Button variant="sun" icon="award" onClick={showCompletion} className={FIT}>
      {certificate ? "View certificate" : "Celebrate"}
    </Button>
  );
}

function Result({
  ctx,
  phase,
  tracking,
  attemptsLeft,
  unlocked,
  nextItem,
  nextOpen,
  passedBefore,
  courseSlug,
  onRetry,
  onPractice,
  onBack,
}: {
  ctx: ItemContext & { item: QuizItem };
  phase: Extract<Phase, { kind: "result" }>;
  tracking: boolean;
  attemptsLeft: number;
  unlocked: ModuleItem[];
  nextItem: ModuleItem | null;
  /** the learner can open the next item (a practice pass unlocks nothing) */
  nextOpen: boolean;
  /** a saved attempt has passed this test */
  passedBefore: boolean;
  courseSlug: string;
  onRetry: () => void;
  onPractice: () => void;
  onBack: () => void;
}) {
  const quiz = ctx.item.quiz;
  const practice = phase.practice;
  // practice runs only happen after a pass or with no tries left: reveal freely
  const revealCorrect = phase.passed || attemptsLeft === 0 || practice;
  const correctCount = phase.results.filter((r) => r.correct).length;
  const prevVideo = (() => {
    for (const it of [...ctx.module.items].reverse())
      if (it.position < ctx.item.position && it.type === "video") return it;
    return null;
  })();
  return (
    <div>
      <div
        className={clsx(
          "relative overflow-hidden p-5 md:p-8",
          phase.passed ? "bg-mint" : "bg-butter",
        )}
      >
        {phase.passed && <Burst />}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <ProgressRing
              value={phase.score}
              size={112}
              stroke={11}
              tone={phase.passed ? "green" : "tangerine"}
              label="Your score"
              className="rounded-full bg-white/70"
            >
              <span className="font-display text-[34px] leading-none">
                {phase.score}%
              </span>
            </ProgressRing>
            {/* phones: a smaller Tami joins the celebration beside the ring */}
            {phase.passed && (
              <span className="shrink-0 sm:hidden" aria-hidden>
                <Mascot
                  title=""
                  wink
                  className="w-12"
                  style={{ transform: "rotate(8deg)" }}
                />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1" role="status">
            <h1 className="t-eyebrow">
              <span className="sr-only">{quiz.title}: </span>
              {practice
                ? `Practice run · not saved · ${phase.passed ? "passed" : "not passed"}`
                : phase.passed
                  ? "Passed"
                  : "Not quite yet"}
            </h1>
            <p
              className="mt-2 t-display-m"
              style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.4vw, 2.5rem)" }}
            >
              {practice
                ? phase.passed
                  ? passedBefore
                    ? "Still got it. Nicely done."
                    : "You got it in practice. This run isn't saved."
                  : "Practice makes progress. Check the explanations below."
                : phase.passed
                  ? quiz.isGating
                    ? "You got it. The next lesson is unlocked."
                    : "You got it. Nicely done."
                  : phase.score >= 50
                    ? "So close. Check the explanations and try again."
                    : prevVideo
                      ? `Not this time. Rewatch “${truncate(itemTitle(prevVideo), 40)}” and come back.`
                      : "Not this time. Read the explanations below and come back."}
            </p>
            <p className="mt-2 t-small text-ink/70">
              {correctCount} of {phase.results.length} right · pass mark{" "}
              {quiz.passPercentage}%{!tracking && " · preview mode, not saved"}
              {practice && " · no attempt used"}
              {tracking &&
                !practice &&
                !phase.passed &&
                attemptsLeft !== Infinity &&
                ` · ${plural(attemptsLeft, "attempt")} left`}
            </p>
          </div>
          <div className="hidden shrink-0 sm:block" aria-hidden>
            {phase.passed ? (
              <Mascot
                title=""
                wink
                className="w-24"
                style={{ transform: "rotate(8deg)" }}
              />
            ) : (
              <BlockBuddy body="#fd4401" head="#ffcf3f" className="w-14" />
            )}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {phase.passed && nextItem && nextOpen && (
            <Button
              href={`/learn/${courseSlug}/${nextItem.id}`}
              iconRight="arrow-right"
              aria-label={`Continue: ${itemTitle(nextItem)}`}
              className={FIT}
            >
              <span className="min-w-0 truncate">
                Continue: {itemTitle(nextItem)}
              </span>
            </Button>
          )}
          {phase.passed && !nextItem && tracking && <FinishedCta />}
          {!phase.passed && !practice && attemptsLeft > 0 && (
            <Button
              variant="accent"
              icon="refresh"
              onClick={onRetry}
              className={FIT}
            >
              Try again
            </Button>
          )}
          {!phase.passed && prevVideo && (
            <Button
              variant="secondary"
              icon="play"
              href={learnHref(courseSlug, prevVideo.id)}
              aria-label={`Rewatch: ${itemTitle(prevVideo)}`}
              className={FIT}
            >
              <span className="min-w-0 truncate">
                Rewatch: {itemTitle(prevVideo)}
              </span>
            </Button>
          )}
          {/* A real attempt only while one is left and the test isn't passed;
              otherwise a practice round (graded here, nothing saved). */}
          {(phase.passed || practice || attemptsLeft === 0) && (
            <Button
              variant="secondary"
              icon="refresh"
              onClick={tracking ? onPractice : onRetry}
              className={FIT}
            >
              {!tracking
                ? "Take it again"
                : phase.passed || passedBefore
                  ? "Retake for practice"
                  : "Practice run"}
            </Button>
          )}
          <Button variant="ghost" onClick={onBack} className={FIT}>
            Back to test details
          </Button>
        </div>
        {phase.passed && !practice && unlocked.length > 0 && quiz.isGating && (
          <div className="relative mt-5 rounded-[18px] bg-white/70 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-forest">
              <Icon name="unlock" className="size-4" />
              Just unlocked
            </p>
            <ul className="mt-2 space-y-1">
              {unlocked.map((it) => (
                <li key={it.id}>
                  <Link
                    href={learnHref(courseSlug, it.id)}
                    className="text-[14px] font-semibold underline-offset-2 hf:underline"
                  >
                    {itemTitle(it)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-5 md:p-8">
        <h3 className="t-app-h2">Review your answers</h3>
        <p className="mt-1 t-small text-ink/65">
          {revealCorrect
            ? "Correct answers and explanations below."
            : "Correct answers show once you pass or run out of attempts. The explanations are a big hint."}
        </p>
        <ol className="mt-5 space-y-3">
          {quiz.questions.map((q, i) => {
            const r = phase.results.find((x) => x.questionId === q.id);
            const a = phase.answers[q.id];
            const picked = Array.isArray(a) ? a : [];
            const text = typeof a === "string" ? a : "";
            return (
              <li
                key={q.id}
                className={clsx(
                  "rounded-[20px] p-4 md:p-5",
                  r?.correct ? "bg-[#e9f9e4]" : "bg-[#fff0e9]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={clsx(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white",
                      r?.correct ? "bg-green" : "bg-flame",
                    )}
                  >
                    <Icon
                      name={r?.correct ? "check" : "x"}
                      className="size-4"
                      strokeWidth={3}
                    />
                    <span className="sr-only">
                      {r?.correct ? "Correct" : "Incorrect"}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-ink/65">
                      Question {i + 1}
                    </p>
                    <p className="mt-0.5 text-[16px] leading-snug font-bold">
                      {q.text}
                    </p>
                    {q.type === "short" ? (
                      <p className="mt-2 t-small">
                        Your answer: <strong>{text.trim() || "(blank)"}</strong>
                        {revealCorrect &&
                        !r?.correct &&
                        q.acceptedAnswers?.length ? (
                          <>
                            {" "}
                            · Accepted: <strong>{q.acceptedAnswers[0]}</strong>
                          </>
                        ) : null}
                      </p>
                    ) : (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {q.options.map((o) => {
                          const mine = picked.includes(o.id);
                          const showRight = revealCorrect && o.isCorrect;
                          if (!mine && !showRight) return null;
                          return (
                            <li
                              key={o.id}
                              className={clsx(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold",
                                showRight
                                  ? "bg-green text-white"
                                  : mine && revealCorrect
                                    ? "bg-flame text-white"
                                    : "bg-white text-ink ring-1 ring-ink/10",
                              )}
                            >
                              {mine && (
                                <span className="text-[11px] font-bold uppercase opacity-80">
                                  You
                                </span>
                              )}
                              {o.text}
                              {showRight && (
                                <Icon
                                  name="check"
                                  className="size-3.5"
                                  strokeWidth={3}
                                />
                              )}
                            </li>
                          );
                        })}
                        {!picked.length && (
                          <li className="text-[13px] font-semibold text-ink/65">
                            (blank)
                          </li>
                        )}
                      </ul>
                    )}
                    <p className="mt-3 flex items-start gap-1.5 t-small text-ink/75">
                      <Icon name="info" className="mt-0.5 size-4 text-ink/65" />
                      <span>{q.explanation}</span>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Focus the card top for screen readers, and bring it below the sticky top bar if needed. */
function focusTop(el: HTMLElement | null) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const top = el.getBoundingClientRect().top;
  if (top < 76 || top > window.innerHeight * 0.6)
    window.scrollBy({ top: top - 84, behavior: "smooth" });
}

/** Result CTAs: full width on phones, never wider than the card. */
const FIT =
  "max-sm:w-full min-w-0 max-w-full sm:max-w-[420px] [&>svg]:shrink-0";

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

const BURST = Array.from({ length: 16 }, (_, i) => ({
  a: (i / 16) * 360,
  d: 70 + (i % 3) * 26,
  c: ["#ffcf3f", "#ff008c", "#2668fd", "#fd4401"][i % 4],
}));
function Burst() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-14 left-14 motion-reduce:hidden sm:top-[88px] sm:left-[88px]"
    >
      <style>{`@keyframes tm-burst{0%{transform:rotate(var(--a)) translateX(0) scale(.4);opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) scale(1);opacity:0}}`}</style>
      {BURST.map((b, i) => (
        <span
          key={i}
          className="absolute size-2.5 rounded-full"
          style={{
            background: b.c,
            ["--a" as string]: `${b.a}deg`,
            ["--d" as string]: `${b.d}px`,
            animation: `tm-burst .9s ${i * 0.01}s cubic-bezier(.16,1,.3,1) both`,
          }}
        />
      ))}
    </div>
  );
}
