/* =============================================================================
   Small phone helpers shared by the auth forms (MOBILE_SPEC §1.10 / A-02, A-08).
   ============================================================================= */

/**
 * Focus a field and glide it to the middle of the screen, so an inline error under
 * it is visible too (and it clears the fixed header and any bottom bar).
 */
export function focusField(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
}

/**
 * `enterkeyhint="next"` chain: Enter (the keyboard's "Next" key) moves on to the
 * next field while that one is still empty; once it is filled (autofill, or going
 * back to fix a typo) Enter submits the form as usual.
 */
export function enterToNext(next: React.RefObject<HTMLInputElement | null>) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const el = next.current;
    if (!el || el.value) return;
    e.preventDefault();
    el.focus();
  };
}
