/**
 * Pagination and list virtualization constants
 */

/**
 * Number of items to render initially and load per batch in virtual scroll
 */
export const VIRTUAL_SCROLL_THRESHOLD = 50;

/**
 * Default maximum number of listings to fetch from database
 * Prevents unbounded queries that could degrade performance
 */
export const DEFAULT_LISTINGS_LIMIT = 100;

/**
 * Root margin for IntersectionObserver in virtual scrolling
 * Starts loading new items before user reaches the end
 */
export const VIRTUAL_SCROLL_ROOT_MARGIN = "200px";

/**
 * Maximum width for category name text before truncation
 */
export const CATEGORY_NAME_MAX_WIDTH = "140px";

/**
 * Maximum count to display in badges before showing "X+"
 * Example: counts > 99 will show "99+"
 */
export const MAX_DISPLAY_COUNT = 99;

/**
 * Default price range for equipment filters
 */
export const DEFAULT_PRICE_MIN = 0;
export const DEFAULT_PRICE_MAX = 500;
