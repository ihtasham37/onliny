/**
 * Universal Image Resolution and Fallback Utility for Onliny
 * Handles all formats: Firebase Storage (gs:// and https://), Cloudflare R2,
 * Data URIs, Markaz URLs, external supplier links, single strings, and object arrays.
 */

export const DEFAULT_PLACEHOLDER_IMAGE = '/placeholder.svg';

/**
 * Resolves any raw image input into a direct, browser-loadable URL string.
 */
export function resolveImageUrl(input: any): string {
  if (!input) return '';

  let url = '';
  if (typeof input === 'string') {
    url = input.trim();
  } else if (typeof input === 'object' && input !== null) {
    url = (
      input.url ||
      input.src ||
      input.imageUrl ||
      input.link ||
      input.downloadUrl ||
      input.path ||
      input.uri ||
      ''
    ).trim();
  }

  if (!url) return '';

  // Strip wrapping quotes or accidental brackets
  url = url.replace(/^["'\[]+|["'\]]+$/g, '').trim();
  if (!url) return '';

  // 1. Data URLs & Blob URLs are valid as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // 2. Firebase Storage gs:// references (e.g., gs://bucket/path/image.jpg)
  if (url.startsWith('gs://')) {
    const withoutGs = url.replace(/^gs:\/\//, '');
    const firstSlash = withoutGs.indexOf('/');
    if (firstSlash !== -1) {
      const bucket = withoutGs.substring(0, firstSlash);
      const filePath = withoutGs.substring(firstSlash + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    }
  }

  // 3. Direct Firebase Storage bucket paths (e.g., https://e-commerse-ca95f.firebasestorage.app/uploads/...)
  if (
    (url.includes('.firebasestorage.app/') || url.includes('.appspot.com/')) &&
    !url.includes('firebasestorage.googleapis.com')
  ) {
    const match = url.match(/https?:\/\/([^/]+)\/(.+)/);
    if (match) {
      const bucket = match[1];
      const filePath = match[2];
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    }
  }

  // 4. Firebase Storage URLs missing alt=media parameter
  if (
    (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) &&
    !url.includes('alt=media')
  ) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}alt=media`;
  }

  // 5. Protocol-relative URLs (//example.com/img.jpg -> https://example.com/img.jpg)
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  return url;
}

/**
 * Safely extracts the primary / first valid image URL from any product object.
 * Robust against variations in Firestore document schemas (images: [], images: "", imageUrl, photoUrl, etc.)
 */
export function getPrimaryProductImage(product: any, fallback: string = DEFAULT_PLACEHOLDER_IMAGE): string {
  if (!product) return fallback;

  // 1. Array of images
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const item of product.images) {
      const resolved = resolveImageUrl(item);
      if (resolved) return resolved;
    }
  }

  // 2. String representation of images (JSON array, comma-separated, or direct URL)
  if (typeof product.images === 'string' && product.images.trim()) {
    const raw = product.images.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const resolved = resolveImageUrl(parsed[0]);
          if (resolved) return resolved;
        }
      } catch (e) {}
    }
    if (raw.includes(',')) {
      const first = raw.split(',')[0].trim();
      const resolved = resolveImageUrl(first);
      if (resolved) return resolved;
    }
    const resolved = resolveImageUrl(raw);
    if (resolved) return resolved;
  }

  // 3. Direct field fallbacks used in Firebase products
  const directFields = [
    product.imageUrl,
    product.image,
    product.photoUrl,
    product.photo,
    product.thumbnail,
    product.img,
    product.picture,
    product.coverImage,
    product.productImage
  ];

  for (const field of directFields) {
    if (field) {
      const resolved = resolveImageUrl(field);
      if (resolved) return resolved;
    }
  }

  return fallback;
}

/**
 * Safely extracts all valid image URLs from any product object.
 */
export function getAllProductImages(product: any): string[] {
  if (!product) return [];
  const list: string[] = [];

  const addIfValid = (candidate: any) => {
    const resolved = resolveImageUrl(candidate);
    if (resolved && !list.includes(resolved)) {
      list.push(resolved);
    }
  };

  if (Array.isArray(product.images)) {
    product.images.forEach(addIfValid);
  } else if (typeof product.images === 'string' && product.images.trim()) {
    const raw = product.images.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(addIfValid);
        }
      } catch (e) {}
    } else if (raw.includes(',')) {
      raw.split(',').forEach(addIfValid);
    } else {
      addIfValid(raw);
    }
  }

  const directFields = [
    product.imageUrl,
    product.image,
    product.photoUrl,
    product.photo,
    product.thumbnail,
    product.img,
    product.picture,
    product.coverImage
  ];

  for (const field of directFields) {
    if (field) addIfValid(field);
  }

  return list;
}
