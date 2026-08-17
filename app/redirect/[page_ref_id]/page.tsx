import { redirect } from "next/navigation";
import { verifyTransaction } from "../../../src/lib/api";
import { jsonToShaValidator } from "../../../src/lib/encryption";

import type { Metadata } from "next";

interface RedirectPageProps {
  params: Promise<{ page_ref_id: string }>;
  searchParams: Promise<{ tran?: string }>;
}

export async function generateMetadata({
  params,
}: RedirectPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pageId = resolvedParams.page_ref_id;

  const defaultTitle = "OnePay Payment Page";
  const defaultDesc = "Complete your payment securely via OnePay Gateway.";
  const defaultImage = "https://pay.onepay.lk/assets/OnepayPayment.png";

  if (!pageId) {
    return {
      title: defaultTitle,
      description: defaultDesc,
    };
  }

  const res = await verifyTransaction(pageId);
  const data = res?.data || {};
  const pageInfo = data.page_data || {};
  const merchantInfo = data.merchant_data || {};

  const pageName = pageInfo.page_name || merchantInfo.merchant_name || defaultTitle;
  const rawDesc = pageInfo.description || "";
  const pageDesc =
    rawDesc && rawDesc.trim() !== ""
      ? rawDesc.replace(/<[^>]*>?/gm, "").substring(0, 160)
      : `Pay ${pageInfo.currency || "LKR"} ${pageInfo.net_amount || pageInfo.gross_amount || ""} securely via ${merchantInfo.merchant_name || "OnePay"}.`;

  let coverImage = pageInfo.cover_image || merchantInfo.merchant_logo || defaultImage;
  if (coverImage && !coverImage.startsWith("http")) {
    coverImage = `https://onepayserviceimages.s3.amazonaws.com/${coverImage.replace(/^\/+/, "")}`;
  }

  const isPng = coverImage.toLowerCase().endsWith(".png");
  const isJpeg = coverImage.toLowerCase().endsWith(".jpg") || coverImage.toLowerCase().endsWith(".jpeg");
  const imageType = isPng ? "image/png" : isJpeg ? "image/jpeg" : "image/png";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pay.onepay.lk";
  const pageUrl = `${appUrl.replace(/\/+$/, "")}/redirect/${pageId}`;

  return {
    metadataBase: new URL(appUrl),
    title: pageName,
    description: pageDesc,
    openGraph: {
      title: pageName,
      description: pageDesc,
      url: pageUrl,
      siteName: "OnePay Payment Gateway",
      images: [
        {
          url: coverImage,
          secureUrl: coverImage,
          width: 1200,
          height: 630,
          alt: pageName,
          type: imageType,
        },
        {
          url: coverImage,
          secureUrl: coverImage,
          width: 600,
          height: 315,
          alt: pageName,
          type: imageType,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageName,
      description: pageDesc,
      images: [coverImage],
      site: "@onepay",
    },
    other: {
      "og:image:secure_url": coverImage,
      "og:image:type": imageType,
      "og:image:width": "1200",
      "og:image:height": "630",
    },
  };
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
