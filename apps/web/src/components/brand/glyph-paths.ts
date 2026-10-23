/** Hand-built SVG paths (viewBox 0 0 32 32). */

/** (a) Storefront doorway with upward arrow in negative space. */
export const EXPLORATION_A_PATHS = {
  frame: 'M8 10h16v14H8z',
  door: 'M11 13h10v8H11z',
  arrow: 'M16 22V8m0 0l-4 4m4-4l4 4',
} as const;

/** (b) L monogram + upward chevron (selected mark). */
export const EXPLORATION_B_PATHS = {
  lBar: 'M6 6v20h6v-4H10V6H6z',
  chevron: 'M14 22l6-8-6-8v16z',
} as const;

/** (c) Map pin with open door cutout. */
export const EXPLORATION_C_PATHS = {
  pin: 'M16 4c-4.5 0-8 3.5-8 8 0 6 8 14 8 14s8-8 8-14c0-4.5-3.5-8-8-8z',
  door: 'M13 11h6v7h-6z',
} as const;

/** Production glyph: exploration (b), tuned for 16px legibility. */
export const GLYPH_PATHS = {
  lBar: 'M5 5v18h5.5v-3.5H8.5V5H5z',
  chevron: 'M13.5 21L19.5 13 13.5 5v16z',
} as const;
