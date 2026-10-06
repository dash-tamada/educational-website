"use client";

import { cloneElement, forwardRef, isValidElement, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./icons";

/* =============================================================================
   Form controls. Labels are always visible; hints and errors are wired with
   aria-describedby; errors set aria-invalid. Rounded, flat, soft focus ring.

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

const control =
  "rounded-tag bg-white text-base sm:text-[15px] font-medium text-ink placeholder:text-ink/40 ring-1 ring-ink/[0.12] transition-[box-shadow,background-color] duration-150 ease-ui hf:ring-ink/25 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-blue disabled:cursor-not-allowed disabled:bg-ink/[0.04] disabled:text-ink/50 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-flame aria-[invalid=true]:focus:outline-solid aria-[invalid=true]:focus:outline-2 aria-[invalid=true]:focus:outline-offset-2 aria-[invalid=true]:focus:outline-blue";

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
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-bold text-ink">
          {label}
          {required && (
            <span className="text-flame" aria-hidden>
              {" "}
              *
            </span>
          )}
          {optional && <span className="font-medium text-ink/65"> (optional)</span>}
        </label>
        {labelAction && <span className="text-[13px] font-semibold">{labelAction}</span>}
      </div>
      {child}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[13px] leading-snug text-ink/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 flex items-start gap-1 text-[13px] font-semibold leading-snug text-[#c13500]">
          <Icon name="alert" className="mt-px size-3.5" strokeWidth={2.4} />
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
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 size-[18px] text-ink/45" />}
      {prefix && <span className="pointer-events-none absolute left-3.5 text-base font-bold text-ink/65 sm:text-[15px]">{prefix}</span>}
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
          <button type="button" onClick={onClear} className="hit grid size-8 place-items-center rounded-full text-ink/55 hf:bg-ink/[0.06]" aria-label="Clear search">
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
            "mt-1.5 block text-right text-[12px] font-semibold tabular-nums",
            count >= maxLength! ? "text-flame-deep" : count >= maxLength! * 0.9 ? "text-ink/80" : "text-ink/60",
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
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 size-[18px] text-ink/55" />
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
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] max-sm:size-[22px] bg-white ring-1 ring-ink/25 transition-colors checked:bg-ink checked:ring-ink indeterminate:bg-ink indeterminate:ring-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed"
          {...rest}
        />
        <Icon name="check" className="pointer-events-none absolute size-3.5 text-cream opacity-0 peer-checked:opacity-100" strokeWidth={3.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-snug font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">{description}</span>}
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
      <legend className={clsx("mb-2 text-[14px] font-bold", hideLabel && "sr-only")}>{label}</legend>
      <div className={clsx("flex", variant === "default" ? "gap-3 max-sm:gap-x-3 max-sm:gap-y-0" : "gap-3", orientation === "vertical" ? "flex-col" : "flex-wrap")}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={clsx(
                "flex cursor-pointer items-start gap-3",
                variant === "default" && "max-sm:min-h-11 max-sm:py-2.5",
                variant === "cards" && [orientation === "horizontal" ? "min-w-[10.5rem] flex-1" : "", "rounded-card p-4 ring-1 transition-[box-shadow,background-color]", checked ? "bg-butter ring-2 ring-ink" : "bg-white ring-ink/[0.12] hf:ring-ink/30"],
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
                className="mt-0.5 grid size-5 shrink-0 cursor-pointer appearance-none place-items-center rounded-full max-sm:size-[22px] bg-white ring-1 ring-ink/25 transition-all before:size-2.5 before:scale-0 before:rounded-full before:bg-cream before:transition-transform before:content-[''] checked:bg-ink checked:ring-ink checked:before:scale-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue"
              />
              <span className="min-w-0">
                <span className="block text-[15px] leading-snug font-semibold">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">{o.description}</span>}
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
        <label htmlFor={id} className="block cursor-pointer text-[15px] leading-snug font-semibold">
          {label}
        </label>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "hit relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-ui disabled:cursor-not-allowed max-sm:mt-2",
          checked ? "bg-green" : "bg-ink/20",
        )}
      >
        <span
          aria-hidden
          className={clsx("absolute top-1 left-1 size-5 rounded-full bg-white shadow-soft transition-[translate] duration-200 ease-spring", checked && "translate-x-5")}
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
        "inline-flex rounded-full bg-white p-1 shadow-soft",
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
            "inline-flex items-center justify-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
            // phones: 44px tall (thumb-friendly); desktop keeps 28/36px
            size === "sm" ? "h-11 px-3.5 text-[14px] sm:h-7 sm:px-3 sm:text-[13px]" : "h-11 px-4 text-[14px] sm:h-9",
            o.value === value ? "bg-ink text-cream" : "text-ink/70 hf:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
