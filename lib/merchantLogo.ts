import { resolveMerchantLogoUrl } from '@/lib/onePayFiles';
import { sanitizeImageUrl } from '@/lib/url';

const GCS_LOGO_BASE = 'https://storage.googleapis.com/onepay_ipg';

/** Public checkout <img> src for a merchant/app logo stored in any known shape. */
export function resolveCheckoutLogo(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  const resolved = resolveMerchantLogoUrl(trimmed);
  if (resolved?.startsWith('/api/files/')) return resolved;
  if (resolved?.startsWith('https://')) return sanitizeImageUrl(resolved);

  if (!trimmed.includes('://') && !trimmed.startsWith('/') && !trimmed.startsWith('data:')) {
    return sanitizeImageUrl(`${GCS_LOGO_BASE}/${trimmed.replace(/^\//, '')}`);
  }

  return null;
}
