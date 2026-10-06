import clsx from "clsx";
import { Icon } from "@/components/app";

/**
 * Error line for controls that can't sit inside <Field> (checkboxes, chip
 * groups). Same markup as the UI kit's Field error: alert icon + #c13500.
 */
export function FormError({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={clsx(
        "mt-1.5 flex items-start gap-1 text-[13px] leading-snug font-semibold text-[#c13500]",
        className,
      )}
    >
      <Icon
        name="alert"
        className="mt-px size-3.5 shrink-0"
        strokeWidth={2.4}
      />
      <span>{children}</span>
    </p>
  );
}

/** Invalid styling for the UI kit Checkbox (className lands on its <label>). */
export const CHECKBOX_INVALID =
  "[&_input[aria-invalid=true]]:ring-2 [&_input[aria-invalid=true]]:ring-flame";
