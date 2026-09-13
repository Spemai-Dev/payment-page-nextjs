const DEFAULT_IMAGE_HOSTS = [
  'onepay.blob.core.windows.net',
  'cdn.onepay.lk',
  'files.onepayapi.lk',
  'storage.googleapis.com',
];

function extraImageHosts() {
  return (process.env.IMAGE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const allowed = [...DEFAULT_IMAGE_HOSTS, ...extraImageHosts()];
  return allowed.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

export function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!isAllowedImageHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
