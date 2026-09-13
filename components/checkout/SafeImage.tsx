import type { ReactNode } from 'react';

type SafeImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

export default function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  if (!src) return <>{fallback}</>;

  return (
    // External merchant/CDN images are already host-allowlisted on the server.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" />
  );
}
