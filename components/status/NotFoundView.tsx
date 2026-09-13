import GoBackButton from '@/components/status/GoBackButton';

function NotFoundArt() {
  return (
    <svg className="pp-nf__art" viewBox="0 0 180 140" fill="none" aria-hidden="true">
      <circle cx="90" cy="74" r="50" fill="#e7f6ee" />
      <rect x="62" y="28" width="62" height="78" rx="10" fill="#fff" stroke="#d4eadc" strokeWidth="2" />
      <path d="M96 28v14c0 4 3 7 7 7h17" fill="#f4fbf7" stroke="#d4eadc" strokeWidth="2" />
      <rect x="76" y="58" width="34" height="5" rx="2.5" fill="#d7e6de" />
      <rect x="76" y="70" width="24" height="5" rx="2.5" fill="#e3eee8" />
      <circle cx="112" cy="90" r="20" fill="#fff" stroke="#1f9d57" strokeWidth="7" />
      <path d="M126 104l10 10" stroke="#1f9d57" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M112 80c-5.2 0-8.5 3.4-8.5 7.6 0 .9.8 1.6 1.7 1.6s1.7-.7 1.7-1.6c0-2.2 1.9-4.4 5.1-4.4 3 0 5 1.8 5 4.2 0 1.8-1 3-3.2 4.6-2.4 1.8-3.6 3.4-3.6 6v.4c0 .9.8 1.6 1.7 1.6s1.7-.7 1.7-1.6v-.3c0-1.5.8-2.8 3-4.4 2.8-2 4.8-4.2 4.8-7.3 0-4.6-4-7.4-9.4-7.4zM112 106.5a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2z"
        fill="#1f9d57"
      />
      <path d="M64 40l3.5-9M58 44l-8-1.5M126 36l8-6M132 44l9 .5" stroke="#8fd0ab" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function NotFoundView() {
  return (
    <main className="pp-nf">
      <span className="pp-nf__blob pp-nf__blob--tl" aria-hidden="true" />
      <span className="pp-nf__blob pp-nf__blob--br" aria-hidden="true" />
      <span className="pp-nf__dots" aria-hidden="true" />

      <div className="pp-nf__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/onepay-pg-logo.png" alt="OnePay Payment Gateway" />
        <NotFoundArt />
        <h1>Payment page not found</h1>
        <p>
          This link is invalid, unpublished, or no longer available.
          <br />
          Ask the merchant for an updated payment page.
        </p>
        <div className="pp-nf__rule" />
        <GoBackButton />
      </div>
    </main>
  );
}
