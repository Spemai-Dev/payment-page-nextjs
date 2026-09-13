import sanitizeHtml from 'sanitize-html';

export function sanitizeText(value: unknown, max = 500): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function sanitizeRichHtml(value: unknown, max = 20_000): string {
  const dirty = String(value ?? '').slice(0, max);
  if (!dirty.trim()) return '';

  return sanitizeHtml(dirty, {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'span'],
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }),
    },
    disallowedTagsMode: 'discard',
  });
}
