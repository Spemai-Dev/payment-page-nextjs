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
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { requestPLTransaction, createCheckoutIntent } from "../lib/api";
import { getJsonHash } from "../lib/encryption";
import { useOnePay } from "../hooks/useOnePay";

interface MerchantPaymentClientProps {
  pageData: any;
  tran: string;
  initialIsAttempted: boolean;
  initialStatus: boolean;
}

function ItemImageSlider({
  images,
  itemName,
  imageBaseUrl,
}: {
  images: string[];
  itemName: string;
  imageBaseUrl: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auto-play interval for multiple images
  useEffect(() => {
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) return null;

  const currentImg = images[currentIndex] || images[0];
  const fullUrl = currentImg.startsWith("http") ? currentImg : `${imageBaseUrl}${currentImg}`;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white group flex-shrink-0 shadow-sm flex items-center justify-center">
        <img
          src={fullUrl}
          alt={`${itemName} ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
          onClick={() => setPreviewImage(fullUrl)}
        />

        {images.length > 1 && (
          <>
            {/* Slider Nav Buttons */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-0.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 focus:outline-none"
              title="Previous image"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 focus:outline-none"
              title="Next image"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-10 pointer-events-none">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all ${
                    idx === currentIndex ? "w-2 bg-white" : "w-1 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="premium-modal-backdrop z-50 p-4 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors z-20"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt={itemName}
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
            />
            <p className="mt-2 text-xs font-semibold text-slate-700 text-center px-4">
              {itemName} ({currentIndex + 1} of {images.length})
            </p>
          </div>
        </div>
      )}
    </>
  );
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
  const items = pageData.items || pageData.page_item_data || [];
  const additionalFields = pageData.custom_fields || pageData.page_additional_data || [];
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
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [currentTranId, setCurrentTranId] = useState(tran);

  const pageRefId = String(pageInfo.page_ref_id || pageData.page_ref_id || "");

  // OnePay SDK hook
  const {
    isInitialized: isSDKInitialized,
    isProcessing: isSDKProcessing,
    error: sdkError,
    processPayment,
    processDirectPayment,
    paymentStatus,
    paymentResult,
    resetPaymentStatus,
    appDetails,
  } = useOnePay({
    pageRefId: pageRefId,
    appId: String(pageInfo.app_id || pageData.app_id || ""),
    appRefId: String(pageInfo.app_ref_id || pageData.app_ref_id || ""),
    appToken: pageInfo.token || pageData.token || "",
    hashToken: pageInfo.token || pageData.token || "",
    debug: true,
  });

  // Sync paymentStatus with UI modals
  useEffect(() => {
    if (paymentStatus === "success") {
      setLoading(false);
      setStatusSuccess(true);
      if (paymentResult?.transaction_id) {
        setCurrentTranId(paymentResult.transaction_id);
      }
      setShowStatusModal(true);
    } else if (paymentStatus === "failed") {
      setLoading(false);
      setStatusSuccess(false);
      if (paymentResult?.transaction_id) {
        setCurrentTranId(paymentResult.transaction_id);
      }
      setShowStatusModal(true);
    } else if (paymentStatus === "closed") {
      setLoading(false);
      if (paymentResult?.transaction_id) {
        setCurrentTranId(paymentResult.transaction_id);
      }
    }
  }, [paymentStatus, paymentResult]);

  // Console log API response for debugging
  useEffect(() => {
    console.log("Payment Page API Data:", pageData);
  }, [pageData]);

  // Helper function to safely parse boolean flags (handles 0, 1, "0", "1", true, false, "true", "false")
  const parseBooleanFlag = (val: any): boolean => {
    if (val === true || val === 1 || val === "1" || val === "true" || val === "True") {
      return true;
    }
    if (val === false || val === 0 || val === "0" || val === "false" || val === "False") {
      return false;
    }
    return false;
  };

  // Helper flags for payment page types
  const rawPlainText = pageData.is_plain_text ?? pageInfo.is_plain_text;
  const isPlainText = parseBooleanFlag(rawPlainText) || items.length === 0;

  const rawReqAmount = pageData.required_amount ?? pageInfo.required_amount;
  const isRequiredAmount = parseBooleanFlag(rawReqAmount);

  // Initialize amount once on mount / page data load for Plain Text mode
  useEffect(() => {
    if (isPlainText) {
      const fixedAmt =
        pageData.net_amount ||
        pageData.gross_amount ||
        pageData.amount ||
        pageData.rest_amount ||
        pageInfo.net_amount ||
        pageInfo.gross_amount ||
        pageInfo.amount ||
        "";
      if (fixedAmt && parseFloat(String(fixedAmt)) > 0) {
        setAmount(String(fixedAmt));
      }
    }
  }, [isPlainText, pageData.net_amount, pageData.gross_amount, pageData.amount, pageData.rest_amount, pageInfo.net_amount, pageInfo.gross_amount, pageInfo.amount]);

  // Recalculate amount dynamically when selected items change in Item List mode
  useEffect(() => {
    if (!isPlainText) {
      const total = selectedItems.reduce((sum, item) => {
        const itemAmt = parseFloat(item.amount || "0");
        return sum + (isNaN(itemAmt) ? 0 : itemAmt);
      }, 0);
      setAmount(total.toFixed(2));
    }
  }, [selectedItems, isPlainText]);

  // Handle item checkbox change
  const handleItemCheck = (choice: any, checked: boolean) => {
    const colItemId = choice.collection_item_id !== undefined ? choice.collection_item_id : choice.id;
    if (checked) {
      const netAmount = choice.net_amount !== undefined ? choice.net_amount : choice.collection_item_net_amount;
      setSelectedItems((prev) => [
        ...prev,
        {
          id: choice.id,
          collection_item_id: colItemId,
          amount: netAmount,
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

    // If checkboxes are required for Item List page
    if (!isPlainText && selectedItems.length === 0) {
      return true;
    }

    return false;
  };

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Pay button clicked.");

    // Mark all fields as touched to display errors
    const allTouched: Record<string, boolean> = {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      amount: true,
    };
    additionalFields.forEach((field: any) => {
      if (field.field_name) {
        allTouched[field.field_name] = true;
      }
    });
    setTouched(allTouched);

    const formInvalid = isFormInvalid();
    console.log("Form Validation Check:", {
      isInvalid: formInvalid,
      firstName,
      lastName,
      email,
      phone,
      amount,
      agreedToTerms,
      isSDKInitialized,
      isPlainText,
      selectedItemsCount: selectedItems.length,
    });

    if (formInvalid) {
      if (!agreedToTerms) {
        alert("Please check the box to agree to the Terms & Conditions before proceeding.");
      }
      return;
    }

    if (!isSDKInitialized) {
      alert("Payment system is still initializing. Please wait a moment and try again.");
      return;
    }

    setGeneralError(null);
    setLoading(true);
    setLoadingMessage("Registering checkout intent...");

    try {
      let directSuccess = false;
      const pageRefId = pageInfo.page_ref_id || pageData.page_ref_id || "";
      const currentAppId = String(pageInfo.app_id || pageData.app_id || "");

      // 1. Post Checkout Intent to register selections and obtain intent reference
      const intentPayload = {
        collection_item_ids: selectedItems.map((item) =>
          item.collection_item_id !== undefined ? item.collection_item_id : item.id
        ),
        custom_field_answers: additionalFields.map((field: any) => ({
          field_name: field.field_name,
          value: additionalData[field.field_name] || "",
        })),
      };

      const intentResult = await createCheckoutIntent(pageRefId, intentPayload);
      console.log("Checkout Intent API Result:", intentResult);

      if (!intentResult.success || !intentResult.reference) {
        const errorMsg = intentResult.error || "Failed to create checkout intent. Please verify your selections and try again.";
        console.error("Checkout intent failed, stopping SDK payment process:", errorMsg);
        setGeneralError(errorMsg);
        setLoading(false);
        return; // STOP EXECUTION! DO NOT CALL SDK!
      }

      const intentReference = intentResult.reference;
      console.log("Checkout Intent Successful! Reference:", intentReference);

      setLoadingMessage("Initiating payment gateway...");

      if (pageInfo.token && pageRefId) {
        try {
          const requestBody = {
            pp_id: pageRefId,
            amount: parseFloat(amount),
            customer_first_name: firstName,
            customer_last_name: lastName,
            customer_phone_number: phone,
            customer_email: email,
            additional_data: intentReference,
          };
          const requestHash = getJsonHash(requestBody);
          const plRes = await requestPLTransaction(requestHash, requestBody, pageInfo.token);
          if (plRes && (plRes.status || plRes.success)) {
            const resData = plRes.data || plRes;
            const gatewayObj = resData.gateway || resData;
            const redirectUrl = gatewayObj.redirect_url || resData.redirect_url || resData.url;
            const tranId = gatewayObj.ipg_transaction_id || resData.ipg_transaction_id || resData.transaction_id;
            if (redirectUrl && tranId) {
              directSuccess = true;
              setLoading(false);
              await processDirectPayment({
                directGatewayURL: redirectUrl,
                directTransactionId: tranId,
              });
            }
          }
        } catch (e) {
          console.warn("requestPLTransaction attempt failed, falling back to processPayment:", e);
        }
      }

      if (!directSuccess) {
        setLoading(false);
        const paymentPayload = {
          currency: currency,
          amount: parseFloat(amount),
          orderReference: pageRefId,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerPhoneNumber: phone,
          customerEmail: email,
          redirectUrl: window.location.origin + `/redirect/${pageRefId}`,
          appid: currentAppId,
          apptoken: pageInfo.token || pageData.token,
          hashToken: pageInfo.token || pageData.token,
          additionalData: intentReference,
        };
        console.log("Submitting Payment Payload to OnePay SDK:", paymentPayload);
        await processPayment(paymentPayload);
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      setLoading(false);
      setGeneralError(error?.message || "An unexpected error occurred while processing payment.");
    } finally {
      setLoading(false);
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
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-stretch items-start">
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
            {!isPlainText ? (
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
                    const netAmount = choice.net_amount !== undefined ? choice.net_amount : choice.collection_item_net_amount;
                    const itemImages: string[] =
                      Array.isArray(choice.images) && choice.images.length > 0
                        ? choice.images
                        : choice.collection_item_image
                        ? [choice.collection_item_image]
                        : [];
                    const itemName = choice.item_name || choice.collection_item_name;
                    const itemDescription = choice.description || choice.collection_item_description;
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

                            {/* Image Slider / Thumbnail */}
                            <ItemImageSlider
                              images={itemImages}
                              itemName={itemName}
                              imageBaseUrl={imageBaseUrl}
                            />

                            {/* Title and descriptions */}
                            <div className="flex-1 space-y-1">
                              <h3 className="font-bold text-[#0a2540] text-sm leading-snug">
                                {itemName}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                {itemDescription}
                              </p>
                            </div>

                            {/* Pricing */}
                            <div className="text-right flex-shrink-0 pt-0.5">
                              <span className="text-sm font-bold text-emerald-600">
                                {currency} {parseFloat(netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
              {isPlainText && isRequiredAmount ? (
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
            {(generalError || sdkError) && (
              <div className="p-4 mb-2 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-3">
                <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                <span>{generalError || sdkError}</span>
              </div>
            )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="hidden sm:block"></div>
                <div>
                  <button
                    type="submit"
                    disabled={loading || isFormInvalid()}
                    className="payment-btn-primary w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="h-4 w-4" />
                    Pay {currency} {parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </button>
                </div>
              </div>
            </form>

            {/* Footer contacts & info */}
            <footer className="mt-12 sm:mt-12 flex flex-col items-end gap-1.5 text-xs font-semibold text-[#95a5b5] w-full">
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
                {currentTranId && (
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-bold border border-slate-100 flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-mono text-slate-700">{currentTranId}</span>
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
                {currentTranId && (
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-bold border border-slate-100 flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-mono text-slate-700">{currentTranId}</span>
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
