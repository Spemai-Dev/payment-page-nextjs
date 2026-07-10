"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Phone,
  Mail,
  Info,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText
} from "lucide-react";
import { requestPLTransaction } from "../lib/api";
import { requestEncrypt, getJsonHash } from "../lib/encryption";

interface MerchantPaymentClientProps {
  pageData: any;
  tran: string;
  initialIsAttempted: boolean;
  initialStatus: boolean;
}

export default function MerchantPaymentClient({
  pageData,
  tran,
  initialIsAttempted,
  initialStatus,
}: MerchantPaymentClientProps) {
  const imageBaseUrl = "https://onepayserviceimages.s3.amazonaws.com/";

  // Extract variables
  const merchant = pageData.merchant_data || {};
  const pageInfo = pageData.page_data || {};
  const items = pageData.page_item_data || [];
  const additionalFields = pageData.page_additional_data || [];
  const currency = pageInfo.currency || "LKR";

  // State variables
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Custom additional data fields mapping
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({});

  // Form validation & touches
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Loading & Popup states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(initialIsAttempted);
  const [statusSuccess, setStatusSuccess] = useState(initialStatus);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Initialize amount
  useEffect(() => {
    if (pageData.is_plain_text) {
      if (pageData.amount && parseFloat(pageData.amount) > 0) {
        setAmount(String(pageData.amount));
      } else if (pageData.rest_amount && parseFloat(pageData.rest_amount) > 0) {
        setAmount(String(pageData.rest_amount));
      } else if (!pageData.required_amount) {
        setAmount(String(pageInfo.net_amount || "0.00"));
      } else {
        setAmount("");
      }
    } else {
      // For items list, set to sum of selected
      const total = selectedItems.reduce(
        (sum, item) => sum + parseFloat(item.amount || "0"),
        0
      );
      setAmount(total.toFixed(2));
    }
  }, [selectedItems, pageData.is_plain_text, pageData.required_amount, pageInfo.net_amount, pageData.amount, pageData.rest_amount]);

  // Handle item checkbox change
  const handleItemCheck = (choice: any, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [
        ...prev,
        {
          id: choice.id,
          amount: choice.collection_item_net_amount,
        },
      ]);
    } else {
      setSelectedItems((prev) =>
        prev.filter((item) => item.id !== choice.id)
      );
    }
  };

  // Form Field Validations
  const validateFirstName = (val: string) => {
    if (!val) return "First name cannot be left blank.";
    if (!/^[a-zA-Z\s]+$/.test(val)) return "First name format is invalid.";
    return "";
  };

  const validateLastName = (val: string) => {
    if (!val) return "Last name cannot be left blank.";
    if (!/^[a-zA-Z\s]+$/.test(val)) return "Last name format is invalid.";
    return "";
  };

  const validateEmail = (val: string) => {
    if (!val) return "Email cannot be left blank.";
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      return "Invalid email address format.";
    }
    return "";
  };

  const validatePhone = (val: string) => {
    if (!val) return "Contact number cannot be left blank.";
    if (!/^[0-9]+$/.test(val)) return "Contact number format is invalid.";
    return "";
  };

  const validateAmount = (val: string) => {
    if (!val) return "Amount cannot be left blank.";
    if (!/^[+-]?([0-9]*[.])?[0-9]+$/.test(val)) return "Amount must be numerical.";
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return "Amount must be greater than 0.";
    return "";
  };

  const validateAdditionalField = (fieldName: string, type: string, val: string) => {
    if (!val) return `${fieldName} cannot be left blank.`;
    if (type === "Number" && !/^[0-9]*$/.test(val)) {
      return `Invalid ${fieldName} number format.`;
    }
    return "";
  };

  // Check form level validity
  const isFormInvalid = () => {
    if (validateFirstName(firstName)) return true;
    if (validateLastName(lastName)) return true;
    if (validateEmail(email)) return true;
    if (validatePhone(phone)) return true;
    if (validateAmount(amount)) return true;
    if (!agreedToTerms) return true;

    // Check additional fields
    for (const field of additionalFields) {
      const val = additionalData[field.field_name] || "";
      if (validateAdditionalField(field.field_name, field.field_type, val)) {
        return true;
      }
    }

    // If checkboxes are required
    if (!pageData.is_plain_text && selectedItems.length === 0) {
      return true;
    }

    return false;
  };

  // Handle submit action
  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid()) return;

    setLoading(true);
    setLoadingMessage("Processing your request...");

    const itemIds = selectedItems.map((item) => item.id);

    const requestBody: Record<string, any> = {
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_email: email,
      customer_phone_number: phone,
      amount: parseFloat(amount),
      page_ref_id: pageInfo.page_ref_id,
      currency: currency,
    };

    if (!pageData.is_plain_text) {
      requestBody.collection_items = itemIds;
    }
    if (additionalFields.length > 0) {
      requestBody.additional_data = additionalData;
    }

    const hashPayload = {
      page_ref_id: pageInfo.page_ref_id,
      customer_phone_number: phone,
    };

    const hash = getJsonHash(hashPayload);
    const encryptedBody = requestEncrypt(requestBody);

    try {
      const res = await requestPLTransaction(
        hash,
        encryptedBody,
        pageInfo.token
      );

      if (res && res.status === 1000 && res.data?.redirect_url) {
        // Redirect to safe payment processor
        window.location.href = res.data.redirect_url;
      } else {
        setLoading(false);
        setStatusSuccess(false);
        setShowStatusModal(true);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatusSuccess(false);
      setShowStatusModal(true);
    }
  };

  // Error selectors helper
  const getFieldError = (field: string) => {
    if (!touched[field]) return "";
    switch (field) {
      case "firstName": return validateFirstName(firstName);
      case "lastName": return validateLastName(lastName);
      case "email": return validateEmail(email);
      case "phone": return validatePhone(phone);
      case "amount": return validateAmount(amount);
      default: return "";
    }
  };

  const getAdditionalFieldError = (fieldName: string, type: string) => {
    if (!touched[fieldName]) return "";
    return validateAdditionalField(fieldName, type, additionalData[fieldName] || "");
  };
  return (
    <div className="payment-page-container">
      {/* Header Section */}
      <header className="payment-header flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          {merchant.merchant_logo ? (
            <div className="merchant-logo-circle">
              <img
                src={`${imageBaseUrl}${merchant.merchant_logo}`}
                alt="Merchant Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="relative w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/default_pro_pic.jpg"
                alt="Default Merchant Logo"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <span className="font-bold text-[#0a2540] text-lg uppercase tracking-wide">
            {merchant.merchant_name || "Merchant"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-28 h-8 flex items-center">
            <img
              src="/assets/OnepayPayment.png"
              alt="OnePay Gateway"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT SIDE PANEL (Details & Items) */}
        <section className="lg:col-span-6 payment-panel-left rounded-[32px] overflow-hidden flex flex-col">
          <div className="bg-[#e2eaf4]/60 px-8 py-7 space-y-1 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-[#0a2540]">
              {pageInfo.page_name || "Payment Request"}
            </h1>
            <p className="text-sm font-semibold text-[#4a6b82]/85">
              Settle your payments with ease
            </p>
          </div>

          <div className="px-8 py-8 flex flex-col gap-6 flex-grow">
            {/* Checklist items vs Plain-text block */}
            {!pageData.is_plain_text ? (
              <div className="space-y-4">
                <div className="space-y-0.5">
                  <h2 className="text-[#0a2540] text-base font-bold">
                    Select items to pay
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    Choose one or more items below
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="w-full h-[1px] bg-slate-200/60" />
                  {items.map((choice: any, index: number) => {
                    const isChecked = selectedItems.some((item) => item.id === choice.id);
                    const isLast = index === items.length - 1;
                    return (
                      <React.Fragment key={choice.id || index}>
                        <div className="payment-item-row flex flex-col gap-4 p-2 rounded-xl">
                          <div className="flex items-start gap-4">
                            {/* Styled Checkbox */}
                            <div className="pt-1 flex items-center flex-shrink-0">
                              <label className="payment-checkbox-container">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleItemCheck(choice, e.target.checked)}
                                  className="sr-only peer payment-checkbox-input"
                                />
                                <div className="payment-checkbox-custom">
                                  <Check className="payment-checkbox-checkmark h-3.5 w-3.5 stroke-[3px]" />
                                </div>
                              </label>
                            </div>

                            {/* Thumbnail image if exists */}
                            {choice.collection_item_image && (
                              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                                <img
                                  src={`${imageBaseUrl}${choice.collection_item_image}`}
                                  alt={choice.collection_item_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {/* Title and descriptions */}
                            <div className="flex-1 space-y-1">
                              <h3 className="font-bold text-[#0a2540] text-sm leading-snug">
                                {choice.collection_item_name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                {choice.collection_item_description}
                              </p>
                            </div>

                            {/* Pricing */}
                            <div className="text-right flex-shrink-0 pt-0.5">
                              <span className="text-sm font-bold text-emerald-600">
                                {currency} {parseFloat(choice.collection_item_net_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isLast && <div className="w-full h-[1px] bg-slate-200/60" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="text-sm leading-relaxed text-[#0a2540]/80 prose max-h-[450px] overflow-y-auto custom-scrollbar"
                dangerouslySetInnerHTML={{ __html: pageInfo.description || "" }}
              />
            )}
          </div>
        </section>

        {/* RIGHT SIDE PANEL (Payable Amount & Payment Form) */}
        <section className="lg:col-span-6 payment-panel-right rounded-[32px] p-4 pt-0 sm:px-0 sm:pt-0 sm:pb-2 space-y-6">
          {/* Payable Amount Card */}
          <div>
            <div className="payment-amount-card">
              <span className="text-xl font-bold text-[#0a2540]">Payable amount</span>
              {pageData.is_plain_text && pageData.required_amount ? (
                <div className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-lg border border-[#0a2540]/10 shadow-sm focus-within:border-[#0a2540]/30 transition-colors">
                  <span className="text-xl font-bold text-[#0a2540]/80">{currency}</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={() => setTouched({ ...touched, amount: true })}
                    placeholder="0.00"
                    className="w-28 bg-transparent text-right text-xl sm:text-2xl font-extrabold text-[#0a2540] font-mono outline-none"
                  />
                </div>
              ) : (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0a2540] font-mono tracking-tight">
                  {parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {/* {pageData.is_plain_text && pageData.required_amount && getFieldError("amount") && (
              <p className="text-xs font-semibold text-red-500 mt-1.5 px-1">
                {getFieldError("amount")}
              </p>
            )} */}
          </div>

          {/* Form Fields Section */}
          <div className="space-y-5">
            <form onSubmit={handleProceed} className="space-y-4">

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="payment-input-group">
                  <label className="payment-label">
                    First Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => setTouched({ ...touched, firstName: true })}
                    placeholder="Enter first name"
                    className={`payment-input ${getFieldError("firstName") ? "input-error" : ""}`}
                  />
                  {getFieldError("firstName") && (
                    <p className="text-xs font-semibold text-red-500 mt-1">
                      {getFieldError("firstName")}
                    </p>
                  )}
                </div>

                <div className="payment-input-group">
                  <label className="payment-label">
                    Last Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => setTouched({ ...touched, lastName: true })}
                    placeholder="Enter last name"
                    className={`payment-input ${getFieldError("lastName") ? "input-error" : ""}`}
                  />
                  {getFieldError("lastName") && (
                    <p className="text-xs font-semibold text-red-500 mt-1">
                      {getFieldError("lastName")}
                    </p>
                  )}
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="payment-input-group">
                  <label className="payment-label">
                    Email Address <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    placeholder="Enter email address"
                    className={`payment-input ${getFieldError("email") ? "input-error" : ""}`}
                  />
                  {getFieldError("email") && (
                    <p className="text-xs font-semibold text-red-500 mt-1">
                      {getFieldError("email")}
                    </p>
                  )}
                </div>

                <div className="payment-input-group">
                  <label className="payment-label">
                    Contact Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setTouched({ ...touched, phone: true })}
                    placeholder="Enter contact number"
                    className={`payment-input ${getFieldError("phone") ? "input-error" : ""}`}
                  />
                  {getFieldError("phone") && (
                    <p className="text-xs font-semibold text-red-500 mt-1">
                      {getFieldError("phone")}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Dynamic Data Fields */}
              {additionalFields.map((field: any, index: number) => {
                const name = field.field_name;
                return (
                  <div key={name || index} className="payment-input-group">
                    <label className="payment-label">
                      {name} <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={additionalData[name] || ""}
                      onChange={(e) =>
                        setAdditionalData({
                          ...additionalData,
                          [name]: e.target.value,
                        })
                      }
                      onBlur={() => setTouched({ ...touched, [name]: true })}
                      placeholder={`Enter ${name}`}
                      className={`payment-input ${getAdditionalFieldError(name, field.field_type) ? "input-error" : ""}`}
                    />
                    {getAdditionalFieldError(name, field.field_type) && (
                      <p className="text-xs font-semibold text-red-500 mt-1">
                        {getAdditionalFieldError(name, field.field_type)}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Checkbox Row */}
              <div className="pt-2">
                <label className="payment-checkbox-container">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only peer payment-checkbox-input"
                  />
                  <div className="payment-checkbox-custom">
                    <Check className="payment-checkbox-checkmark h-3.5 w-3.5 stroke-[3px]" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#198754] hover:text-[#146c43] underline font-semibold focus:outline-none cursor-pointer"
                    >
                      Terms & Conditions
                    </button>
                  </span>
                </label>
              </div>

              {/* Pay Button Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="hidden sm:block"></div>
                <div>
                  <button
                    type="submit"
                    disabled={isFormInvalid() || loading}
                    className="payment-btn-primary w-full"
                  >
                    <Lock className="h-4 w-4" />
                    Pay {currency} {parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </button>
                </div>
              </div>
            </form>

            {/* Footer contacts & info */}
            <footer className="mt-12 sm:mt-24 flex flex-col items-end gap-1.5 text-xs font-semibold text-[#95a5b5] w-full">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-end mb-2">
                {merchant.merchant_mobile && (
                  <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                    <Phone className="h-3.5 w-3.5 text-[#95a5b5]" />
                    {merchant.merchant_mobile}
                  </span>
                )}
                {merchant.merchant_email && (
                  <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                    <Mail className="h-3.5 w-3.5 text-[#95a5b5]" />
                    {merchant.merchant_email}
                  </span>
                )}
                {pageInfo.page_ref_id && (
                  <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                    <Info className="h-3.5 w-3.5 text-[#95a5b5]" />
                    {pageInfo.page_ref_id}
                  </span>
                )}
              </div>
              <div>© 2026 All Rights Reserved</div>
              <div className="text-[11px] mt-0.5">
                <span className="font-semibold text-[#95a5b5]">OnePay</span>{" "}
                <span className="text-[#95a5b5]">is Powered by</span>{" "}
                <span className="font-bold text-slate-800">Spemai</span>
              </div>
            </footer>
          </div>
        </section>
      </main>

      {/* MODAL overlay loaders */}
      {loading && (
        <div className="premium-modal-backdrop">
          <div className="premium-modal-content p-6 flex flex-col items-center gap-4 max-w-xs text-center">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
            <p className="text-sm font-bold text-slate-800">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* POPUP: Status Modal (Success / Failure popup from attempted redirects) */}
      {showStatusModal && (
        <div className="premium-modal-backdrop p-4">
          <div className="premium-modal-content w-full max-w-sm overflow-hidden flex flex-col p-6 items-center text-center gap-4">

            {statusSuccess ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-10 w-10 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900">Payment Successful</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Your transaction has been processed successfully.
                  </p>
                </div>
                {tran && (
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-bold border border-slate-100 flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-mono text-slate-700">{tran}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full mt-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm transition-colors cursor-pointer"
                >
                  Okay
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <XCircle className="h-10 w-10 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900">Payment Failed</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Your payment could not be processed. Please try again.
                  </p>
                </div>
                {tran && (
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-bold border border-slate-100 flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-mono text-slate-700">{tran}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full mt-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 text-sm transition-colors cursor-pointer"
                >
                  Retry Payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* POPUP: Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="premium-modal-backdrop p-4">
          <div className="premium-modal-content w-full max-w-md overflow-hidden flex flex-col p-6 gap-4">
            <h3 className="text-xl font-extrabold text-slate-900 pb-2 border-b border-gray-100">
              Terms & Conditions
            </h3>

            <div className="text-xs text-slate-500 leading-relaxed space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              <p>
                Welcome to OnePay payment gateway. By proceeding with this payment transaction, you agree to comply with and be bound by the following terms of service.
              </p>
              <p>
                <strong>1. Payment Authorization</strong><br />
                By providing your card or banking details, you authorize OnePay to charge the specified amount for the selected services or goods.
              </p>
              <p>
                <strong>2. Security & Compliance</strong><br />
                All transactions are processed securely under strict PCI-DSS compliance protocols. Your credentials are never stored directly on our frontend servers.
              </p>
              <p>
                <strong>3. Refund Policy</strong><br />
                Refunds are subject to the merchant&apos;s billing agreements and policies. OnePay operates solely as a payment processor and is not directly responsible for dispute resolutions.
              </p>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                }}
                className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm transition-colors cursor-pointer"
              >
                Agree
              </button>
              <button
                onClick={() => setShowTermsModal(false)}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
