'use client';

export default function PaymentPageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="pp-status">
      <div className="pp-status__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/onepay-pg-logo.png" alt="OnePay" />
        <h1>Unable to load this page</h1>
        <p>Please refresh and try again. If the problem continues, contact the merchant or OnePay support.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16 }}>
          Try again
        </button>
      </div>
    </main>
  );
}
