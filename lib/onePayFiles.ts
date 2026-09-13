const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extract an OnePay file UUID from a stored logo value in any known shape. */
export function extractOnePayFileId(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return trimmed.toLowerCase();

  const fromPath = trimmed.match(
    /\/(?:api\/)?files\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|\?|$)/i,
  );
  return fromPath?.[1]?.toLowerCase() || null;
}

export function onePayFilePreviewPath(fileId: string): string {
  return `/api/files/${fileId}`;
}

/**
 * Normalize a stored logo (raw UUID, /api/files/{id}, files.onepayapi.lk URL,
 * or https URL) into an <img> src. File IDs go through the same-origin proxy
 * because files.onepayapi.lk/preview requires an auth token.
 */
export function resolveMerchantLogoUrl(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fileId = extractOnePayFileId(trimmed);
  if (fileId) return onePayFilePreviewPath(fileId);

  if (trimmed.startsWith('/api/files/')) return trimmed.split('?')[0];

  if (/files\.onepayapi\.lk/i.test(trimmed)) {
    const fromHost = trimmed.match(
      /\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
    );
    return fromHost?.[1] ? onePayFilePreviewPath(fromHost[1]) : null;
  }

  if (trimmed.startsWith('https://')) return trimmed;

  return null;
}
