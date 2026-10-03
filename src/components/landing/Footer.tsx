"use client";

import Link from "next/link";
import { useState } from "react";
import { footerLinks } from "@/lib/landing-data";
import { Logo } from "./Header";

export function Footer() {
  const [sent, setSent] = useState(false);

  return (
    <footer className="bg-purple text-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr_1.2fr] md:py-20">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-paper/75">
            Video courses from real tutors. The first video of every course is
            free.
          </p>
          <div className="mt-6 flex gap-3">
            {["IG", "YT", "X"].map((s) => (
              <a
                key={s}
                href="#"
                aria-label={`Tamada Media on ${s}`}
                className="grid size-10 place-items-center rounded-full border-2 border-ink bg-hotpink text-xs font-bold transition-transform hover:scale-110 hover:-rotate-12"
              >
                {s}
              </a>
            ))}
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-medium"
        >
          {footerLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="w-fit hover:text-lime hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight">
            Join our mailing list
          </h2>
          <p className="mt-2 text-sm text-paper/75">
            New courses on the 1st of every month. No spam, promise.
          </p>
          {/* UI only for now: wired to the email provider in a later milestone */}
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              placeholder="Email address"
              className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-paper px-4 py-3 text-ink placeholder:text-ink/50"
            />
            <button
              type="submit"
              className="shadow-hard-sm rounded-xl border-2 border-ink bg-hotpink px-5 py-3 font-display text-[11px] uppercase transition-transform hover:-translate-y-0.5"
            >
              {sent ? "You're in ✓" : "Subscribe"}
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-paper/60">
          <span>
            © {new Date().getFullYear()} Tamada Media. All rights reserved.
          </span>
          <span>Made for learners, by learners.</span>
        </div>
      </div>
    </footer>
  );
}
