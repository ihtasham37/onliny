
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './context/AppContext';
// Fix: Corrected import source for useStore to pull from hooks/useStore instead of context/AppContext.
import { useStore } from './hooks/useStore';
import { useStandaloneCategory } from './hooks/useStandaloneCategory';
import { FullPageSpinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyRetry } from './utils/lazyLoad';
import { SplashScreen } from './components/ui/SplashScreen';
import { safeJsonStringify } from './utils/helpers';

import StoreLayout from './components/layout/StoreLayout';
import AdminLayout from './pages/admin/AdminLayout';
import VendorAuth from './pages/vendor/VendorAuth';
import VendorLayout from './pages/vendor/VendorLayout';

const AppContent = () => {
    const { settings } = useStore();
    const { isStandalone, storeName, storeLogoUrl, homeUrl, standaloneType, vendorId, categoryId } = useStandaloneCategory();
    const [showSplash, setShowSplash] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !sessionStorage.getItem('app_initialized');
    });

    useEffect(() => {
        if (!showSplash) return;
        sessionStorage.setItem('app_initialized', 'true');
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 1200);

        return () => clearTimeout(timer);
    }, [showSplash]);

    useEffect(() => {
        const logoUrl = (isStandalone && storeLogoUrl ? storeLogoUrl : (settings?.logoUrl || '')).trim();
        const appName = (isStandalone && storeName ? storeName : (settings?.appName || 'Online store')).trim();
        const startUrl = isStandalone && homeUrl ? `/#${homeUrl}` : '/';
        const manifestId = isStandalone && homeUrl ? homeUrl : '/';

        document.title = appName;

        // Ensure manifest link always points to valid HTTP/HTTPS endpoint (never a blob: URL which causes Android WebAPK install failure)
        try {
            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.setAttribute('rel', 'manifest');
                document.head.appendChild(manifestLink);
            }
            const targetManifestHref = isStandalone && (vendorId || categoryId)
                ? `/manifest.json?${vendorId ? `vendor=${encodeURIComponent(vendorId)}` : `category=${encodeURIComponent(categoryId || '')}`}`
                : '/manifest.json';
            if (manifestLink.getAttribute('href') !== targetManifestHref) {
                manifestLink.setAttribute('href', targetManifestHref);
            }
        } catch (err) {
            console.warn("Failed to set manifest href:", err);
        }

        // Update Favicon & App Icons directly in head
        const directIcon192 = logoUrl || '/pwa-192x192.png';
        const directIcon512 = logoUrl || '/pwa-512x512.png';

        document.querySelectorAll('link[rel="icon"]').forEach(el => {
            const sizes = el.getAttribute('sizes');
            if (sizes === '512x512') {
                el.setAttribute('href', directIcon512);
            } else {
                el.setAttribute('href', directIcon192);
            }
        });

        let shortcutIcon = document.querySelector('link[rel="shortcut icon"]');
        if (shortcutIcon) {
            shortcutIcon.setAttribute('href', directIcon192);
        }

        // Update Apple Touch Icon
        let appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleTouch) {
            appleTouch = document.createElement('link');
            appleTouch.setAttribute('rel', 'apple-touch-icon');
            document.head.appendChild(appleTouch);
        }
        appleTouch.setAttribute('href', directIcon192);

        // Update Apple Mobile Title
        let appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (!appTitleMeta) {
            appTitleMeta = document.createElement('meta');
            appTitleMeta.setAttribute('name', 'apple-mobile-web-app-title');
            document.head.appendChild(appTitleMeta);
        }
        appTitleMeta.setAttribute('content', appName);
    }, [settings, isStandalone, storeName, storeLogoUrl, homeUrl, standaloneType, vendorId, categoryId]);

    if (showSplash) {
        return <SplashScreen />;
    }

    return (
        <Suspense fallback={<FullPageSpinner />}>
            <Routes>
                {/* Admin Routes */}
                <Route path="/admin/*" element={<AdminLayout />} />

                {/* Vendor Routes */}
                <Route path="/vendor/login" element={<VendorAuth />} />
                <Route path="/vendor/register" element={<VendorAuth />} />
                <Route path="/vendor/*" element={<VendorLayout />} />

                {/* Storefront Routes */}
                <Route path="/*" element={<StoreLayout />} />
            </Routes>
        </Suspense>
    );
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AppProvider>
          {/* HashRouter is used for stability on static hosts (like InfinityFree) to prevent 404s on refresh */}
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
          </HashRouter>
        </AppProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
