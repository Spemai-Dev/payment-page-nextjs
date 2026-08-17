import type { Metadata } from "next";
import "./custom.css";

const defaultAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ambitious-smoke-05a89ee00.7.azurestaticapps.net";

export const metadata: Metadata = {
  metadataBase: new URL(defaultAppUrl),
  title: "OnePay Payment Page",
  description: "Pay securely via OnePay Gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
