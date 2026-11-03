import { Eyebrow } from "@/components/app";
import { RuledList, RuledRow } from "./editorial";

/** The tutor studio's 404: stays inside the studio shell with a way back (editorial: a giant
 *  Anton "404" slate, an Inter Tight line, arrow links). */
export function StudioNotFound() {
  return (
    <div className="app-enter">
      <div className="grid gap-x-8 gap-y-8 border-t border-fg pt-6 md:pt-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Eyebrow>Tutor studio</Eyebrow>
          <p className="mt-4 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Error · 404 · page not found</p>
        </div>
        <div className="min-w-0 lg:col-span-9">
          <p aria-hidden className="t-display-xl pt-2 text-[clamp(6rem,3rem+14vw,15rem)] leading-[0.8] tracking-[-0.01em]">
            4<span className="text-red">0</span>4
          </p>
          <h1 className="mt-8 max-w-[18ch] font-heading text-[clamp(1.75rem,1.3rem+1.6vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.045em] md:mt-10">
            We can&apos;t find that <em className="text-red not-italic">page</em>.
          </h1>
          <p className="t-body-l mt-4 max-w-[52ch] text-muted">
            The link may be old, or the course was created in another browser. Demo drafts live only where you made them.
          </p>
          <RuledList className="mt-10 max-w-[560px]">
            <RuledRow index={1} title="Your courses" meta="Drafts, reviews and everything live" href="/tutor/courses" />
            <RuledRow index={2} title="Studio home" meta="Today's numbers and what's next" href="/tutor" />
            <RuledRow index={3} title="Start a fresh draft" meta="Titles first, lessons later" href="/tutor/courses/new" />
          </RuledList>
        </div>
      </div>
    </div>
  );
}
