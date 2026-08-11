"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OnePaySDK, PaymentResult } from "@onepaynpm/onepay-sdk";

export interface AppDetails {
  app_id: string;
  app_name: string;
  brand_logo: string | null;
  banner_bg_color: string;
  banner_font_color: string;
  action_bt_text: string;
  action_button_bt_color: string;
  app_token: string;
  hash_salt: string;
  greeting_message: string | null;
  redirection_url: string | null;
  business_name: string;
  contact_email: string;
  contact_phone_no: string;
}

export interface UseOnePayOptions {
  appId?: string;
  appRefId?: string;
  pageRefId?: string;
  appToken?: string;
  hashToken?: string;
  debug?: boolean;
  apiBaseUrl?: string;
  merchantApiBaseUrl?: string;
}

export interface PaymentParams {
  amount: number;
  currency: string;
  orderReference: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  redirectUrl?: string;
  additionalData?: string;
  appid?: string;
  apptoken?: string;
  hashToken?: string;
}

export interface DirectPaymentParams {
  directGatewayURL: string;
  directTransactionId: string;
}

export interface UseOnePayReturn {
  isInitialized: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  processPayment: (params: PaymentParams) => Promise<void>;
  processDirectPayment: (params: DirectPaymentParams) => Promise<void>;
  paymentResult: PaymentResult | null;
  paymentStatus: "idle" | "processing" | "success" | "failed" | "closed";
  resetPaymentStatus: () => void;
  appDetails: AppDetails | null;
}

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_ONEPAY_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://onepay-api-manager-uat.onepayapi.lk";

const DEFAULT_MERCHANT_API_BASE_URL =
  process.env.NEXT_PUBLIC_MERCHANT_API_BASE_URL ||
  "https://onepay-merchant-uat-v3.onepayapi.lk";

export function useOnePay({
  appId,
  appRefId,
  pageRefId,
  appToken,
  hashToken,
  debug = true,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  merchantApiBaseUrl = DEFAULT_MERCHANT_API_BASE_URL,
}: UseOnePayOptions = {}): UseOnePayReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed" | "closed">("idle");
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null);

  const sdkRef = useRef<OnePaySDK | null>(null);
  const targetId = appRefId || appId || pageRefId;

  // Fetch app details if targetId (appRefId || appId || pageRefId) is provided
  useEffect(() => {
    const fetchAppDetails = async () => {
      if (!targetId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const cleanMerchantUrl = merchantApiBaseUrl.replace(/\/+$/, "");
        console.log(`Fetching App details from: ${cleanMerchantUrl}/v3/app/client/app/${targetId}/`);
        const response = await fetch(`${cleanMerchantUrl}/v3/app/client/app/${targetId}/`);
        const result = await response.json();

        if (!response.ok || (result.status !== 200 && result.status !== "200") || !result.data) {
          const errorMessage = result.error || result.message || `Failed to fetch app details: ${response.status}`;
          throw new Error(errorMessage);
        }

        console.log("App details fetched successfully:", result.data);
        setAppDetails(result.data);
      } catch (err) {
        console.warn("Failed to fetch app details, fallback credentials will be used:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppDetails();
  }, [targetId, merchantApiBaseUrl]);

  // Initialize SDK after app details or options are ready
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        if (sdkRef.current) return;

        const cleanedApiBaseUrl = apiBaseUrl
          ? apiBaseUrl
            .replace(/\/+$/, "")
            .replace(/\/gateway\/payment_page(\/v1)?$/, "")
            .replace(/\/v1$/, "")
          : undefined;

        const sdkOptions: any = { debug: Boolean(debug) };
        if (cleanedApiBaseUrl) {
          sdkOptions.apiBaseUrl = cleanedApiBaseUrl;
        }

        const sdk = new OnePaySDK(sdkOptions);
        sdkRef.current = sdk;

        await sdk.initialize();
        setIsInitialized(true);

        sdk.addEventListener({
          onSuccess: (result: PaymentResult) => {
            console.log("Payment successful:", result);
            setPaymentResult(result);
            setPaymentStatus("success");
            setIsProcessing(false);
          },
          onFail: (result: PaymentResult) => {
            console.log("Payment failed - full result:", JSON.stringify(result, null, 2));
            setPaymentResult(result);

            const resultObj = result as PaymentResult & {
              error?: string;
              message?: string;
              errorMessage?: string;
              reason?: string;
              statusMessage?: string;
              data?: { error?: string; message?: string };
              response?: { error?: string; message?: string };
            };
            const errorMessage =
              resultObj.error ||
              resultObj.errorMessage ||
              resultObj.message ||
              resultObj.reason ||
              resultObj.statusMessage ||
              resultObj.data?.error ||
              resultObj.data?.message ||
              resultObj.response?.error ||
              resultObj.response?.message ||
              "Payment failed";
            setError(errorMessage);
            setPaymentStatus("failed");
            setIsProcessing(false);
          },
          onClose: (result: PaymentResult) => {
            console.log("Payment modal closed:", result);
            setPaymentResult(result);
            if (paymentStatus === "processing") {
              setPaymentStatus("closed");
            }
            setIsProcessing(false);
          },
        });
      } catch (err) {
        console.error("Failed to initialize OnePay SDK:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize payment system");
      }
    };

    initializeSDK();

    return () => {
      if (sdkRef.current) {
        sdkRef.current.closePaymentGateway();
      }
    };
  }, [debug, apiBaseUrl]);

  const processPayment = useCallback(
    async (params: PaymentParams) => {
      if (!sdkRef.current || !isInitialized) {
        setError("Payment system not initialized");
        return;
      }

      const finalAppId = appDetails?.app_id || params.appid || appId;
      const finalAppToken = appDetails?.app_token || params.apptoken || appToken;
      const finalHashToken = appDetails?.hash_salt || params.hashToken || hashToken;

      if (!finalAppId || !finalAppToken || !finalHashToken) {
        setError("Missing required payment credentials (appId, appToken, hashToken)");
        return;
      }

      setIsProcessing(true);
      setPaymentStatus("processing");
      setError(null);

      try {
        const paymentData = {
          currency: params.currency,
          amount: params.amount,
          appid: finalAppId,
          hashToken: finalHashToken,
          orderReference: params.orderReference,
          customerFirstName: params.customerFirstName,
          customerLastName: params.customerLastName,
          customerPhoneNumber: params.customerPhoneNumber,
          customerEmail: params.customerEmail,
          transactionRedirectUrl: params.redirectUrl || window.location.href,
          apptoken: finalAppToken,
          additionalData:
            params.additionalData && params.additionalData.trim() !== ""
              ? params.additionalData
              : JSON.stringify({ page_ref_id: params.orderReference || "" }),
        };

        console.log("OnePay SDK Payment Payload:", paymentData);

        await sdkRef.current.processPayment(paymentData);
      } catch (err: unknown) {
        console.error("Payment processing error:", err);

        let errorMessage = "Payment processing failed";
        if (err instanceof Error) {
          const errorObj = err as Error & {
            response?: { data?: { error?: string; message?: string } };
            data?: { error?: string; message?: string };
          };
          errorMessage =
            errorObj.response?.data?.error ||
            errorObj.response?.data?.message ||
            errorObj.data?.error ||
            errorObj.data?.message ||
            err.message;
        }

        setError(errorMessage);
        setPaymentStatus("failed");
        setIsProcessing(false);
        throw err;
      }
    },
    [appDetails, appId, appToken, hashToken, debug, isInitialized]
  );

  const processDirectPayment = useCallback(
    async (params: DirectPaymentParams) => {
      if (!sdkRef.current || !isInitialized) {
        setError("Payment system not initialized");
        return;
      }

      setIsProcessing(true);
      setPaymentStatus("processing");
      setError(null);

      try {
        await sdkRef.current.processDirectPayment({
          directGatewayURL: params.directGatewayURL,
          directTransactionId: params.directTransactionId,
        });
      } catch (err) {
        console.error("Direct payment processing error:", err);
        setError(err instanceof Error ? err.message : "Direct payment processing failed");
        setPaymentStatus("failed");
        setIsProcessing(false);
        throw err;
      }
    },
    [isInitialized]
  );

  const resetPaymentStatus = useCallback(() => {
    setPaymentStatus("idle");
    setPaymentResult(null);
    setError(null);
  }, []);

  return {
    isInitialized,
    isLoading,
    isProcessing,
    error,
    processPayment,
    processDirectPayment,
    paymentResult,
    paymentStatus,
    resetPaymentStatus,
    appDetails,
  };
}
