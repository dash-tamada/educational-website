"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/mock/types";
import { getUser } from "@/lib/mock";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth, useDemoSession } from "@/lib/demo/session-client";
import { DEMO_USERS, roleHome } from "@/lib/demo/session";
import { BrandLockup } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { Eyebrow } from "@/components/decor/Bits";
import { AREAS } from "./nav";
import { Button } from "./Button";
import { DemoPill } from "./Badge";

/* =============================================================================
   RoleGate: shown by an area layout when the demo session doesn't match the area
   (logged out, or another role). One click switches to the right demo account
   and re-renders the same URL. Never a crash, never a redirect loop.
   - Names the person actually signed in (any seeded or store-created user), not
     the role's default demo account.
   - If the demo store has since given the signed-in person this area's role
     (e.g. an admin approved their tutor application), it offers
     "Continue as <name>" for that same person first.
   ============================================================================= */

const COPY: Record<Role, { title: string; what: string }> = {
  student: { title: "This is the student space.", what: "Priya's courses, progress, wishlist and certificates" },
  tutor: { title: "This is the tutor studio.", what: "Arjun's courses, the course builder, analytics and earnings" },
  admin: { title: "This is the control room.", what: "people, tutor applications, course reviews and orders" },
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
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-4 pt-[max(16px,var(--sat))] sm:px-8 md:pt-6">
        <Link href="/" aria-label="Tamada Media home" className="group tap flex min-h-11 items-center [--lw:112px] phone-s:[--lw:92px] md:[--lw:132px]">
          <BrandLockup interactive sizes="132px" />
        </Link>
        <DemoPill />
      </header>
      <main id="main" className="grid min-w-0 flex-1 place-items-center px-4 py-12 phone-s:px-3">
        <div className="app-enter relative w-full max-w-[560px] min-w-0 rounded-card-lg bg-white px-6 pt-10 pb-8 text-center shadow-soft phone-s:px-5 md:px-12 md:pt-12 md:pb-10">
          <div className="mx-auto flex w-fit items-end gap-2" aria-hidden>
            <BlockBuddy body="#2668fd" head="#ffcf3f" hat="#ff008c" className="w-10" />
            <Mascot title="" interactive className="w-20" style={{ transform: "rotate(-6deg)" }} />
            <BlockBuddy body="#00b351" head="#f780d4" wave className="w-11" />
          </div>
          <Eyebrow tone={cfg.tone} className="mt-6">
            {cfg.name}
          </Eyebrow>
          <h1 className="t-display-m mt-eyebrow">{promoted ? `Welcome in, ${firstName}.` : copy.title}</h1>
          <p className="t-body mx-auto mt-3 max-w-[40ch] text-ink/70" aria-live="polite">
            {promoted ? (
              <>
                You&apos;re signed in as <strong>{myName}</strong> ({DEMO_USERS[role].label.toLowerCase()}). {PROMOTED[area]} Continue as {firstName} to open it.
              </>
            ) : role ? (
              <>
                You&apos;re browsing as <strong>{myName}</strong> ({DEMO_USERS[role].label.toLowerCase()}). Switch to the {target.label.toLowerCase()} demo to see {copy.what}.
              </>
            ) : (
              <>
                You&apos;re not logged in. Hop into the {target.label.toLowerCase()} demo {area === "admin" ? "as the platform admin" : <>as <strong>{target.name}</strong></>} to look around {copy.what}. No password needed.
              </>
            )}
          </p>
          {/* phones: full-width buttons whose labels may wrap (never wider than the card) */}
          <div className="mt-7 flex flex-col items-stretch justify-center gap-2 max-sm:[&>*]:h-auto max-sm:[&>*]:min-h-[52px] max-sm:[&>*]:py-3 max-sm:[&>*]:whitespace-normal sm:flex-row sm:flex-wrap sm:items-center">
            {promoted ? (
              <>
                <Button variant="accent" size="lg" icon="arrow-right" loading={busy === "self"} disabled={!!busy} onClick={continueAsMe}>
                  Continue as {firstName} ({target.label.toLowerCase()})
                </Button>
                <Button variant="secondary" size="lg" icon="switch" loading={busy === "demo"} disabled={!!busy} onClick={switchToDemo}>
                  Use {target.name}&apos;s demo instead
                </Button>
              </>
            ) : (
              <>
                <Button variant="accent" size="lg" icon="switch" loading={busy === "demo"} disabled={!!busy} onClick={switchToDemo}>
                  {role ? `Switch to the ${target.label.toLowerCase()} demo` : area === "admin" ? "Continue as admin" : `Continue as ${target.name}`}
                </Button>
                {role ? (
                  <Button variant="secondary" size="lg" href={roleHome(role)}>
                    Back to my {DEMO_USERS[role].label.toLowerCase()} space
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" href={loginHref}>
                    Go to log in
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="mt-6 text-[13px] text-ink/65">
            Everything here is sample data. <Link href="/" className="font-bold text-ink underline-offset-2 hf:underline">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
