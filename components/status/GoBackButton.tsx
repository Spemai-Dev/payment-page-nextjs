'use client';

import { ArrowLeft } from 'lucide-react';

export default function GoBackButton() {
  function goBack() {
    if (document.referrer) {
      window.history.back();
      return;
    }
    window.location.assign('/');
  }

  return (
    <button type="button" className="pp-nf__back" onClick={goBack}>
      <ArrowLeft size={16} strokeWidth={2.4} />
      Go back
    </button>
  );
}
