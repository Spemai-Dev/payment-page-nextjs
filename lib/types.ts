export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type PaymentPageApiItem = {
  id: number;
  collection_item_id?: number;
  item_name?: string;
  is_service?: boolean;
  description?: string;
  images?: string[];
  currency?: string;
  gross_amount?: string;
  discounts?: string;
  net_amount?: string;
};

export type PaymentPageApiField = {
  id: number;
  field_name?: string;
  field_type?: string;
};

export type PaymentPageApiMerchant = {
  merchant_name?: string;
  merchant_email?: string;
  merchant_mobile?: string;
  merchant_logo?: string;
};

export type PaymentPageApiTransaction = {
  onepay_transaction_id?: string;
  status?: boolean;
  amount?: string;
  currency?: string;
  paid_on?: string;
  failure_reason?: string;
};

export type PaymentPageApiData = {
  page_data?: {
    id?: number;
    app_id?: string | number;
    app_ref_id?: string;
    page_name?: string;
    page_ref_id?: string;
    cover_image?: string;
    description?: string;
    terms_condition?: string;
    plain_text_content?: string;
    currency?: string;
    gross_amount?: string;
    discounts?: string;
    net_amount?: string;
    expire_date?: string;
    payment_page_url?: string;
  };
  items?: PaymentPageApiItem[];
  custom_fields?: PaymentPageApiField[];
  merchant_data?: PaymentPageApiMerchant;
  required_amount?: boolean;
  is_plain_text?: boolean;
  transaction?: PaymentPageApiTransaction;
};

export type CheckoutItem = {
  id: number;
  collectionItemId: number;
  name: string;
  description: string;
  image: string | null;
  currency: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
};

export type CheckoutCustomField = {
  id: number;
  name: string;
  type: 'text' | 'number';
};

export type CheckoutMerchant = {
  name: string;
  email: string;
  mobile: string;
  logo: string | null;
};

export type CheckoutTransaction = {
  id: string;
  status: boolean;
  amount: number;
  currency: string;
  paidOn: string;
  failureReason: string;
};

export type CheckoutPage = {
  pageRef: string;
  appId: string;
  pageName: string;
  description: string;
  coverImage: string | null;
  currency: string;
  netAmount: number;
  expireDate: string;
  isExpired: boolean;
  isPlainText: boolean;
  plainTextHtml: string;
  termsHtml: string;
  requiredAmount: boolean;
  items: CheckoutItem[];
  customFields: CheckoutCustomField[];
  merchant: CheckoutMerchant;
  transaction: CheckoutTransaction | null;
};

export type FetchPageResult =
  | { ok: true; page: CheckoutPage }
  | { ok: false; status: number; message: string };
