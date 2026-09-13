/** Public payment-page refs look like `PP-8F3A21C9`. Keep this tight to block path injection. */
export const PAGE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;
export const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9._-]{4,64}$/;

export function isValidPageRef(value: unknown): value is string {
  return typeof value === 'string' && PAGE_REF_PATTERN.test(value);
}

export function isValidTransactionId(value: unknown): value is string {
  return typeof value === 'string' && TRANSACTION_ID_PATTERN.test(value);
}
