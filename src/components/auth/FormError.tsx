import clsx from "clsx";

/**
 * Error line for controls that can't sit inside <Field> (checkboxes, chip
 * groups). Same markup as the UI kit's Field error: a small red square + red-deep text.
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
        "mt-2 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep on-dark:text-red-lite",
        className,
      )}
    >
      <span aria-hidden className="mt-[5px] size-[6px] shrink-0 bg-current" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Invalid styling for the UI kit Checkbox (className lands on its <label>). */
export const CHECKBOX_INVALID =
  "[&_input[aria-invalid=true]]:border-red [&_input[aria-invalid=true]]:ring-1 [&_input[aria-invalid=true]]:ring-red";
