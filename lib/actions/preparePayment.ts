'use server';

import { checkoutInputSchema } from '@/lib/checkoutSchema';
import { getPublicPaymentPage } from '@/lib/paymentPage';
import { sanitizeText } from '@/lib/sanitize';

export type PreparePaymentResult =
  | {
      ok: true;
      amount: number;
      currency: string;
      selectedCount: number;
    }
  | {
      ok: false;
      message: string;
    };

export async function preparePayment(input: unknown): Promise<PreparePaymentResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Please check your details and try again.' };
  }

  const result = await getPublicPaymentPage(parsed.data.pageRef);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const page = result.page;
  if (page.isExpired) {
    return { ok: false, message: 'This payment page has expired.' };
  }

  if (page.transaction?.status) {
    return { ok: false, message: 'This payment has already been completed.' };
  }

  const requestedIds = new Set(parsed.data.selectedItemIds);
  const selected = page.items.filter((item) => requestedIds.has(item.id));

  const amount = page.items.length
    ? selected.reduce((sum, item) => sum + item.netAmount, 0)
    : page.netAmount;

  if (amount <= 0) {
    return { ok: false, message: page.items.length ? 'Select at least one item to pay.' : 'A payable amount is not available.' };
  }

  for (const field of page.customFields) {
    const value = sanitizeText(parsed.data.customValues[String(field.id)], 200);
    if (!value) {
      return { ok: false, message: `${field.name} is required.` };
    }
    if (field.type === 'number' && !/^\d+(\.\d+)?$/.test(value)) {
      return { ok: false, message: `${field.name} must be a number.` };
    }
  }

  return {
    ok: true,
    amount: Number(amount.toFixed(2)),
    currency: page.currency,
    selectedCount: selected.length,
  };
}
