"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button, toast } from "@/components/app";
import { ArrowIcon } from "@/components/editorial";
import { useDemoAuth, useDemoUser } from "@/lib/demo/session-client";
import { DEMO_ACCOUNT_CARDS, landingFor } from "@/lib/mock/extra/auth";
import type { Role } from "@/lib/mock/types";

/* =============================================================================
   Demo logins for the auth pages, as ruled editorial lists (no cards, no
   colour chips): ROLE · Name · "Use →". One click sets the demo session cookie
   through useDemoAuth().loginAs, then routes to the role's home (or to a ?next=
   inside that role's area).
   ============================================================================= */

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={clsx("animate-spin", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function useDemoGo(next?: string | null) {
  const { loginAs } = useDemoAuth();
  const [pending, setPending] = useState<Role | null>(null);
  const go = (role: Role, name: string) => {
    setPending(role);
    loginAs(role, { redirectTo: landingFor(role, next ?? null) });
    toast.success(`You're in as ${name}.`, {
      description: "Demo session: everything you change stays in this browser.",
    });
  };
  return { pending, go };
}

/** "Use →" / spinner, the right-hand cell of a demo row. */
function UseCell({ busy }: { busy: boolean }) {
  return (
    <span className="t-label inline-flex items-center gap-2 text-fg transition-colors group-hf:text-red" aria-hidden>
      {busy ? (
        <>
          Opening <Spinner className="size-3.5" />
        </>
      ) : (
        <>
          Use <ArrowIcon className="size-3.5 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" />
        </>
      )}
    </span>
  );
}

/**
 * Phones and tablets: a compact three-cell ruled row above the login form, so a
 * demo account is one tap away without scrolling past the form.
 */
export function DemoQuickStrip({ next, className }: { next?: string | null; className?: string }) {
  const { pending, go } = useDemoGo(next);
  return (
    <section aria-labelledby="demo-strip-title" className={clsx("app-enter", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="demo-strip-title" className="t-label">
          Just looking?
        </h2>
        <p className="t-small text-muted">Try a demo, no password.</p>
      </div>
      <ul className="mt-3 grid grid-cols-3 border-y border-line">
        {DEMO_ACCOUNT_CARDS.map((a, i) => (
          <li key={a.role} className={clsx(i > 0 && "border-l border-line")}>
            <button
              type="button"
              onClick={() => go(a.role, a.name)}
              disabled={pending !== null}
              aria-busy={pending === a.role || undefined}
              aria-label={`Continue as ${a.name} (${a.label.toLowerCase()} demo)`}
              className="group flex min-h-16 w-full flex-col items-start justify-center gap-1.5 px-3 py-3 text-left transition-colors disabled:cursor-wait disabled:opacity-60 hf:bg-cream-2"
            >
              <span className="t-label text-muted">{a.label}</span>
              <span className="flex items-center gap-2 font-heading text-[15px] leading-none font-semibold tracking-[-0.02em] transition-colors group-hf:text-red">
                {pending === a.role ? <Spinner className="size-3.5" /> : a.name.split(" ")[0]}
                {pending !== a.role && <ArrowIcon className="size-3.5" />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Demo accounts": one-click Student / Tutor / Admin logins as a ruled list
 * (role · name + what you'll find · Use →).
 */
export function DemoAccounts({
  next,
  id = "demo",
  heading = "Demo accounts",
  className,
}: {
  next?: string | null;
  id?: string;
  heading?: string;
  className?: string;
}) {
  const { pending, go } = useDemoGo(next);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={clsx("scroll-mt-8", className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-fg pb-3">
        <h2 id={`${id}-title`} className="t-label">
          {heading}
        </h2>
        <p className="t-small text-muted">One click. No password. Nothing real.</p>
      </div>
      <ul>
        {DEMO_ACCOUNT_CARDS.map((a) => (
          <li key={a.role} className="border-b border-line">
            <button
              type="button"
              onClick={() => go(a.role, a.name)}
              disabled={pending !== null}
              aria-busy={pending === a.role || undefined}
              className="group grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-4 py-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:py-5"
            >
              <span className="t-label pt-[5px] text-muted">{a.label}</span>
              <span className="min-w-0">
                <span className="block font-heading text-[18px] leading-tight font-semibold tracking-[-0.025em] transition-colors group-hf:text-red sm:text-[19px]">
                  <span className="sr-only">Continue as </span>
                  {a.name}
                </span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted">{a.blurb}</span>
              </span>
              <span className="pt-[5px]">
                <UseCell busy={pending === a.role} />
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
  const [initialKey] = useState(() => (user ? `${user.role}:${user.userId}` : null));
  if (!user || `${user.role}:${user.userId}` !== initialKey) return null;
  const area = user.meta.area.split(" ")[0].toLowerCase() === "admin" ? "control room" : user.meta.area.toLowerCase();
  return (
    <div role="status" className={clsx("app-fade flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center", className)}>
      <p className="flex min-w-0 flex-1 items-start gap-3 text-[14px] leading-snug">
        <span aria-hidden className="mt-[5px] size-[7px] shrink-0 rounded-full bg-red" />
        <span className="min-w-0">
          Logged in as <strong className="font-semibold">{user.profile.name}</strong>
          <span className="t-label mt-1 block text-muted">{user.meta.label} demo</span>
        </span>
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => logout()}>
          Log out
        </Button>
        <Button size="sm" href={user.meta.href} iconRight="arrow-right">
          Go to {area}
        </Button>
      </div>
    </div>
  );
}
