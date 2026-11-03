/**
 * Legacy colour-tone names from the v1 playful system. Mock records (courses, categories,
 * users) and older component props still carry them; the v2 editorial kit maps every name
 * onto the cinematic palette (globals.css LEGACY aliases, cardVariantFor, editorialTone).
 * Do not add new names; new work picks an editorial ground instead.
 */
export type Tone =
  | "sun"
  | "yellow"
  | "butter"
  | "tangerine"
  | "orange"
  | "flame"
  | "tomato"
  | "hotpink"
  | "magenta"
  | "blush"
  | "bubblegum"
  | "cyan"
  | "aqua"
  | "turquoise"
  | "blue"
  | "green"
  | "mint"
  | "forest"
  | "lilac"
  | "purple"
  | "indigo"
  | "olive"
  | "lime"
  | "white"
  | "ink";
