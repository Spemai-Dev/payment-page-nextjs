import { redirect } from "next/navigation";
import { verifyTransaction } from "../../../src/lib/api";
import { jsonToShaValidator } from "../../../src/lib/encryption";

interface RedirectPageProps {
  params: Promise<{ page_ref_id: string }>;
  searchParams: Promise<{ tran?: string }>;
}

export default async function RedirectPage({
  params,
  searchParams,
}: RedirectPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const pageId = resolvedParams.page_ref_id;
  const transactionId = resolvedSearchParams.tran || "";

  // Call verification API
  const res = await verifyTransaction(pageId, transactionId);
  console.log(res, 'response')

  if (!res) {
    redirect("/unauth");
  }

  let isAttempted = false;
  let paymentStatus = false;
  let pageDataObj = null;

  if (res.success !== undefined) {
    // New API envelope
    if (!res.success || !res.data) {
      redirect("/unauth");
    }
    pageDataObj = res.data.page_data;
    if (res.data.transaction) {
      isAttempted = true;
      paymentStatus = res.data.transaction.status === true;
    }
  } else {
    // Old API envelope fallback
    if (!res.status || !res.data) {
      redirect("/unauth");
    }
    pageDataObj = res.data.page_data;
    const statusCode = Number(res.status);
    isAttempted = statusCode === 173 || statusCode === 174;
    paymentStatus = statusCode === 173;
  }

  if (!pageDataObj) {
    redirect("/unauth");
  }

  // Verify Sha integrity signature (skip if not present in new API)
  let isValidSignature = true;
  if (pageDataObj.request_hash && pageDataObj.token) {
    const validateRequest = {
      pp_id: pageDataObj.page_ref_id,
      token: pageDataObj.token,
    };
    isValidSignature = jsonToShaValidator(
      validateRequest,
      pageDataObj.request_hash
    );
  }

  if (isValidSignature) {
    // Redirect to the merchant interface
    const query = new URLSearchParams({
      tran: transactionId,
      is_attempted: String(isAttempted),
      status: String(paymentStatus),
    });
    redirect(`/merchant/${pageDataObj.page_ref_id}?${query.toString()}`);
  } else {
    redirect("/unauth");
  }
}
