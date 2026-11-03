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
  title: "The director & the studio",
  description: `We are Tamada Media: an AI filmmaking school built like a film studio. Meet ${DIRECTOR.name}, the director who leads the course, the crew behind every lesson, and how we teach: story first, direct the machine, finish like a pro.`,
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
