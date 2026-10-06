"use client";

import { useState } from "react";
import clsx from "clsx";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { Button, DemoPill, Icon, toast } from "@/components/app";
import { useDemoAuth, useDemoUser } from "@/lib/demo/session-client";
import { DEMO_ACCOUNT_CARDS, landingFor } from "@/lib/mock/extra/auth";
import { toneBg } from "@/lib/landing-data";
import type { Role } from "@/lib/mock/types";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx("animate-spin", className)}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".3"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Compact "Just looking?" row for phones and tablets, shown above the login
 * form so the demo accounts are one tap away without scrolling past the form.
 */
export function DemoQuickStrip({
  next,
  className,
}: {
  next?: string | null;
  className?: string;
}) {
  const { loginAs } = useDemoAuth();
  const [pending, setPending] = useState<Role | null>(null);
  const go = (role: Role, name: string) => {
    setPending(role);
    loginAs(role, { redirectTo: landingFor(role, next ?? null) });
    toast.success(`You're in as ${name}.`, {
      description: "Demo session: everything you change stays in this browser.",
    });
  };
  return (
    <section
      aria-labelledby="demo-strip-title"
      className={clsx("app-enter rounded-card bg-butter p-3 sm:p-4", className)}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <h2
          id="demo-strip-title"
          className="text-[15px] font-bold [text-wrap:pretty]"
        >
          Just looking?{" "}
          <span className="font-semibold text-ink/65">
            Try a demo, no password.
          </span>
        </h2>
      </div>
      <ul className="mt-2.5 grid grid-cols-3 gap-2">
        {DEMO_ACCOUNT_CARDS.map((a) => (
          <li key={a.role}>
            <button
              type="button"
              onClick={() => go(a.role, a.name)}
              disabled={pending !== null}
              aria-busy={pending === a.role || undefined}
              aria-label={`Continue as ${a.name} (${a.label.toLowerCase()} demo)`}
              className="tap flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-white px-2 text-[14px] font-bold shadow-soft transition-shadow disabled:cursor-wait disabled:opacity-70 hf:shadow-lift"
            >
              {pending === a.role ? (
                <Spinner className="size-4" />
              ) : (
                <span
                  className={clsx(
                    "size-2.5 shrink-0 rounded-full",
                    toneBg[a.tone],
                  )}
                  aria-hidden
                />
              )}
              {a.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Try a demo account": one-click Student / Tutor / Admin logins. Sets the demo
 * session cookie through the foundation helper, then routes to the role's home
 * (or to a ?next= inside that role's area).
 */
export function DemoAccounts({
  next,
  id = "demo",
  heading = "Just looking around?",
}: {
  next?: string | null;
  id?: string;
  heading?: string;
}) {
  const { loginAs } = useDemoAuth();
  const [pending, setPending] = useState<Role | null>(null);

  const go = (role: Role, name: string) => {
    setPending(role);
    loginAs(role, { redirectTo: landingFor(role, next ?? null) });
    toast.success(`You're in as ${name}.`, {
      description: "Demo session: everything you change stays in this browser.",
    });
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-card-lg bg-butter p-5 md:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="t-app-h2">
          {heading}
        </h2>
        <DemoPill className="mt-0.5 shrink-0 bg-white!" />
      </div>
      <p className="mt-1 t-small text-ink/70">
        Try a demo account. One click, no password, nothing real.
      </p>
      <ul className="mt-5 grid gap-2.5">
        {DEMO_ACCOUNT_CARDS.map((a) => (
          <li key={a.role}>
            <button
              type="button"
              onClick={() => go(a.role, a.name)}
              disabled={pending !== null}
              aria-busy={pending === a.role || undefined}
              className="group tap flex w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-soft transition-[box-shadow,scale] duration-200 ease-ui disabled:cursor-wait disabled:opacity-70 sm:gap-3.5 sm:pr-4 hf:shadow-lift"
            >
              <span
                className={clsx(
                  "grid size-12 shrink-0 place-items-end justify-center overflow-hidden rounded-[16px] pt-2 sm:size-14 sm:rounded-[18px]",
                  toneBg[a.tone],
                )}
                aria-hidden
              >
                <BlockBuddy
                  body="#fffdf8"
                  head={a.buddy.head}
                  hat={a.buddy.hat}
                  className="w-7 translate-y-1 sm:w-9"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="t-app-h3">
                    <span className="sr-only sm:not-sr-only">Continue as </span>
                    {a.name}
                  </span>
                  <span
                    className={clsx("rounded-full px-2 py-1 t-micro", a.chip)}
                  >
                    {a.label}
                  </span>
                </span>
                <span className="mt-1 block t-small text-ink/70">
                  {a.blurb}
                </span>
              </span>
              <span
                className={clsx(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                  a.chip,
                )}
                aria-hidden
              >
                {pending === a.role ? (
                  <Spinner className="size-4" />
                ) : (
                  <Icon
                    name="arrow-right"
                    className="size-4"
                    strokeWidth={2.6}
                  />
                )}
              </span>
              <span className="sr-only">Opens the {a.lands}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shown on auth pages when a demo session already exists. */
export function SessionBanner({ className }: { className?: string }) {
  const user = useDemoUser();
  const { logout } = useDemoAuth();
  // Only for a session that existed when the page opened: logging in from this
  // page must not slide a banner in (and push the form down) under the curtain.
  const [initialKey] = useState(() =>
    user ? `${user.role}:${user.userId}` : null,
  );
  if (!user || `${user.role}:${user.userId}` !== initialKey) return null;
  return (
    <div
      role="status"
      className={clsx(
        "app-fade flex flex-col gap-3 rounded-card bg-white p-4 shadow-soft sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-forest"
          aria-hidden
        >
          <Icon name="check" className="size-4" strokeWidth={2.8} />
        </span>
        <p className="min-w-0 t-small">
          Logged in as{" "}
          <strong className="font-bold">{user.profile.name}</strong>
          <span className="block text-ink/70">{user.meta.label} demo</span>
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => logout()}>
          Log out
        </Button>
        <Button size="sm" href={user.meta.href} iconRight="arrow-right">
          Go to{" "}
          {user.meta.area.split(" ")[0].toLowerCase() === "admin"
            ? "control room"
            : user.meta.area.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
