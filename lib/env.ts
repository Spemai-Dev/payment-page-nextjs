import 'server-only';

const DEFAULT_API_BASE =
  'https://api-gateway-uat-dpe9eegffresc9dv.southeastasia-01.azurewebsites.net/gateway/payment_page';

export function getPaymentPageApiBaseUrl(): string {
  const raw = (process.env.PAYMENT_PAGE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  if (!raw) {
    throw new Error('PAYMENT_PAGE_API_BASE_URL is not configured');
  }
  return raw;
}

export function getSupportUrl(): string {
  return (process.env.SUPPORT_URL || 'https://onepay.lk').trim();
}

export function getOnePayFilesBaseUrl(): string {
  return (process.env.ONEPAY_FILES_BASE_URL || 'https://files.onepayapi.lk').trim().replace(/\/+$/, '');
}

export function getOnePayFilesApiKey(): string {
  return (process.env.ONEPAY_FILES_API_KEY || '').trim();
}
