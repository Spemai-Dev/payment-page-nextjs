import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'OnePay Payment Page',
    template: '%s | OnePay',
  },
  description: 'Secure public checkout for OnePay payment pages.',
  robots: { index: false, follow: false },
  icons: { icon: '/assets/main_logo.png' },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`} data-nonce={nonce}>
        {children}
      </body>
    </html>
  );
}
