import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaymentCheckout from '@/components/checkout/PaymentCheckout';
import { getPublicPaymentPage } from '@/lib/paymentPage';
import { isValidPageRef } from '@/lib/pageRef';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageProps = {
  params: Promise<{ pageRef: string }>;
  searchParams: Promise<{ transaction_id?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pageRef } = await params;
  if (!isValidPageRef(pageRef)) {
    return { title: 'Payment page not found' };
  }

  const result = await getPublicPaymentPage(pageRef);
  if (!result.ok) {
    return { title: 'Payment page not found' };
  }

  return {
    title: result.page.pageName,
    description: result.page.description || `Pay ${result.page.merchant.name} securely with OnePay.`,
  };
}

export default async function PublicPaymentPage({ params, searchParams }: PageProps) {
  const { pageRef } = await params;
  const { transaction_id: transactionId } = await searchParams;

  if (!isValidPageRef(pageRef)) notFound();

  const result = await getPublicPaymentPage(pageRef, transactionId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    throw new Error(result.message);
  }

  return <PaymentCheckout page={result.page} />;
}
