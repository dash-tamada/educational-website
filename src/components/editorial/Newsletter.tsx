"use client";

import { useId, useState } from "react";
import { NEWSLETTER } from "@/lib/content/site";
import { ArrowIcon } from "./Button";

/** Footer newsletter field (Mobius): one underlined email field + arrow. UI only. */
export function Newsletter() {
  const id = useId();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done)
    return (
      <p role="status" className="t-body mt-6 max-w-[26rem] border-b border-line-strong pb-4">
        {NEWSLETTER.done}
      </p>
    );

  return (
    <form
      noValidate
      className="mt-6 max-w-[26rem]"
      onSubmit={(e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get("email") ?? "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          setError("Enter an email address like name@example.com");
          return;
        }
        setError("");
        setDone(true);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className="flex items-center border-b border-line-strong transition-colors focus-within:border-red">
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={NEWSLETTER.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="t-label h-12 min-w-0 flex-1 bg-transparent placeholder:text-muted focus:outline-none"
        />
        <button type="submit" aria-label="Subscribe" className="tap hit grid size-12 place-items-center hf:text-red">
          <ArrowIcon className="size-4" />
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="t-small mt-2 text-red-lite">
          {error}
        </p>
      )}
    </form>
  );
}
