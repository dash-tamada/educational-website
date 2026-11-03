"use client";

import { cloneElement, forwardRef, isValidElement, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";

/* =============================================================================
   Form controls, design system v2 (Mobius contact fields): flat cream-2 fields,
   square, a hairline underline that turns into a 2px RED line on focus. Tiny-caps
   labels are always visible; hints and errors are wired with aria-describedby;
   errors set aria-invalid (red underline + red line under the field). 16px text on
   phones (no iOS zoom). Inside a dark ground (.theatre) the fields turn translucent.

     <Field label="Course title" hint="Keep it under 60 characters." error={errors.title} required>
       <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
     </Field>
     <Field label="Level"><Select options={[{ value: "Beginner", label: "Beginner" }]} /></Field>
     <Checkbox label="Gate the next lesson" checked={g} onChange={(e) => setG(e.target.checked)} />
     <RadioGroup label="I'm here to" name="intent" value={v} onChange={setV} options={[...]} />
     <Switch label="Free preview" checked={free} onChange={setFree} />
     <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
     <Segmented label="View" value={v} onChange={setV}
       options={[{ value: "grid", label: <Icon name="grid" />, ariaLabel: "Grid view" }, { value: "list", label: "List" }]} />
       (arrow keys / Home / End move + select; icon-only options need `ariaLabel`)

   Field clones its single child to inject id / aria-describedby / aria-invalid,
   so any control (or your own) works inside it.
   ============================================================================= */

const control = clsx(
  "rounded-none border-0 border-b border-ink/30 bg-cream-2 text-base font-normal text-ink placeholder:text-ink/45 sm:text-[15px]",
  "transition-[box-shadow,background-color,border-color] duration-200 ease-ui hf:border-ink/60",
  "focus:border-red focus:bg-paper focus:shadow-[inset_0_-1px_0_var(--color-red)] focus:outline-none focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-ink/50",
  "aria-[invalid=true]:border-red aria-[invalid=true]:bg-[#fbeae6] aria-[invalid=true]:shadow-[inset_0_-1px_0_var(--color-red)]",
  "on-dark:border-white/30 on-dark:bg-white/[0.06] on-dark:text-cream on-dark:placeholder:text-cream/45 on-dark:focus:border-red-lite on-dark:focus:bg-white/[0.1]",
);

/** Phone-friendly defaults per input type (MOBILE_SPEC §1.10): the right keyboard, no
    autocorrect on emails/URLs, a sensible Enter key. Anything you pass wins. */
function typeDefaults(type: string | undefined): React.InputHTMLAttributes<HTMLInputElement> {
  switch (type) {
    case "email":
      return { inputMode: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, enterKeyHint: "next" };
    case "url":
      return { inputMode: "url", autoCapitalize: "none", spellCheck: false };
    case "tel":
      return { inputMode: "tel", autoComplete: "tel" };
    case "search":
      return { enterKeyHint: "search" };
    case "password":
      return { autoCapitalize: "none", spellCheck: false };
    default:
      return {};
  }
}

/** A passed className with its own unprefixed width (w-auto, w-40, w-[12rem]) replaces the
    default w-full instead of fighting it (clsx can't de-duplicate Tailwind classes). */
const widthOf = (className?: string) => (className && /(^|\s)!?w-\S+/.test(className) ? undefined : "w-full");

/* ----------------------------------------------------------------------------- Field */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
  labelAction,
  id: idProp,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** shows "(optional)" next to the label */
  optional?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
  /** right side of the label row (e.g. "Forgot password?") */
  labelAction?: React.ReactNode;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? (children.props.id as string | undefined) ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [children.props["aria-describedby"], hintId, errId].filter(Boolean).join(" ") || undefined;
  const child = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : (children.props["aria-invalid"] as boolean | undefined),
        required: required ?? children.props.required,
      })
    : children;
  return (
    <div className={clsx("flex flex-col", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase">
          {label}
          {required && (
            <span className="text-red" aria-hidden>
              {" "}
              *
            </span>
          )}
          {optional && <span className="font-normal tracking-normal text-muted normal-case"> (optional)</span>}
        </label>
        {labelAction && <span className="text-[13px] font-medium">{labelAction}</span>}
      </div>
      {child}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-[12.5px] leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep on-dark:text-red-lite">
          <span aria-hidden className="mt-[5px] size-[6px] shrink-0 bg-current" />
          {/* one inline run: text + links in an error flow as a sentence, not flex columns */}
          <span className="min-w-0">{error}</span>
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- Input */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: IconName;
  /** text/node inside the right edge (e.g. "₹" prefix uses `prefix`) */
  suffix?: React.ReactNode;
  prefix?: string;
  inputSize?: "sm" | "md" | "lg";
};
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ icon, suffix, prefix, inputSize = "md", className, ...props }, ref) {
  // phones: 48px (md) / 44px (sm) tall, 16px text (no iOS focus zoom); from 640px the desktop sizes
  const h = inputSize === "sm" ? "h-11 sm:h-9" : inputSize === "lg" ? "h-[52px]" : "h-12 sm:h-11";
  const rest = { ...typeDefaults(props.type), ...props };
  if (!icon && !suffix && !prefix) return <input ref={ref} className={clsx(control, widthOf(className), h, "px-3.5", className)} {...rest} />;
  return (
    <span className={clsx("relative flex items-center", widthOf(className), className)}>
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 z-[1] size-[17px] text-fg/50" strokeWidth={1.7} />}
      {prefix && <span className="pointer-events-none absolute left-3.5 z-[1] font-mono text-[15px] font-medium text-fg/60">{prefix}</span>}
      <input ref={ref} className={clsx(control, "w-full", h, icon || prefix ? "pl-10" : "pl-3.5", suffix ? "pr-12" : "pr-3.5")} {...rest} />
      {suffix && <span className="absolute right-2 flex items-center">{suffix}</span>}
    </span>
  );
});

export const SearchInput = forwardRef<HTMLInputElement, InputProps & { onClear?: () => void }>(function SearchInput({ onClear, value, ...rest }, ref) {
  return (
    <Input
      ref={ref}
      type="search"
      icon="search"
      value={value}
      aria-label={rest["aria-label"] ?? (typeof rest.placeholder === "string" ? rest.placeholder : "Search")}
      suffix={
        onClear && value ? (
          <button type="button" onClick={onClear} className="hit grid size-8 place-items-center text-fg/55 hf:text-red" aria-label="Clear search">
            <Icon name="x" className="size-4" />
          </button>
        ) : undefined
      }
      {...rest}
    />
  );
});

/* ----------------------------------------------------------------------------- Textarea */
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { showCount?: boolean }>(function Textarea(
  { className, rows = 4, showCount, maxLength, value, onInput, ...rest },
  ref,
) {
  // uncontrolled textareas (defaultValue) still get a live count
  const [typed, setTyped] = useState(() => String(rest.defaultValue ?? "").length);
  const count = value !== undefined && value !== null ? String(value).length : typed;
  const counted = !!(showCount && maxLength);
  return (
    <span className="block w-full">
      <textarea
        ref={ref}
        rows={rows}
        maxLength={maxLength}
        value={value}
        data-lenis-prevent=""
        onInput={(e) => {
          if (counted) setTyped(e.currentTarget.value.length);
          onInput?.(e);
        }}
        className={clsx(
          control,
          widthOf(className),
          "block resize-y px-3.5 py-3 leading-relaxed",
          // phones: grows with its content (where field-sizing is supported) from `rows` up to 40% of the screen
          "max-sm:max-h-[40dvh] max-sm:min-h-[calc(var(--rows)*1.625em+1.5rem+2px)] max-sm:[field-sizing:content]",
          className,
        )}
        enterKeyHint={rest.enterKeyHint ?? "enter"}
        {...rest}
        style={{ "--rows": rows, ...rest.style } as React.CSSProperties}
      />
      {/* the counter sits on its own line under the box, so scrolled text never runs under it */}
      {counted && (
        <span
          className={clsx(
            "mt-1.5 block text-right font-mono text-[11px] font-medium tabular-nums",
            count >= maxLength! ? "text-red-deep" : count >= maxLength! * 0.9 ? "text-fg/80" : "text-muted",
          )}
          aria-hidden
        >
          {count}/{maxLength}
        </span>
      )}
    </span>
  );
});

/* ----------------------------------------------------------------------------- Select */
export type SelectOption = { value: string; label: string; disabled?: boolean };
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[]; placeholder?: string; selectSize?: "sm" | "md" }
>(function Select({ options, placeholder, className, selectSize = "md", ...rest }, ref) {
  return (
    <span className={clsx("relative flex items-center", widthOf(className), className)}>
      <select ref={ref} className={clsx(control, "w-full", selectSize === "sm" ? "h-11 sm:h-9 sm:text-[14px]" : "h-12 sm:h-11", "appearance-none pr-10 pl-3.5")} {...rest}>
        {placeholder && (
          <option value="" disabled={rest.required}>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 size-4 text-fg/60" strokeWidth={1.7} />
    </span>
  );
});

/* ----------------------------------------------------------------------------- Checkbox */
export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: React.ReactNode; description?: React.ReactNode }
>(function Checkbox({ label, description, className, id: idProp, ...rest }, ref) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <label htmlFor={id} className={clsx("group flex cursor-pointer items-start gap-3 max-sm:min-h-11 max-sm:py-2.5", rest.disabled && "cursor-not-allowed opacity-55", className)}>
      {/* 24px hit area around the 20px box (centre unchanged, so text alignment is too) */}
      <span className="relative -mx-0.5 grid size-6 shrink-0 place-items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer size-[18px] cursor-pointer appearance-none rounded-none border border-ink/45 bg-paper transition-colors max-sm:size-5 checked:border-ink checked:bg-ink indeterminate:border-ink indeterminate:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red disabled:cursor-not-allowed on-dark:border-white/45 on-dark:bg-transparent on-dark:checked:border-cream on-dark:checked:bg-cream"
          {...rest}
        />
        <Icon name="check" className="pointer-events-none absolute size-3 text-cream opacity-0 peer-checked:opacity-100 on-dark:text-ink" strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-snug font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
    </label>
  );
});

/* ----------------------------------------------------------------------------- Radio */
export function RadioGroup<T extends string>({
  label,
  name,
  value,
  onChange,
  options,
  orientation = "vertical",
  variant = "default",
  className,
  hideLabel,
}: {
  label: React.ReactNode;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[];
  orientation?: "vertical" | "horizontal";
  /** "cards": bordered tiles (e.g. Learn / Teach picker) */
  variant?: "default" | "cards";
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <fieldset className={className}>
      <legend className={clsx("mb-3 text-[11.5px] font-semibold tracking-[0.12em] uppercase", hideLabel && "sr-only")}>{label}</legend>
      <div className={clsx("flex", variant === "default" ? "gap-3 max-sm:gap-x-3 max-sm:gap-y-0" : "gap-3", orientation === "vertical" ? "flex-col" : "flex-wrap")}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={clsx(
                "flex cursor-pointer items-start gap-3",
                variant === "default" && "max-sm:min-h-11 max-sm:py-2.5",
                variant === "cards" && [
                  orientation === "horizontal" ? "min-w-[10.5rem] flex-1" : "",
                  "rounded-none p-4 ring-inset transition-[box-shadow,background-color]",
                  checked ? "bg-paper ring-2 ring-fg" : "bg-transparent ring-1 ring-line-strong hf:ring-fg/60",
                ],
                o.disabled && "cursor-not-allowed opacity-55",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="mt-0.5 grid size-[18px] shrink-0 cursor-pointer appearance-none place-items-center rounded-full border border-ink/45 bg-paper transition-all before:size-2 before:scale-0 before:rounded-full before:bg-ink before:transition-transform before:content-[''] max-sm:size-5 checked:border-ink checked:before:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red on-dark:border-white/45 on-dark:bg-transparent on-dark:before:bg-cream on-dark:checked:border-cream"
              />
              <span className="min-w-0">
                <span className="block text-[15px] leading-snug font-medium">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ----------------------------------------------------------------------------- Switch */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  hideLabel,
  className,
  id: idProp,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={clsx("flex items-start justify-between gap-4 max-sm:min-h-11", disabled && "opacity-55", className)}>
      <span className={clsx("min-w-0", hideLabel && "sr-only")}>
        <label htmlFor={id} className="block cursor-pointer text-[15px] leading-snug font-medium">
          {label}
        </label>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "hit relative h-6 w-11 shrink-0 rounded-none border transition-colors duration-200 ease-ui disabled:cursor-not-allowed max-sm:mt-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red",
          checked ? "border-ink bg-ink on-dark:border-cream on-dark:bg-cream" : "border-ink/40 bg-transparent on-dark:border-white/40",
        )}
      >
        <span
          aria-hidden
          className={clsx(
            "absolute top-[3px] left-[3px] size-4 transition-[translate,background-color] duration-300 ease-expo",
            checked ? "translate-x-5 bg-red" : "bg-ink/50 on-dark:bg-cream/60",
          )}
        />
      </button>
    </div>
  );
}

/** Small segmented control (date ranges, view toggles). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  /**
   * `ariaLabel` names an option whose visible label is not text (e.g. an icon-only
   * option: <Icon> is aria-hidden, so without it the radio has no accessible name).
   * It also becomes the native tooltip.
   */
  options: { value: T; label: React.ReactNode; ariaLabel?: string; disabled?: boolean }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const current = options.findIndex((o) => o.value === value);
  // roving tabindex: one tab stop (the checked option, else the first enabled one)
  const tabStop = current >= 0 && !options[current].disabled ? current : enabled[0];

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key) || enabled.length === 0) return;
    e.preventDefault();
    const pos = enabled.indexOf(i);
    let next: number;
    if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    else {
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      next = enabled[(pos + step + enabled.length) % enabled.length];
    }
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        "inline-flex divide-x divide-line-strong border border-line-strong",
        // phone-s: 3+ options take the full width in equal parts instead of overflowing
        options.length >= 3 && "phone-s:flex phone-s:w-full phone-s:[&>*]:min-w-0 phone-s:[&>*]:flex-1 phone-s:[&>*]:px-2",
        className,
      )}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.ariaLabel}
          title={o.ariaLabel}
          disabled={o.disabled}
          tabIndex={i === tabStop ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={clsx(
            "inline-flex items-center justify-center gap-1.5 rounded-none font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
            "focus-visible:-outline-offset-2",
            // phones: 44px tall (thumb-friendly); desktop keeps 30/38px
            size === "sm" ? "h-11 px-3.5 text-[11px] sm:h-[30px] sm:px-3 sm:text-[10.5px]" : "h-11 px-4 text-[11px] sm:h-[38px]",
            o.value === value ? "bg-fg text-surface" : "text-muted hf:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
