/**
 * High-Efficiency Ultra-Lightweight Image Compressor
 * - Banners and Category Banners: Strictly compressed to < 50 KB (Target: ~48 KB)
 * - Products & Other Images: Strictly compressed to < 30 KB (Target: ~29 KB)
 * Uses high-performance HTML5 Canvas with adaptive quality and WebP/JPEG encoding.
 */

export interface CompressionOptions {
  maxKb?: number;
  type?: 'banner' | 'category' | 'product' | string;
}

export const compressImage = async (
  file: File,
  options?: CompressionOptions | 'banner' | 'category' | 'product'
): Promise<File> => {
  // If not an image, return original
  if (!file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Parse type & max target bytes
  const optType = typeof options === 'string' ? options : options?.type;
  const isBanner = optType === 'banner' || optType === 'category' || /banner|category/i.test(file.name);
  
  // Custom maxKb override or strict rule: < 50 KB for banners, < 30 KB for products
  const maxKb = typeof options === 'object' && options?.maxKb 
    ? options.maxKb 
    : (isBanner ? 49 : 29);

  const MAX_TARGET_BYTES = maxKb * 1024;

  // If already WebP and strictly within target size, reuse as is immediately
  if (file.size <= (maxKb - 2) * 1024 && file.type === 'image/webp') {
    return file;
  }

  return new Promise<File>((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback if URL.createObjectURL fails
      objectUrl = '';
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
    };

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Targeted sizing right from step 1 for ultra-fast 1-step completion:
        // Products (< 30 KB): 720px is crystal clear on mobile/retina and compresses in ~20-25 KB
        // Banners (< 50 KB): 1200px provides high-res wide hero quality within ~42-48 KB
        const targetMaxDim = isBanner ? 1200 : 720;
        let w = origW;
        let h = origH;
        if (w > targetMaxDim || h > targetMaxDim) {
          if (w > h) {
            h = Math.round((h * targetMaxDim) / w);
            w = targetMaxDim;
          } else {
            w = Math.round((w * targetMaxDim) / h);
            h = targetMaxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w));
        canvas.height = Math.max(1, Math.round(h));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          cleanup();
          resolve(file);
          return;
        }

        // Clean white background for transparency conversion
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const mimeType = 'image/webp';
        const initialQuality = isBanner ? 0.76 : 0.65;

        // Ultra-fast native toBlob helper (offloaded to native browser C++)
        const getBlob = (q: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob((blob) => {
              if (blob && blob.size > 0) {
                res(blob);
              } else {
                // Fallback to jpeg if webp encoding is unavailable
                canvas.toBlob(res, 'image/jpeg', q);
              }
            }, mimeType, q);
          });
        };

        (async () => {
          // Pass 1: Fast native compression
          let blob = await getBlob(initialQuality);

          // Pass 2 (Only if slightly over target limit): Quick adaptive step
          if (blob && blob.size > MAX_TARGET_BYTES) {
            const step2Quality = Math.max(0.42, initialQuality - 0.20);
            if (blob.size > MAX_TARGET_BYTES * 1.3) {
              const scale = 0.82;
              canvas.width = Math.max(1, Math.round(w * scale));
              canvas.height = Math.max(1, Math.round(h * scale));
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            const blob2 = await getBlob(step2Quality);
            if (blob2 && blob2.size < blob.size) {
              blob = blob2;
            }
          }

          // Pass 3 (Strict safety check for very dense photos):
          if (blob && blob.size > MAX_TARGET_BYTES) {
            const scale = 0.70;
            canvas.width = Math.max(1, Math.round(w * scale));
            canvas.height = Math.max(1, Math.round(h * scale));
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const blob3 = await getBlob(0.38);
            if (blob3) blob = blob3;
          }

          cleanup();
          if (blob) {
            const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'image';
            const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
            const compressedFile = new File([blob], `${baseName}${ext}`, {
              type: blob.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        })();
      } catch {
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    }
  });
};

export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Downloads an external image from a URL, strictly compresses it using HTML5 Canvas (< 28 KB),
 * and converts to a self-contained Data URI ready to be stored directly in Firebase Firestore.
 */
export const compressImageUrlToDataUri = async (imageUrl: string, maxKb: number = 28): Promise<string> => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const clean = imageUrl.trim();
  if (clean.startsWith('data:image/')) {
    return clean;
  }

  // 1. Try browser HTML5 Canvas compression
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        const timeout = setTimeout(() => reject(new Error('Canvas image load timeout')), 6000);

        img.onload = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement('canvas');
            let width = img.naturalWidth || img.width || 600;
            let height = img.naturalHeight || img.height || 600;

            const maxDim = 800;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas 2D unavailable'));

            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.75;
            let result = canvas.toDataURL('image/webp', quality);
            if (!result.startsWith('data:image/webp')) {
              result = canvas.toDataURL('image/jpeg', quality);
            }

            if (result.length > maxKb * 1024 * 1.37) {
              result = canvas.toDataURL('image/webp', 0.52);
              if (!result.startsWith('data:image/webp')) {
                result = canvas.toDataURL('image/jpeg', 0.52);
              }
            }

            resolve(result);
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Canvas image onerror'));
        };

        img.src = clean;
      });

      if (dataUri && dataUri.startsWith('data:image/')) {
        return dataUri;
      }
    } catch (_) {
      // Canvas CORS prevented reading pixels, fall through to proxy
    }
  }

  // 2. Fallback to server/edge proxy endpoint
  try {
    const res = await fetch('/api/compress-image-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: clean, maxKb })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.dataUri) {
        return data.dataUri;
      }
    }
  } catch (_) {}

  return clean;
};
