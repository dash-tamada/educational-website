/* Context-token grounds as plain utility strings, for elements that are already
   positioned (fixed / absolute panels, menus, sheets). The .ground-cream / .theatre
   utilities in globals.css also set `position: relative`, which would fight `fixed`. */

/** Cream panel: ink text, light hairlines, cream surface (menus, drawers, sheets). */
export const CREAM_SURFACE =
  "bg-cream text-ink [color-scheme:light] [--fg:var(--color-ink)] [--muted:var(--color-smoke)] [--line:rgb(11_11_11/0.12)] [--line-strong:rgb(11_11_11/0.28)] [--surface:var(--color-cream)]";

/** Ink panel (theatre): cream text, light-on-dark hairlines (dock, sidebar, toasts). */
export const INK_SURFACE =
  "bg-ink text-cream [color-scheme:dark] [--fg:var(--color-cream)] [--muted:var(--color-ash)] [--line:rgb(253_248_238/0.14)] [--line-strong:rgb(253_248_238/0.32)] [--surface:var(--color-ink)]";
