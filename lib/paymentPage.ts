import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { getPaymentPageApiBaseUrl } from '@/lib/env';
import { parseAmount } from '@/lib/money';
import { isValidPageRef, isValidTransactionId } from '@/lib/pageRef';
import { rateLimitAllow } from '@/lib/rateLimit';
import { sanitizeRichHtml, sanitizeText } from '@/lib/sanitize';
import type {
  ApiEnvelope,
  CheckoutPage,
  FetchPageResult,
  PaymentPageApiData,
  PaymentPageApiField,
  PaymentPageApiItem,
} from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/url';

const FETCH_TIMEOUT_MS = 8_000;
const GENERIC_ERROR = 'Unable to load this payment page right now.';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function mapItems(items: PaymentPageApiItem[] | undefined, fallbackCurrency: string) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => typeof item?.id === 'number' && Number.isFinite(item.id))
    .map((item) => {
      const images = Array.isArray(item.images) ? item.images : [];
      const image = images.map((src) => sanitizeImageUrl(src)).find(Boolean) ?? null;
      const currency = sanitizeText(item.currency || fallbackCurrency, 8) || 'LKR';
      const grossAmount = parseAmount(item.gross_amount);
      const discountAmount = parseAmount(item.discounts);
      const netAmount = parseAmount(item.net_amount) || Math.max(grossAmount - discountAmount, 0);

      return {
        id: item.id,
        name: sanitizeText(item.item_name, 120) || 'Item',
        description: sanitizeText(item.description, 240),
        image,
        currency,
        grossAmount,
        discountAmount,
        netAmount,
      };
    });
}

function mapCustomFields(fields: PaymentPageApiField[] | undefined) {
  if (!Array.isArray(fields)) return [];

  return fields
    .filter((field) => typeof field?.id === 'number' && Number.isFinite(field.id))
    .map((field) => ({
      id: field.id,
      name: sanitizeText(field.field_name, 80) || 'Field',
      type: String(field.field_type || 'text').toLowerCase() === 'number' ? 'number' as const : 'text' as const,
    }));
}

function mapPage(pageRef: string, data: PaymentPageApiData): CheckoutPage {
  const pageData = data.page_data || {};
  const currency = sanitizeText(pageData.currency, 8) || 'LKR';
  const expireDate = sanitizeText(pageData.expire_date, 32);
  const merchant = data.merchant_data || {};
  const transaction = data.transaction;
  const isPlainText = Boolean(data.is_plain_text);

  return {
    pageRef: sanitizeText(pageData.page_ref_id || pageRef, 64),
    pageName: sanitizeText(pageData.page_name, 160) || 'Payment',
    description: sanitizeText(pageData.description, 2000),
    coverImage: sanitizeImageUrl(pageData.cover_image),
    currency,
    netAmount: parseAmount(pageData.net_amount),
    expireDate,
    isExpired: Boolean(expireDate && expireDate < todayDateString()),
    isPlainText,
    plainTextHtml: isPlainText ? sanitizeRichHtml(pageData.plain_text_content) : '',
    termsHtml: sanitizeRichHtml(pageData.terms_condition) || sanitizeText(pageData.terms_condition, 4000),
    requiredAmount: Boolean(data.required_amount),
    items: isPlainText ? [] : mapItems(data.items, currency),
    customFields: mapCustomFields(data.custom_fields),
    merchant: {
      name: sanitizeText(merchant.merchant_name, 120) || 'Merchant',
      email: sanitizeText(merchant.merchant_email, 254),
      mobile: sanitizeText(merchant.merchant_mobile, 32),
      logo: sanitizeImageUrl(merchant.merchant_logo),
    },
    transaction: transaction
      ? {
          id: sanitizeText(transaction.onepay_transaction_id, 64),
          status: Boolean(transaction.status),
          amount: parseAmount(transaction.amount),
          currency: sanitizeText(transaction.currency || currency, 8) || currency,
          paidOn: sanitizeText(transaction.paid_on, 40),
          failureReason: sanitizeText(transaction.failure_reason, 240),
        }
      : null,
  };
}

async function clientKey() {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headerStore.get('x-real-ip') || 'unknown';
  return `page:${ip}`;
}

export const getPublicPaymentPage = cache(async function getPublicPaymentPage(
  pageRef: string,
  transactionId?: string,
): Promise<FetchPageResult> {
  if (!isValidPageRef(pageRef)) {
    return { ok: false, status: 404, message: 'payment page not found' };
  }

  if (!(rateLimitAllow(await clientKey()))) {
    return { ok: false, status: 429, message: 'Too many requests. Please try again shortly.' };
  }

  const url = new URL(
    `${getPaymentPageApiBaseUrl()}/v1/client/payment-pages/${encodeURIComponent(pageRef)}`,
  );

  if (transactionId) {
    if (!isValidTransactionId(transactionId)) {
      return { ok: false, status: 404, message: 'payment page transaction not found' };
    }
    url.searchParams.set('transaction_id', transactionId);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return { ok: false, status: 404, message: 'payment page not found' };
    }

    if (!response.ok) {
      return { ok: false, status: 502, message: GENERIC_ERROR };
    }

    const payload = (await response.json()) as ApiEnvelope<PaymentPageApiData>;
    if (!payload?.success || !payload.data?.page_data) {
      return {
        ok: false,
        status: payload?.success === false ? 404 : 502,
        message: sanitizeText(payload?.message, 160) || 'payment page not found',
      };
    }

    return { ok: true, page: mapPage(pageRef, payload.data) };
  } catch {
    return { ok: false, status: 502, message: GENERIC_ERROR };
  }
});
