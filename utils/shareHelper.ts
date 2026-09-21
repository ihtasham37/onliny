/**
 * Universal Share Helper for Social Media (WhatsApp, Facebook, Twitter, Telegram, etc.)
 * Generates OpenGraph-compatible redirect URLs so scrapers show rich title and image previews,
 * and redirects users directly to the right in-app route.
 */

export interface ShareOptions {
  type: 'product' | 'category' | 'store' | 'standalone';
  id?: string;
  title: string;
  description?: string;
  image?: string;
  price?: number;
  appName?: string;
}

export function getSmartShareUrl(options: ShareOptions): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const appName = options.appName || 'Online store';
  const title = options.title.trim();
  const desc = (options.description || '').trim().slice(0, 160);
  let image = (options.image || '').trim();
  if (image && image.startsWith('/')) {
    image = `${origin}${image}`;
  }
  const id = options.id || '';
  const type = options.type;
  const price = options.price !== undefined ? String(options.price) : '';

  const params = new URLSearchParams();
  params.set('type', type);
  if (id) params.set('id', id);
  if (title) params.set('title', title);
  if (desc) params.set('desc', desc);
  if (image) params.set('image', image);
  if (price) params.set('price', price);
  if (appName) params.set('app', appName);

  return `${origin}/share?${params.toString()}`;
}

/**
 * Robust copy-to-clipboard function that gracefully falls back across iframes and restricted environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Strategy 1: Modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied in iframe -> fallback to execCommand
    }
  }

  // Strategy 2: DOM fallback with execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export async function shareContent(
  options: ShareOptions,
  onCopied?: (msg: string) => void
): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
  const appName = options.appName || 'Online store';
  const shareUrl = getSmartShareUrl(options);
  const shareTitle = `${options.title} | ${appName}`;
  const shareText = options.price 
    ? `Check out ${options.title} (Rs. ${Number(options.price).toLocaleString()}) on ${appName}!`
    : `Check out ${options.title} on ${appName}!`;

  // Try Native Web Share API first (Mobile WhatsApp, Telegram, etc.)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && !navigator.canShare({ url: shareUrl })) {
        // Can't share this payload natively, proceed to clipboard
      } else {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return { success: true, method: 'native' };
      }
    } catch (err: any) {
      // If user simply closed the share sheet (AbortError), return clean success
      if (err?.name === 'AbortError') {
        return { success: true, method: 'native' };
      }
      // Fallback to clipboard
    }
  }

  // Fallback to Clipboard Copy
  const copied = await copyToClipboard(shareUrl);
  if (copied) {
    if (onCopied) {
      onCopied('Link copied! You can now paste and share on WhatsApp or Social Media.');
    }
    return { success: true, method: 'clipboard' };
  } else {
    if (onCopied) {
      onCopied('Link ready to share!');
    }
    return { success: false, method: 'clipboard' };
  }
}
