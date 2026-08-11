import { redirect } from "next/navigation";
import { verifyTransaction } from "../../../src/lib/api";
import { jsonToShaValidator } from "../../../src/lib/encryption";
import MerchantPaymentClient from "../../../src/components/MerchantPaymentClient";

interface MerchantPageProps {
  params: Promise<{ transaction_id: string }>;
  searchParams: Promise<{
    tran?: string;
    is_attempted?: string;
    status?: string;
  }>;
}

export default async function MerchantPage({
  params,
  searchParams,
}: MerchantPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const pageId = resolvedParams.transaction_id; // representing page_ref_id
  const tran = resolvedSearchParams.tran || "";
  const isAttempted = resolvedSearchParams.is_attempted === "true";
  const status = resolvedSearchParams.status === "true";

  // Fetch transaction data from backend (via GET call)
  const res = await verifyTransaction(pageId, tran);

  if (!res) {
    redirect("/unauth");
  }

  let pageDataObj = null;
  if (res.success !== undefined) {
    if (!res.success || !res.data) {
      redirect("/unauth");
    }
    pageDataObj = res.data.page_data;
  } else {
    if (!res.status || !res.data) {
      redirect("/unauth");
    }
    pageDataObj = res.data.page_data;
  }

  if (!pageDataObj) {
    redirect("/unauth");
  }

  // Re-verify request hash integrity (skip if not present in new API)
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

  if (!isValidSignature) {
    redirect("/unauth");
  }

  return (
    <MerchantPaymentClient
      pageData={res.data}
      tran={tran}
      initialIsAttempted={isAttempted}
      initialStatus={status}
    />
  );
}
