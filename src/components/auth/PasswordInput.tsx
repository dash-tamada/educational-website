"use client";

import { forwardRef, useState } from "react";
import clsx from "clsx";
import { Icon, Input, type InputProps } from "@/components/app";
import { passwordStrength } from "@/lib/mock/extra/auth";

/**
 * Password field with a show / hide toggle. Use inside <Field> (it forwards the
 * injected id / aria-describedby / aria-invalid to the real input).
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type" | "suffix">
>(function PasswordInput(props, ref) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      ref={ref}
      type={shown ? "text" : "password"}
      icon="lock"
      autoCapitalize="none"
      spellCheck={false}
      {...props}
      suffix={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label="Show password"
          aria-pressed={shown}
          className="grid size-9 place-items-center text-fg/60 transition-colors coarse:-mr-1 coarse:size-11 hf:text-red"
        >
          <Icon name={shown ? "eye-off" : "eye"} className="size-[18px]" />
        </button>
      }
    />
  );
});

/* Monochrome + the one red: weak = red, fair = smoke, good / strong = ink. */
const BAR_TONE = ["bg-red", "bg-red", "bg-smoke", "bg-ink", "bg-ink"];
const TEXT_TONE = ["text-red-deep", "text-red-deep", "text-smoke", "text-ink", "text-ink"];

/** Four-segment strength meter + a short tip. Announced politely to screen readers. */
export function StrengthMeter({
  password,
  id,
  hideTip,
}: {
  password: string;
  id?: string;
  hideTip?: boolean;
}) {
  const s = passwordStrength(password);
  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={clsx(
              "h-[3px] flex-1 transition-colors duration-300",
              password && (s.score >= i || (s.score === 0 && i === 1))
                ? BAR_TONE[s.score]
                : "bg-ink/[0.1]",
            )}
          />
        ))}
      </div>
      <p
        className={clsx(
          "mt-2 flex-wrap items-baseline gap-x-2 text-[12.5px] leading-snug text-muted",
          hideTip && !s.label ? "hidden" : "flex",
        )}
      >
        {s.label && (
          <span className={clsx("t-label", TEXT_TONE[s.score])}>
            {s.label}.
          </span>
        )}
        {!hideTip && <span>{s.tip}</span>}
      </p>
    </div>
  );
}
