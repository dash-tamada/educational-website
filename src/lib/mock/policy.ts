/* =============================================================================
   Platform policy constants shared by the seed builder and the selectors
   (kept in their own module so seed/db.ts can use them without importing the
   selector barrel, which imports the seed).
   Refund policy (mirrors /terms#refunds and the FAQ): within 7 days of purchase,
   less than 25% of the course completed, no certificate earned.
   ============================================================================= */

export const REFUND_WINDOW_DAYS = 7;
export const REFUND_MAX_PROGRESS = 25;
