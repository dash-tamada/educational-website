import { JOURNAL, POSTS } from "@/lib/content/journal";
import { Eyebrow, SplitReveal } from "@/components/editorial";

/* =============================================================================
   JOURNAL HERO (Mobius "Studio Notes" header). Cream.
   Left column: the eyebrow on top, the note at the bottom (Mobius); right: a small
   Anton JOURNAL line above the giant Inter Tight "Studio Notes". Server component.
   ============================================================================= */
export function JournalHero() {
  return (
    <header className="edit-grid gap-y-8 pt-[calc(var(--header-offset)+var(--sat)+clamp(40px,8vh,112px))] pb-[clamp(40px,6vw,88px)]">
      <div className="col-span-12 flex flex-col justify-between gap-8 lg:col-span-3">
        <Eyebrow index={String(POSTS.length).padStart(2, "0")}>{JOURNAL.label}</Eyebrow>
        <p data-reveal="rise" className="t-small max-w-[17rem] text-muted max-lg:hidden">
          {JOURNAL.note}
        </p>
      </div>
      <div className="col-span-12 lg:col-span-9 lg:col-start-4">
        <p className="font-display text-[clamp(1.5rem,1rem+1.6vw,2.75rem)] leading-none text-red uppercase">{JOURNAL.label}</p>
        <SplitReveal as="h1" immediate className="mt-3 font-heading text-[clamp(3.75rem,1.2rem+8.6vw,11rem)] leading-[0.88] font-bold tracking-[-0.058em]">
          {JOURNAL.title}
        </SplitReveal>
        <p data-reveal="rise" className="t-body-l mt-8 max-w-[34rem] text-muted lg:hidden">
          {JOURNAL.note}
        </p>
      </div>
    </header>
  );
}
