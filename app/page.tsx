export default function HomePage() {
  return (
    <main className="pp-home">
      <div className="pp-home__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/onepay-pg-logo.png" alt="OnePay Payment Gateway" />
        <h1>Secure payment checkout</h1>
        <p>
          Open the unique payment link shared by the merchant to view items and complete your payment.
        </p>
      </div>
    </main>
  );
}
