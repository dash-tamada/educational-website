"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Button, Modal } from "@/components/app";
import { ArrowButton, HandNote } from "@/components/decor/Bits";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseProgress, getEnrolledCourses, type Db } from "@/lib/mock";
import { FIT_QUIZ, recommendForViewer } from "@/lib/mock/extra/catalog";
import { CatalogCard } from "./CatalogCard";

/**
 * Bottom-of-catalog prompt + the 30-second "what should I learn?" quiz:
 * three taps, one recommended course.
 */
export function FitQuiz({ db }: { db: Db }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // bumped on every answer / Back / Start over: focus follows the new step
  const [focusTick, setFocusTick] = useState(0);
  const session = useDemoSession();
  const uid = session?.role === "student" ? session.userId : null;
  const done = step >= FIT_QUIZ.length;
  // never recommend something the student already owns
  const owned = done && uid ? getEnrolledCourses(uid, db).map((e) => e.course.id) : [];
  const { pick, top } = done ? recommendForViewer(answers, owned, db) : { pick: null, top: null };
  const topOwned = !!top && owned.includes(top.id);
  // every good match is owned: point at the best one to resume
  const resume = done && !pick && top && topOwned ? top : null;
  const resumeProgress = resume && uid ? getCourseProgress(uid, resume.id, db) : null;
  const resumeHref = resume
    ? `/learn/${resume.slug}${resumeProgress?.resumeItemId ? `/${resumeProgress.resumeItemId}` : ""}`
    : null;
  const q = FIT_QUIZ[Math.min(step, FIT_QUIZ.length - 1)];

  const restart = () => {
    setStep(0);
    setAnswers({});
    setFocusTick((t) => t + 1);
  };

  // keep keyboard focus inside the dialog as the question re-renders: the
  // chosen (or first) option of the new question, or the result's main action
  useEffect(() => {
    if (!focusTick) return;
    const raf = requestAnimationFrame(() => {
      const el =
        document.getElementById("fit-open") ??
        document.querySelector<HTMLElement>('[data-fit-option][aria-pressed="true"]') ??
        document.querySelector<HTMLElement>("[data-fit-option]");
      el?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [focusTick]);

  const description = !done
    ? `Question ${step + 1} of ${FIT_QUIZ.length}`
    : pick
      ? topOwned && top
        ? `Your top match, ${top.title}, is already yours. Here's the next best one. Its first video is free.`
        : "Based on your answers. Watch its first video free before you decide."
      : resume
        ? "You already have the best match: pick up where you left off."
        : "Nothing matched this time.";

  return (
    <section aria-labelledby="fit-title" className="relative overflow-hidden rounded-card-lg bg-blush px-6 py-10 md:px-12 md:py-14">
      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 id="fit-title" className="t-chunky-xl max-w-[12ch]">
            Still scrolling?
          </h2>
          <p className="t-body-l mt-sub max-w-[30rem] opacity-80">Take the 30-second &ldquo;what should I learn?&rdquo; quiz. Three taps, one course that fits your week.</p>
          <div className="mt-8">
            <ArrowButton
              onClick={() => {
                restart();
                setOpen(true);
              }}
            >
              Find my fit
            </ArrowButton>
          </div>
        </div>
        <div className="relative hidden items-end gap-3 pr-4 md:flex" aria-hidden>
          <HandNote write={false} className="absolute -top-14 -left-24 hidden w-40 lg:block" rotate={-8}>
            honestly faster than asking the group chat
          </HandNote>
          <BlockBuddy body="#ff008c" head="#ffcf3f" hat="#2668fd" className="w-20 hover-wiggle" />
          <BlockBuddy body="#2668fd" head="#f780d4" wave className="w-24 hover-wiggle" />
          <BlockBuddy body="#00b351" head="#ffcf3f" className="w-[4.5rem] hover-wiggle" />
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={done ? (resume ? "You already own your fit." : "Here's your fit.") : "What should I learn?"}
        description={description}
        footer={
          done ? (
            <>
              <Button variant="ghost" onClick={restart} icon="refresh">
                Start over
              </Button>
              {pick ? (
                <Button id="fit-open" href={`/courses/${pick.slug}`} variant="accent" iconRight="arrow-right">
                  Open the course
                </Button>
              ) : resumeHref ? (
                <Button id="fit-open" href={resumeHref} variant="accent" icon="play">
                  {resumeProgress && resumeProgress.percent >= 100 ? "Rewatch it" : "Pick up where you left off"}
                </Button>
              ) : (
                <Button id="fit-open" href="/courses" variant="accent">
                  Browse the library
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => {
                  setStep((s) => s - 1);
                  setFocusTick((t) => t + 1);
                }}
                icon="arrow-left"
              >
                Back
              </Button>
            </>
          )
        }
      >
        {!done ? (
          <div key={q.id} className="app-fade">
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {FIT_QUIZ.map((x, i) => (
                <span key={x.id} className={clsx("h-1.5 flex-1 rounded-full", i <= step ? "bg-hotpink" : "bg-ink/10")} />
              ))}
            </div>
            <fieldset>
              <legend className="t-app-h3 mb-3">
                <span className="sr-only">
                  Question {step + 1} of {FIT_QUIZ.length}:{" "}
                </span>
                {q.q}
              </legend>
              <div className="grid gap-2">
                {q.options.map((o, i) => (
                  <button
                    key={o.label}
                    type="button"
                    data-fit-option
                    data-autofocus={i === 0 && step === 0 ? true : undefined}
                    aria-pressed={answers[q.id] === i}
                    onClick={() => {
                      setAnswers((a) => ({ ...a, [q.id]: i }));
                      setStep((s) => s + 1);
                      setFocusTick((t) => t + 1);
                    }}
                    className={clsx(
                      "tap flex min-h-14 items-center justify-between gap-3 rounded-card px-4 py-3 text-left text-[15px] font-semibold ring-1 transition-[background-color,box-shadow] duration-150",
                      answers[q.id] === i ? "bg-butter ring-2 ring-ink" : "bg-white ring-ink/[0.12] hf:bg-cream hf:ring-ink/30",
                    )}
                  >
                    {o.label}
                    <svg viewBox="0 0 24 24" className="size-5 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4.5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : pick || resume ? (
          <div className="app-fade mx-auto max-w-[340px] py-2">
            <CatalogCard courseId={(pick ?? resume)!.id} headingLevel="h3" />
          </div>
        ) : (
          <p className="t-small">Nothing matched, which is rare. Browse the library instead.</p>
        )}
      </Modal>
    </section>
  );
}
