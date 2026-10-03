import { Header } from "@/components/landing/Header";
import { IntroCurtain } from "@/components/landing/IntroCurtain";
import { Hero } from "@/components/landing/Hero";
import { MarqueeTape } from "@/components/landing/MarqueeTape";
import { CourseCarousel } from "@/components/landing/CourseCarousel";
import { WhyCards } from "@/components/landing/WhyCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureStack } from "@/components/landing/FeatureStack";
import { CategoryList } from "@/components/landing/CategoryList";
import { WhyStickers } from "@/components/landing/WhyStickers";
import { Testimonials } from "@/components/landing/Testimonials";
import { TutorBanner } from "@/components/landing/TutorBanner";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <IntroCurtain />
      <Header />
      <main>
        <Hero />
        <MarqueeTape />
        <CourseCarousel />
        <WhyCards />
        <HowItWorks />
        <FeatureStack />
        <CategoryList />
        <WhyStickers />
        <Testimonials />
        <TutorBanner />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
