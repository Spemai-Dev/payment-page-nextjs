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
