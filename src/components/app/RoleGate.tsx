"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/mock/types";
import { getUser } from "@/lib/mock";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth, useDemoSession } from "@/lib/demo/session-client";
import { DEMO_USERS, roleHome } from "@/lib/demo/session";
import { LOGO, LOGO_SRC } from "@/lib/brand";
import { AREAS } from "./nav";
import { Button } from "./Button";
import { DemoPill } from "./Badge";
import { AppClock } from "./Clock";

/* =============================================================================
   RoleGate (design system v2): a full-screen THEATRE (ink ground, hairline columns,
   Anton title, one red CTA) shown by an area layout when the demo session doesn't
   match the area (logged out, or another role). One click switches to the right
   demo account and re-renders the same URL. Never a crash, never a redirect loop.
   - Names the person actually signed in (any seeded or store-created user), not
     the role's default demo account.
   - If the demo store has since given the signed-in person this area's role
     (e.g. an admin approved their tutor application), it offers
     "Continue as <name>" for that same person first.
   ============================================================================= */

const COPY: Record<Role, { title: string; accent: string; what: string }> = {
  student: { title: "The student", accent: "space.", what: "Priya's course, progress, wishlist and certificates" },
  tutor: { title: "The tutor", accent: "studio.", what: "Arjun's course, the course builder, analytics and earnings" },
  admin: { title: "The control", accent: "room.", what: "people, tutor applications, course reviews and orders" },
};

const PROMOTED: Record<Role, string> = {
  student: "Your student space is ready too.",
  tutor: "Your tutor application was approved, so your course studio is ready.",
  admin: "You have admin access now.",
};

export function RoleGate({ area, currentRole, userId }: { area: Role; currentRole: Role | null; userId?: string | null }) {
  const { loginAs } = useDemoAuth();
  const session = useDemoSession();
  const db = useDb();
  const hydrated = useStoreHydrated();
  const [busy, setBusy] = useState<"self" | "demo" | null>(null);
  const target = DEMO_USERS[area];
  const cfg = AREAS[area];
  const copy = COPY[area];
  // "Go to log in" brings them back to the page they asked for (/login reads ?next).
  // Area layouts read the demo cookie, so these routes are dynamic and useSearchParams needs no Suspense.
  const pathname = usePathname() || roleHome(area);
  const query = useSearchParams()?.toString() ?? "";
  const search = query ? `?${query}` : "";
  const loginHref = `/login?next=${encodeURIComponent(pathname + search)}`;

  // who is signed in: the server's view first (no flash), then the live client session
  const role = currentRole ?? session?.role ?? null;
  const uid = role ? (userId ?? (session?.role === role ? session.userId : null) ?? DEMO_USERS[role].userId) : null;
  const me = uid ? (getUser(uid, db) ?? getUser(uid)) : null;
  const myName = me?.name ?? (role ? DEMO_USERS[role].name : "");
  // the store says this very person now holds the area's role: let them in as themselves
  const promoted = hydrated && !!me && !!role && role !== area && me.role === area && me.status !== "suspended";
  const firstName = myName.split(" ")[0];

  // the theatre runs edge to edge: paint the canvas (and its reserved scrollbar gutter) ink too
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.backgroundColor;
    root.style.backgroundColor = "var(--color-ink)";
    return () => {
      root.style.backgroundColor = prev;
    };
  }, []);

  const switchToDemo = () => {
    setBusy("demo");
    loginAs(area);
  };
  const continueAsMe = () => {
    if (!uid) return;
    setBusy("self");
    loginAs(area, { userId: uid });
  };

  return (
    <div className="theatre flex min-h-dvh flex-col overflow-hidden">
      {/* Marlowe hairline columns */}
      <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto max-w-[1400px] px-5 sm:px-10">
        <div className="relative h-full">
          <div className="grid-lines" style={{ "--cols": 4 } as React.CSSProperties} />
        </div>
      </div>
      <header className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-5 pt-[max(20px,var(--sat))] sm:px-10 md:pt-8">
        <Link href="/" aria-label="Tamada Media home" className="tap flex min-h-11 items-center">
          <Image src={LOGO_SRC.light} alt="Tamada Media" width={LOGO.w} height={LOGO.h} sizes="132px" loading="eager" className="h-auto w-[112px] md:w-[132px]" />
        </Link>
        <div className="flex items-center gap-4">
          <AppClock className="text-cream/70 max-sm:hidden" />
          <DemoPill tone="dark" />
        </div>
      </header>
      <main id="main" className="relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-1 flex-col justify-end px-5 pt-16 pb-12 sm:px-10 md:pb-16">
        <div className="app-enter max-w-[980px]">
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-cream uppercase">
            <span aria-hidden className="h-px w-6 bg-red" />
            {cfg.name} · Demo access
          </p>
          <h1 className="t-display-xl mt-6 text-cream">
            {promoted ? (
              <>
                Welcome in, <span className="text-red">{firstName}.</span>
              </>
            ) : (
              <>
                {copy.title} <span className="text-red">{copy.accent}</span>
              </>
            )}
          </h1>
          <div className="mt-8 grid gap-8 border-t border-line pt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12">
            <p className="t-body-l max-w-[46ch] text-cream/80" aria-live="polite">
              {promoted ? (
                <>
                  You&apos;re signed in as <strong className="font-semibold text-cream">{myName}</strong> ({DEMO_USERS[role].label.toLowerCase()}). {PROMOTED[area]} Continue as {firstName} to open it.
                </>
              ) : role ? (
                <>
                  You&apos;re browsing as <strong className="font-semibold text-cream">{myName}</strong> ({DEMO_USERS[role].label.toLowerCase()}). Switch to the {target.label.toLowerCase()} demo to see {copy.what}.
                </>
              ) : (
                <>
                  You&apos;re not logged in. Step into the {target.label.toLowerCase()} demo{" "}
                  {area === "admin" ? "as the platform admin" : (
                    <>
                      as <strong className="font-semibold text-cream">{target.name}</strong>
                    </>
                  )}{" "}
                  to look around {copy.what}. No password needed.
                </>
              )}
            </p>
            {/* phones: full-width buttons whose labels may wrap */}
            <div className="flex flex-col items-stretch gap-2 max-sm:[&>*]:h-auto max-sm:[&>*]:min-h-[52px] max-sm:[&>*]:py-3 max-sm:[&>*]:whitespace-normal sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
              {promoted ? (
                <>
                  <Button variant="red" size="lg" iconRight="arrow-right" loading={busy === "self"} disabled={!!busy} onClick={continueAsMe}>
                    Continue as {firstName}
                  </Button>
                  <Button variant="outline" size="lg" loading={busy === "demo"} disabled={!!busy} onClick={switchToDemo}>
                    Use {target.name}&apos;s demo
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="red" size="lg" iconRight="arrow-right" loading={busy === "demo"} disabled={!!busy} onClick={switchToDemo}>
                    {role ? `Switch to the ${target.label.toLowerCase()} demo` : area === "admin" ? "Continue as admin" : `Continue as ${target.name}`}
                  </Button>
                  {role ? (
                    <Button variant="outline" size="lg" href={roleHome(role)}>
                      Back to my {DEMO_USERS[role].label.toLowerCase()} space
                    </Button>
                  ) : (
                    <Button variant="outline" size="lg" href={loginHref}>
                      Go to log in
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="mt-10 font-mono text-[10.5px] tracking-[0.08em] text-cream/55 uppercase">
            Everything here is sample data ·{" "}
            <Link href="/" className="text-cream underline-offset-4 hf:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
