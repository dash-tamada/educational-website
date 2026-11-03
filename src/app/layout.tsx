import type { Metadata, Viewport } from "next";
import { Anton, Inter, Inter_Tight } from "next/font/google";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { RevealScanner } from "@/components/motion/Reveal";
import { AnimationGate } from "@/components/motion/AnimationGate";
import { PrePaint } from "@/components/motion/PrePaint";
import { RouteTransitionProvider } from "@/components/transition/RouteTransition";
import { Toaster } from "@/components/app/Toast";
import { KeyboardInset } from "@/components/app/mobile";
import "./globals.css";

/* Design system v2 type (see the globals.css header):
   display  = Anton (condensed caps, one weight)            --font-anton
   headings = Inter Tight (statements, headlines; variable) --font-inter-tight
   body/UI  = Inter (variable)                              --font-inter
   latin-ext carries the rupee sign (U+20B9), so prices never fall back. */
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tamada Media | AI Filmmaking: Prompt to Premiere",
    template: "%s | Tamada Media",
  },
  description:
    "An AI filmmaking school for Indian creators. Learn to write, design, generate, voice, score, edit and release a cinematic short with Veo, Kling, Runway, Midjourney, ElevenLabs and DaVinci Resolve. First lesson free.",
  applicationName: "Tamada Media",
  keywords: [
    "AI filmmaking course",
    "AI video generation",
    "Veo",
    "Kling",
    "Runway",
    "Midjourney",
    "AI short film",
    "filmmaking course India",
  ],
  openGraph: {
    type: "website",
    siteName: "Tamada Media",
    locale: "en_IN",
    title: "AI Filmmaking: Prompt to Premiere | Tamada Media",
    description:
      "Direct a cinematic short with AI, from the first prompt to the premiere. Ten modules, a 60-second capstone and a certificate. First lesson free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Filmmaking: Prompt to Premiere | Tamada Media",
    description: "Direct a cinematic short with AI, from the first prompt to the premiere. First lesson free.",
  },
};

/* Mobile foundation (MOBILE_SPEC §1.11): draw under the notch / home indicator
   (layouts pad with the --sat/--sab/--sal/--sar safe-area tokens) and let Android
   resize the layout viewport for the keyboard so sticky bars ride above it.
   Never maximumScale / userScalable: pinch zoom stays available. */
export const viewport: Viewport = {
  themeColor: "#fdf8ee",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [anton, interTight, inter]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <head>
        {/* Pre-paint <html> data attributes (motion, intro, session): see PrePaint. */}
        <PrePaint />
      </head>
      <body className="min-h-dvh">
        <SmoothScroll>
          <RouteTransitionProvider>
            {children}
            <RevealScanner />
            <AnimationGate />
            <Toaster />
            <KeyboardInset />
          </RouteTransitionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
