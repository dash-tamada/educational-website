import type { Metadata } from "next";
import { SiteShell } from "@/components/app/SiteShell";
import { FilmsExplorer } from "@/components/films/FilmsExplorer";
import { FilmsCta } from "@/components/films/FilmsCta";

export const metadata: Metadata = {
  title: "Films",
  description:
    "Films made with prompts: capstones, mentor-cohort films and studio work from Tamada Media, every frame generated and every decision human. Drag the canvas, open any film for its prompt and tool stack.",
};

/* /films (Mobius "Work" x Marlowe): a dark scroll / drag canvas of stills under a giant
   FILMS title (or a grid: the toggle, and the default under reduced motion), a detail
   overlay per film, then the "make your own" band. Components: src/components/films,
   copy: src/lib/content/films.ts. */
export default function FilmsPage() {
  return (
    <SiteShell flush headerLight>
      <FilmsExplorer />
      <FilmsCta />
    </SiteShell>
  );
}
