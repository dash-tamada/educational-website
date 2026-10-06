"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { formatDuration, type ModuleItem, type Question, type QuestionType, type Quiz, type QuizItem, type Resource, type ResourceItem, type ResourceFileType, type VideoItem } from "@/lib/mock";
import { SAMPLE_FILES, SAMPLE_VIDEOS } from "@/lib/mock/extra/tutor";
import { Badge, Button, Checkbox, DropdownMenu, Drawer, Field, Icon, Input, ProgressBar, Segmented, Select, Switch, Textarea, toast } from "@/components/app";
import { answerKey, itemLabel, newQuestion, omitKey, parseDuration, questionFieldIssues, quizProblems, stripUndefined, titleFromFileName } from "./utils";

/* =============================================================================
   Item editors in a drawer: video lesson (mock upload + duration detection),
   test (questions of four types) and resource (mock file / link).
   ============================================================================= */

/** "Use a sample clip" turn counter for this session: each pick takes the next clip. */
let sampleTurn = 0;

export function ItemEditorDrawer({
  open,
  item,
  isNew,
  isFirstVideo,
  onClose,
  onSave,
}: {
  open: boolean;
  item: ModuleItem | null;
  isNew: boolean;
  isFirstVideo: boolean;
  onClose: () => void;
  onSave: (item: ModuleItem) => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const formId = "item-editor-form";
  // Only the Discard button throws edits away.
  const discard = () => {
    setDirty(false);
    setConfirming(false);
    onClose();
  };
  const keepEditing = () => {
    setConfirming(false);
    const back = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      if (back?.isConnected) back.focus();
      else document.querySelector<HTMLElement>(`#${formId} input, #${formId} textarea`)?.focus();
    });
  };
  // Esc, the overlay, the X and Cancel all land here. With unsaved edits they ask first;
  // while the question is showing, they mean "keep editing", never "discard".
  const requestClose = () => {
    if (!dirty) return discard();
    if (confirming) return keepEditing();
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setConfirming(true);
  };
  // Move focus to the safe choice so a second Esc or Enter can't drop the edits by accident.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  if (!item) return null;
  const kind = itemLabel(item.type).toLowerCase();
  return (
    <Drawer
      open={open}
      onClose={requestClose}
      width={item.type === "quiz" ? 760 : 560}
      title={isNew ? `Add a ${kind === "test" ? "test" : kind === "lesson" ? "video lesson" : "resource"}` : `Edit ${kind}`}
      description={
        item.type === "video"
          ? "Upload the video, name it and decide whether it's a free preview."
          : item.type === "quiz"
            ? "A tiny test between lessons. Learners see their score and your explanations after they submit."
            : "A file or link learners can download next to the lessons."
      }
      footer={
        confirming ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2" role="alert" aria-live="assertive">
            <span className="mr-auto text-[14px] font-bold">Discard your changes?</span>
            <Button ref={keepRef} variant="secondary" onClick={keepEditing}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={discard}>
              Discard
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} icon="check">
              {isNew ? `Add ${kind}` : "Save changes"}
            </Button>
          </>
        )
      }
    >
      {item.type === "video" && (
        <VideoForm
          formId={formId}
          item={item}
          isFirstVideo={isFirstVideo}
          onDirty={() => {
            setDirty(true);
            setConfirming(false);
          }}
          onSave={(it) => {
            setDirty(false);
            setConfirming(false);
            onSave(it);
          }}
        />
      )}
      {item.type === "quiz" && (
        <QuizForm
          formId={formId}
          item={item}
          onDirty={() => {
            setDirty(true);
            setConfirming(false);
          }}
          onSave={(it) => {
            setDirty(false);
            setConfirming(false);
            onSave(it);
          }}
        />
      )}
      {item.type === "resource" && (
        <ResourceForm
          formId={formId}
          item={item}
          onDirty={() => {
            setDirty(true);
            setConfirming(false);
          }}
          onSave={(it) => {
            setDirty(false);
            setConfirming(false);
            onSave(it);
          }}
        />
      )}
    </Drawer>
  );
}

/* ----------------------------------------------------------------------------- mock upload */
type Upload = { phase: "idle" | "uploading" | "processing" | "done"; progress: number; name: string; sizeMb: number };

function useMockUpload(onDone: (u: { name: string; sizeMb: number }) => void) {
  const [u, setU] = useState<Upload>({ phase: "idle", progress: 0, name: "", sizeMb: 0 });
  const timer = useRef<number | null>(null);
  const finish = useRef<number | null>(null);
  const progress = useRef(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (finish.current) window.clearTimeout(finish.current);
    timer.current = null;
    finish.current = null;
  };
  useEffect(() => stop, []);
  // side effects live outside the state updaters (StrictMode double-invokes updaters)
  const start = (name: string, sizeMb: number) => {
    stop();
    progress.current = 0;
    setU({ phase: "uploading", progress: 0, name, sizeMb });
    const step = Math.max(2.5, 9 - sizeMb / 80);
    timer.current = window.setInterval(() => {
      const p = Math.min(100, progress.current + step * (0.7 + Math.random() * 0.6));
      progress.current = p;
      if (p < 100) {
        setU((x) => ({ ...x, progress: p }));
        return;
      }
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      setU((x) => ({ ...x, progress: 100, phase: "processing" }));
      finish.current = window.setTimeout(() => {
        finish.current = null;
        setU((y) => (y.phase === "processing" ? { ...y, phase: "done" } : y));
        done.current({ name, sizeMb });
      }, 900);
    }, 110);
  };
  const cancel = () => {
    stop();
    progress.current = 0;
    setU({ phase: "idle", progress: 0, name: "", sizeMb: 0 });
  };
  return { upload: u, start, cancel, setUpload: setU };
}

function UploadStatus({ u, onCancel, verb = "Uploading" }: { u: Upload; onCancel: () => void; verb?: string }) {
  const sent = (u.sizeMb * u.progress) / 100;
  const left = Math.max(0, Math.round(((100 - u.progress) / 100) * (u.sizeMb > 1 ? 4 : 1)));
  return (
    <div className="rounded-[20px] bg-cream p-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <Icon name={u.phase === "processing" ? "refresh" : "upload"} className={clsx("size-[18px]", u.phase === "processing" && "animate-spin")} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold">{u.name}</p>
          <p className="text-[12.5px] font-semibold text-ink/60">
            {u.phase === "processing" ? "Processing: checking the file and reading its length…" : `${verb} ${sent < 1 ? sent.toFixed(1) : Math.round(sent)} of ${u.sizeMb < 1 ? u.sizeMb.toFixed(1) : u.sizeMb} MB · about ${left}s left`}
          </p>
        </div>
        {u.phase === "uploading" && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <ProgressBar value={u.progress} size="lg" tone={u.phase === "processing" ? "sun" : "blue"} className="mt-3" label="Upload progress" />
    </div>
  );
}

/* ----------------------------------------------------------------------------- video */
function VideoForm({ formId, item, isFirstVideo, onDirty, onSave }: { formId: string; item: VideoItem; isFirstVideo: boolean; onDirty: () => void; onSave: (it: VideoItem) => void }) {
  const [l, setL] = useState(item.lesson);
  const [dur, setDur] = useState(item.lesson.durationSec ? formatDuration(item.lesson.durationSec, "clock") : "");
  const [videoError, setVideoError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const detected = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const change = (f: Partial<typeof l>) => {
    setL((x) => ({ ...x, ...f }));
    onDirty();
  };
  const { upload, start, cancel } = useMockUpload(({ name }) => {
    setVideoError("");
    const sec = detected.current ?? 0;
    setL((x) => ({ ...x, videoPath: `uploads/${item.id}/${name}`, durationSec: sec || x.durationSec }));
    if (sec) setDur(formatDuration(sec, "clock"));
    toast.success("Video uploaded", { description: sec ? `${name} · ${formatDuration(sec, "clock")} detected` : name });
  });

  const takeFile = (file: File) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|mkv|webm|m4v)$/i.test(file.name)) {
      setVideoError("That doesn't look like a video. Try an MP4 or MOV file.");
      return;
    }
    setVideoError("");
    const sizeMb = Math.max(0.1, Math.round((file.size / 1_048_576) * 10) / 10);
    detected.current = Math.max(30, Math.round(sizeMb * 3));
    // real duration detection from the file's metadata (falls back to an estimate)
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        if (Number.isFinite(v.duration) && v.duration > 0) detected.current = Math.round(v.duration);
        URL.revokeObjectURL(url);
      };
      v.onerror = () => URL.revokeObjectURL(url);
      v.src = url;
    } catch {}
    onDirty();
    start(file.name, sizeMb);
  };
  const useSample = () => {
    // rotate through the sample clips so lessons added one after another get different files and lengths
    const s = SAMPLE_VIDEOS[sampleTurn++ % SAMPLE_VIDEOS.length];
    detected.current = s.durationSec;
    setVideoError("");
    onDirty();
    start(s.name, s.sizeMb);
  };

  const sec = dur.trim() ? parseDuration(dur) : 0;
  // errors refresh as you type once you've tried to save (not before, so nobody gets shouted at mid-word)
  const fieldErrs: Record<string, string> = {};
  if (l.title.trim().length < 3) fieldErrs.title = "Give the lesson a name (3+ characters).";
  if (dur.trim() && (!Number.isFinite(sec) || sec <= 0)) fieldErrs.duration = "Use minutes:seconds, like 12:30.";
  const errors: Record<string, string> = { ...(submitted ? fieldErrs : {}), ...(videoError ? { video: videoError } : {}) };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const busy = upload.phase === "uploading" || upload.phase === "processing";
    if (busy) setVideoError("Hang on, the upload is still running.");
    if (busy || Object.keys(fieldErrs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${formId} [aria-invalid=true]`)?.focus());
      return;
    }
    onSave({ ...item, lesson: { ...l, title: l.title.trim(), description: l.description.trim(), durationSec: sec || l.durationSec, isFreePreview: isFirstVideo || l.isFreePreview } });
  };

  const fileName = l.videoPath ? l.videoPath.split("/").pop() : null;

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
      <div>
        <p className="mb-1.5 text-[14px] font-bold">Video file</p>
        {upload.phase === "uploading" || upload.phase === "processing" ? (
          <UploadStatus u={upload} onCancel={cancel} />
        ) : fileName ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-mint/50 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-green">
              <Icon name="check" className="size-[18px]" strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{fileName}</p>
              <p className="text-[12.5px] font-semibold text-forest/75">Ready{l.durationSec ? ` · ${formatDuration(l.durationSec, "clock")}` : ""} · HD transcode done</p>
            </div>
            <Button size="sm" variant="secondary" icon="refresh" onClick={() => fileInput.current?.click()}>
              Replace
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) takeFile(f);
            }}
            className={clsx("flex flex-col items-center rounded-[20px] border-2 border-dashed px-4 py-7 text-center transition-colors", dragOver ? "border-blue bg-[#dfe8ff]" : "border-ink/15 bg-cream/60")}
          >
            <span className="grid size-12 place-items-center rounded-full bg-white shadow-soft">
              <Icon name="video" className="size-5" />
            </span>
            <p className="mt-3 text-[15px] font-bold">Drop a video here</p>
            <p className="mt-1 text-[13px] font-medium text-ink/60">MP4 or MOV, up to 4 GB. We read the length for you.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" icon="upload" onClick={() => fileInput.current?.click()}>
                Choose a file
              </Button>
              <Button size="sm" variant="secondary" icon="sparkles" onClick={useSample}>
                Use a sample clip
              </Button>
            </div>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) takeFile(f);
            e.target.value = "";
          }}
        />
        {errors.video && (
          <p role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-[#c13500]">
            <Icon name="alert" className="size-3.5" strokeWidth={2.4} /> {errors.video}
          </p>
        )}
        <p className="mt-1.5 text-[12.5px] font-medium text-ink/50">Demo: files never leave your browser. The upload is simulated.</p>
      </div>

      <Field label="Lesson name" required error={errors.title}>
        <Input value={l.title} onChange={(e) => change({ title: e.target.value })} maxLength={90} placeholder="e.g. Flexbox in ten minutes" data-autofocus="" />
      </Field>
      <Field label="What's in it" optional hint="One or two lines. Shown under the video and in the curriculum.">
        <Textarea value={l.description} onChange={(e) => change({ description: e.target.value })} rows={3} maxLength={300} showCount />
      </Field>
      <Field label="Duration" hint="Filled in after upload. Edit it if you trimmed the video." error={errors.duration}>
        <Input
          value={dur}
          onChange={(e) => {
            setDur(e.target.value);
            onDirty();
          }}
          placeholder="mm:ss"
          icon="clock"
          className="max-w-[180px]"
        />
      </Field>
      <div className="flex flex-col gap-4 rounded-[20px] bg-cream/70 p-4">
        <Switch
          label="Free preview"
          description={isFirstVideo ? "This is the first video, so it's always free. You can open more previews when it helps learners decide." : "Anyone can watch this lesson before buying the course."}
          checked={isFirstVideo || l.isFreePreview}
          disabled={isFirstVideo}
          onChange={(v) => change({ isFreePreview: v })}
        />
        <Switch label="Auto-generate captions" description="English captions, ready about an hour after upload." checked={l.hasCaptions} onChange={(v) => change({ hasCaptions: v })} />
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------------- quiz */
const QTYPES: { value: QuestionType; label: string }[] = [
  { value: "single", label: "Single choice" },
  { value: "multiple", label: "Multiple choice" },
  { value: "true_false", label: "True or false" },
  { value: "short", label: "Short answer" },
];

/** The intro we write when the tutor leaves it empty. Regenerated on save while it still matches. */
const autoIntro = (count: number, pass: number, gating: boolean) =>
  `${count} quick ${count === 1 ? "question" : "questions"}. Pass with ${pass}% ${gating ? "to unlock the next part" : "to lock in what you learned"}.`;
const AUTO_INTRO = /^\d+ quick questions?\. Pass with \d+% to (unlock the next part|lock in what you learned)\.$/;
const isAutoIntro = (text: string) => AUTO_INTRO.test(text.trim());

/** Time limit as read from the store: anything that isn't a positive number means "No limit". */
const validLimit = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

function QuizForm({ formId, item, onDirty, onSave }: { formId: string; item: QuizItem; onDirty: () => void; onSave: (it: QuizItem) => void }) {
  const [q, setQ] = useState<Quiz>(() => {
    const base = stripUndefined(item.quiz);
    return validLimit(base.timeLimitMin) ? base : omitKey(base, "timeLimitMin");
  });
  // pass mark is typed as text so an empty or out-of-range value can be shown and corrected
  const [passDraft, setPassDraft] = useState(String(item.quiz.passPercentage ?? 70));
  const errorToast = useRef<ReturnType<typeof toast.error> | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const change = (f: Partial<Quiz>) => {
    setQ((x) => ({ ...x, ...f }));
    onDirty();
  };
  const setQuestion = (id: string, f: Partial<Question>) => change({ questions: q.questions.map((x) => (x.id === id ? { ...x, ...f } : x)) });
  const move = (i: number, d: -1 | 1) => {
    const arr = [...q.questions];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    change({ questions: arr });
  };
  const addQuestion = (type: QuestionType) => {
    const nq = newQuestion(type);
    setConfirmEmpty(false);
    change({ questions: [...q.questions, nq] });
    requestAnimationFrame(() => document.getElementById(`qtext-${nq.id}`)?.focus());
  };
  const problems = quizProblems(q);
  const titleProblem = q.title.trim().length < 3 ? "Name the test (3+ characters)." : null;
  const titleError = showErrors ? titleProblem : null;
  const passNum = Number(passDraft);
  const passProblem = !passDraft.trim() || !Number.isInteger(passNum) || passNum < 10 || passNum > 100 ? "Use a whole number from 10 to 100." : null;
  const passError = showErrors ? passProblem : null;
  // Keep the intro honest about the pass mark.
  const introPcts = [...q.description.matchAll(/(\d{1,3})\s?%/g)].map((m) => Number(m[1]));
  const effectivePass = passProblem ? q.passPercentage : passNum;
  const introHint: React.ReactNode = isAutoIntro(q.description) ? (
    "Written from your settings. It updates itself when you save, so it always matches the pass mark."
  ) : introPcts.length && !introPcts.includes(effectivePass) ? (
    <span className="font-bold text-[#b02f00]">
      This intro mentions {introPcts[0]}%, but the pass mark is {effectivePass}%. Update one of them so learners aren&apos;t confused.
    </span>
  ) : (
    "Leave empty and we'll write one from your settings."
  );
  const clearErrorToast = () => {
    if (errorToast.current != null) toast.dismiss(errorToast.current);
    errorToast.current = null;
  };

  const save = (allowEmpty = false) => {
    setShowErrors(true);
    if (titleProblem || passProblem) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${formId} [aria-invalid=true]`)?.focus());
      return;
    }
    if (problems.broken) {
      clearErrorToast();
      errorToast.current = toast.error(`${problems.broken} ${problems.broken === 1 ? "question needs" : "questions need"} a fix`, { description: "The red notes sit right under the fields to fix." });
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`#${formId} [data-q-error] [aria-invalid=true]`);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    if (q.questions.length === 0 && !allowEmpty) {
      setConfirmEmpty(true);
      requestAnimationFrame(() => document.getElementById("quiz-empty-confirm")?.focus());
      return;
    }
    clearErrorToast();
    // optional keys are omitted, never set to undefined (the store would persist that as a sentinel)
    const limit = validLimit(q.timeLimitMin);
    onSave({
      ...item,
      quiz: stripUndefined({
        ...omitKey(q, "timeLimitMin"),
        ...(limit ? { timeLimitMin: limit } : {}),
        passPercentage: passNum,
        title: q.title.trim(),
        // empty, or still our own auto-written line: write it fresh from the current settings
        description: !q.description.trim() || isAutoIntro(q.description) ? autoIntro(q.questions.length, passNum, q.isGating) : q.description.trim(),
        questions: q.questions.map((x, i) => ({
          ...omitKey(x, "acceptedAnswers"),
          position: i + 1,
          text: x.text.trim(),
          explanation: x.explanation.trim(),
          options: x.options.map((o) => ({ ...o, text: o.text.trim() })),
          ...(x.type === "short" ? { acceptedAnswers: (Array.isArray(x.acceptedAnswers) ? x.acceptedAnswers : []).map((a) => a.trim()).filter(Boolean) } : {}),
        })),
      }),
    });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
      <Field label="Test name" required error={titleError ?? undefined}>
        <Input value={q.title} onChange={(e) => change({ title: e.target.value })} maxLength={80} placeholder="e.g. Flexbox checkpoint" data-autofocus="" />
      </Field>
      <Field label="Intro for learners" optional hint={introHint}>
        <Textarea value={q.description} onChange={(e) => change({ description: e.target.value })} rows={2} maxLength={200} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Pass mark" hint={passError ? undefined : "10 to 100. Score needed to pass."} error={passError ?? undefined}>
          <Input
            type="number"
            inputMode="numeric"
            min={10}
            max={100}
            step={5}
            suffix={<span className="pr-2 text-[14px] font-bold text-ink/55">%</span>}
            value={passDraft}
            onChange={(e) => {
              const v = e.target.value;
              setPassDraft(v);
              const n = Number(v);
              if (v.trim() && Number.isInteger(n) && n >= 10 && n <= 100) setQ((x) => ({ ...x, passPercentage: n }));
              onDirty();
            }}
          />
        </Field>
        <Field label="Attempts">
          <Select
            value={String(q.maxAttempts)}
            onChange={(e) => change({ maxAttempts: Number(e.target.value) })}
            options={[
              { value: "0", label: "Unlimited" },
              { value: "1", label: "1 attempt" },
              { value: "2", label: "2 attempts" },
              { value: "3", label: "3 attempts" },
              { value: "5", label: "5 attempts" },
            ]}
          />
        </Field>
        <Field label="Time limit" optional>
          <Select
            value={String(validLimit(q.timeLimitMin))}
            onChange={(e) => {
              const n = Number(e.target.value);
              // "No limit" removes the key instead of writing timeLimitMin: undefined
              setQ((x) => (n > 0 ? { ...x, timeLimitMin: n } : omitKey(x, "timeLimitMin")));
              onDirty();
            }}
            options={[
              { value: "0", label: "No limit" },
              { value: "5", label: "5 minutes" },
              { value: "10", label: "10 minutes" },
              { value: "15", label: "15 minutes" },
              { value: "30", label: "30 minutes" },
            ]}
          />
        </Field>
      </div>
      <div className="rounded-[20px] bg-[#e7e0fb]/60 p-4">
        <Switch
          label="Gate next lesson"
          description="Everything after this test stays locked until the learner passes it. Great for checkpoints before a harder module."
          checked={q.isGating}
          onChange={(v) => change({ isGating: v })}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="t-app-h3">
            Questions <span className="text-ink/45">({q.questions.length})</span>
          </h3>
          {showErrors && problems.broken > 0 && <Badge tone="flame" dot>{problems.broken} to fix</Badge>}
        </div>
        {q.questions.length === 0 &&
          (confirmEmpty ? (
            <div id="quiz-empty-confirm" tabIndex={-1} role="alert" className="rounded-[18px] bg-[#ffe1d4] p-4 text-[#8a2600] focus:outline-none">
              <p className="text-[14.5px] font-bold">This test has no questions yet.</p>
              <p className="mt-1 text-[13.5px] font-medium">Learners would open an empty test, and it can&apos;t go to review like this. Save it as a placeholder anyway?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" icon="plus" onClick={() => addQuestion("single")}>
                  Add a question
                </Button>
                <Button size="sm" variant="secondary" onClick={() => save(true)}>
                  Save without questions
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] bg-cream p-4 text-[14px] font-semibold text-ink/60">No questions yet. Add one below; three to five is the sweet spot.</p>
          ))}
        <ol className="flex flex-col gap-3">
          {q.questions.map((qq, i) => (
            <QuestionCard
              key={qq.id}
              q={qq}
              index={i}
              count={q.questions.length}
              showIssues={showErrors}
              onChange={(f) => setQuestion(qq.id, f)}
              onMove={(d) => move(i, d)}
              onDuplicate={() => {
                const copy: Question = { ...newQuestion(qq.type), text: qq.text, explanation: qq.explanation, ...(qq.type === "short" ? { acceptedAnswers: [...(qq.acceptedAnswers ?? [])] } : {}) };
                copy.options = qq.options.map((o, j) => ({ ...o, id: `${copy.id}_o${j + 1}` }));
                const arr = [...q.questions];
                arr.splice(i + 1, 0, copy);
                change({ questions: arr });
              }}
              onRemove={() => change({ questions: q.questions.filter((x) => x.id !== qq.id) })}
            />
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {QTYPES.map((t) => (
            <Button key={t.value} size="sm" variant="secondary" icon="plus" onClick={() => addQuestion(t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    </form>
  );
}

function QuestionCard({
  q,
  index,
  count,
  showIssues,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  q: Question;
  index: number;
  count: number;
  showIssues: boolean;
  onChange: (f: Partial<Question>) => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerNote, setAnswerNote] = useState<string | null>(null);
  const fi = showIssues ? questionFieldIssues(q) : {};
  const hasIssues = !!(fi.text || fi.options || fi.answers);
  const errId = (k: string) => `q-${q.id}-${k}-err`;
  const setType = (type: QuestionType) => {
    if (type === q.type) return;
    const fresh = newQuestion(type);
    if ((type === "single" || type === "multiple") && (q.type === "single" || q.type === "multiple")) {
      // keep options; single keeps only the first correct one
      let seen = false;
      onChange({ type, options: q.options.map((o) => (type === "single" ? { ...o, isCorrect: o.isCorrect && !seen ? (seen = true) : false } : o)) });
      return;
    }
    onChange({ type, options: fresh.options.map((o) => ({ ...o, id: o.id.replace(fresh.id, q.id) })), acceptedAnswers: fresh.acceptedAnswers });
  };
  const setCorrect = (id: string) => onChange({ options: q.options.map((o) => (q.type === "multiple" ? (o.id === id ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: o.id === id })) });
  const addAnswer = () => {
    const v = answerDraft.trim().replace(/\s+/g, " ");
    if (!v) return;
    const list = q.acceptedAnswers ?? [];
    const dupe = list.find((a) => answerKey(a) === answerKey(v));
    if (dupe) {
      setAnswerNote(`"${dupe}" already covers that: matching ignores capitals and spaces.`);
      setAnswerDraft("");
      return;
    }
    setAnswerNote(null);
    onChange({ acceptedAnswers: [...list, v] });
    setAnswerDraft("");
  };

  return (
    <li className={clsx("rounded-[22px] bg-white p-4 ring-1", hasIssues ? "ring-2 ring-flame/60" : "ring-ink/[0.09]")} {...(hasIssues ? { "data-q-error": "" } : {})}>
      {/* Phones: number + move/more on row 1, the type picker gets its own full-width row 2. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[12.5px] font-bold text-cream" aria-hidden>
          {index + 1}
        </span>
        <span className="text-[13px] font-bold text-ink/55 max-[359px]:hidden sm:hidden">
          Question {index + 1} of {count}
        </span>
        <div className="order-last w-full sm:order-none sm:w-[200px]">
          <Select selectSize="sm" aria-label={`Question ${index + 1} type`} value={q.type} onChange={(e) => setType(e.target.value as QuestionType)} options={QTYPES} />
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <Button size="sm" variant="ghost" iconOnly icon="arrow-up" aria-label="Move question up" disabled={index === 0} onClick={() => onMove(-1)} />
          <Button size="sm" variant="ghost" iconOnly icon="arrow-down" aria-label="Move question down" disabled={index === count - 1} onClick={() => onMove(1)} />
          <DropdownMenu
            label={`More actions for question ${index + 1}`}
            trigger={<Icon name="more" className="size-5" />}
            items={[
              { label: "Duplicate", icon: "copy", onSelect: onDuplicate },
              { label: "Delete question", icon: "trash", danger: true, onSelect: onRemove },
            ]}
          />
        </div>
      </div>

      <Field label="Question" className="mt-3" error={fi.text}>
        <Textarea id={`qtext-${q.id}`} value={q.text} onChange={(e) => onChange({ text: e.target.value })} rows={2} maxLength={300} placeholder="What do you want to check?" />
      </Field>

      {q.type === "short" ? (
        <div className="mt-3">
          <Field label="Accepted answers" hint={answerNote ?? "Matching ignores capitals and spaces. Add every spelling you'd accept."} error={fi.answers}>
            <Input
              value={answerDraft}
              onChange={(e) => {
                setAnswerDraft(e.target.value);
                if (answerNote) setAnswerNote(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAnswer();
                }
              }}
              placeholder="Type an answer and press Enter"
              suffix={
                <Button size="sm" variant="ghost" onClick={addAnswer} aria-label="Add accepted answer" iconOnly icon="plus" />
              }
            />
          </Field>
          {(q.acceptedAnswers ?? []).length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Accepted answers">
              {(q.acceptedAnswers ?? []).map((a) => (
                <li key={a} className="inline-flex h-8 items-center gap-1 rounded-full bg-mint pr-1 pl-3 text-[13px] font-bold text-forest">
                  {a}
                  <button type="button" onClick={() => onChange({ acceptedAnswers: (q.acceptedAnswers ?? []).filter((x) => x !== a) })} className="grid size-6 place-items-center rounded-full hf:bg-white/60" aria-label={`Remove answer ${a}`}>
                    <Icon name="x" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <fieldset className="mt-3" aria-invalid={fi.options ? true : undefined} aria-describedby={fi.options ? errId("options") : undefined}>
          <legend className="mb-1.5 text-[14px] font-bold">
            Options <span className="font-medium text-ink/50">({q.type === "multiple" ? "tick every correct answer" : "pick the correct one"})</span>
          </legend>
          <ul className="flex flex-col gap-2">
            {q.options.map((o, oi) => (
              <li key={o.id} className="flex items-center gap-2">
                {q.type === "multiple" ? (
                  <Checkbox
                    label={<span className="sr-only">Option {oi + 1} is correct</span>}
                    checked={o.isCorrect}
                    onChange={() => setCorrect(o.id)}
                    className="shrink-0"
                    aria-invalid={fi.options && !q.options.some((x) => x.isCorrect) ? true : undefined}
                    aria-describedby={fi.options ? errId("options") : undefined}
                  />
                ) : (
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={o.isCorrect}
                    onChange={() => setCorrect(o.id)}
                    aria-label={`Option ${oi + 1} is the correct answer`}
                    aria-invalid={fi.options && !q.options.some((x) => x.isCorrect) ? true : undefined}
                    aria-describedby={fi.options ? errId("options") : undefined}
                    className="size-6 shrink-0 cursor-pointer accent-green"
                  />
                )}
                {q.type === "true_false" ? (
                  <span className={clsx("flex h-11 flex-1 items-center rounded-tag px-3.5 text-[15px] font-semibold", o.isCorrect ? "bg-mint text-forest" : "bg-cream")}>{o.text}</span>
                ) : (
                  <Input
                    value={o.text}
                    onChange={(e) => onChange({ options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
                    placeholder={`Option ${oi + 1}`}
                    aria-label={`Option ${oi + 1}`}
                    aria-invalid={fi.options && !o.text.trim() ? true : undefined}
                    aria-describedby={fi.options ? errId("options") : undefined}
                    maxLength={160}
                    className={clsx(o.isCorrect && "ring-2 ring-green/60")}
                  />
                )}
                {q.type !== "true_false" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconOnly
                    icon="x"
                    aria-label={`Remove option ${oi + 1}`}
                    disabled={q.options.length <= 2}
                    onClick={() => {
                      const rest = q.options.filter((x) => x.id !== o.id);
                      if (q.type === "single" && o.isCorrect && rest.length) rest[0] = { ...rest[0], isCorrect: true };
                      onChange({ options: rest });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          {q.type !== "true_false" && q.options.length < 6 && (
            <Button size="sm" variant="ghost" icon="plus" className="mt-2" onClick={() => onChange({ options: [...q.options, { id: `${q.id}_o${Date.now().toString(36)}`, text: "", isCorrect: false }] })}>
              Add option
            </Button>
          )}
          {fi.options && (
            <p id={errId("options")} role="alert" className="mt-1.5 flex items-start gap-1 text-[13px] font-semibold leading-snug text-[#c13500]">
              <Icon name="alert" className="mt-px size-3.5 shrink-0" strokeWidth={2.4} /> {fi.options}
            </p>
          )}
        </fieldset>
      )}

      <Field label="Explanation" optional hint="Shown after they submit. Explain why, not just what." className="mt-3">
        <Textarea value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} rows={2} maxLength={400} />
      </Field>

    </li>
  );
}

/* ----------------------------------------------------------------------------- resource */
const FILE_TYPES: { value: ResourceFileType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "zip", label: "ZIP folder" },
  { value: "sheet", label: "Spreadsheet" },
  { value: "template", label: "Template" },
  { value: "audio", label: "Audio" },
  { value: "link", label: "Link" },
];
const MOCK_URL: Record<ResourceFileType, string> = {
  pdf: "/mock/files/resource.pdf",
  zip: "/mock/files/resource.zip",
  sheet: "/mock/files/resource.xlsx",
  template: "/mock/files/resource-template.pdf",
  link: "",
  audio: "/mock/files/resource.mp3",
};

function ResourceForm({ formId, item, onDirty, onSave }: { formId: string; item: ResourceItem; onDirty: () => void; onSave: (it: ResourceItem) => void }) {
  const [r, setR] = useState<Resource>(() => stripUndefined(item.resource));
  const [fileName, setFileName] = useState<string | null>(item.resource.url && item.resource.fileType !== "link" ? item.resource.url.split("/").pop() ?? null : null);
  const [submitted, setSubmitted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const change = (f: Partial<Resource>) => {
    setR((x) => ({ ...x, ...f }));
    onDirty();
  };
  const { upload, start, cancel } = useMockUpload(({ name, sizeMb }) => {
    setFileName(name);
    setR((x) => ({ ...x, url: MOCK_URL[x.fileType] || MOCK_URL.pdf, sizeKb: Math.max(1, Math.round(sizeMb * 1024)) }));
  });
  const takeFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const type: ResourceFileType = ext === "pdf" ? "pdf" : ext === "zip" ? "zip" : ["xls", "xlsx", "csv"].includes(ext) ? "sheet" : ["mp3", "wav", "m4a"].includes(ext) ? "audio" : r.fileType === "link" ? "pdf" : r.fileType;
    setR((x) => ({ ...x, fileType: type, title: x.title || titleFromFileName(f.name) }));
    onDirty();
    start(f.name, Math.max(0.05, f.size / 1_048_576));
  };

  const errs: Record<string, string> = {};
  if (r.title.trim().length < 3) errs.title = "Name the resource (3+ characters).";
  if (r.fileType === "link") {
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(r.url.trim())) errs.url = "Paste a full link starting with https://";
  } else if (!r.url) errs.file = "Upload a file first.";
  if (upload.phase === "uploading" || upload.phase === "processing") errs.file = "Hang on, the upload is still running.";
  const errors = submitted ? errs : {};
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${formId} [aria-invalid=true]`)?.focus());
      return;
    }
    const keepSize = r.fileType !== "link" && typeof r.sizeKb === "number" && r.sizeKb > 0;
    onSave({
      ...item,
      resource: stripUndefined({
        ...omitKey(r, "sizeKb"),
        title: r.title.trim(),
        description: r.description.trim(),
        url: r.url.trim(),
        ...(keepSize ? { sizeKb: r.sizeKb } : {}),
      }),
    });
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
      <Field label="Type">
        <Segmented
          label="Resource type"
          size="sm"
          value={r.fileType === "link" ? "link" : "file"}
          onChange={(v) => change(v === "link" ? { fileType: "link", url: r.fileType === "link" ? r.url : "" } : { fileType: r.fileType === "link" ? "pdf" : r.fileType, url: r.fileType === "link" ? "" : r.url })}
          options={[
            { value: "file", label: "File" },
            { value: "link", label: "Link" },
          ]}
        />
      </Field>
      {r.fileType === "link" ? (
        <Field label="Link" required error={errors.url}>
          <Input type="url" value={r.url} onChange={(e) => change({ url: e.target.value })} placeholder="https://github.com/you/starter-repo" icon="link" />
        </Field>
      ) : (
        <div>
          <p className="mb-1.5 text-[14px] font-bold">File</p>
          {upload.phase === "uploading" || upload.phase === "processing" ? (
            <UploadStatus u={upload} onCancel={cancel} />
          ) : fileName ? (
            <div className="flex items-center gap-3 rounded-[20px] bg-mint/50 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-green">
                <Icon name="file" className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{fileName}</p>
                <p className="text-[12.5px] font-semibold text-forest/75">{r.sizeKb ? (r.sizeKb > 1024 ? `${(r.sizeKb / 1024).toFixed(1)} MB` : `${r.sizeKb} KB`) : "Uploaded"}</p>
              </div>
              <Button size="sm" variant="secondary" icon="refresh" onClick={() => fileInput.current?.click()}>
                Replace
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-[20px] border-2 border-dashed border-ink/15 bg-cream/60 px-4 py-6 text-center">
              <Icon name="upload" className="size-6 text-ink/60" />
              <p className="mt-2 text-[14px] font-bold">PDF, ZIP, spreadsheet or audio, up to 200 MB</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" icon="upload" onClick={() => fileInput.current?.click()}>
                  Choose a file
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="sparkles"
                  onClick={() => {
                    const s = SAMPLE_FILES[0]; // the button promises a PDF, so it's always the PDF sample
                    setR((x) => ({ ...x, fileType: s.fileType, title: x.title || titleFromFileName(s.name) }));
                    onDirty();
                    start(s.name, s.sizeKb / 1024);
                  }}
                >
                  Use a sample PDF
                </Button>
              </div>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) takeFile(f);
              e.target.value = "";
            }}
          />
          {errors.file && (
            <p role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-[#c13500]">
              <Icon name="alert" className="size-3.5" strokeWidth={2.4} /> {errors.file}
            </p>
          )}
          <Field label="File type" className="mt-4">
            <Select value={r.fileType} onChange={(e) => change({ fileType: e.target.value as ResourceFileType })} options={FILE_TYPES.filter((t) => t.value !== "link")} />
          </Field>
        </div>
      )}
      <Field label="Name" required error={errors.title}>
        <Input value={r.title} onChange={(e) => change({ title: e.target.value })} maxLength={80} placeholder="e.g. Flexbox cheat sheet" data-autofocus="" />
      </Field>
      <Field label="Description" optional>
        <Textarea value={r.description} onChange={(e) => change({ description: e.target.value })} rows={2} maxLength={200} showCount />
      </Field>
    </form>
  );
}
