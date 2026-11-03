import { SiteShell } from "@/components/app/SiteShell";
import { CinematicIntro } from "@/components/editorial";
import { HomeHero } from "@/components/home/HomeHero";
import { ScatteredWords } from "@/components/home/ScatteredWords";
import { MotionStill } from "@/components/home/MotionStill";
import { CourseServices } from "@/components/home/CourseServices";
import { InNumbers } from "@/components/home/InNumbers";
import { ToolsTable } from "@/components/home/ToolsTable";
import { DirectorQuote } from "@/components/home/DirectorQuote";
import { BtsBreak } from "@/components/home/BtsBreak";
import { Reflections } from "@/components/home/Reflections";
import { PricingPlans } from "@/components/home/PricingPlans";
import { JournalTeaser } from "@/components/home/JournalTeaser";
import { FaqList } from "@/components/home/FaqList";
import { Enquiry } from "@/components/home/Enquiry";

/* Home (Mobius flow x Marlowe mood). One component per section in src/components/home,
   copy in src/lib/content/home.ts, the shell (header, footer, clock) from SiteShell. */
export default function HomePage() {
  return (
    <SiteShell flush headerLight before={<CinematicIntro />}>
      <HomeHero />
      <ScatteredWords />
      <MotionStill />
      <CourseServices />
      <InNumbers />
      <ToolsTable />
      <DirectorQuote />
      <BtsBreak />
      <Reflections />
      <PricingPlans />
      <JournalTeaser />
      <FaqList />
      <Enquiry />
    </SiteShell>
  );
}
