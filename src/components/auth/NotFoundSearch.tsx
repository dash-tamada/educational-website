"use client";

import { useState } from "react";
import { Button, Input } from "@/components/app";
import { useTransitionRouter } from "@/components/transition/RouteTransition";

/** "Search the library instead" box for the 404 page. */
export function NotFoundSearch() {
  const router = useTransitionRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/courses?q=${encodeURIComponent(v)}` : "/courses");
      }}
      className="w-full max-w-[460px]"
    >
      <label htmlFor="nf-search" className="sr-only">
        Search courses
      </label>
      <Input
        id="nf-search"
        type="search"
        icon="search"
        inputSize="lg"
        placeholder="Search courses…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        suffix={
          <Button type="submit" size="sm" variant="accent" className="mr-1">
            Search
          </Button>
        }
        className="[&_input]:rounded-full [&_input]:pr-28 [&_input]:shadow-soft [&_input]:ring-0"
      />
    </form>
  );
}
