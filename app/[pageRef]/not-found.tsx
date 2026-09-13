export default function PaymentPageNotFound() {
  return (
    <main className="pp-status">
      <div className="pp-status__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/onepay-pg-logo.png" alt="OnePay" />
        <h1>Payment page not found</h1>
        <p>This link is invalid, unpublished, or no longer available. Ask the merchant for an updated payment page.</p>
      </div>
    </main>
  );
}
