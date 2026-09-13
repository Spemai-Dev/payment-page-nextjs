'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OnePaySDK, type PaymentResult } from '@onepaynpm/onepay-sdk';
import { getMerchantApiBaseUrl, getOnePayApiBaseUrl } from '@/lib/clientEnv';

type AppDetails = {
  app_id: string;
  app_token: string;
  hash_salt: string;
};

type PaymentParams = {
  amount: number;
  currency: string;
  orderReference: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  redirectUrl?: string;
  additionalData?: string;
};

export type UseOnePayReturn = {
  isInitialized: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  processPayment: (params: PaymentParams) => Promise<void>;
  paymentResult: PaymentResult | null;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed' | 'closed';
  resetPaymentStatus: () => void;
};

function paymentErrorMessage(result: PaymentResult, fallback: string) {
  const extra = result as PaymentResult & {
    error?: string;
    message?: string;
    errorMessage?: string;
    reason?: string;
    statusMessage?: string;
    data?: { error?: string; message?: string };
    response?: { error?: string; message?: string };
  };

  return (
    extra.error ||
    extra.errorMessage ||
    extra.message ||
    extra.reason ||
    extra.statusMessage ||
    extra.data?.error ||
    extra.data?.message ||
    extra.response?.error ||
    extra.response?.message ||
    fallback
  );
}

export function useOnePay({ appId }: { appId: string }): UseOnePayReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(appId));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'closed'>('idle');
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null);
  const sdkRef = useRef<OnePaySDK | null>(null);
  const paymentStatusRef = useRef(paymentStatus);
  paymentStatusRef.current = paymentStatus;

  useEffect(() => {
    if (!appId) {
      setIsLoading(false);
      setError('This payment page is missing a gateway application.');
      return;
    }

    let cancelled = false;
    const merchantApiBaseUrl = getMerchantApiBaseUrl();

    async function fetchAppDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${merchantApiBaseUrl}/v3/app/client/app/${encodeURIComponent(appId)}/`);
        const result = await response.json();
        if (!response.ok || result.status !== 200 || !result.data?.app_id || !result.data?.app_token || !result.data?.hash_salt) {
          throw new Error(result.error || result.message || 'Failed to load payment application.');
        }
        if (!cancelled) setAppDetails(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load payment application.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAppDetails();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  useEffect(() => {
    if (!appDetails) return;

    const sdk = new OnePaySDK({
      debug: process.env.NODE_ENV !== 'production',
      apiBaseUrl: getOnePayApiBaseUrl(),
    });
    sdkRef.current = sdk;

    sdk
      .initialize()
      .then(() => {
        sdk.addEventListener({
          onSuccess: (result) => {
            setPaymentResult(result);
            setPaymentStatus('success');
            setIsProcessing(false);
            setError(null);
          },
          onFail: (result) => {
            setPaymentResult(result);
            setPaymentStatus('failed');
            setIsProcessing(false);
            setError(paymentErrorMessage(result, 'Payment failed'));
          },
          onClose: (result) => {
            setPaymentResult(result);
            if (paymentStatusRef.current === 'processing') {
              setPaymentStatus('closed');
            }
            setIsProcessing(false);
          },
        });
        setIsInitialized(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment system');
      });

    return () => {
      sdk.closePaymentGateway();
      sdkRef.current = null;
      setIsInitialized(false);
    };
  }, [appDetails]);

  const processPayment = useCallback(
    async (params: PaymentParams) => {
      if (!sdkRef.current || !isInitialized || !appDetails) {
        setError('Payment system not initialized');
        return;
      }

      setIsProcessing(true);
      setPaymentStatus('processing');
      setError(null);

      try {
        await sdkRef.current.processPayment({
          currency: params.currency,
          amount: params.amount,
          appid: appDetails.app_id,
          hashToken: appDetails.hash_salt,
          orderReference: params.orderReference,
          customerFirstName: params.customerFirstName,
          customerLastName: params.customerLastName,
          customerPhoneNumber: params.customerPhoneNumber,
          customerEmail: params.customerEmail,
          transactionRedirectUrl: params.redirectUrl || window.location.href,
          apptoken: appDetails.app_token,
          additionalData: params.additionalData || '',
        });
      } catch (err: unknown) {
        const errorObj = err as Error & {
          response?: { data?: { error?: string; message?: string } };
          data?: { error?: string; message?: string };
        };
        setError(
          errorObj.response?.data?.error ||
            errorObj.response?.data?.message ||
            errorObj.data?.error ||
            errorObj.data?.message ||
            (err instanceof Error ? err.message : 'Payment processing failed'),
        );
        setPaymentStatus('failed');
        setIsProcessing(false);
      }
    },
    [appDetails, isInitialized],
  );

  const resetPaymentStatus = useCallback(() => {
    setPaymentStatus('idle');
    setPaymentResult(null);
    setError(null);
  }, []);

  return {
    isInitialized,
    isLoading,
    isProcessing,
    error,
    processPayment,
    paymentResult,
    paymentStatus,
    resetPaymentStatus,
  };
}
