"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { navLinks } from "@/lib/landing-data";
import { Mascot } from "@/components/decor/Mascot";
import { ArrowButton } from "@/components/decor/Bits";

export function Logo({
  className,
  light,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      className={clsx("flex items-center gap-1.5", className)}
      aria-label="Tamada Media home"
    >
      <Mascot className="size-8 -rotate-6" title="" />
      <span
        className={clsx(
          "font-display text-[13px] leading-[0.95] tracking-tight uppercase",
          light ? "text-paper" : "text-ink",
        )}
      >
        Tamada
        <br />
        Media
      </span>
    </Link>
  );
}

export function Header() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 120 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-4 py-3 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:px-8 md:py-4",
          hidden && !open && "-translate-y-[120%]",
        )}
      >
        <Logo className="rounded-xl bg-cream/80 py-1 pr-2 backdrop-blur-sm" />

        <nav
          aria-label="Primary"
          className="shadow-hard-sm hidden items-center gap-1 rounded-xl border-2 border-ink bg-paper p-1 md:flex"
        >
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-yellow"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-yellow"
          >
            Log in
          </Link>
          <ArrowButton href="/signup" className="ml-1 !shadow-none">
            Start free
          </ArrowButton>
        </nav>

        <button
          type="button"
          className="shadow-hard-sm relative z-50 grid size-12 place-items-center rounded-xl border-2 border-ink bg-lime md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="relative block h-3 w-5">
            <span
              className={clsx(
                "absolute left-0 block h-[3px] w-5 rounded bg-ink transition-transform",
                open ? "top-1 rotate-45" : "top-0",
              )}
            />
            <span
              className={clsx(
                "absolute left-0 block h-[3px] w-5 rounded bg-ink transition-transform",
                open ? "top-1 -rotate-45" : "top-2.5",
              )}
            />
          </span>
        </button>
      </header>

      {/* Mobile menu */}
      <div
        className={clsx(
          "fixed inset-0 z-40 flex flex-col justify-between overflow-hidden bg-maroon px-6 pt-28 pb-10 text-paper transition-[clip-path] duration-700 ease-[cubic-bezier(.7,0,.2,1)] md:hidden",
          open
            ? "[clip-path:circle(150%_at_100%_0)]"
            : "pointer-events-none [clip-path:circle(0%_at_100%_0)]",
        )}
        aria-hidden={!open}
      >
        <nav className="flex flex-col gap-2" aria-label="Mobile">
          {[...navLinks, { label: "Log in", href: "/login" }].map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="w-fit font-display text-[clamp(1.3rem,6.5vw,2rem)] leading-tight uppercase"
              style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <ArrowButton href="/signup" className="self-start">
          Start free
        </ArrowButton>
      </div>
    </>
  );
}
