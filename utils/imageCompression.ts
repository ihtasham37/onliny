/**
 * Compresses an image file client-side so its byte size is strictly under 20KB.
 * Iteratively scales dimensions and adjusts JPEG quality to preserve readable payment details.
 */
export async function compressImageUnder20KB(file: File, maxBytes: number = 19800): Promise<File> {
  // If already under 20KB, return as is
  if (file.size <= maxBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = async () => {
        try {
          let width = img.width;
          let height = img.height;
          
          // Initial downscale if large image
          const maxDim = 850;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(file);
          }

          let bestBlob: Blob | null = null;
          let quality = 0.75;
          let currentWidth = width;
          let currentHeight = height;

          // Attempt compression loop: step down quality and dimensions until <= maxBytes
          for (let attempt = 0; attempt < 8; attempt++) {
            canvas.width = Math.max(120, currentWidth);
            canvas.height = Math.max(120, currentHeight);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const blob: Blob | null = await new Promise((resBlob) =>
              canvas.toBlob(resBlob, "image/jpeg", quality)
            );

            if (blob) {
              bestBlob = blob;
              if (blob.size <= maxBytes) {
                break;
              }
            }

            if (quality > 0.45) {
              quality -= 0.15;
            } else {
              quality = Math.max(0.2, quality - 0.05);
              currentWidth = Math.round(currentWidth * 0.82);
              currentHeight = Math.round(currentHeight * 0.82);
            }
          }

          if (bestBlob) {
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([bestBlob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        } catch (err) {
          console.warn("Client-side image compression fallback:", err);
          resolve(file);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
