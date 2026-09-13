import 'server-only';

import { getMerchantApiBaseUrl } from '@/lib/clientEnv';
import { resolveCheckoutLogo } from '@/lib/merchantLogo';
import { sanitizeText } from '@/lib/sanitize';

const FETCH_TIMEOUT_MS = 8_000;

export type AppBranding = {
  businessName: string;
  logo: string | null;
};

type AppClientPayload = {
  data?: {
    business_name?: string;
    brand_logo?: string | null;
  };
};

/** Same public app endpoint the invoice frontend uses for business_name. */
export async function fetchAppBranding(appId: string): Promise<AppBranding | null> {
  if (!appId) return null;

  try {
    const response = await fetch(
      `${getMerchantApiBaseUrl()}/v3/app/client/app/${encodeURIComponent(appId)}/`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as AppClientPayload;
    const data = payload?.data;
    if (!data) return null;

    return {
      businessName: sanitizeText(data.business_name, 120),
      logo: resolveCheckoutLogo(data.brand_logo),
    };
  } catch {
    return null;
  }
}
