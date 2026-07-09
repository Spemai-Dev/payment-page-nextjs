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

  if (!res || !res.status) {
    redirect("/unauth");
  }

  const statusCode = Number(res.status);

  // Replicate original status checks:
  // 172: checkout page (is_attempted = false, status = false)
  // 173: successful transaction (is_attempted = true, status = true)
  // 174: failed transaction (is_attempted = true, status = false)
  const isAttempted = statusCode === 173 || statusCode === 174;
  const paymentStatus = statusCode === 173;

  const pageDataObj = res.data?.page_data;
  if (!pageDataObj) {
    redirect("/unauth");
  }

  // Verify Sha integrity signature
  const validateRequest = {
    pp_id: pageDataObj.page_ref_id,
    token: pageDataObj.token,
  };

  const isValidSignature = jsonToShaValidator(
    validateRequest,
    pageDataObj.request_hash
  );

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
