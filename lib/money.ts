export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(currency: string, amount: number): string {
  const code = (currency || 'LKR').toUpperCase();
  return `${code} ${amount.toFixed(2)}`;
}
