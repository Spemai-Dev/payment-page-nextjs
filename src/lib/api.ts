import { responseDecrypt } from "./encryption";

const API_BASE_URL = "https://merchant-api-live-v2.onepay.lk/api/";

export async function verifyTransaction(pageId: string, transactionId: string = ""): Promise<any> {
  const url = `${API_BASE_URL}payment-page/ref/?ref_id=${pageId}${transactionId ? `&transaction_id=${transactionId}` : ""
    }`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const encryptedText = await response.text();
    return responseDecrypt(encryptedText);
  } catch (error) {
    console.error("verifyTransaction failed:", error);
    return null;
  }
}

export async function requestPLTransaction(
  hash: string,
  encryptedRequest: string,
  token: string
): Promise<any> {
  const url = `${API_BASE_URL}payment-page/link/?hash=${hash}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Authorization: token,
      },
      body: encryptedRequest,
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const encryptedText = await response.text();
    return responseDecrypt(encryptedText);
  } catch (error) {
    console.error("requestPLTransaction failed:", error);
    return null;
  }
}
