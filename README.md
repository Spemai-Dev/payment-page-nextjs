# OnePay public payment page

Open a merchant payment page at `/{page_ref}` — for example `/PP-8F3A21C9`. The app loads `GET /v1/client/payment-pages/{ref_id}` on the server and renders the public checkout UI.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Dev server: [http://localhost:3010](http://localhost:3010)

Then open `http://localhost:3010/<page_ref_id>`.

## Environment

| Variable | Where it is used | Notes |
|---|---|---|
| `PAYMENT_PAGE_API_BASE_URL` | Server only | API gateway base, including `/gateway/payment_page`. Never expose this to the browser. |
| `NEXT_PUBLIC_ONEPAY_API_BASE_URL` | Browser (OnePay SDK) | Checkout API used by `@onepaynpm/onepay-sdk`. Defaults to `https://api.onepay.lk`. |
| `NEXT_PUBLIC_MERCHANT_API_BASE_URL` | Browser (OnePay SDK) | Merchant app lookup for `app_token` / `hash_salt`. |
| `IMAGE_ALLOWED_HOSTS` | Server only | Optional extra image hosts, comma-separated. |
| `SUPPORT_URL` | Server + footer link | Support URL shown on the checkout footer. |

## Security defaults

- Page data is fetched in a React Server Component. The browser never calls the payment-page API.
- `page_ref` and `transaction_id` are format-checked before any outbound request.
- Amounts are recalculated on the server from the live page payload. Client-sent totals are ignored.
- Pay starts a server `checkout-intent`, then opens the OnePay SDK gateway iframe with that intent in `additionalData`.
- HTML from `plain_text_content` and terms is sanitized before render.
- HTML from `plain_text_content` and terms is sanitized before render.
- Cover, item, and logo images must be `https` URLs on an allowlisted host.
- CSP, clickjacking, MIME sniffing, referrer, and HSTS headers are enabled.
- Payment pages are marked `noindex`.
