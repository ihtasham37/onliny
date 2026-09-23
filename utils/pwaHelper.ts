/**
 * Dynamic PWA Manifest and App Icon Sync
 * Ensures that whatever logo and store name are configured in the Admin Panel
 * are immediately reflected on the mobile device home screen, PWA manifest,
 * apple-touch-icon, and browser tab favicons.
 */

export interface PWABrandConfig {
  appName?: string;
  logoUrl?: string;
  themeColor?: string;
  startUrl?: string;
}

let lastBlobUrl: string | null = null;

export function syncDynamicPWABranding(config: PWABrandConfig) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const rawName = (config.appName || '').trim();
    const appName = rawName || 'onliny';
    const shortName = appName.length > 12 ? appName.slice(0, 12).trim() : appName;
    const logoUrl = (config.logoUrl || '').trim();
    const themeColor = config.themeColor || '#be185d';
    const startUrl = config.startUrl || '/';

    // Update document title if needed
    if (appName && appName.toLowerCase() !== 'online store') {
      document.title = `${appName} - Online Shopping`;
    }

    // Determine icon URLs
    const icon192 = logoUrl || '/pwa-192x192.png';
    const icon512 = logoUrl || '/pwa-512x512.png';

    const getMimeType = (url: string) => {
      if (url.startsWith('data:image/svg')) return 'image/svg+xml';
      if (url.startsWith('data:image/webp')) return 'image/webp';
      if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'image/jpeg';
      if (url.endsWith('.svg')) return 'image/svg+xml';
      if (url.endsWith('.webp')) return 'image/webp';
      if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
      return 'image/png';
    };

    const iconType = logoUrl ? getMimeType(logoUrl) : 'image/png';

    // Construct dynamic Web App Manifest
    const dynamicManifest = {
      id: startUrl,
      name: appName,
      short_name: shortName,
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: themeColor,
      description: `Official ${appName} storefront with verified products and fast delivery.`,
      prefer_related_applications: false,
      categories: ['shopping', 'lifestyle'],
      icons: [
        {
          src: icon192,
          sizes: '192x192',
          type: iconType,
          purpose: 'any'
        },
        {
          src: icon512,
          sizes: '512x512',
          type: iconType,
          purpose: 'any'
        },
        {
          src: icon512,
          sizes: '512x512',
          type: iconType,
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: icon512,
          sizes: '512x512',
          type: iconType,
          form_factor: 'narrow',
          label: `${appName} Store`
        }
      ]
    };

    // Generate object URL for manifest
    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json'
    });

    if (lastBlobUrl) {
      try {
        URL.revokeObjectURL(lastBlobUrl);
      } catch (e) {}
    }

    const manifestBlobUrl = URL.createObjectURL(manifestBlob);
    lastBlobUrl = manifestBlobUrl;

    // Update <link rel="manifest">
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', manifestBlobUrl);

    // Update Favicons and Apple Touch Icon
    if (logoUrl) {
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.setAttribute('sizes', '180x180');
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.setAttribute('href', logoUrl);

      const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      favicons.forEach(el => {
        el.setAttribute('href', logoUrl);
        if (logoUrl.startsWith('data:')) {
          el.setAttribute('type', getMimeType(logoUrl));
        }
      });
    }

    // Store in localStorage for instant retrieval on next cold boot
    try {
      localStorage.setItem('pwa_brand_cache', JSON.stringify({
        appName,
        logoUrl,
        themeColor,
        updatedAt: Date.now()
      }));
    } catch (e) {}
  } catch (err) {
    console.warn('Failed to sync dynamic PWA branding:', err);
  }
}
