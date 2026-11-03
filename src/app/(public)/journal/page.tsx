import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/app/SiteShell";
import { JournalHero } from "@/components/journal/JournalHero";
import { FeedView, JournalFeed } from "@/components/journal/JournalFeed";
import { CourseCta } from "@/components/journal/CourseCta";
import { JOURNAL } from "@/lib/content/journal";

export const metadata: Metadata = {
  title: `${JOURNAL.title}: the journal`,
  description:
    "Studio Notes from Tamada Media: practical AI filmmaking notes on prompting camera language, character continuity, sound, the grade, credit budgets and releasing AI films in India.",
};

/* /journal (Mobius "Feed"): giant Studio Notes header, tag chips (?tag=), a featured
   note + a 3-column feed with load more, then the course CTA. Components:
   src/components/journal, posts: src/lib/content/journal.ts. The feed reads the URL,
   so it sits in a Suspense boundary whose fallback is the unfiltered feed. */
export default function JournalPage() {
  return (
    <SiteShell flush>
      <section aria-label={JOURNAL.title} className="ground-cream relative">
        <div className="container-wide pb-section">
          <JournalHero />
          <Suspense fallback={<FeedView tag={null} />}>
            <JournalFeed />
          </Suspense>
        </div>
      </section>
      <section aria-label="The course" className="ground-cream relative">
        <div className="container-wide pb-section">
          <CourseCta />
        </div>
      </section>
    </SiteShell>
  );
}
