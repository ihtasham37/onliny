import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const publicDir = path.resolve('public');

  // SVG with clean white background and sleek shopping bag logo
  const svgTemplate = (size, paddingRatio = 0.2) => {
    const pad = size * paddingRatio;
    const innerSize = size - pad * 2;
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <!-- Crisp White Background -->
      <rect width="${size}" height="${size}" fill="#ffffff" rx="${size * 0.08}" />
      
      <!-- Inner Centered Shopping Bag -->
      <g transform="translate(${pad}, ${pad}) scale(${innerSize / 512})">
        <!-- Top Outer Handle -->
        <path 
          d="M 188 175 C 188 78, 324 78, 324 175" 
          stroke="#0f172a" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"
        />
        <!-- Main Bag Body -->
        <path 
          d="M 136 175 L 376 175 L 412 418 C 414 438, 398 454, 378 454 L 134 454 C 114 454, 98 438, 100 418 Z" 
          stroke="#0f172a" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="#ffffff"
        />
        <!-- Nested Rose Handle -->
        <path 
          d="M 188 175 C 188 272, 324 272, 324 175" 
          stroke="#f43f5e" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"
        />
      </g>
    </svg>
    `;
  };

  const svgFullSquare = (size) => {
    // For maskable icon: Full white background with centered logo inside safe area (65%)
    const pad = size * 0.22;
    const innerSize = size - pad * 2;
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#ffffff" />
      <g transform="translate(${pad}, ${pad}) scale(${innerSize / 512})">
        <path 
          d="M 188 175 C 188 78, 324 78, 324 175" 
          stroke="#0f172a" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"
        />
        <path 
          d="M 136 175 L 376 175 L 412 418 C 414 438, 398 454, 378 454 L 134 454 C 114 454, 98 438, 100 418 Z" 
          stroke="#0f172a" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="#ffffff"
        />
        <path 
          d="M 188 175 C 188 272, 324 272, 324 175" 
          stroke="#f43f5e" 
          stroke-width="32" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"
        />
      </g>
    </svg>
    `;
  };

  console.log("Generating white default PWA icons...");

  // 192x192
  await sharp(Buffer.from(svgTemplate(192, 0.16)))
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512
  await sharp(Buffer.from(svgTemplate(512, 0.16)))
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Maskable 512x512
  await sharp(Buffer.from(svgFullSquare(512)))
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Apple Touch Icon 180x180
  await sharp(Buffer.from(svgTemplate(180, 0.16)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Favicon 192
  await sharp(Buffer.from(svgTemplate(192, 0.16)))
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log("✓ White default PWA icons successfully generated!");
}

generateIcons().catch(err => {
  console.error("Icon generation failed:", err);
});
