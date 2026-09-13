'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  FileText,
  Lock,
  Mail,
  Package,
  Phone,
  ShoppingCart,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { preparePayment } from '@/lib/actions/preparePayment';
import { getCheckoutPresentation } from '@/lib/checkoutPresentation';
import { formatMoney } from '@/lib/money';
import type { CheckoutPage } from '@/lib/types';
import { useOnePay } from '@/hooks/useOnePay';
import SafeImage from './SafeImage';

type PaymentCheckoutProps = {
  page: CheckoutPage;
};

export default function PaymentCheckout({ page }: PaymentCheckoutProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [paidAmount, setPaidAmount] = useState(page.transaction?.amount || 0);

  const {
    isInitialized,
    isLoading: sdkLoading,
    isProcessing,
    error: sdkError,
    processPayment,
    paymentStatus,
    resetPaymentStatus,
  } = useOnePay({ appId: page.appId });

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => page.items.filter((item) => selectedIdSet.has(item.id)),
    [page.items, selectedIdSet],
  );

  const { hasBanner, hasItems, isPlainText, isFixedAmount } = getCheckoutPresentation(page);
  const introSolo = !hasItems && !isFixedAmount;

  const payable = page.items.length
    ? selectedItems.reduce((sum, item) => sum + item.netAmount, 0)
    : page.netAmount;

  const payLabel = formatMoney(page.currency, payable);
  const showSuccess = paymentStatus === 'success';
  const showFailed = paymentStatus === 'failed';
  const showResult = showSuccess || showFailed;
  const canPay =
    payable > 0 &&
    acceptedTerms &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    phone.trim() &&
    !page.isExpired &&
    !submitting &&
    !isProcessing &&
    isInitialized &&
    !sdkLoading &&
    !showResult;

  function closeResult() {
    resetPaymentStatus();
  }

  function toggleItem(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function onPay() {
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await preparePayment({
        pageRef: page.pageRef,
        firstName,
        lastName,
        email,
        phone,
        note,
        acceptedTerms: true,
        selectedItemIds: selectedIds,
        customValues,
      });

      if (!result.ok) {
        setFeedback({ type: 'error', text: result.message });
        return;
      }

      setPaidAmount(result.amount);
      await processPayment({
        amount: result.amount,
        currency: result.currency,
        orderReference: result.orderReference,
        customerFirstName: firstName.trim(),
        customerLastName: lastName.trim(),
        customerEmail: email.trim(),
        customerPhoneNumber: phone.trim(),
        redirectUrl: window.location.href,
        additionalData: result.additionalData,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Unable to start this payment right now.' });
    } finally {
      setSubmitting(false);
    }
  }

  function payButtonLabel() {
    if (submitting) return 'Verifying…';
    if (isProcessing) return 'Opening payment…';
    if (sdkLoading || !isInitialized) return 'Preparing payment…';
    return `Pay ${payLabel}`;
  }

  return (
    <div className="pp-shell">
      <header className="pp-top">
        <div className="pp-top__inner">
          <div className="pp-merchant">
            <div className="pp-merchant__logo">
              <SafeImage
                src={page.merchant.logo}
                alt=""
                className="pp-merchant__img"
                fallback={<User size={22} strokeWidth={1.75} />}
              />
            </div>
            <div>
              <p className="pp-merchant__name">{page.merchant.name}</p>
              <p className="pp-merchant__trust">Trusted merchant on OnePay</p>
            </div>
          </div>
          {/* Local brand mark; next/image is unnecessary for this tiny static asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/main_logo.png" alt="OnePay" className="pp-brand" />
        </div>
      </header>

      <div className="pp">

      {page.transaction && paymentStatus === 'idle' ? (
        <div className={`pp-banner ${page.transaction.status ? 'is-success' : 'is-error'}`}>
          {page.transaction.status
            ? `Last payment received: ${formatMoney(page.transaction.currency, page.transaction.amount)}`
            : page.transaction.failureReason || 'This payment attempt was not completed.'}
        </div>
      ) : null}

      {page.isExpired ? (
        <div className="pp-banner is-error">This payment page has expired and can no longer accept payments.</div>
      ) : null}

      <div className="pp-grid">
        <section
          className="pp-card pp-catalog"
          data-has-items={hasItems ? 'true' : 'false'}
          data-has-banner={hasBanner ? 'true' : 'false'}
        >
          {hasBanner ? (
            <div className="pp-cover">
              <SafeImage src={page.coverImage} alt="" className="pp-cover__img" />
            </div>
          ) : null}

          <div className={introSolo ? 'pp-intro pp-intro--solo' : 'pp-intro'}>
            <span className="pp-badge">Secure payment</span>
            <h1>{page.pageName}</h1>
            {page.description ? <p className="pp-lead">{page.description}</p> : null}
            {isPlainText && page.plainTextHtml ? (
              // HTML is sanitized with sanitize-html on the server before it reaches this client tree.
              <div className="pp-rich" dangerouslySetInnerHTML={{ __html: page.plainTextHtml }} />
            ) : null}
          </div>

          {hasItems ? (
            <div className="pp-items">
              <div className="pp-items__head">
                <div>
                  <h2>Select items to pay</h2>
                  <p>Choose one or more items below</p>
                </div>
              </div>

              <ul className="pp-item-list">
                {page.items.map((item) => {
                  const checked = selectedIdSet.has(item.id);
                  return (
                    <li key={item.id}>
                      <label className={`pp-item ${checked ? 'is-checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.id)}
                          disabled={isProcessing || submitting}
                        />
                        <span className="pp-item__thumb">
                          <SafeImage
                            src={item.image}
                            alt=""
                            fallback={<Package size={18} />}
                          />
                        </span>
                        <span className="pp-item__copy">
                          <strong>{item.name}</strong>
                          {item.description ? <em>{item.description}</em> : null}
                        </span>
                        <span className="pp-item__price">
                          {item.discountAmount > 0 ? (
                            <s>{formatMoney(item.currency, item.grossAmount)}</s>
                          ) : null}
                          {formatMoney(item.currency, item.netAmount)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="pp-summary">
                <div className="pp-summary__left">
                  <ShoppingCart size={18} />
                  <div>
                    <strong>
                      {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
                    </strong>
                    <p>
                      {selectedItems.length
                        ? selectedItems.map((item) => item.name).join(', ')
                        : 'Select the items you want to pay for.'}
                    </p>
                  </div>
                </div>
                <div className="pp-summary__total">
                  <span>Total</span>
                  <strong>{payLabel}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {isFixedAmount ? (
            <div className="pp-fixed">
              <p>This page has a fixed amount set by the merchant.</p>
              <div className="pp-fixed__amount">
                <span>Payable amount</span>
                <strong>{formatMoney(page.currency, page.netAmount)}</strong>
              </div>
            </div>
          ) : null}
        </section>

        <section className="pp-card pp-form-card">
          <div className="pp-form-head">
            <h2>Your Details</h2>
            <p>Enter your information to complete the payment.</p>
          </div>

          <div className="pp-fields">
            <label>
              <span className="pp-caption">First Name <b className="pp-req">*</b></span>
              <span className="pp-input">
                <User size={16} />
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" maxLength={80} autoComplete="given-name" />
              </span>
            </label>
            <label>
              <span className="pp-caption">Last Name <b className="pp-req">*</b></span>
              <span className="pp-input">
                <User size={16} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" maxLength={80} autoComplete="family-name" />
              </span>
            </label>
            <label>
              <span className="pp-caption">Email Address <b className="pp-req">*</b></span>
              <span className="pp-input">
                <Mail size={16} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" maxLength={254} autoComplete="email" />
              </span>
            </label>
            <label>
              <span className="pp-caption">Contact Number <b className="pp-req">*</b></span>
              <span className="pp-input">
                <Phone size={16} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.slice(0, 20))}
                  placeholder="Enter contact number"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </span>
            </label>

            {page.customFields.map((field) => (
              <label key={field.id} className="pp-span-2">
                <span className="pp-caption">{field.name} <b className="pp-req">*</b></span>
                <span className="pp-input">
                  <FileText size={16} />
                  <input
                    type="text"
                    inputMode={field.type === 'number' ? 'decimal' : 'text'}
                    value={customValues[String(field.id)] || ''}
                    onChange={(e) =>
                      setCustomValues((current) => ({ ...current, [String(field.id)]: e.target.value }))
                    }
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    maxLength={200}
                  />
                </span>
              </label>
            ))}

            <label className="pp-span-2">
              <span className="pp-caption">Note (Optional)</span>
              <span className="pp-textarea">
                <FileText size={16} />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  placeholder="Add any note (e.g. request, reference, etc.)"
                  maxLength={200}
                  rows={3}
                />
                <small>{note.length}/200</small>
              </span>
            </label>
          </div>

          <div className="pp-terms">
            <label>
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
              <span>I agree to the</span>
            </label>
            <button type="button" onClick={() => setShowTerms(true)}>
              Terms & Conditions
            </button>
          </div>

          {feedback ? <p className={`pp-feedback is-${feedback.type}`}>{feedback.text}</p> : null}

          <button className="pp-pay" type="button" disabled={!canPay} onClick={onPay}>
            <Lock size={16} />
            {payButtonLabel()}
            <span aria-hidden>→</span>
          </button>
        </section>
      </div>

      <footer className="pp-foot">
        <p>
          Powered by <strong>OnePay</strong> | Secure. Simple. Reliable.
        </p>
      </footer>

      {showTerms ? (
        <dialog className="pp-modal" open onCancel={() => setShowTerms(false)} aria-labelledby="terms-title">
          <div className="pp-modal__card">
            <h2 id="terms-title">Terms & Conditions</h2>
            {page.termsHtml ? (
              <div className="pp-rich" dangerouslySetInnerHTML={{ __html: page.termsHtml }} />
            ) : (
              <p>No additional terms were provided for this payment page.</p>
            )}
            <button type="button" onClick={() => setShowTerms(false)}>
              Close
            </button>
          </div>
        </dialog>
      ) : null}

      {showResult ? (
        <dialog
          className="pp-modal"
          open
          onCancel={closeResult}
          aria-labelledby="payment-result-title"
        >
          <div className={`pp-modal__card pp-result-card ${showFailed ? 'is-error' : 'is-success'}`}>
            <button type="button" className="pp-result__close" onClick={closeResult} aria-label="Close">
              <X size={16} strokeWidth={2.4} />
            </button>
            <div className="pp-result">
              {showSuccess ? (
                <div className="pp-result__burst" aria-hidden>
                  <span /><span /><span /><span /><span /><span />
                  <div className="pp-result__badge is-success">
                    <Check size={34} strokeWidth={3.2} />
                  </div>
                </div>
              ) : (
                <div className="pp-result__burst" aria-hidden>
                  <div className="pp-result__badge is-error">
                    <XCircle size={34} strokeWidth={2.4} />
                  </div>
                </div>
              )}
              <h2 id="payment-result-title">{showSuccess ? 'Payment completed' : 'Payment failed'}</h2>
              <p className={`pp-result__amount ${showFailed ? 'is-error' : ''}`}>
                {formatMoney(page.currency, paidAmount || payable)}
              </p>
              <p className="pp-result__copy">
                {showSuccess
                  ? 'Thank you! Your payment has been successfully processed.'
                  : sdkError || 'Your payment could not be processed. Please check your details and try again.'}
              </p>
              <button className="pp-result__cta" type="button" onClick={closeResult}>
                {showSuccess ? 'Close' : 'Try again'}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
      </div>
    </div>
  );
}
