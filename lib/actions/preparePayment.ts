'use server';

import { checkoutInputSchema } from '@/lib/checkoutSchema';
import { createCheckoutIntent, getPublicPaymentPage } from '@/lib/paymentPage';
import { sanitizeText } from '@/lib/sanitize';

export type PreparePaymentResult =
  | {
      ok: true;
      amount: number;
      currency: string;
      selectedCount: number;
      appId: string;
      orderReference: string;
      additionalData: string;
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

  if (!page.appId) {
    return { ok: false, message: 'This payment page is missing a gateway application.' };
  }

  const requestedIds = new Set(parsed.data.selectedItemIds);
  const selected = page.items.filter((item) => requestedIds.has(item.id));

  const amount = page.items.length
    ? selected.reduce((sum, item) => sum + item.netAmount, 0)
    : page.netAmount;

  if (amount <= 0) {
    return { ok: false, message: page.items.length ? 'Select at least one item to pay.' : 'A payable amount is not available.' };
  }

  const customFieldAnswers: { field_name: string; value: string }[] = [];
  for (const field of page.customFields) {
    const value = sanitizeText(parsed.data.customValues[String(field.id)], 200);
    if (!value) {
      return { ok: false, message: `${field.name} is required.` };
    }
    if (field.type === 'number' && !/^\d+(\.\d+)?$/.test(value)) {
      return { ok: false, message: `${field.name} must be a number.` };
    }
    customFieldAnswers.push({ field_name: field.name, value });
  }

  const note = sanitizeText(parsed.data.note, 200);
  if (note) {
    customFieldAnswers.push({ field_name: 'Note', value: note });
  }

  const intent = await createCheckoutIntent(page.pageRef, {
    collectionItemIds: selected.map((item) => item.collectionItemId).filter((id) => id > 0),
    customFieldAnswers,
  });

  if (!intent.ok) {
    return { ok: false, message: intent.message };
  }

  return {
    ok: true,
    amount: Number(amount.toFixed(2)),
    currency: page.currency,
    selectedCount: selected.length,
    appId: page.appId,
    orderReference: page.pageRef,
    additionalData: intent.reference,
  };
}
