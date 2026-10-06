"use client";

import { Button, type ButtonVariant } from "@/components/app";
import { useLearn } from "./context";

/**
 * "Unlock the course" for learners and visitors. A tutor browsing someone
 * else's course can't buy it (checkout sells to learner accounts only), so they
 * get a one-click switch to the student demo instead, staying on this item.
 */
export function BuyButton({
  label = "Unlock the course",
  variant = "accent",
  size,
  fullWidth,
  className,
  arrow = true,
  switchLabel = "Switch to the student demo",
}: {
  label?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  arrow?: boolean;
  /** visible label of the tutor's switch button (the accessible name stays explicit) */
  switchLabel?: string;
}) {
  const { course, tutorBrowsing, switchToStudent } = useLearn();
  if (tutorBrowsing)
    return (
      <Button
        variant={variant === "accent" ? "secondary" : variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        icon="switch"
        onClick={switchToStudent}
        aria-label={
          switchLabel === "Switch to the student demo"
            ? undefined
            : "Switch to the student demo to buy this course"
        }
      >
        {switchLabel}
      </Button>
    );
  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      href={`/checkout/${course.slug}`}
      iconRight={arrow ? "arrow-right" : undefined}
    >
      {label}
    </Button>
  );
}

/** One line for places that explain why a tutor sees no price. */
export const TUTOR_BROWSING_LINE =
  "You're previewing as a tutor. Switch to the student demo to buy and learn.";
