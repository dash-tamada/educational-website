/* =============================================================================
   EDITORIAL KIT (design system v2: Marlowe mood x Mobius structure).
   The public site shell + the building blocks every public page uses.

   Shell (wired through <SiteShell> in @/components/app; use that in pages):
     SiteHeader       fixed header, ground-aware, hides on scroll, full-screen menu
     WordmarkFooter   giant TAMADA MEDIA® footer (variant "minimal" for task pages)
     LiveClock        fixed bottom-right "INDIA · IST 07:19 AM"
     CinematicIntro   home-only first-visit intro (once per session)

   Blocks:
     Button / ArrowLink / ArrowIcon     rectangular CTAs, Mobius "Get started →"
     Label / Eyebrow / RedWords         tiny caps labels, red accent words
     GridLines                          Marlowe hairline columns overlay
     Photo / BrandMark                  media.ts photos (next/image), the logo
     SplitReveal                        line / word mask reveal on scroll
     useGround                          dark / light ground under a viewport line
   ============================================================================= */
export { SiteHeader } from "./SiteHeader";
export { WordmarkFooter, MinimalFooterRow } from "./WordmarkFooter";
export { ShellFooter } from "./ShellFooter";
export { LiveClock } from "./LiveClock";
export { CinematicIntro } from "./CinematicIntro";
export { Button, ArrowLink, ArrowIcon, type ButtonVariant, type ButtonSize } from "./Button";
export { Label, Eyebrow, RedWords } from "./Label";
export { GridLines } from "./GridLines";
export { Photo, ParallaxPhoto } from "./Photo";
export { BrandMark } from "./BrandMark";
export { SplitReveal } from "./SplitReveal";
export { Newsletter } from "./Newsletter";
export { useGround, type Ground } from "./useGround";
