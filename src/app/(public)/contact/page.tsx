import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/app/SiteShell";
import { ContactForm, ContactFormFromUrl } from "@/components/contact/ContactForm";
import { ContactDetails } from "@/components/contact/ContactDetails";
import { ContactFaq } from "@/components/contact/ContactFaq";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Tamada Media: the course, the mentor cohort, workshops for your team, a film you want made, or just a hello. A human replies within one working day.",
};

/* /contact (Mobius "Contacts"): Let's talk + the conversational sentence form
   (UI only; ?topic= and ?ref= preselect it, #message lands on it), the photo +
   details card with the live local time, then quick answers. Components:
   src/components/contact, copy: src/lib/content/contact.ts. */
export default function ContactPage() {
  return (
    <SiteShell flush>
      <section aria-label="Write to us" className="ground-cream relative">
        <div className="container-wide">
          <Suspense fallback={<ContactForm />}>
            <ContactFormFromUrl />
          </Suspense>
        </div>
      </section>
      <ContactDetails />
      <ContactFaq />
    </SiteShell>
  );
}
