import fs from 'fs';
import path from 'path';

// Clean, precise vector of the premium shopping bag
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <!-- Top Handle -->
  <path 
    d="M 188 175 C 188 78, 324 78, 324 175" 
    stroke="#0f172a" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />
  <!-- Main Bag Body -->
  <path 
    d="M 136 175 L 376 175 L 412 418 C 414 438, 398 454, 378 454 L 134 454 C 114 454, 98 438, 100 418 Z" 
    stroke="#0f172a" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />
  <!-- Nested Handle -->
  <path 
    d="M 188 175 C 188 272, 324 272, 324 175" 
    stroke="#f43f5e" 
    stroke-width="32" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  />
</svg>`;

const svgMaskableContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#ffffff" />
  <g transform="translate(64, 64) scale(0.75)">
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
      fill="none"
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

  try {
    const { default: sharp } = await import('sharp');
    const svgBuffer = Buffer.from(svgContent);
    const svgMaskableBuffer = Buffer.from(svgMaskableContent);

    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'default-store-icon.png'));
    await sharp(svgMaskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
    await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
    await sharp(svgMaskableBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
    await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));
    console.log('PNG icons updated using sharp.');
  } catch {
    console.log('SVG icons saved; skipping PNG regeneration (existing static PNG assets preserved).');
  }
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
