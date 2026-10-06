"use client";

import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/app";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { Mascot } from "@/components/decor/Mascot";
import { toneBg, type Tone } from "@/lib/landing-data";
import { useDemoAuth } from "@/lib/demo/session-client";

/**
 * A full-width state card for the checkout pages (log in, wrong account, not
 * found). Same look as the app EmptyState, but the title can be the page's h1.
 */
export function StateCard({
  title,
  body,
  action,
  footnote,
  art = "tami",
  tone = "butter",
  as: H = "h2",
  titleId,
  className,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  footnote?: React.ReactNode;
  art?: "tami" | "buddy" | "buddies";
  tone?: Tone;
  as?: "h1" | "h2";
  titleId?: string;
  className?: string;
}) {
  return (
    <div className={clsx("app-fade flex flex-col items-center rounded-card-lg bg-white px-6 py-12 text-center shadow-soft md:py-16", className)}>
      <div className={clsx("relative grid size-32 place-items-center rounded-full md:size-36", toneBg[tone])} aria-hidden>
        {art === "tami" && <Mascot title="" className="w-[4.5rem] md:w-20" style={{ transform: "rotate(-6deg)" }} />}
        {art === "buddy" && <BlockBuddy body="#2668fd" head="#ffcf3f" wave className="w-12 md:w-14" />}
        {art === "buddies" && (
          <span className="flex items-end gap-1">
            <BlockBuddy body="#ff008c" head="#ffcf3f" hat="#2668fd" className="w-10" />
            <BlockBuddy body="#00b351" head="#f780d4" wave className="w-11" />
          </span>
        )}
      </div>
      <H id={titleId} className={clsx("mt-5 max-w-[22ch]", H === "h1" ? "t-display-m" : "t-app-h2")}>
        {title}
      </H>
      {body && <p className="t-body mt-3 max-w-[40ch] text-ink/70">{body}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
      {footnote && <p className="mt-5 text-[13px] font-semibold text-ink/60">{footnote}</p>}
    </div>
  );
}

/** "Log in to …" card: one click into Priya's student demo, or the real login with ?next=. */
export function LoginPrompt({ next, title, body, as, titleId }: { next: string; title: React.ReactNode; body: React.ReactNode; as?: "h1" | "h2"; titleId?: string }) {
  const { loginAs } = useDemoAuth();
  return (
    <StateCard
      as={as}
      titleId={titleId}
      title={title}
      body={body}
      action={
        <>
          <Button variant="accent" icon="user" onClick={() => loginAs("student")} className="h-auto! min-h-11 max-w-full py-2.5 text-center leading-tight! whitespace-normal!">
            Continue as Priya (student demo)
          </Button>
          <Button href={`/login?next=${encodeURIComponent(next)}`} variant="secondary">
            Log in
          </Button>
        </>
      }
      footnote={
        <>
          New here?{" "}
          <Link href="/signup" className="font-bold text-blue underline-offset-4 hf:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}
