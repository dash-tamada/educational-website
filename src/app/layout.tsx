import type { Metadata, Viewport } from "next";
import {
  Boldonse,
  Bricolage_Grotesque,
  Caveat,
  DM_Sans,
  Yellowtail,
} from "next/font/google";
import "./globals.css";

const boldonse = Boldonse({
  variable: "--font-boldonse",
  weight: "400",
  subsets: ["latin"],
});
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
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
  themeColor: "#f7f5ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [boldonse, bricolage, caveat, yellowtail, dmSans]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
