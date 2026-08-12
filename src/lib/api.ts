import { responseDecrypt } from "./encryption";

const cleanBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api-gateway-uat-dpe9eegffresc9dv.southeastasia-01.azurewebsites.net/gateway/payment_page/v1"
)
  .replace(/\/+$/, "") // remove trailing slashes
  .replace(/\/v1$/, ""); // remove trailing /v1 if present

export async function verifyTransaction(pageId: string, transactionId: string = ""): Promise<any> {
  const primaryUrl = `${cleanBaseUrl}/v1/client/payment-pages/${pageId}${transactionId ? `?transaction_id=${transactionId}` : ""
    }`;
  const fallbackUrl = `https://merchant-api-live-v2.onepay.lk/api/payment-page/ref/?ref_id=${pageId}${transactionId ? `&transaction_id=${transactionId}` : ""
    }`;

  const tryFetch = async (urlStr: string) => {
    console.log("Fetching Payment Page Details from URL:", urlStr);
    const response = await fetch(urlStr, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const text = await response.text();
    let resData: any;
    try {
      resData = JSON.parse(text);
    } catch {
      resData = responseDecrypt(text);
    }
    console.log("Payment Page Details API Response:", resData);
    return resData;
  };

  try {
    return await tryFetch(primaryUrl);
  } catch (error) {
    console.warn("Primary verifyTransaction failed, trying fallback:", error);
    try {
      return await tryFetch(fallbackUrl);
    } catch (fallbackErr) {
      console.error("verifyTransaction failed on both endpoints:", fallbackErr);
      return null;
    }
  }
}

export async function requestPLTransaction(
  hash: string,
  requestBodyVal: any,
  token: string
): Promise<any> {
  const isEncrypted = typeof requestBodyVal === "string" && !requestBodyVal.trim().startsWith("{");
  const headers: Record<string, string> = {
    "Content-Type": isEncrypted ? "text/plain; charset=utf-8" : "application/json",
  };
  if (token) {
    headers["Authorization"] = token;
  }

  const body = typeof requestBodyVal === "string" ? requestBodyVal : JSON.stringify(requestBodyVal);

  const primaryUrl = `${cleanBaseUrl}/v1/client/payment-pages/link/`;
  const fallbackUrl = `https://merchant-api-live-v2.onepay.lk/api/payment-page/link/?hash=${hash}`;

  const tryFetch = async (urlStr: string) => {
    const response = await fetch(urlStr, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return responseDecrypt(text);
    }
  };

  try {
    return await tryFetch(primaryUrl);
  } catch (error) {
    console.warn("Primary PL transaction endpoint failed, trying fallback:", error);
    try {
      return await tryFetch(fallbackUrl);
    } catch (fallbackErr) {
      console.error("requestPLTransaction failed on both endpoints:", fallbackErr);
      return null;
    }
  }
}

export async function createCheckoutIntent(
  pageRefId: string,
  payload: { collection_item_ids?: any[]; custom_field_answers?: any[] }
): Promise<{ success: boolean; reference?: string; error?: string }> {
  const primaryUrl = `${cleanBaseUrl}/v1/client/payment-pages/${pageRefId}/checkout-intent`;

  try {
    console.log("Posting Checkout Intent to URL:", primaryUrl, payload);
    const response = await fetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json().catch(() => null);
    console.log("Checkout Intent API Response:", resJson);

    if (!response.ok) {
      const errMsg = resJson?.error || resJson?.message || `Checkout intent failed with status ${response.status}`;
      return { success: false, error: errMsg };
    }

    if (resJson && (resJson.success || resJson.status === 200 || resJson.status === 201)) {
      const dataObj = resJson.data || resJson;
      const ref = dataObj.reference || resJson.reference;
      if (ref) {
        return { success: true, reference: ref };
      }
    }

    const errorDetail = resJson?.error || resJson?.message || "Failed to obtain checkout intent reference";
    return { success: false, error: errorDetail };
  } catch (error: any) {
    console.warn("createCheckoutIntent failed:", error);
    return { success: false, error: error?.message || "Network error while creating checkout intent" };
  }
}
