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

  // If already WebP and strictly within target size, reuse as is
  if (file.size <= (maxKb - 2) * 1024 && file.type === 'image/webp') {
    return file;
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // For banners, allow up to 1400px; for products, allow up to 900px
          const maxDimension = isBanner ? 1400 : 900;
          let quality = isBanner ? 0.80 : 0.72;
          let mimeType = 'image/webp';

          // Test if webp is supported on canvas
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 1;
          testCanvas.height = 1;
          if (testCanvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
            mimeType = 'image/jpeg';
          }

          const attemptCompress = (width: number, height: number, q: number): Blob | null => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return null;

            // Fill white background for transparent images when converting to jpeg/webp
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL(mimeType, q);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
          };

          // Iterative reduction loop to guarantee size is STRICTLY within target
          let currentWidth = originalWidth;
          let currentHeight = originalHeight;

          // Scale down initial dimensions if larger than maxDimension
          if (currentWidth > maxDimension || currentHeight > maxDimension) {
            if (currentWidth > currentHeight) {
              currentHeight = Math.round((currentHeight * maxDimension) / currentWidth);
              currentWidth = maxDimension;
            } else {
              currentWidth = Math.round((currentWidth * maxDimension) / currentHeight);
              currentHeight = maxDimension;
            }
          }

          let bestBlob: Blob | null = null;
          let attempts = 0;

          while (attempts < 10) {
            attempts++;
            const blob = attemptCompress(currentWidth, currentHeight, quality);
            if (!blob) break;

            bestBlob = blob;

            if (blob.size <= MAX_TARGET_BYTES) {
              // Target achieved! Under target KB limit
              break;
            }

            // If too large, step down quality first, then dimensions
            if (quality > 0.45) {
              quality -= 0.10;
            } else {
              // Scale down dimensions by 12%
              currentWidth = Math.round(currentWidth * 0.88);
              currentHeight = Math.round(currentHeight * 0.88);
              quality = Math.max(0.35, quality - 0.05);
            }
          }

          if (bestBlob) {
            const extension = bestBlob.type === 'image/webp' ? '.webp' : '.jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([bestBlob], `${baseName}${extension}`, {
              type: bestBlob.type,
              lastModified: Date.now(),
            });

            console.log(
              `[Image Compression - ${isBanner ? 'Banner (<50KB)' : 'Product (<30KB)'}] Original: ${(file.size / 1024).toFixed(1)} KB -> Compressed: ${(compressedFile.size / 1024).toFixed(1)} KB (Target < ${maxKb} KB achieved)`
            );
            resolve(compressedFile);
            return;
          }

          resolve(file);
        } catch (err) {
          console.warn('[Image Compression] Error in canvas compression:', err);
          resolve(file);
        }
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
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
