function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function getOnePayApiBaseUrl() {
  return trimUrl(process.env.NEXT_PUBLIC_ONEPAY_API_BASE_URL || 'https://api.onepay.lk');
}

export function getMerchantApiBaseUrl() {
  return trimUrl(
    process.env.NEXT_PUBLIC_MERCHANT_API_BASE_URL || 'https://onepay-merchant.onepayapi.lk',
  );
}
