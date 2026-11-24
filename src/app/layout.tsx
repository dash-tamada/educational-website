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
    default: "Tamada Media | The AI-first creative school",
    template: "%s | Tamada Media",
  },
  description:
    "The AI-first creative school for Indian creators, founded by filmmakers. Learn filmmaking, movie making, ads, content and design with AI, starting with the flagship course AI Filmmaking: Prompt to Premiere. Standout graduates are considered for work on Tamada Media productions. First lesson free.",
  applicationName: "Tamada Media",
  keywords: [
    "AI-first creative school",
    "AI filmmaking course",
    "AI movie making",
    "AI ads and brand films",
    "AI content creation course",
    "AI design course",
    "AI video generation",
    "filmmaking course India",
  ],
  openGraph: {
    type: "website",
    siteName: "Tamada Media",
    locale: "en_IN",
    title: "Tamada Media | The AI-first creative school",
    description:
      "Films, ads and stories, made AI-first and directed by you. Start with the flagship AI filmmaking course; standout graduates get a shot at Tamada Media productions. First lesson free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tamada Media | The AI-first creative school",
    description: "Films, ads and stories, made AI-first and directed by you. First lesson free.",
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
