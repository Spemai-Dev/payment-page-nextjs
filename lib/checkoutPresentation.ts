import type { CheckoutPage } from '@/lib/types';

export type CheckoutPresentation = {
  hasBanner: boolean;
  hasItems: boolean;
  isPlainText: boolean;
  isFixedAmount: boolean;
  isMinimal: boolean;
};

export function getCheckoutPresentation(page: CheckoutPage): CheckoutPresentation {
  const hasBanner = Boolean(page.coverImage);
  const isPlainText = Boolean(page.isPlainText);
  // Plain text is page content, never a selectable catalog. Mapping already
  // clears items when isPlainText, but keep the guard in the presentation layer.
  const hasItems = !isPlainText && page.items.length > 0;
  const isFixedAmount = !hasItems && page.netAmount > 0;
  const isMinimal = !hasItems && !isPlainText && !isFixedAmount;

  return {
    hasBanner,
    hasItems,
    isPlainText,
    isFixedAmount,
    isMinimal,
  };
}
