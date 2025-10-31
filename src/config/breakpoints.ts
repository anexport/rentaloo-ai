/**
 * Tailwind CSS breakpoint constants in pixels.
 * These values match Tailwind's default breakpoints to keep media queries
 * and utility classes in sync.
 */
export const THEME_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Helper function to create max-width media queries using breakpoint constants
 */
export const createMaxWidthQuery = (breakpoint: keyof typeof THEME_BREAKPOINTS): string => {
  return `(max-width: ${THEME_BREAKPOINTS[breakpoint]}px)`;
};

/**
 * Helper function to create min-width media queries using breakpoint constants
 */
export const createMinWidthQuery = (breakpoint: keyof typeof THEME_BREAKPOINTS): string => {
  return `(min-width: ${THEME_BREAKPOINTS[breakpoint]}px)`;
};

