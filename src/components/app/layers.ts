/* Open overlay panels (Modal / Drawer), newest last. The Toaster subscribes so a
   toast never sits on top of an open dialog's footer buttons (see Toast.tsx). */

let stack: HTMLElement[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function pushLayer(el: HTMLElement) {
  stack = [...stack.filter((x) => x !== el), el];
  emit();
  return () => {
    stack = stack.filter((x) => x !== el);
    emit();
  };
}

export function subscribeLayers(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

/** The top-most open overlay panel (or null). */
export const topLayer = (): HTMLElement | null => stack[stack.length - 1] ?? null;

/* ----------------------------------------------------------------------------- Escape stack
   Every open layer (Modal, Drawer, DropdownMenu…) pushes its close handler here.
   ONE capture listener on document runs only the newest handler, so a single Esc
   closes the top layer (the modal over a drawer, the menu inside a modal) and
   leaves the layers below it open. */
let escStack: { fn: () => void }[] = [];
function onEscKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || e.isComposing) return;
  const top = escStack[escStack.length - 1];
  if (!top) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  top.fn();
}
export function pushEscape(fn: () => void) {
  const entry = { fn };
  escStack = [...escStack, entry];
  if (escStack.length === 1) document.addEventListener("keydown", onEscKey, true);
  return () => {
    const had = escStack.length > 0;
    escStack = escStack.filter((x) => x !== entry);
    if (had && escStack.length === 0) document.removeEventListener("keydown", onEscKey, true);
  };
}
