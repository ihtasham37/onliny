import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Clean, precise vector of the premium shopping bag matching image_1.png
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <!-- Top Handle: Deep dark indigo semi-circular arc arching upwards -->
  <path 
    d="M 188 175 C 188 78, 324 78, 324 175" 
    stroke="#0f172a" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />

  <!-- Main Bag Body: Deep dark indigo smooth hum-shape with rounded bottom corners -->
  <path 
    d="M 136 175 L 376 175 L 412 418 C 414 438, 398 454, 378 454 L 134 454 C 114 454, 98 438, 100 418 Z" 
    stroke="#0f172a" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />

  <!-- Nested Handle: Vibrant matte pink semi-circular arc nested just below the main handle -->
  <path 
    d="M 188 175 C 188 272, 324 272, 324 175" 
    stroke="#f43f5e" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />
</svg>`;

// Also with white circular background for PWA maskable / app icons on Android & iOS
const svgMaskableContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#ffffff" />
  <g transform="translate(64, 64) scale(0.75)">
    <!-- Top Handle: Deep dark indigo -->
    <path 
      d="M 188 175 C 188 78, 324 78, 324 175" 
      stroke="#0f172a" 
      stroke-width="32" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Main Bag Body: Deep dark indigo -->
    <path 
      d="M 136 175 L 376 175 L 412 418 C 414 438, 398 454, 378 454 L 134 454 C 114 454, 98 438, 100 418 Z" 
      stroke="#0f172a" 
      stroke-width="32" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Nested Handle: Vibrant matte pink -->
    <path 
      d="M 188 175 C 188 272, 324 272, 324 175" 
      stroke="#f43f5e" 
      stroke-width="32" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />
  </g>
</svg>`;

async function generateIcons() {
  const publicDir = path.resolve('public');
  const srcAssetsDir = path.resolve('src/assets');
  if (!fs.existsSync(srcAssetsDir)) {
    fs.mkdirSync(srcAssetsDir, { recursive: true });
  }

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'default-logo.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(srcAssetsDir, 'default-logo.svg'), svgContent, 'utf8');

  const svgBuffer = Buffer.from(svgContent);
  const svgMaskableBuffer = Buffer.from(svgMaskableContent);

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'default-store-icon.png'));

  // 512x512 maskable
  await sharp(svgMaskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // apple touch icon (180x180)
  await sharp(svgMaskableBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
