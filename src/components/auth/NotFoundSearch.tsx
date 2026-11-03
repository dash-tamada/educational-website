"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/app";
import { ArrowIcon } from "@/components/editorial";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { FLAGSHIP } from "@/lib/content/site";
import { COURSE_GROUPS } from "@/lib/content/home";

/* =============================================================================
   404 search: a tiny client-side index of the site (the course and its module
   groups, journal notes, pages). Matches show as a ruled list under the field;
   Enter opens the first match (or the course page when nothing matches).
   ============================================================================= */

type Entry = { kind: string; title: string; href: string; terms: string };

const INDEX: Entry[] = [
  { kind: "Course", title: FLAGSHIP.title, href: FLAGSHIP.href, terms: "course ai filmmaking prompt premiere curriculum price buy enrol enroll modules" },
  { kind: "Lesson", title: "Watch the free first lesson", href: FLAGSHIP.freeLessonHref, terms: "free lesson trial preview watch video learn" },
  ...COURSE_GROUPS.map((g) => ({
    kind: g.modules,
    title: g.title,
    href: FLAGSHIP.href,
    terms: `${g.title} ${g.chips.join(" ")} ${g.statement}`.toLowerCase(),
  })),
  { kind: "Page", title: "Films", href: "/films", terms: "films showreel work shorts gallery learners" },
  { kind: "Page", title: "The director", href: "/about", terms: "director arjun rao about team story school" },
  { kind: "Page", title: "Journal", href: "/journal", terms: "journal notes articles blog studio" },
  { kind: "Page", title: "Contact", href: "/contact", terms: "contact email help support question human talk" },
  { kind: "Page", title: "Questions, answered", href: "/#faq", terms: "faq questions help refund access emi cost tools" },
  { kind: "Page", title: "Verify a certificate", href: "/certificates", terms: "certificate verify check code certified ai filmmaker" },
  { kind: "Page", title: "Log in", href: "/login", terms: "log in login sign in account dashboard password" },
  { kind: "Page", title: "Create an account", href: "/signup", terms: "sign up signup register account join" },
  { kind: "Legal", title: "Terms of use", href: "/terms", terms: "terms rules refund legal licence" },
  { kind: "Legal", title: "Privacy policy", href: "/privacy", terms: "privacy data cookies personal legal dpdp" },
];

/** A journal note in the index (passed in by the server page, so the posts stay off the client). */
export type NoteEntry = { slug: string; title: string; excerpt: string; tag: string };

function search(q: string, index: Entry[]) {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return index.map((e) => {
    const hay = `${e.title.toLowerCase()} ${e.terms}`;
    let score = 0;
    for (const w of words) {
      if (e.title.toLowerCase().includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
      else return null;
    }
    return { e, score };
  })
    .filter((x): x is { e: Entry; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.e);
}

export function NotFoundSearch({ notes = [] }: { notes?: NoteEntry[] }) {
  const router = useTransitionRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const index = useMemo(
    () => [
      ...INDEX,
      ...notes.map((p) => ({ kind: "Journal", title: p.title, href: `/journal/${p.slug}`, terms: `${p.title} ${p.excerpt} ${p.tag} journal notes blog`.toLowerCase() })),
    ],
    [notes],
  );
  const hits = useMemo(() => search(q, index), [q, index]);
  const typed = q.trim().length > 1;
  return (
    <form
      role="search"
      aria-label="Search the site"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(hits[0]?.href ?? FLAGSHIP.href);
      }}
      className="w-full"
    >
      <label htmlFor={`${id}-q`} className="t-label mb-3 block text-ash">
        Search the site
      </label>
      <Input
        id={`${id}-q`}
        type="search"
        icon="search"
        inputSize="lg"
        placeholder="Try “sound”, “characters” or “certificate”"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-controls={`${id}-hits`}
        aria-describedby={`${id}-status`}
      />
      <p id={`${id}-status`} aria-live="polite" className="sr-only">
        {typed ? (hits.length ? `${hits.length} matches. Press Enter to open the first.` : "No matches.") : ""}
      </p>
      <ul id={`${id}-hits`} className={hits.length ? "mt-1" : "hidden"}>
        {hits.map((h) => (
          <li key={`${h.href}-${h.title}`} className="border-b border-line">
            <Link
              href={h.href}
              className="group grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-baseline gap-x-4 py-3 transition-colors hf:text-red-lite"
            >
              <span className="t-label truncate text-ash">{h.kind}</span>
              <span className="truncate text-[15px] font-medium">{h.title}</span>
              <ArrowIcon className="size-3.5 self-center transition-[translate] duration-500 ease-expo group-hf:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
      {typed && !hits.length && <p className="t-small mt-3 text-ash">Nothing on set by that name. Press Enter for the course page.</p>}
    </form>
  );
}
