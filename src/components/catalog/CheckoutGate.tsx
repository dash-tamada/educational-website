"use client";

import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/editorial";
import { useDemoAuth } from "@/lib/demo/session-client";

/* =============================================================================
   Editorial state blocks for checkout + the order page (log in, wrong account,
   not found, already owned). A ruled block: mono slate, an Inter Tight title
   (the page h1 when it IS the page), body, actions, footnote. Follows the ground
   it sits on (cream or theatre) through the context tokens.
   ============================================================================= */
export function StateCard({
  title,
  body,
  action,
  footnote,
  slate,
  as: H = "h2",
  titleId,
  className,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  footnote?: React.ReactNode;
  /** tiny mono caps line above the title */
  slate?: React.ReactNode;
  as?: "h1" | "h2";
  titleId?: string;
  className?: string;
}) {
  return (
    <div className={clsx("border-t border-fg pt-8 md:pt-10", className)}>
      {slate && (
        <p className="t-timecode flex items-center gap-3 text-muted">
          <span aria-hidden className="block size-[7px] bg-red" />
          {slate}
        </p>
      )}
      <H id={titleId} className={clsx("max-w-[18ch]", slate && "mt-6", H === "h1" ? "t-headline-xl" : "t-headline-l")}>
        {title}
      </H>
      {body && <p className="t-body-l mt-5 max-w-[36rem] text-muted">{body}</p>}
      {action && <div className="mt-8 flex flex-wrap items-center gap-3">{action}</div>}
      {footnote && <p className="t-small mt-6 text-muted">{footnote}</p>}
    </div>
  );
}

/** "Log in to …": one click into Priya's student demo, or the real login with ?next=. */
export function LoginPrompt({
  next,
  title,
  body,
  as,
  titleId,
  className,
  demo,
}: {
  next: string;
  title: React.ReactNode;
  body: React.ReactNode;
  as?: "h1" | "h2";
  titleId?: string;
  className?: string;
  /** the one-click demo login (default: Priya, the default student) */
  demo?: { label: string; onClick: () => void };
}) {
  const { loginAs } = useDemoAuth();
  return (
    <StateCard
      as={as}
      titleId={titleId}
      className={className}
      slate="Account needed"
      title={title}
      body={body}
      action={
        <>
          <Button onClick={demo?.onClick ?? (() => loginAs("student"))} arrow className="max-sm:w-full">
            {demo?.label ?? "Continue as Priya · demo"}
          </Button>
          <Button href={`/login?next=${encodeURIComponent(next)}`} variant="outline" className="max-sm:w-full">
            Log in
          </Button>
        </>
      }
      footnote={
        <>
          New here?{" "}
          <Link href="/signup" className="link-draw text-fg">
            Create an account
          </Link>
        </>
      }
    />
  );
}
