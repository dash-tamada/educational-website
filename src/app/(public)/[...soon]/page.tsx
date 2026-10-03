import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import { ArrowButton, LimeBox } from "@/components/decor/Bits";

export const metadata: Metadata = {
  title: "Coming soon",
  robots: { index: false },
};

// Temporary stand-in for routes built in later milestones (login, catalog, dashboards…).
export default async function ComingSoon({ params }: PageProps<"/[...soon]">) {
  const { soon } = await params;
  const label = decodeURIComponent(soon[0] ?? "").replace(/-/g, " ");
  return (
    <>
      <Header />
      <main className="bg-dots grid min-h-dvh place-items-center px-4 pt-24 text-center">
        <div>
          <Mascot className="mx-auto size-24 animate-float" wink title="" />
          <h1 className="mt-6 font-display text-[clamp(1.6rem,5vw,3.4rem)] leading-[1.3] uppercase">
            {label || "This page"} is
            <br />
            <LimeBox>coming soon</LimeBox>
          </h1>
          <p className="mx-auto mt-6 max-w-sm font-medium text-ink/70">
            We&apos;re still building this part of Tamada Media. Check back
            shortly.
          </p>
          <ArrowButton href="/" className="mt-8">
            Back home
          </ArrowButton>
        </div>
      </main>
    </>
  );
}
