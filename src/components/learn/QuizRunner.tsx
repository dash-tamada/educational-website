"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  ConfirmDialog,
  Eyebrow,
  Icon,
  ProgressBar,
  Segmented,
  StickyActionBar,
  toast,
} from "@/components/app";
import {
  formatDate,
  getQuizAttempts,
  getQuizForTaking,
  gradeQuiz,
  itemTitle,
  pad2,
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
    <section className="@container border border-line bg-night">
      {/* exam-paper header: what this is, and where you are in it */}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-2.5 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase tabular-nums md:px-8 lg:px-10">
        <span className="flex min-w-0 items-center gap-2.5 text-fg">
          <span aria-hidden className="size-[6px] shrink-0 rounded-full bg-red" />
          <span className="truncate">{ctx.label.replace(" / ", " · ")}</span>
        </span>
        <span className="shrink-0">
          {phase.kind === "taking"
            ? `${total - unanswered}/${total} answered${remaining !== null ? ` · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} left` : ""}`
            : phase.kind === "result"
              ? `Scored ${phase.score}% · pass ${quiz.passPercentage}%`
              : `${plural(total, "question")} · pass ${quiz.passPercentage}%`}
        </span>
      </div>
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
          <div className="p-5 md:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Eyebrow>
                  {practice && tracking
                    ? "Practice run · not saved"
                    : quiz.isGating
                      ? "Checkpoint test"
                      : "Tiny test"}
                </Eyebrow>
                <h1 className="mt-3 font-heading text-[17px] leading-tight font-semibold tracking-[-0.02em] text-muted">
                  {quiz.title}
                </h1>
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
              </div>
            </div>

            {mode === "one" ? (
              <>
                <ProgressBar
                  value={((step + 1) / forTaking.questions.length) * 100}
                  size="sm"
                  className="mt-6 max-sm:hidden"
                  label={`Question ${step + 1} of ${forTaking.questions.length}`}
                />
                {/* phones: one segment per question (tap one to jump there) */}
                <nav
                  aria-label="Jump to question"
                  className="mt-6 flex gap-1 sm:hidden"
                >
                  {forTaking.questions.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-current={i === step ? "step" : undefined}
                      aria-label={`Question ${i + 1}${answered(q) ? ", answered" : ""}`}
                      className={clsx(
                        "hit h-[3px] min-w-0 flex-1 transition-colors",
                        i === step
                          ? "bg-fg"
                          : answered(q)
                            ? "bg-red"
                            : "bg-line-strong",
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
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 max-sm:hidden">
                  <nav
                    aria-label="Jump to question"
                    className="flex flex-wrap gap-1.5"
                  >
                    {forTaking.questions.map((q, i) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setStep(i)}
                        aria-current={i === step ? "step" : undefined}
                        aria-label={`Question ${i + 1}${answered(q) ? ", answered" : ""}`}
                        className={clsx(
                          "tap grid size-9 place-items-center font-mono text-[11.5px] tabular-nums ring-1 transition-colors ring-inset",
                          i === step
                            ? "bg-fg text-surface ring-fg"
                            : answered(q)
                              ? "text-red-lite ring-red/60"
                              : "text-muted ring-line-strong hf:text-fg hf:ring-fg",
                        )}
                      >
                        {pad2(i + 1)}
                      </button>
                    ))}
                  </nav>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      icon="arrow-left"
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      disabled={step === 0}
                    >
                      Back
                    </Button>
                    {step < forTaking.questions.length - 1 ? (
                      <Button
                        iconRight="arrow-right"
                        onClick={() => setStep((s) => s + 1)}
                      >
                        {answered(forTaking.questions[step])
                          ? "Next question"
                          : "Skip for now"}
                      </Button>
                    ) : (
                      <Button
                        variant="red"
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
                <ol className="mt-4 divide-y divide-line">
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
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                  <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                    Pass mark {quiz.passPercentage}% ·{" "}
                    {unanswered
                      ? `${plural(unanswered, "question")} still blank`
                      : "All answered"}
                  </p>
                  <Button
                    ref={submitBtn}
                    type="submit"
                    variant="red"
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
            surface="ink"
            title={`${total - unanswered} of ${total} answered`}
            sub={`Pass mark ${quiz.passPercentage}%`}
          >
            <Button
              variant="outline"
              iconOnly
              icon="arrow-left"
              aria-label="Previous question"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            />
            {step < total - 1 ? (
              <Button
                className="h-12"
                iconRight="arrow-right"
                onClick={() => setStep((s) => s + 1)}
              >
                {answered(forTaking.questions[step]) ? "Next" : "Skip"}
              </Button>
            ) : (
              <Button
                className="h-12"
                variant="red"
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
            surface="ink"
            title={`${total - unanswered} of ${total} answered`}
            sub={`Pass mark ${quiz.passPercentage}%`}
          >
            <Button
              className="h-12"
              variant="red"
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
        surface="ink"
        eyebrow="Checkpoint"
      />
    </section>
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
    { label: "Questions", value: String(quiz.questions.length) },
    { label: "Pass mark", value: `${quiz.passPercentage}%` },
    {
      label: "Tries left",
      value: tracking
        ? left === Infinity
          ? "∞"
          : String(left)
        : quiz.maxAttempts
          ? String(quiz.maxAttempts)
          : "∞",
    },
    {
      label: "Time",
      value: quiz.timeLimitMin ? `${quiz.timeLimitMin}m` : "Open",
    },
  ];
  const rules = [
    "No trick questions. Each one checks a single idea from the lessons before it.",
    "Every answer comes with a short explanation, so a miss still teaches you something.",
    "Correct answers show once you pass or use your last attempt.",
    quiz.isGating
      ? "Checkpoint: the lessons after this stay locked until you pass."
      : "Practice test: nothing gets locked, but passing counts toward your progress.",
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 p-5 md:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Eyebrow>{quiz.isGating ? "Checkpoint test" : "Tiny test"}</Eyebrow>
          {passedBefore && (
            <Badge tone="mint" dot size="sm">
              Passed
            </Badge>
          )}
        </div>
        <h1 className="mt-5 max-w-[18ch] font-display text-[clamp(2.25rem,1.4rem+2.6vw,4rem)] leading-[0.92] uppercase">
          {quiz.title}
        </h1>
        <p className="mt-4 max-w-[52ch] t-body-l text-muted">
          {plural(quiz.questions.length, "quick question")}. Pass with{" "}
          {quiz.passPercentage}%{" "}
          {quiz.isGating
            ? "to unlock the next lessons."
            : "to lock in what you learned."}
        </p>

        <dl className="mt-8 grid grid-cols-2 border-t border-l border-line sm:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className="min-w-0 border-r border-b border-line px-4 pt-3 pb-4"
            >
              <dt className="flex items-center justify-between gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
                <span className="truncate">{f.label}</span>
                <span className="font-mono font-normal tracking-normal opacity-70">
                  {pad2(i + 1)}
                </span>
              </dt>
              <dd className="mt-4 font-display text-[34px] leading-none">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Format
          </span>
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
          <p className="mt-7 max-w-[60ch] border-l-2 border-red pl-4 text-[14px] leading-snug text-fg/90">
            {passedBefore
              ? `Passed. You've used all ${plural(quiz.maxAttempts, "attempt")}, so this score is locked in.`
              : "You've used every attempt on this test. Message the tutor from the Q&A tab and they can help."}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          {outOfTries || (tracking && passedBefore) ? (
            // nothing left to prove (or no tries left): rounds here aren't saved
            <Button
              id="quiz-start"
              size="lg"
              variant={outOfTries ? "outline" : "red"}
              icon="refresh"
              onClick={onPractice}
              className="scroll-mt-24 max-sm:w-full"
            >
              {passedBefore ? "Retake for practice" : "Practice run"}
            </Button>
          ) : (
            <Button
              id="quiz-start"
              size="lg"
              variant="red"
              iconRight="arrow-right"
              onClick={onStart}
              className="scroll-mt-24 max-sm:w-full"
            >
              {attemptsCount ? "Try again" : "Start the test"}
            </Button>
          )}
          {!tracking ? (
            <p className="t-small text-muted">
              Preview mode: answers are graded but not saved.
            </p>
          ) : outOfTries || passedBefore ? (
            <p className="t-small text-muted">
              Practice rounds are graded but not saved, and don&apos;t use an
              attempt.
            </p>
          ) : null}
        </div>

        {attempts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between gap-4 border-b border-fg pb-3">
              <h3 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                Your attempts
              </h3>
              <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                Best {best}%
              </p>
            </div>
            <table className="w-full text-left">
              <caption className="sr-only">
                Previous attempts on {quiz.title}
              </caption>
              <thead className="max-sm:sr-only">
                <tr className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
                  <th scope="col" className="w-14 py-2.5 pr-3 font-semibold">
                    No.
                  </th>
                  <th scope="col" className="py-2.5 pr-3 font-semibold">
                    When
                  </th>
                  <th scope="col" className="py-2.5 pr-3 font-semibold">
                    Score
                  </th>
                  <th scope="col" className="py-2.5 text-right font-semibold">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {attempts.map((a, i) => (
                  <tr key={a.id} className="text-[14px]">
                    <td className="py-3 pr-3 font-mono text-[11.5px] text-muted tabular-nums">
                      {pad2(i + 1)}
                    </td>
                    <td className="py-3 pr-3 text-muted">
                      <span className="max-sm:hidden">
                        {formatDate(a.createdAt, "datetime")}
                      </span>
                      <span className="sm:hidden">
                        {formatDate(a.createdAt, "short")}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-display text-[22px] leading-none tabular-nums">
                      {a.score}%
                    </td>
                    <td className="py-3 text-right">
                      <Badge
                        tone={a.passed ? "mint" : "flame"}
                        dot
                        size="sm"
                      >
                        {a.passed ? "Passed" : "Not yet"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* house rules: the right margin of the exam paper */}
      <aside
        aria-label="How this test works"
        className="border-t border-line p-5 md:p-8 lg:border-t-0 lg:border-l lg:p-8"
      >
        <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">
          House rules
        </p>
        <ol className="mt-4 border-t border-line">
          {rules.map((r, i) => (
            <li
              key={r}
              className="flex gap-3.5 border-b border-line py-3.5 text-[13.5px] leading-snug text-muted"
            >
              <span className="w-5 shrink-0 font-mono text-[11px] text-red-lite tabular-nums">
                {pad2(i + 1)}
              </span>
              {r}
            </li>
          ))}
        </ol>
      </aside>
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
    <fieldset className="app-fade py-8">
      <legend className="contents">
        <span className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.1em] text-muted uppercase tabular-nums">
          <span className="text-red-lite">Q{pad2(index + 1)}</span>
          <span>
            Question {pad2(index + 1)} / {pad2(total)}
          </span>
        </span>
        <span className="mt-4 block max-w-[30ch] font-heading text-[clamp(1.5rem,1.15rem+1.2vw,2.25rem)] leading-[1.12] font-semibold tracking-[-0.03em]">
          {q.text}
        </span>
      </legend>
      <p className="mt-3 t-small text-muted">{hint}</p>
      {q.type === "short" ? (
        <div className="mt-6 max-w-md">
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
            className="h-12 w-full border-b border-line-strong bg-transparent px-0 text-[18px] font-medium placeholder:text-muted focus:border-red focus:outline-none"
          />
        </div>
      ) : (
        <div
          className={clsx(
            "mt-6 grid gap-2",
            q.type === "true_false" ? "max-w-md grid-cols-2" : "@[640px]:grid-cols-2",
          )}
        >
          {q.options.map((o, i) => {
            const checked = picked.includes(o.id);
            const multi = q.type === "multiple";
            return (
              <label
                key={o.id}
                className={clsx(
                  "tap group relative flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3.5 text-[15px] leading-snug ring-1 transition-[background-color,box-shadow] duration-150 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red max-sm:text-[16px]",
                  checked
                    ? "bg-fg/[0.07] ring-fg"
                    : "ring-line-strong hf:bg-fg/[0.03] hf:ring-fg/60",
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
                    "grid size-7 shrink-0 place-items-center font-mono text-[11.5px] transition-colors",
                    checked
                      ? "bg-red text-white"
                      : "text-muted ring-1 ring-line-strong ring-inset group-hf:text-fg",
                  )}
                >
                  {checked ? (
                    <Icon name="check" className="size-3.5" strokeWidth={2.4} />
                  ) : q.type === "true_false" ? (
                    i === 0 ? "T" : "F"
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className={clsx("min-w-0", checked && "font-medium")}>
                  {o.text}
                </span>
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
    <Button variant="red" icon="award" onClick={showCompletion} className={FIT}>
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
      <div className="grid gap-x-12 gap-y-6 border-b border-line p-5 md:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:p-10">
        {/* the score, in Anton, over a line with the pass mark on it */}
        <div className="min-w-0">
          <p
            className={clsx(
              "flex items-center gap-2.5 font-mono text-[11px] tracking-[0.1em] uppercase",
              phase.passed ? "text-fg" : "text-red-lite",
            )}
          >
            <span
              aria-hidden
              className={clsx(
                "size-[6px] shrink-0",
                phase.passed ? "bg-fg" : "bg-red",
              )}
            />
            {practice
              ? `Practice · ${phase.passed ? "passed" : "not passed"}`
              : phase.passed
                ? "Passed"
                : "Not quite yet"}
          </p>
          <p
            className="mt-3 font-display text-[clamp(5.5rem,3rem+8vw,10rem)] leading-[0.8] tracking-[-0.01em] tabular-nums"
            aria-label={`Score ${phase.score}%`}
          >
            {phase.score}
            <span className="text-[0.5em] text-muted">%</span>
          </p>
          <div className="relative mt-5 h-[3px] w-full max-w-[320px] bg-line-strong" aria-hidden>
            <span
              className={clsx(
                "absolute inset-y-0 left-0",
                phase.passed ? "bg-fg" : "bg-red",
              )}
              style={{ width: `${phase.score}%` }}
            />
            <span
              className="absolute -top-1.5 h-[15px] w-px bg-red-lite"
              style={{ left: `${quiz.passPercentage}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
            {correctCount}/{phase.results.length} right · pass {quiz.passPercentage}%
          </p>
        </div>
        <div className="min-w-0" role="status">
          <h1 className="sr-only">
            {quiz.title}:{" "}
            {practice
              ? `practice run, ${phase.passed ? "passed" : "not passed"}`
              : phase.passed
                ? "passed"
                : "not quite yet"}
          </h1>
          <p className="max-w-[26ch] font-heading text-[clamp(1.5rem,1.15rem+1.2vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
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
          <p className="mt-3 t-small text-muted">
            {!tracking && "Preview mode, not saved. "}
            {practice && "No attempt used. "}
            {tracking &&
              !practice &&
              !phase.passed &&
              attemptsLeft !== Infinity &&
              `${plural(attemptsLeft, "attempt")} left.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {phase.passed && nextItem && nextOpen && (
              <Button
                href={`/learn/${courseSlug}/${nextItem.id}`}
                variant="red"
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
                variant="red"
                icon="refresh"
                onClick={onRetry}
                className={FIT}
              >
                Try again
              </Button>
            )}
            {!phase.passed && prevVideo && (
              <Button
                variant="outline"
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
                variant="outline"
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
              Test details
            </Button>
          </div>
          {phase.passed && !practice && unlocked.length > 0 && quiz.isGating && (
            <div className="mt-7 border-t border-line pt-4">
              <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-red-lite uppercase">
                <Icon name="unlock" className="size-3.5" strokeWidth={1.8} />
                Just unlocked
              </p>
              <ul className="mt-2">
                {unlocked.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={learnHref(courseSlug, it.id)}
                      className="inline-flex min-h-9 items-center gap-2 text-[14.5px] underline-offset-4 hf:underline"
                    >
                      {itemTitle(it)}
                      <Icon name="arrow-right" className="size-3.5" strokeWidth={1.8} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 md:p-8 lg:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-fg pb-3">
          <h3 className="text-[11px] font-semibold tracking-[0.16em] uppercase">
            Review your answers
          </h3>
          <p className="t-small text-muted">
            {revealCorrect
              ? "Correct answers and explanations below."
              : "Correct answers show once you pass or run out of attempts. The explanations are a big hint."}
          </p>
        </div>
        <ol className="divide-y divide-line">
          {quiz.questions.map((q, i) => {
            const r = phase.results.find((x) => x.questionId === q.id);
            const a = phase.answers[q.id];
            const picked = Array.isArray(a) ? a : [];
            const text = typeof a === "string" ? a : "";
            return (
              <li key={q.id} className="flex gap-4 py-6 md:gap-6">
                <div className="flex w-12 shrink-0 flex-col items-start gap-2">
                  <span className="font-mono text-[11px] text-muted tabular-nums">
                    Q{pad2(i + 1)}
                  </span>
                  <span
                    className={clsx(
                      "grid size-7 place-items-center",
                      r?.correct
                        ? "text-fg ring-1 ring-fg ring-inset"
                        : "bg-red text-white",
                    )}
                  >
                    <Icon
                      name={r?.correct ? "check" : "x"}
                      className="size-3.5"
                      strokeWidth={2.4}
                    />
                    <span className="sr-only">
                      {r?.correct ? "Correct" : "Incorrect"}
                    </span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[18px] leading-snug font-semibold tracking-[-0.02em]">
                    {q.text}
                  </p>
                  {q.type === "short" ? (
                    <p className="mt-3 t-small text-muted">
                      Your answer:{" "}
                      <strong className="font-semibold text-fg">
                        {text.trim() || "(blank)"}
                      </strong>
                      {revealCorrect &&
                      !r?.correct &&
                      q.acceptedAnswers?.length ? (
                        <>
                          {" "}
                          · Accepted:{" "}
                          <strong className="font-semibold text-fg">
                            {q.acceptedAnswers[0]}
                          </strong>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {q.options.map((o) => {
                        const mine = picked.includes(o.id);
                        const showRight = revealCorrect && o.isCorrect;
                        if (!mine && !showRight) return null;
                        return (
                          <li
                            key={o.id}
                            className={clsx(
                              "inline-flex min-h-8 items-center gap-2 px-2.5 py-1 text-[13px] ring-1 ring-inset",
                              showRight
                                ? "text-fg ring-fg"
                                : mine && revealCorrect
                                  ? "text-red-lite ring-red/60 line-through decoration-red/70"
                                  : "text-fg/85 ring-line-strong",
                            )}
                          >
                            {mine && (
                              <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase opacity-70">
                                You
                              </span>
                            )}
                            {o.text}
                            {showRight && (
                              <Icon
                                name="check"
                                className="size-3.5"
                                strokeWidth={2.2}
                              />
                            )}
                          </li>
                        );
                      })}
                      {!picked.length && (
                        <li className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                          (blank)
                        </li>
                      )}
                    </ul>
                  )}
                  <p className="mt-4 max-w-[64ch] border-l border-line-strong pl-3.5 t-small text-muted">
                    {q.explanation}
                  </p>
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

/** Result CTAs: full width on phones, never wider than the column. */
const FIT =
  "max-sm:w-full min-w-0 max-w-full sm:max-w-[420px] [&>svg]:shrink-0";

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
