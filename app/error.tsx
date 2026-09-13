'use client';

export default function RootError({
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
        <h1>Something went wrong</h1>
        <p>We could not complete this request. Please try again.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16 }}>
          Try again
        </button>
      </div>
    </main>
  );
}
