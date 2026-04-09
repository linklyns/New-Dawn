export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function textToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '')}</p>`)
    .join('');
}

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function normalizeRichTextHtml(value: string): string {
  if (!value.trim()) {
    return '';
  }

  return looksLikeHtml(value) ? value : textToHtml(value);
}

export function richTextToPlainText(value: string): string {
  if (!value.trim()) {
    return '';
  }

  if (typeof window !== 'undefined') {
    const container = window.document.createElement('div');
    container.innerHTML = value;
    return (container.textContent ?? container.innerText ?? '').trim();
  }

  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}