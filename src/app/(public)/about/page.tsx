import type { Metadata } from "next";
import { SiteShell } from "@/components/app/SiteShell";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutStatement } from "@/components/about/AboutStatement";
import { AboutDirector } from "@/components/about/AboutDirector";
import { AboutApproach } from "@/components/about/AboutApproach";
import { AboutTeam } from "@/components/about/AboutTeam";
import { AboutNumbers } from "@/components/about/AboutNumbers";
import { AboutWork } from "@/components/about/AboutWork";
import { AboutFinal } from "@/components/about/AboutFinal";
import { DIRECTOR } from "@/lib/content/director";

export const metadata: Metadata = {
  title: "The studio",
  description: `We are Tamada Media: a school of filmmaking with AI, and a studio, founded by filmmakers. Meet ${DIRECTOR.name}, the founder and director, the crew behind every lesson, how we teach, and the path from the class into the studio.`,
};

/* /about (nav: Director). Mobius "Studio" flow x Marlowe mood: WE ARE TAMADA MEDIA®,
   the statement, the director (bio, quote, credits), the approach, the crew, numbers,
   work with us, a final dark band. Components: src/components/about, copy:
   src/lib/content/team.ts (ABOUT, TEAM) + director.ts. */
export default function AboutPage() {
  return (
    <SiteShell flush headerLight>
      <AboutHero />
      <AboutStatement />
      <AboutDirector />
      <AboutApproach />
      <AboutTeam />
      <AboutNumbers />
      <AboutWork />
      <AboutFinal />
    </SiteShell>
  );
}
