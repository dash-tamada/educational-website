import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import {
  Caveat,
  DM_Sans,
  Londrina_Solid,
  Yellowtail,
} from "next/font/google";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { RevealScanner } from "@/components/motion/Reveal";
import { AnimationGate } from "@/components/motion/AnimationGate";
import { RouteTransitionProvider } from "@/components/transition/RouteTransition";
import "./globals.css";

/** Display caps (Maxima-style tall, rounded, condensed). Only 900 is used. */
const londrina = Londrina_Solid({
  variable: "--font-londrina",
  weight: "900",
  subsets: ["latin"],
});
/**
 * Chunky Aardvark-style headings. Every use is weight 800 at opsz 96, so we ship
 * Google's static instance pinned to exactly that (opsz 96, wght 800, latin:
 * 22 KB) instead of the variable font with opsz + wdth axes (131 KB).
 * Re-download: fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,800
 * (OFL, see fonts/Bricolage-OFL.txt). Not preloaded: nothing above the fold uses it.
 */
const bricolage = localFont({
  variable: "--font-bricolage",
  src: [{ path: "./fonts/bricolage-800-opsz96-latin.woff2", weight: "800", style: "normal" }],
  display: "swap",
  preload: false,
  fallback: ["Arial Black", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
/** Hand notes (hero + sections): 600, plus 700 for the category hover swap. */
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });
const yellowtail = Yellowtail({
  variable: "--font-yellowtail",
  weight: "400",
  subsets: ["latin"],
});
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Tamada Media | Video courses from real tutors",
    template: "%s | Tamada Media",
  },
  description:
    "Short video lessons, tests between modules and real tutors. The first video of every course is free.",
};

export const viewport: Viewport = {
  themeColor: "#f5f0e3",
};

/**
 * Runs before first paint (see docs: preventing-flash-before-hydration).
 * - data-motion="ok" | "reduce": CSS only pre-hides [data-reveal] targets when "ok",
 *   so no-JS and reduced-motion visitors always see static content.
 * - data-intro="done" on every route except "/" (the intro curtain only lives on home).
 */
const prePaint = `(function(){var d=document.documentElement;try{var r=matchMedia("(prefers-reduced-motion: reduce)").matches;d.dataset.motion=r?"reduce":"ok";if(location.pathname!=="/"||r)d.dataset.intro="done";}catch(e){d.dataset.intro="done";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [londrina, bricolage, caveat, yellowtail, dmSans]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </head>
      <body className="min-h-dvh">
        <SmoothScroll>
          <RouteTransitionProvider>
            {children}
            <RevealScanner />
            <AnimationGate />
          </RouteTransitionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
